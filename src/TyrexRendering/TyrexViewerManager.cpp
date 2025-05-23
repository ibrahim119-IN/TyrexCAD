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
#include <Prs3d_LineAspect.hxx>
#include <Prs3d_Drawer.hxx>
#include <Aspect_TypeOfLine.hxx>
#include <V3d_TypeOfOrientation.hxx>
#include <Graphic3d_RenderingParams.hxx>

// Include Qt headers
#include <QDebug>
#include <QPoint>
#include <QTimer>

#include <cmath>

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
            try {
                m_view->MustBeResized();
                m_view->Invalidate();
                m_view->Redraw();

                // Notify about view change
                emit viewChanged();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error during resize:" << ex.GetMessageString();
            }
        }
    }

    void TyrexViewerManager::fitAll()
    {
        if (!m_view.IsNull()) {
            try {
                m_view->FitAll();
                m_view->ZFitAll();
                m_view->Redraw();

                // Notify about view change
                emit viewChanged();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error during fitAll:" << ex.GetMessageString();
            }
        }
    }

    void TyrexViewerManager::redraw()
    {
        if (!m_view.IsNull()) {
            try {
                m_view->Redraw();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error during redraw:" << ex.GetMessageString();
            }
        }
    }

    void TyrexViewerManager::pan(int dx, int dy)
    {
        if (!m_view.IsNull()) {
            try {
                // Scale pan speed based on current zoom level
                double scale = m_view->Scale();
                double panSpeed = 1.0 / scale;

                // Apply scaled pan
                m_view->Pan(static_cast<Standard_Integer>(dx * panSpeed),
                    static_cast<Standard_Integer>(dy * panSpeed),
                    1.0,
                    Standard_True);

                emit viewChanged();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error during pan:" << ex.GetMessageString();
            }
        }
    }

    void TyrexViewerManager::rotate(int dx, int dy)
    {
        if (!m_view.IsNull() && !m_is2DMode) {
            try {
                // Only allow rotation in 3D mode
                m_view->Rotate(dx, dy);
                emit viewChanged();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error during rotate:" << ex.GetMessageString();
            }
        }
    }

    void TyrexViewerManager::zoom(double factor)
    {
        if (!m_view.IsNull()) {
            try {
                m_view->SetScale(m_view->Scale() * factor);
                emit viewChanged();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error during zoom:" << ex.GetMessageString();
            }
        }
    }

    void TyrexViewerManager::zoomAtPoint(const QPoint& center, double factor)
    {
        if (!m_view.IsNull()) {
            try {
                // Start zoom at specific point
                m_view->StartZoomAtPoint(center.x(), center.y());

                // Apply zoom - note the correct method name
                m_view->Zoom(0, 0, static_cast<Standard_Integer>(center.x()),
                    static_cast<Standard_Integer>(center.y()));

                // Update scale
                m_view->SetScale(m_view->Scale() * factor);

                emit viewChanged();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error during zoom at point:" << ex.GetMessageString();
            }
        }
    }

    void TyrexViewerManager::highlightEntityAt(const QPoint& position)
    {
        if (m_context.IsNull() || m_view.IsNull()) {
            return;
        }

        try {
            // Convert screen position to view space and update dynamic highlight
            m_context->MoveTo(position.x(), position.y(), m_view, Standard_True);
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error during highlight:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::selectEntityAt(const QPoint& position)
    {
        if (m_context.IsNull() || m_view.IsNull()) {
            return;
        }

        try {
            // Perform selection using the correct overload of Select  
            m_context->MoveTo(position.x(), position.y(), m_view, Standard_True);
            m_context->Select(Standard_True);
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error during selection:" << ex.GetMessageString();
        }
    }

    gp_Pnt TyrexViewerManager::screenToModel(const QPoint& screenPos) const
    {
        if (m_view.IsNull()) {
            return gp_Pnt(0, 0, 0);
        }

        try {
            if (m_is2DMode) {
                // Simplified conversion for 2D mode
                Standard_Real xv, yv, zv;
                m_view->Convert(screenPos.x(), screenPos.y(), xv, yv, zv);

                // In 2D mode, Z is always 0
                return gp_Pnt(xv, yv, 0.0);
            }
            else {
                // Use 3D conversion - implement inline
                return screenToModel3D(screenPos);
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in screenToModel conversion:" << ex.GetMessageString();
            return gp_Pnt(0, 0, 0);
        }
    }

    gp_Pnt TyrexViewerManager::screenToModel3D(const QPoint& screenPos) const
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
            gp_Vec eyeToPlane(eyePoint, planeOrigin);
            Standard_Real numerator = planeNormal.Dot(eyeToPlane);
            Standard_Real denominator = planeNormal.Dot(rayDir);

            if (std::abs(denominator) < 1e-10) {
                // Ray is parallel to plane - project eye point onto plane
                gp_Pnt projectedPoint = eyePoint.Translated(-numerator * planeNormal);
                return projectedPoint;
            }

            Standard_Real t = numerator / denominator;
            gp_Pnt intersection = eyePoint.Translated(t * rayVec);

            return intersection;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in screenToModel3D conversion:" << ex.GetMessageString();

            // Simple fallback - assume orthographic projection
            Standard_Real x = static_cast<Standard_Real>(screenPos.x());
            Standard_Real y = static_cast<Standard_Real>(screenPos.y());
            return gp_Pnt(x, y, 0.0);
        }
        catch (...) {
            qWarning() << "Unknown error in screenToModel3D conversion";
            return gp_Pnt(0, 0, 0);
        }
    }

    void TyrexViewerManager::set2DMode()
    {
        if (!m_view.IsNull()) {
            try {
                m_is2DMode = true;

                // Set orthographic projection using camera
                Handle(Graphic3d_Camera) camera = m_view->Camera();
                if (!camera.IsNull()) {
                    camera->SetProjectionType(Graphic3d_Camera::Projection_Orthographic);

                    // Set proper camera parameters for 2D view
                    camera->SetUp(gp_Dir(0, 1, 0));      // Y-up
                    camera->SetDirection(gp_Dir(0, 0, -1)); // Looking down Z-axis

                    // Disable perspective
                    camera->SetZFocus(Graphic3d_Camera::FocusType_Absolute, 1.0);
                }

                // Set exact top view
                m_view->SetProj(V3d_Zpos);

                // Reset view orientation to ensure proper 2D alignment
                m_view->SetAt(0, 0, 0);    // Look at origin
                m_view->SetUp(0, 1, 0);    // Y is up

                // Disable rotation for true 2D mode
                m_view->SetViewOrientationDefault();

                // Set view parameters for 2D
                m_view->SetTwist(0);  // No twist

                // Configure depth rendering
                m_view->ChangeRenderingParams().IsAntialiasingEnabled = Standard_True;
                m_view->ChangeRenderingParams().NbMsaaSamples = 4;
                m_view->ChangeRenderingParams().Method = Graphic3d_RM_RASTERIZATION;

                // Set Z range for 2D mode
                m_view->SetZSize(1000.0); // Large Z range to avoid clipping

                // Fit all content
                m_view->FitAll(0.01, Standard_True);
                m_view->ZFitAll();

                // Force update
                m_view->Invalidate();
                m_view->Redraw();

                qDebug() << "View set to 2D mode (orthographic projection)";

                // Notify about view change
                emit viewChanged();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error setting 2D mode:" << ex.GetMessageString();
            }
        }
    }

    void TyrexViewerManager::set3DMode()
    {
        if (!m_view.IsNull()) {
            try {
                m_is2DMode = false;

                // Set perspective projection using camera
                Handle(Graphic3d_Camera) camera = m_view->Camera();
                if (!camera.IsNull()) {
                    camera->SetProjectionType(Graphic3d_Camera::Projection_Perspective);

                    // Restore perspective parameters
                    camera->SetZFocus(Graphic3d_Camera::FocusType_Relative, 1.0);
                    camera->SetFOVy(45.0); // Standard FOV
                }

                // Set isometric view
                m_view->SetProj(V3d_XposYnegZpos);

                // Restore rotation capability
                m_view->SetViewOrientationDefault();

                // Fit all
                m_view->FitAll(0.01, Standard_True);
                m_view->ZFitAll();

                // Force update
                m_view->Invalidate();
                m_view->Redraw();

                qDebug() << "View set to 3D mode (perspective projection)";

                // Notify about view change
                emit viewChanged();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error setting 3D mode:" << ex.GetMessageString();
            }
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
                m_view->TriedronDisplay(Aspect_TOTP_LEFT_LOWER, Quantity_NOC_WHITE, 0.08);

                // Important: Enable depth buffer and shading
                m_view->ChangeRenderingParams().Method = Graphic3d_RM_RASTERIZATION;
                m_view->ChangeRenderingParams().IsAntialiasingEnabled = Standard_True;
                m_view->ChangeRenderingParams().NbMsaaSamples = 4;

                // Set up automatic updates
                m_view->SetImmediateUpdate(Standard_True);

                // Force initial redraw after a short delay
                QTimer::singleShot(100, this, [this]() {
                    if (!m_view.IsNull()) {
                        try {
                            m_view->MustBeResized();
                            m_view->FitAll();
                            m_view->ZFitAll();
                            m_view->Redraw();
                            m_view->Update();
                        }
                        catch (...) {
                            // Ignore errors during initial setup
                        }
                    }
                    });
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