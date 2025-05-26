#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexInteraction/TyrexInteractionManager.h"

#include <QOpenGLContext>
#include <QOpenGLWidget>
#include <QMouseEvent>
#include <QWheelEvent>
#include <QDebug>

#include <AIS_DisplayMode.hxx>
#include <AIS_InteractiveContext.hxx>
#include <AIS_Shape.hxx>
#include <Aspect_Handle.hxx>
#include <Aspect_DisplayConnection.hxx>
#include <BRepPrimAPI_MakeBox.hxx>
#include <Graphic3d_GraphicDriver.hxx>
#include <OpenGl_GraphicDriver.hxx>
#include <Quantity_Color.hxx>
#include <V3d_Viewer.hxx>
#include <V3d_View.hxx>
#include <Graphic3d_Camera.hxx>
#include <Aspect_Window.hxx>

#ifdef _WIN32
#include <WNT_Window.hxx>
#else
#include <Xw_Window.hxx>
#endif

#include <cmath>

namespace TyrexCAD {

    TyrexViewerManager::TyrexViewerManager(QObject* parent)
        : QObject(parent),
        m_is2DMode(false)
    {
        qDebug() << "TyrexViewerManager created";
    }

    TyrexViewerManager::~TyrexViewerManager()
    {
        // Cleanup will be handled automatically by Handle
    }

    void TyrexViewerManager::initializeViewer(QWidget* glWidget)
    {
        if (!glWidget) {
            qCritical() << "Cannot initialize viewer without OpenGL widget";
            return;
        }

        try {
            // Create OpenCascade viewer
            Handle(Aspect_DisplayConnection) displayConnection = new Aspect_DisplayConnection();
            Handle(Graphic3d_GraphicDriver) graphicDriver = new OpenGl_GraphicDriver(displayConnection);

            m_viewer = new V3d_Viewer(graphicDriver);
            m_viewer->SetDefaultLights();
            m_viewer->SetLightOn();

            // Create view
            m_view = m_viewer->CreateView();

            // Create window
#ifdef _WIN32
            m_window = new WNT_Window((Aspect_Handle)glWidget->winId());
#else
            // Linux/Mac implementation
            m_window = new Xw_Window(displayConnection, (Window)glWidget->winId());
#endif

            m_view->SetWindow(m_window);
            if (!m_window->IsMapped()) {
                m_window->Map();
            }

            // Create interactive context
            m_context = new AIS_InteractiveContext(m_viewer);
            m_context->SetDisplayMode(AIS_Shaded, Standard_True);

            // Set default background
            m_view->SetBackgroundColor(Quantity_Color(0.1, 0.1, 0.1, Quantity_TOC_RGB));

            // Set default view
            m_view->SetProj(V3d_XposYnegZpos);
            m_view->FitAll();

            qDebug() << "Viewer initialized successfully";

        }
        catch (const Standard_Failure& e) {
            qCritical() << "Failed to initialize viewer:" << e.GetMessageString();
        }
    }

    void TyrexViewerManager::resizeViewer(int width, int height)
    {
        if (!m_view.IsNull() && !m_window.IsNull()) {
            m_window->DoResize();
            m_view->MustBeResized();
            m_view->Invalidate();
        }
    }

    void TyrexViewerManager::redraw()
    {
        if (!m_view.IsNull()) {
            m_view->Redraw();
        }
    }

    void TyrexViewerManager::fitAll()
    {
        if (!m_view.IsNull()) {
            m_view->FitAll();
            m_view->ZFitAll();
            emit viewChanged();
        }
    }

