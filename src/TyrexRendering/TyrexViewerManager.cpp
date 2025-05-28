#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexInteraction/TyrexInteractionManager.h"

#include <QWidget>
#include <QMouseEvent>
#include <QWheelEvent>
#include <QDebug>
#include <QApplication>
#include <QThread>
#include <QTimer>

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
#include <Bnd_Box.hxx>
#include <Message.hxx>
#include <Message_Messenger.hxx>
#include <Message_PrinterOStream.hxx>

#ifdef _WIN32
#include <WNT_Window.hxx>
#else
#include <Xw_Window.hxx>
#endif

#include <cmath>

namespace TyrexCAD {

    TyrexViewerManager::TyrexViewerManager(QObject* parent)
        : QObject(parent),
        m_is2DMode(false),
        m_set2DModeRetryTimer(nullptr),
        m_set2DModeRetryCount(0)
    {
        qDebug() << "TyrexViewerManager created";

        // Enable OpenCascade debug messages
        enableOpenCascadeDebug();

        // إنشاء مؤقت إعادة المحاولة
        m_set2DModeRetryTimer = new QTimer(this);
        m_set2DModeRetryTimer->setInterval(RETRY_INTERVAL_MS);
        connect(m_set2DModeRetryTimer, &QTimer::timeout, this, [this]() {
            if (attemptSet2DMode()) {
                stopSet2DModeRetry();
            }
            else if (++m_set2DModeRetryCount >= MAX_RETRY_COUNT) {
                qCritical() << "Failed to set 2D mode after" << MAX_RETRY_COUNT << "attempts";
                stopSet2DModeRetry();
            }
            });
    }

    TyrexViewerManager::~TyrexViewerManager()
    {
        stopSet2DModeRetry();
        // Cleanup will be handled automatically by Handle
    }

    void TyrexViewerManager::enableOpenCascadeDebug()
    {
        // Create printer for messages
        Handle(Message_PrinterOStream) aPrinter =
            new Message_PrinterOStream(Message_Info);

        // Add printer to default messenger
        Message::DefaultMessenger()->AddPrinter(aPrinter);

        qDebug() << "OpenCascade debug messages enabled";
    }

    bool TyrexViewerManager::checkGraphicsDriver()
    {
        qDebug() << "=== Checking Graphics Driver Status ===";

        // Check if driver exists
        if (m_graphicDriver.IsNull()) {
            qCritical() << "Graphics driver is NULL!";
            return false;
        }

        // Get OpenGL driver info
        Handle(OpenGl_GraphicDriver) aGlDriver =
            Handle(OpenGl_GraphicDriver)::DownCast(m_graphicDriver);

        if (!aGlDriver.IsNull()) {
            qDebug() << "OpenGL Graphics Driver detected";
            qDebug() << "Driver is valid and initialized";
        }
        else {
            qCritical() << "Failed to cast to OpenGL driver!";
            return false;
        }

        return true;
    }

