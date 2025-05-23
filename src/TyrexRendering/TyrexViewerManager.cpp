/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexInteraction/TyrexInteractionManager.h"

 // Include OpenCascade headers
#include <AIS_InteractiveContext.hxx>
#include <V3d_Viewer.hxx>
#include <V3d_View.hxx>
#include <OpenGl_GraphicDriver.hxx>
#include <Aspect_Window.hxx>
#include <WNT_Window.hxx>
#include <Aspect_DisplayConnection.hxx>
#include <Quantity_Color.hxx>
#include <Quantity_NameOfColor.hxx>
#include <AIS_Shape.hxx>
#include <AIS_InteractiveObject.hxx>
#include <gp_Lin.hxx>
#include <gp_Pln.hxx>
#include <gp_Ax1.hxx>
#include <gp_Dir.hxx>
#include <gp_Vec.hxx>
#include <gp_Ax3.hxx>
#include <IntAna_IntConicQuad.hxx>
#include <Geom_Line.hxx>
#include <GeomAPI_IntCS.hxx>
#include <Geom_Plane.hxx>
#include <ElSLib.hxx>
#include <Graphic3d_Camera.hxx>

// Include Qt headers
#include <QDebug>
#include <QPoint>

namespace TyrexCAD {

    TyrexViewerManager::TyrexViewerManager(QWidget* parent)
        : QObject(parent)
        , m_parentWidget(parent)
        , m_interactionManager(nullptr)
        , m_is2DMode(false)
    {
        initialize();
    }

    TyrexViewerManager::~TyrexViewerManager()
    {
        // OpenCascade handles are reference-counted and will clean up automatically
    }

    Handle(AIS_InteractiveContext) TyrexViewerManager::context() const
    {
        return m_context;
    }

    Handle(V3d_View) TyrexViewerManager::view() const
    {
        return m_view;
    }

    void TyrexViewerManager::setInteractionManager(TyrexInteractionManager* manager)
    {
        m_interactionManager = manager;

        if (m_interactionManager) {
            // Link back to this viewer manager
            m_interactionManager->setViewerManager(this);
        }
    }

    TyrexInteractionManager* TyrexViewerManager::interactionManager() const
    {
        return m_interactionManager;
    }

    void TyrexViewerManager::handleResize()
    {
        if (!m_view.IsNull() && m_parentWidget) {
            m_view->MustBeResized();
            m_view->Redraw();
        }
    }

    void TyrexViewerManager::fitAll()
    {
        if (!m_view.IsNull()) {
            m_view->FitAll();
            m_view->ZFitAll();
        }
    }

    void TyrexViewerManager::redraw()
    {
        if (!m_view.IsNull()) {
            m_view->Redraw();
        }
    }

    void TyrexViewerManager::pan(int dx, int dy)
    {
        if (!m_view.IsNull()) {
            m_view->Pan(dx, dy);
        }
    }

    void TyrexViewerManager::rotate(int dx, int dy)
    {
        if (!m_view.IsNull() && !m_is2DMode) {
            // Only allow rotation in 3D mode
            m_view->Rotate(dx, dy);
        }
    }

    void TyrexViewerManager::zoom(double factor)
    {
        if (!m_view.IsNull()) {
            m_view->SetScale(m_view->Scale() * factor);
        }
    }

    void TyrexViewerManager::highlightEntityAt(const QPoint& position)
    {
        if (m_context.IsNull() || m_view.IsNull()) {
            return;
        }

        // Convert screen position to view space and update dynamic highlight
        m_context->MoveTo(position.x(), position.y(), m_view, Standard_True);
    }

    void TyrexViewerManager::selectEntityAt(const QPoint& position)
    {
        if (m_context.IsNull() || m_view.IsNull()) {
            return;
        }

        // Perform selection using the correct overload of Select  
        m_context->MoveTo(position.x(), position.y(), m_view, Standard_True);
        m_context->Select(Standard_True);
    }