    void TyrexViewerManager::set2DMode()
    {
        if (m_view.IsNull()) {
            return;
        }

        try {
            m_is2DMode = true;

            // Set orthographic projection
            Handle(Graphic3d_Camera) camera = m_view->Camera();
            if (!camera.IsNull()) {
                camera->SetProjectionType(Graphic3d_Camera::Projection_Orthographic);
            }

            // Set exact top view (looking down Z axis)
            m_view->SetProj(V3d_Zpos);
            m_view->SetUp(0, 1, 0);

            // Reset any rotation
            m_view->SetTwist(0);

            // Fit all and redraw
            m_view->FitAll(0.01, Standard_True);
            m_view->Redraw();

            qDebug() << "Switched to 2D mode";
            emit viewChanged();

        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error setting 2D mode:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::set3DMode()
    {
        if (m_view.IsNull()) {
            return;
        }

        try {
            m_is2DMode = false;

            // Set perspective projection
            Handle(Graphic3d_Camera) camera = m_view->Camera();
            if (!camera.IsNull()) {
                camera->SetProjectionType(Graphic3d_Camera::Projection_Perspective);
            }

            // Set default 3D view
            m_view->SetProj(V3d_XposYnegZpos);
            m_view->FitAll();
            m_view->Redraw();

            qDebug() << "Switched to 3D mode";
            emit viewChanged();

        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error setting 3D mode:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::zoom(double factor)
    {
        if (m_view.IsNull()) {
            return;
        }

        m_view->SetScale(m_view->Scale() * factor);
        emit viewChanged();
    }

    void TyrexViewerManager::mouseWheel(QWheelEvent* event)
    {
        if (!event || m_view.IsNull()) {
            return;
        }

        try {
            // Get wheel delta (positive = forward/zoom in, negative = backward/zoom out)
            int delta = event->angleDelta().y();

            // Forward to interaction manager if available
            if (m_interactionManager) {
                m_interactionManager->onMouseWheel(delta, event->position().toPoint());
                return;
            }

            // Default zoom behavior - FIXED
            zoomAtPoint(event->position().toPoint(), delta > 0 ? 1.1 : 0.9);

        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in mouseWheel:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::zoomAtPoint(const QPoint& center, double factor)
    {
        if (m_view.IsNull()) {
            return;
        }

        try {
            Standard_Integer x = center.x();
            Standard_Integer y = center.y();

            // CRITICAL FIX: Correct zoom implementation
            if (m_is2DMode) {
                // 2D Mode: Simple scale-based zoom
                double currentScale = m_view->Scale();
                double newScale = currentScale * factor;

                // Limit zoom range
                if (newScale > 0.001 && newScale < 10000.0) {
                    m_view->SetScale(newScale);
                }
            }
            else {
                // 3D Mode: Use StartZoomAtPoint + SetScale
                m_view->StartZoomAtPoint(x, y);

                // Apply zoom factor
                double currentScale = m_view->Scale();
                m_view->SetScale(currentScale * factor);
            }

            emit viewChanged();
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error during zoom at point:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::pan(int dx, int dy)
    {
        if (m_view.IsNull()) {
            return;
        }

        try {
            // Pan the view
            m_view->Pan(dx, dy);
            emit viewChanged();
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error during pan:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::rotate(int dx, int dy)
    {
        if (m_view.IsNull() || m_is2DMode) {
            return; // No rotation in 2D mode
        }

        try {
            // Rotate view around center
            m_view->Rotation(dx, dy);
            emit viewChanged();
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error during rotate:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::mousePress(QMouseEvent* event)
    {
        if (!event || m_view.IsNull()) {
            return;
        }

        m_lastMousePos = event->pos();

        try {
            // Forward to interaction manager if available
            if (m_interactionManager) {
                m_interactionManager->onMousePress(event->button(), event->pos());
                return;
            }

            // Default handling
            switch (event->button()) {
            case Qt::LeftButton:
                // Selection
                selectEntityAt(event->pos());
                break;

            case Qt::MiddleButton:
                // Start pan - store position for panning
                break;

            case Qt::RightButton:
                // Start rotation (3D only)
                if (!m_is2DMode) {
                    m_view->StartRotation(event->pos().x(), event->pos().y());
                }
                break;

            default:
                break;
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in mousePress:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::mouseRelease(QMouseEvent* event)
    {
        if (!event || m_view.IsNull()) {
            return;
        }

        try {
            // Forward to interaction manager if available
            if (m_interactionManager) {
                m_interactionManager->onMouseRelease(event->button(), event->pos());
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in mouseRelease:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::mouseMove(QMouseEvent* event)
    {
        if (!event || m_view.IsNull()) {
            return;
        }

        QPoint currentPos = event->pos();
        QPoint delta = currentPos - m_lastMousePos;

        try {
            // Forward to interaction manager if available
            if (m_interactionManager) {
                m_interactionManager->onMouseMove(currentPos, event->modifiers());
                m_lastMousePos = currentPos;
                return;
            }

            // Default handling based on pressed buttons
            if (event->buttons() & Qt::MiddleButton) {
                // Pan - manually calculate pan offset
                m_view->Pan(delta.x(), -delta.y());
            }
            else if (event->buttons() & Qt::RightButton && !m_is2DMode) {
                // Rotate (3D only) - manually handle rotation
                m_view->Rotation(currentPos.x(), currentPos.y());
            }
            else {
                // Highlight on hover
                highlightEntityAt(currentPos);
            }

            m_lastMousePos = currentPos;

        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in mouseMove:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::selectEntityAt(const QPoint& screenPos)
    {
        if (m_context.IsNull() || m_view.IsNull()) {
            return;
        }

        try {
            // Clear previous selection
            m_context->ClearSelected(Standard_False);

            // Move to screen position and select
            m_context->MoveTo(screenPos.x(), screenPos.y(), m_view, Standard_False);
            m_context->Select(Standard_True);

            // Check if anything was selected
            if (m_context->HasSelectedShape()) {
                qDebug() << "Entity selected at" << screenPos;
                emit entitySelected(m_context->SelectedInteractive());
            }

        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error selecting entity:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::highlightEntityAt(const QPoint& screenPos)
    {
        if (m_context.IsNull() || m_view.IsNull()) {
            return;
        }

        try {
            // Move to screen position for highlighting
            m_context->MoveTo(screenPos.x(), screenPos.y(), m_view, Standard_True);

            // Check if anything is highlighted
            if (m_context->HasDetected()) {
                emit entityHighlighted(m_context->DetectedInteractive());
            }

        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error highlighting entity:" << ex.GetMessageString();
        }
    }

    void TyrexViewerManager::setInteractionManager(TyrexInteractionManager* manager)
    {
        m_interactionManager = manager;
    }

    Handle(AIS_InteractiveContext) TyrexViewerManager::context() const
    {
        return m_context;
    }

    Handle(V3d_View) TyrexViewerManager::view() const
    {
        return m_view;
    }

    Handle(V3d_Viewer) TyrexViewerManager::viewer() const
    {
        return m_viewer;
    }

    TyrexInteractionManager* TyrexViewerManager::interactionManager() const
    {
        return m_interactionManager;
    }

} // namespace TyrexCAD