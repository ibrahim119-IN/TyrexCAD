/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexRendering/TyrexUnifiedGridSystem.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"
#include "TyrexRendering/TyrexGridOverlayRenderer.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexCore/UpdateManager.h"
#include <QDebug>

namespace TyrexCAD {

    TyrexUnifiedGridSystem::TyrexUnifiedGridSystem(QObject* parent)
        : QObject(parent)
        , m_isActive(true)
        , m_initialized(false)
        , m_gridLayerId(-1)
        , m_pendingUpdate(false)
    {
        m_config = GridConfig::darkTheme();
        m_updateManager = std::make_unique<UpdateManager>(this);

        connect(m_updateManager.get(), &UpdateManager::updateRequested,
            this, &TyrexUnifiedGridSystem::performUpdate);
    }

    TyrexUnifiedGridSystem::~TyrexUnifiedGridSystem() = default;

    bool TyrexUnifiedGridSystem::initialize(std::shared_ptr<TyrexViewerManager> viewerManager,
        int gridLayerId)
    {
        if (m_initialized) {
            return true;
        }

        if (!viewerManager || viewerManager->view().IsNull()) {
            qCritical() << "Cannot initialize unified grid - invalid viewer manager";
            return false;
        }

        m_viewerManager = viewerManager;
        m_gridLayerId = gridLayerId;

        try {
            // Create pure geometry computation overlay
            m_overlay = std::make_unique<TyrexCanvasOverlay>(
                m_viewerManager->view(),
                this
            );

            // Create OpenGL renderer
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

            // Initial update
            m_overlay->updateViewParameters();

            m_initialized = true;
            qDebug() << "Unified grid system initialized successfully";

            return true;
        }
        catch (const std::exception& e) {
            qCritical() << "Exception initializing unified grid:" << e.what();
            return false;
        }
    }

    void TyrexUnifiedGridSystem::render(int viewportWidth, int viewportHeight,
        const QPoint& cursorPos)
    {
        if (!m_initialized || !m_isActive || !m_renderer || !m_overlay) {
            return;
        }

        // Update view parameters if needed
        if (m_pendingUpdate) {
            m_overlay->updateViewParameters();
            m_pendingUpdate = false;
        }

        // Render using optimized renderer with overlay data
        m_renderer->renderFromOverlay(m_overlay.get(), viewportWidth, viewportHeight, cursorPos);
    }

    void TyrexUnifiedGridSystem::update()
    {
        if (!m_initialized) {
            return;
        }

        // Request update through update manager to batch requests
        m_updateManager->requestUpdate(UpdateManager::Priority::Normal);
    }

    void TyrexUnifiedGridSystem::forceRedraw()
    {
        if (!m_initialized) {
            return;
        }

        // Force immediate update
        if (m_overlay) {
            m_overlay->forceUpdate();
        }

        // Request immediate redraw
        m_updateManager->requestUpdate(UpdateManager::Priority::Immediate);

        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            m_viewerManager->redraw();
        }
    }

    void TyrexUnifiedGridSystem::performUpdate()
    {
        if (!m_overlay) {
            return;
        }

        // Update overlay view parameters
        m_overlay->updateViewParameters();
        m_pendingUpdate = false;

        // Request redraw from viewer
        if (m_viewerManager) {
            m_viewerManager->redraw();
        }
    }

    void TyrexUnifiedGridSystem::connectSignals()
    {
        if (!m_overlay) {
            return;
        }

        // Connect overlay signals
        connect(m_overlay.get(), &TyrexCanvasOverlay::gridSpacingChanged,
            this, &TyrexUnifiedGridSystem::onSpacingChanged);

        connect(m_overlay.get(), &TyrexCanvasOverlay::gridConfigChanged,
            this, &TyrexUnifiedGridSystem::onOverlayConfigChanged);

        connect(m_overlay.get(), &TyrexCanvasOverlay::gridDataChanged,
            this, [this]() {
                // Schedule update when grid data changes
                m_updateManager->requestUpdate(UpdateManager::Priority::Normal);
            });
    }

    void TyrexUnifiedGridSystem::onOverlayConfigChanged()
    {
        // Update renderer configuration
        if (m_renderer && m_overlay) {
            m_renderer->setGridConfig(m_overlay->getGridConfig());
        }

        emit gridConfigChanged();
    }

    void TyrexUnifiedGridSystem::onSpacingChanged(double spacing)
    {
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
        update();
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

        if (m_renderer) {
            m_renderer->setGridConfig(config);
        }

        update();
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

        if (m_renderer) {
            m_renderer->setGridStyle(style);
        }

        update();
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

        update();
    }

    double TyrexUnifiedGridSystem::getCurrentGridSpacing() const
    {
        if (m_overlay) {
            return m_overlay->getCurrentGridSpacing();
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
        return gp_Pnt2d(screenPos.x(), screenPos.y());
    }

    gp_Pnt2d TyrexUnifiedGridSystem::snapToGrid(const gp_Pnt2d& point) const
    {
        if (m_overlay) {
            return m_overlay->snapToGrid(point);
        }

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
        qDebug() << "Pending Update:" << m_pendingUpdate;

        if (m_overlay) {
            qDebug() << "Overlay: Grid visible:" << m_overlay->isGridVisible();
            qDebug() << "Overlay: Current spacing:" << m_overlay->getCurrentGridSpacing();
            qDebug() << "Overlay: Grid levels:" << m_overlay->getGridLevels().size();
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