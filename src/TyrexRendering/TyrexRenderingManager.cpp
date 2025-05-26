#include "TyrexRendering/TyrexRenderingManager.h"
#include <QDebug>
#include <Aspect_Window.hxx> // Include this to define Aspect_Handle
#include <Aspect_Handle.hxx> // Add this include to define Aspect_Handle
#include <WNT_Window.hxx>    // Ensure this include is present for WNT_Window
#include <AIS_InteractiveContext.hxx> // Add this include to resolve the incomplete type error
#include <V3d_Viewer.hxx>
#include <V3d_View.hxx>
#include <OpenGl_GraphicDriver.hxx>
#include <OpenGl_Window.hxx>
#include <Standard_Failure.hxx>
#include <QWidget> // Add this include to resolve the incomplete type error
namespace TyrexCAD {

    // ==================== TyrexRenderingManager ====================

    TyrexRenderingManager::TyrexRenderingManager(QObject* parent)
        : QObject(parent)
        , m_initialized(false)
        , m_gridEnabled(true)
        , m_viewportWidth(800)
        
        , m_viewportHeight(600)
    {
        m_updateManager = std::make_unique<UpdateManager>(this);
        connect(m_updateManager.get(), &UpdateManager::updateRequested,
            this, &TyrexRenderingManager::performRender);
    }

    TyrexRenderingManager::~TyrexRenderingManager() = default;

    bool TyrexRenderingManager::initialize(QWidget* glWidget)
    {
        if (m_initialized) {
            return true;
        }

        // Initialize OpenCascade renderer
        m_occRenderer = std::make_unique<OpenCascadeRenderer>();
        if (!m_occRenderer->initialize(glWidget)) {
            qCritical() << "Failed to initialize OpenCascade renderer";
            return false;
        }

        // Initialize overlay renderer
        m_overlayRenderer = std::make_unique<OpenGLOverlayRenderer>();
        if (!m_overlayRenderer->initialize()) {
            qCritical() << "Failed to initialize overlay renderer";
            return false;
        }

        // Initialize grid renderer
        m_gridRenderer = std::make_unique<GridRenderer>();
        if (!m_gridRenderer->initialize()) {
            qCritical() << "Failed to initialize grid renderer";
            return false;
        }

        m_initialized = true;
        return true;
    }

    void TyrexRenderingManager::render()
    {
        if (!m_initialized) {
            return;
        }

        // Render OpenCascade content
        if (m_occRenderer) {
            m_occRenderer->render();
        }

        // Render grid if enabled
        if (m_gridEnabled && m_gridRenderer && m_occRenderer) {
            m_gridRenderer->render(m_viewportWidth, m_viewportHeight, m_occRenderer->view());
        }

        // Render overlay
        if (m_overlayRenderer && m_overlayRenderer->isOverlayEnabled()) {
            m_overlayRenderer->render(m_viewportWidth, m_viewportHeight);
        }

        emit renderComplete();
    }

    void TyrexRenderingManager::resizeViewport(int width, int height)
    {
        m_viewportWidth = width;
        m_viewportHeight = height;

        if (m_occRenderer) {
            m_occRenderer->resize(width, height);
        }

        emit viewportResized(width, height);
    }

    void TyrexRenderingManager::setGridEnabled(bool enabled)
    {
        if (m_gridEnabled != enabled) {
            m_gridEnabled = enabled;
            updateGridVisibility(enabled);
        }
    }

    void TyrexRenderingManager::requestUpdate(UpdateManager::Priority priority)
    {
        if (m_updateManager) {
            m_updateManager->requestUpdate(priority);
        }
    }

    void TyrexRenderingManager::performRender()
    {
        render();
    }

    void TyrexRenderingManager::updateGridVisibility(bool enabled)
    {
        if (m_gridRenderer) {
            m_gridRenderer->setEnabled(enabled);
        }
        onGridVisibilityChanged(enabled);
    }