    gp_Pnt TyrexViewerManager::screenToModel(const QPoint& screenPos) const
    {
        if (m_view.IsNull()) {
            return gp_Pnt(0, 0, 0);
        }

        try {
            // Create the working plane (XY plane, Z = 0)
            gp_Pln workingPlane(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1));

            // Convert screen coordinates to 3D point on view plane
            Standard_Real xv, yv, zv;
            m_view->Convert(screenPos.x(), screenPos.y(), xv, yv, zv);

            // Get the eye point and at point to create ray direction
            Standard_Real eyeX, eyeY, eyeZ;
            Standard_Real atX, atY, atZ;
            m_view->Eye(eyeX, eyeY, eyeZ);
            m_view->At(atX, atY, atZ);

            gp_Pnt eyePoint(eyeX, eyeY, eyeZ);
            gp_Pnt viewPoint(xv, yv, zv);

            // Create ray from eye through the clicked point
            gp_Vec rayVec(eyePoint, viewPoint);
            if (rayVec.Magnitude() < 1e-10) {
                return gp_Pnt(0, 0, 0);
            }

            gp_Dir rayDir(rayVec);
            gp_Lin viewRay(eyePoint, rayDir);

            // Find intersection with working plane
            gp_Vec planeNormal = workingPlane.Axis().Direction();
            gp_Pnt planeOrigin = workingPlane.Location();

            // Ray-plane intersection using parametric equation
            // Ray: P = P0 + t * D
            // Plane: N · (P - Q) = 0, where Q is point on plane
            gp_Vec eyeToPlane(eyePoint, planeOrigin);
            Standard_Real numerator = planeNormal.Dot(eyeToPlane);
            Standard_Real denominator = planeNormal.Dot(rayDir);

            if (Abs(denominator) < 1e-10) {
                // Ray is parallel to plane - project eye point onto plane
                gp_Pnt projectedPoint = eyePoint.Translated(-numerator * planeNormal);
                return projectedPoint;
            }

            Standard_Real t = numerator / denominator;
            gp_Pnt intersection = eyePoint.Translated(t * rayVec);

            return intersection;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in screenToModel conversion:" << ex.GetMessageString();

            // Simple fallback - assume orthographic projection
            Standard_Real x = static_cast<Standard_Real>(screenPos.x());
            Standard_Real y = static_cast<Standard_Real>(screenPos.y());
            return gp_Pnt(x, y, 0.0);
        }
        catch (...) {
            qWarning() << "Unknown error in screenToModel conversion";
            return gp_Pnt(0, 0, 0);
        }
    }

    void TyrexViewerManager::set2DMode()
    {
        if (!m_view.IsNull()) {
            m_is2DMode = true;

            // Set orthographic projection using camera
            Handle(Graphic3d_Camera) camera = m_view->Camera();
            if (!camera.IsNull()) {
                camera->SetProjectionType(Graphic3d_Camera::Projection_Orthographic);
            }

            // Set top view
            m_view->SetProj(V3d_Zpos);

            // Fit all
            m_view->FitAll();
            m_view->ZFitAll();

            qDebug() << "View set to 2D mode (orthographic projection)";
        }
    }

    void TyrexViewerManager::set3DMode()
    {
        if (!m_view.IsNull()) {
            m_is2DMode = false;

            // Set perspective projection using camera
            Handle(Graphic3d_Camera) camera = m_view->Camera();
            if (!camera.IsNull()) {
                camera->SetProjectionType(Graphic3d_Camera::Projection_Perspective);
            }

            // Set isometric view
            m_view->SetProj(V3d_XposYnegZpos);

            // Fit all
            m_view->FitAll();

            qDebug() << "View set to 3D mode (perspective projection)";
        }
    }

    void TyrexViewerManager::handleAIS_InteractiveContext(const Handle(AIS_InteractiveContext)& context)
    {
        // Implementation for handling AIS context
        // (Add specific functionality as needed)
    }

    void TyrexViewerManager::handleV3d_View(const Handle(V3d_View)& view)
    {
        // Implementation for handling V3d view
        // (Add specific functionality as needed)
    }

    void TyrexViewerManager::initialize()
    {
        try {
            // Create a graphic driver
            Handle(Aspect_DisplayConnection) displayConnection;
            Handle(OpenGl_GraphicDriver) graphicDriver = new OpenGl_GraphicDriver(displayConnection);

            // Create a Viewer
            m_viewer = new V3d_Viewer(graphicDriver);
            m_viewer->SetDefaultLights();
            m_viewer->SetLightOn();

            // Create an interactive context
            m_context = new AIS_InteractiveContext(m_viewer);
            m_context->SetDisplayMode(AIS_Shaded, Standard_True);

            // Create a view
            m_view = m_viewer->CreateView();

            // Set up the window for the view
            if (m_parentWidget) {
                WId windowId = m_parentWidget->winId();
                Handle(WNT_Window) window = new WNT_Window((Aspect_Handle)windowId);
                m_view->SetWindow(window);

                if (!window->IsMapped()) {
                    window->Map();
                }

                // Set background color
                m_view->SetBackgroundColor(Quantity_NOC_DARKSLATEGRAY);

                // Set default view parameters
                m_view->SetProj(V3d_XposYnegZpos);  // Isometric view
                m_view->TriedronDisplay(Aspect_TOTP_LEFT_LOWER, Quantity_NOC_WHITE, 0.1);

                // Set up automatic updates
                m_view->SetImmediateUpdate(Standard_False);
            }

            qDebug() << "TyrexViewerManager initialized successfully";
        }
        catch (const Standard_Failure& ex) {
            qCritical() << "OpenCascade error during viewer initialization:"
                << QString(ex.GetMessageString());
        }
        catch (const std::exception& ex) {
            qCritical() << "Error during viewer initialization:" << ex.what();
        }
        catch (...) {
            qCritical() << "Unknown error during viewer initialization";
        }
    }

} // namespace TyrexCAD