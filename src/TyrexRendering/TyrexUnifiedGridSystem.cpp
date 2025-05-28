#include "TyrexRendering/TyrexUnifiedGridSystem.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"
#include "TyrexRendering/TyrexGridOverlayRenderer.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include <QDebug>

namespace TyrexCAD {

    TyrexUnifiedGridSystem::TyrexUnifiedGridSystem(QObject* parent)
        : QObject(parent)
        , m_isActive(true)
        , m_initialized(false)
        , m_gridLayerId(-1)
    {
        // Initialize with default configuration
        m_config = GridConfig::darkTheme();
    }

    TyrexUnifiedGridSystem::~TyrexUnifiedGridSystem() = default;

    bool TyrexUnifiedGridSystem::initialize(std::shared_ptr<TyrexViewerManager> viewerManager,
        int gridLayerId)
    {
        if (m_initialized) {
            return true;
        }

        if (!viewerManager || viewerManager->context().IsNull() || viewerManager->view().IsNull()) {
            qCritical() << "Cannot initialize unified grid - invalid viewer manager";
            return false;
        }

        m_viewerManager = viewerManager;
        m_gridLayerId = gridLayerId;

        try {
            // Create canvas overlay for logic
            m_overlay = std::make_unique<TyrexCanvasOverlay>(
                m_viewerManager->context(),
                m_viewerManager->view(),
                this
            );

            // Create grid renderer for OpenGL rendering
            m_renderer = std::make_unique<TyrexGridOverlayRenderer>();

            // Initialize renderer
            if (!m_renderer->initialize()) {
                qCritical() << "Failed to initialize grid renderer";
                return false;
            }

            // Set initial configuration
            m_overlay->setGridConfig(m_config);
            m_renderer->setGridConfig(m_config);

            // Set view for renderer
            m_renderer->setView(m_viewerManager->view());

            // Connect signals
            connectSignals();

            // Initial synchronization
            synchronizeState();

            m_initialized = true;
            qDebug() << "Unified grid system initialized successfully";

            return true;

        }
        catch (const std::exception& e) {
            qCritical() << "Exception initializing unified grid:" << e.what();
            return false;
        }
    }

    void TyrexUnifiedGridSystem::render(int viewportWidth, int viewportHeight, const QPoint& cursorPos)
    {
        if (!m_initialized || !m_isActive || !m_renderer) {
            return;
        }

        // Ensure synchronization before rendering
        synchronizeState();

        // Render using OpenGL renderer
        m_renderer->render(viewportWidth, viewportHeight, cursorPos);
    }

    void TyrexUnifiedGridSystem::update()
    {
        if (!m_initialized) {
            return;
        }

        // Update overlay
        if (m_overlay) {
            m_overlay->update();
        }

        // Synchronize state
        synchronizeState();
    }