    void TyrexRenderingManager::onGridVisibilityChanged(bool enabled)
    {
        emit gridVisibilityChanged(enabled);
        handleGridVisibilityChanged(enabled);
    }

    void TyrexRenderingManager::handleGridVisibilityChanged(bool enabled)
    {
        // Request redraw when grid visibility changes
        requestUpdate(UpdateManager::Priority::Normal);
        qDebug() << "Grid visibility changed to:" << enabled;
    }

    // ==================== OpenCascadeRenderer ====================

    OpenCascadeRenderer::OpenCascadeRenderer() = default;

    OpenCascadeRenderer::~OpenCascadeRenderer() = default;

    bool OpenCascadeRenderer::initialize(QWidget* glWidget)
    {
        try {
            // Create graphic driver
            Handle(Aspect_DisplayConnection) displayConnection = new Aspect_DisplayConnection();
            m_graphicDriver = new OpenGl_GraphicDriver(displayConnection);

            // Create viewer
            m_viewer = new V3d_Viewer(m_graphicDriver);
            m_viewer->SetDefaultLights();
            m_viewer->SetLightOn();

            // Create view
            m_view = m_viewer->CreateView();

            // Create window
#ifdef _WIN32
            m_window = new WNT_Window((Aspect_Handle)glWidget->winId());
            
#else
            // Add platform-specific implementation for Linux/Mac if needed
            // m_window = new Xw_Window(displayConnection, (Window)glWidget->winId());
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

            return true;
        }
        catch (const Standard_Failure& e) {
            qCritical() << "OpenCascade initialization failed:" << e.GetMessageString();
            return false;
        }
    }

    void OpenCascadeRenderer::render()
    {
        if (!m_view.IsNull()) {
            m_view->Redraw();
        }
    }

    void OpenCascadeRenderer::resize(int width, int height)
    {
        if (!m_view.IsNull() && !m_window.IsNull()) {
            m_window->DoResize();
            m_view->MustBeResized();
            m_view->Invalidate();
        }
    }

    // ==================== OpenGLOverlayRenderer ====================

    OpenGLOverlayRenderer::OpenGLOverlayRenderer()
        : m_initialized(false)
        , m_enabled(true)
    {
    }

    OpenGLOverlayRenderer::~OpenGLOverlayRenderer() = default;

    bool OpenGLOverlayRenderer::initialize()
    {
        // Initialize overlay rendering resources
        m_initialized = true;
        return true;
    }

    void OpenGLOverlayRenderer::render(int width, int height)
    {
        if (!m_initialized || !m_enabled) {
            return;
        }

        // Overlay rendering implementation would go here
        Q_UNUSED(width);
        Q_UNUSED(height);
    }

    void OpenGLOverlayRenderer::cleanup()
    {
        // Cleanup resources
        m_initialized = false;
    }

    // ==================== GridRenderer ====================

    GridRenderer::GridRenderer()
        : m_initialized(false)
        , m_enabled(true)
    {
    }

    GridRenderer::~GridRenderer() = default;

    bool GridRenderer::initialize()
    {
        m_gridImpl = std::make_unique<TyrexGridOverlayRenderer>();
        m_initialized = m_gridImpl->initialize();
        return m_initialized;
    }

    void GridRenderer::render(int width, int height, const Handle(V3d_View)& view)
    {
        if (!m_initialized || !m_enabled || !m_gridImpl) {
            return;
        }

        m_gridImpl->setView(view);
        m_gridImpl->setGridConfig(m_config);
        m_gridImpl->setGridEnabled(true);
        m_gridImpl->render(width, height);
    }

    void GridRenderer::cleanup()
    {
        if (m_gridImpl) {
            m_gridImpl->cleanup();
        }
        m_initialized = false;
    }

    void GridRenderer::setGridConfig(const GridConfig& config)
    {
        m_config = config;
        if (m_gridImpl) {
            m_gridImpl->setGridConfig(config);
        }
    }

} // namespace TyrexCAD