    void TyrexViewerManager::initializeViewer(QWidget* glWidget)
    {
        if (!glWidget) {
            qCritical() << "Cannot initialize viewer without widget";
            return;
        }

        try {
            // Create display connection with debug info
            qDebug() << "Creating display connection...";
            Handle(Aspect_DisplayConnection) displayConnection = new Aspect_DisplayConnection();

            // Create graphics driver with enhanced options
            qDebug() << "Creating OpenGL graphics driver...";
            Handle(OpenGl_GraphicDriver) graphicDriver =
                new OpenGl_GraphicDriver(displayConnection, false);

            m_graphicDriver = graphicDriver;

            // Check driver status
            if (!checkGraphicsDriver()) {
                throw Standard_Failure("Graphics driver check failed");
            }

            // Create viewer
            m_viewer = new V3d_Viewer(m_graphicDriver);
            m_viewer->SetDefaultLights();
            m_viewer->SetLightOn();

            // Create view
            m_view = m_viewer->CreateView();

            // Enhanced window creation
#ifdef _WIN32
            // Wait until window is visible
            while (!glWidget->isVisible()) {
                QApplication::processEvents();
            }

            // Create window with proper handle
            HWND hwnd = reinterpret_cast<HWND>(glWidget->winId());
            m_window = new WNT_Window(hwnd);
#else
            // Linux/Mac implementation
            m_window = new Xw_Window(displayConnection, (Window)glWidget->winId());
#endif

            // Set window to view
            m_view->SetWindow(m_window);

            // Ensure window is mapped
            if (!m_window->IsMapped()) {
                m_window->Map();
            }

            // Process events to ensure stability
            QApplication::processEvents();

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
            m_view->Update();
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

    // NEW: التحقق من جاهزية View
    bool TyrexViewerManager::isViewReady() const
    {
        if (m_view.IsNull()) {
            return false;
        }

        if (m_view->Window().IsNull()) {
            return false;
        }

        if (!m_view->Window()->IsMapped()) {
            return false;
        }

        // التحقق من وجود كاميرا صالحة
        Handle(Graphic3d_Camera) camera = m_view->Camera();
        if (camera.IsNull() || camera.get() == nullptr) {
            return false;
        }

        return true;
    }

    // NEW: التأكد من جاهزية View مع محاولة إصلاح المشاكل
    bool TyrexViewerManager::ensureViewReady()
    {
        if (m_view.IsNull()) {
            qCritical() << "View is null - cannot ensure readiness";
            return false;
        }

        // التأكد من وجود نافذة
        if (m_view->Window().IsNull()) {
            qCritical() << "View window is null";
            return false;
        }

        // التأكد من أن النافذة مُعيّنة
        if (!m_view->Window()->IsMapped()) {
            qDebug() << "Mapping view window...";
            m_view->Window()->Map();

            // الانتظار قليلاً والمعالجة
            QThread::msleep(50);
            QApplication::processEvents();

            if (!m_view->Window()->IsMapped()) {
                qCritical() << "Failed to map window";
                return false;
            }
        }

        return ensureCameraReady();
    }

    // NEW: التأكد من جاهزية الكاميرا
    bool TyrexViewerManager::ensureCameraReady()
    {
        if (m_view.IsNull()) {
            return false;
        }

        try {
            // محاولة الحصول على الكاميرا
            Handle(Graphic3d_Camera) camera = m_view->Camera();

            // إذا كانت الكاميرا null، نحاول إنشاء واحدة جديدة
            if (camera.IsNull() || camera.get() == nullptr) {
                qDebug() << "Camera is null, attempting to create default camera...";

                // تحديث View و إعادة المحاولة
                m_view->Redraw();
                m_view->Update();
                QApplication::processEvents();

                // محاولة تعيين إسقاط افتراضي لإنشاء كاميرا
                m_view->SetProj(V3d_Zpos);

                // التحقق مرة أخرى
                camera = m_view->Camera();
                if (camera.IsNull()) {
                    qCritical() << "Failed to create camera";
                    return false;
                }

                qDebug() << "Camera created successfully";
            }

            return true;

        }
        catch (const Standard_Failure& ex) {
            qCritical() << "Exception while ensuring camera ready:" << ex.GetMessageString();
            return false;
        }
        catch (...) {
            qCritical() << "Unknown exception while ensuring camera ready";
            return false;
        }
    }

    // NEW: محاولة تطبيق وضع 2D
    bool TyrexViewerManager::attemptSet2DMode()
    {
        qDebug() << "Attempting to set 2D mode (attempt" << m_set2DModeRetryCount + 1 << ")";

        // التحقق من جاهزية View
        if (!ensureViewReady()) {
            qDebug() << "View not ready for 2D mode";
            return false;
        }

        try {
            // الحصول على الكاميرا مع التحقق الكامل
            Handle(Graphic3d_Camera) camera = m_view->Camera();

            if (camera.IsNull() || camera.get() == nullptr) {
                qCritical() << "Camera is invalid after ensureViewReady";
                return false;
            }

            // تعيين نوع الإسقاط
            m_is2DMode = true;
            camera->SetProjectionType(Graphic3d_Camera::Projection_Orthographic);

            // تعيين منظر علوي دقيق
            m_view->SetProj(V3d_Zpos);
            m_view->SetUp(0, 1, 0);
            m_view->SetTwist(0);

            // ضبط العرض للوضع 2D
            m_view->FitAll(0.01, Standard_False);
            m_view->SetZSize(1000.0);

            // إعادة الرسم
            m_view->Redraw();

            emit viewChanged();
            qDebug() << "Successfully switched to 2D mode";

            return true;

        }
        catch (const Standard_Failure& ex) {
            qCritical() << "Exception in attemptSet2DMode:" << ex.GetMessageString();
            m_is2DMode = false;
            return false;
        }
        catch (...) {
            qCritical() << "Unknown exception in attemptSet2DMode";
            m_is2DMode = false;
            return false;
        }
    }

    void TyrexViewerManager::set2DMode()
    {
        if (m_view.IsNull()) {
            qWarning() << "Cannot set 2D mode - view is null";
            return;
        }

        // إيقاف أي محاولات سابقة
        stopSet2DModeRetry();

        // محاولة مباشرة أولاً
        if (attemptSet2DMode()) {
            return;
        }

        // إذا فشلت، بدء آلية إعادة المحاولة
        qDebug() << "Starting 2D mode retry mechanism...";
        m_set2DModeRetryCount = 0;
        scheduleSet2DModeRetry();
    }

    // NEW: جدولة إعادة المحاولة
    void TyrexViewerManager::scheduleSet2DModeRetry()
    {
        if (!m_set2DModeRetryTimer->isActive()) {
            m_set2DModeRetryTimer->start();
        }
    }

    // NEW: إيقاف إعادة المحاولة
    void TyrexViewerManager::stopSet2DModeRetry()
    {
        if (m_set2DModeRetryTimer->isActive()) {
            m_set2DModeRetryTimer->stop();
        }
        m_set2DModeRetryCount = 0;
    }

    void TyrexViewerManager::set3DMode()
    {
        if (m_view.IsNull()) {
            return;
        }

        // إيقاف أي محاولات لوضع 2D
        stopSet2DModeRetry();

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

            // Default zoom behavior
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