    void TyrexUnifiedGridSystem::forceRedraw()
    {
        if (!m_initialized) {
            return;
        }

        // Force update in overlay
        if (m_overlay) {
            m_overlay->forceUpdate();
        }

        // Mark renderer as needing update
        synchronizeState();

        // Request redraw from viewer
        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            m_viewerManager->redraw();
        }
    }

    void TyrexUnifiedGridSystem::synchronizeState()
    {
        if (!m_overlay || !m_renderer) {
            return;
        }

        // Get current configuration from overlay
        const GridConfig& overlayConfig = m_overlay->getGridConfig();

        // Update renderer configuration
        m_renderer->setGridConfig(overlayConfig);

        // Synchronize visibility
        m_renderer->setGridEnabled(m_overlay->isGridVisible());

        // Ensure view is synchronized
        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            m_renderer->setView(m_viewerManager->view());
        }

        // Synchronize current spacing
        double currentSpacing = m_overlay->getCurrentGridSpacing();
        // Note: TyrexGridOverlayRenderer calculates its own spacing,
        // but we ensure consistency through the config
    }

    void TyrexUnifiedGridSystem::connectSignals()
    {
        if (!m_overlay) {
            return;
        }

        // Connect overlay signals to our signals
        connect(m_overlay.get(), &TyrexCanvasOverlay::gridSpacingChanged,
            this, &TyrexUnifiedGridSystem::onSpacingChanged);

        connect(m_overlay.get(), &TyrexCanvasOverlay::gridConfigChanged,
            this, &TyrexUnifiedGridSystem::onOverlayConfigChanged);
    }

    void TyrexUnifiedGridSystem::onOverlayConfigChanged()
    {
        // Synchronize when configuration changes
        synchronizeState();

        // Emit our signal
        emit gridConfigChanged();
    }

    void TyrexUnifiedGridSystem::onSpacingChanged(double spacing)
    {
        // Emit our signal
        emit gridSpacingChanged(spacing);
    }

    void TyrexUnifiedGridSystem::setGridVisible(bool visible)
    {
        m_isActive = visible;

        if (m_overlay) {
            m_overlay->setGridVisible(visible);
        }

        if (m_renderer) {
            m_renderer->setGridEnabled(visible);
        }

        emit gridVisibilityChanged(visible);
    }

    bool TyrexUnifiedGridSystem::isGridVisible() const
    {
        return m_isActive && m_overlay && m_overlay->isGridVisible();
    }

    void TyrexUnifiedGridSystem::setGridConfig(const GridConfig& config)
    {
        m_config = config;

        if (m_overlay) {
            m_overlay->setGridConfig(config);
        }

        synchronizeState();
    }

    const GridConfig& TyrexUnifiedGridSystem::getGridConfig() const
    {
        if (m_overlay) {
            return m_overlay->getGridConfig();
        }
        return m_config;
    }

    void TyrexUnifiedGridSystem::setGridStyle(GridStyle style)
    {
        if (m_overlay) {
            m_overlay->setGridStyle(style);
        }

        synchronizeState();
    }

    GridStyle TyrexUnifiedGridSystem::getGridStyle() const
    {
        if (m_overlay) {
            return m_overlay->getGridStyle();
        }
        return m_config.style;
    }

    void TyrexUnifiedGridSystem::setGridSpacing(double spacing)
    {
        if (m_overlay) {
            m_overlay->setGridSpacing(spacing);
        }

        synchronizeState();
    }

    double TyrexUnifiedGridSystem::getCurrentGridSpacing() const
    {
        if (m_overlay) {
            return m_overlay->getCurrentGridSpacing();
        }

        if (m_renderer) {
            return m_renderer->getCurrentGridSpacing();
        }

        return m_config.baseSpacing;
    }

    void TyrexUnifiedGridSystem::setSnapEnabled(bool enabled)
    {
        if (m_overlay) {
            m_overlay->setSnapEnabled(enabled);
        }

        m_config.snapEnabled = enabled;
    }

    bool TyrexUnifiedGridSystem::isSnapEnabled() const
    {
        return m_config.snapEnabled;
    }

    gp_Pnt2d TyrexUnifiedGridSystem::screenToWorld(const QPoint& screenPos) const
    {
        if (m_overlay) {
            return m_overlay->screenToWorld(screenPos);
        }

        // Fallback
        return gp_Pnt2d(screenPos.x(), screenPos.y());
    }

    gp_Pnt2d TyrexUnifiedGridSystem::snapToGrid(const gp_Pnt2d& point) const
    {
        if (m_overlay) {
            return m_overlay->snapToGrid(point);
        }

        // Fallback manual implementation
        if (!m_config.snapEnabled) {
            return point;
        }

        double spacing = getCurrentGridSpacing();
        double snappedX = std::round(point.X() / spacing) * spacing;
        double snappedY = std::round(point.Y() / spacing) * spacing;

        return gp_Pnt2d(snappedX, snappedY);
    }

    TyrexCanvasOverlay* TyrexUnifiedGridSystem::overlay() const
    {
        return m_overlay.get();
    }

    TyrexGridOverlayRenderer* TyrexUnifiedGridSystem::renderer() const
    {
        return m_renderer.get();
    }

    void TyrexUnifiedGridSystem::debugState() const
    {
        qDebug() << "=== Unified Grid System State ===";
        qDebug() << "Initialized:" << m_initialized;
        qDebug() << "Active:" << m_isActive;
        qDebug() << "Grid Layer ID:" << m_gridLayerId;

        if (m_overlay) {
            qDebug() << "Overlay: Grid visible:" << m_overlay->isGridVisible();
            qDebug() << "Overlay: Current spacing:" << m_overlay->getCurrentGridSpacing();
            m_overlay->debugGridState();
        }
        else {
            qDebug() << "Overlay: Not created";
        }

        if (m_renderer) {
            qDebug() << "Renderer: Grid enabled:" << m_renderer->isGridEnabled();
            qDebug() << "Renderer: Current spacing:" << m_renderer->getCurrentGridSpacing();
        }
        else {
            qDebug() << "Renderer: Not created";
        }

        qDebug() << "=================================";
    }

} // namespace TyrexCAD