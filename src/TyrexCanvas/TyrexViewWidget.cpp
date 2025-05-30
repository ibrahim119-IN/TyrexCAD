/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"
#include "TyrexRendering/TyrexGridOverlayRenderer.h"
#include "TyrexCore/UpdateManager.h"

#include <QDebug>
#include <QPaintEvent>
#include <QResizeEvent>
#include <QMouseEvent>
#include <QWheelEvent>
#include <QApplication>
#include <QOpenGLContext>
#include <chrono>

namespace TyrexCAD {

    TyrexViewWidget::TyrexViewWidget(QWidget* parent)
        : QWidget(parent)
        , m_gridInitialized(false)
        , m_cursorInWidget(false)
        , m_useOpenGLGrid(true)  // Use optimized OpenGL grid by default
        , m_needsResize(false)
        , m_debugMode(false)
        , m_paintEventCount(0)
        , m_lastPaintTime(0)
        , m_updatePending(false)
        , m_openGLContextReady(false)
    {
        // Set widget attributes for OpenCascade
        setAttribute(Qt::WA_OpaquePaintEvent);
        setAttribute(Qt::WA_PaintOnScreen);
        setAttribute(Qt::WA_NoSystemBackground);
        setAttribute(Qt::WA_NativeWindow);

        // Set focus policy
        setFocusPolicy(Qt::StrongFocus);

        // Enable mouse tracking
        setMouseTracking(true);

        // Create update manager for controlled updates
        m_updateManager = std::make_unique<UpdateManager>(this, 60);  // 60 FPS target

        connect(m_updateManager.get(), &UpdateManager::updateRequested,
            this, &TyrexViewWidget::performUpdate);

        // Initialize after widget is ready
        QTimer::singleShot(100, this, &TyrexViewWidget::initialize);
    }

    TyrexViewWidget::~TyrexViewWidget() = default;

    void TyrexViewWidget::initialize()
    {
        qDebug() << "Initializing TyrexViewWidget...";

        // Create viewer manager
        m_viewerManager = std::make_shared<TyrexViewerManager>(this);

        // Initialize viewer with this widget
        m_viewerManager->initializeViewer(this);

        // Initialize overlay systems (but NOT the grid renderer yet)
        initializeOverlay();

        // Signal that viewer is initialized
        emit viewerInitialized();

        // Now check if OpenGL context is ready
        ensureOpenGLContext();
    }

    void TyrexViewWidget::ensureOpenGLContext()
    {
        qDebug() << "=== Checking OpenGL Context Readiness ===";

        // Since we're using WA_PaintOnScreen with OpenCascade, 
        // we need to check if OCCT's context is ready
        if (!m_viewerManager || m_viewerManager->view().IsNull()) {
            qDebug() << "View not ready, scheduling retry...";
            QTimer::singleShot(100, this, &TyrexViewWidget::ensureOpenGLContext);
            return;
        }

        // For OpenCascade, we need to ensure the window is mapped and ready
        auto view = m_viewerManager->view();
        if (view->Window().IsNull() || !view->Window()->IsMapped()) {
            qDebug() << "OCCT window not mapped yet, scheduling retry...";
            QTimer::singleShot(100, this, &TyrexViewWidget::ensureOpenGLContext);
            return;
        }

        // CRITICAL: We need to defer grid initialization to paintEvent
        // where OpenCascade's context will be current
        qDebug() << "OCCT window is mapped, deferring grid init to first paint...";
        m_openGLContextReady = true;

        // Don't initialize grid renderer here - wait for paintEvent
        // when OpenCascade's context is guaranteed to be current
    }

    void TyrexViewWidget::initializeOverlay()
    {
        if (!m_viewerManager || m_viewerManager->view().IsNull()) {
            qWarning() << "Cannot initialize overlay - viewer not ready";
            return;
        }

        // Create pure geometry computation overlay
        m_canvasOverlay = std::make_shared<TyrexCanvasOverlay>(
            m_viewerManager->view(),
            this
        );

        // Connect signals
        connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridSpacingChanged,
            this, &TyrexViewWidget::gridSpacingChanged);

        connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridConfigChanged,
            this, [this]() {
                emit gridConfigChanged(m_canvasOverlay->getGridConfig());
            });

        connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridDataChanged,
            this, [this]() {
                // Request update when grid data changes
                requestUpdate(UpdateManager::Priority::Normal);
            });

        // Set default configuration
        GridConfig config = GridConfig::darkTheme();
        config.showAxes = true;
        config.showOriginMarker = true;
        config.adaptiveSpacing = true;
        config.snapEnabled = false;
        m_canvasOverlay->setGridConfig(config);
    }

    void TyrexViewWidget::requestUpdate(UpdateManager::Priority priority)
    {
        if (!m_updateManager) {
            update();  // Fallback
            return;
        }

        m_updatePending = true;
        m_updateManager->requestUpdate(priority);
    }

    void TyrexViewWidget::performUpdate()
    {
        if (m_needsResize && m_viewerManager) {
            m_viewerManager->resizeViewer(width(), height());
            m_needsResize = false;
        }

        m_updatePending = false;
        update();
    }

    void TyrexViewWidget::paintEvent(QPaintEvent* event)
    {
        // Track frame timing for performance monitoring
        auto now = std::chrono::steady_clock::now();
        auto currentTime = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()).count();

        if (m_debugMode && m_lastPaintTime > 0) {
            auto deltaTime = currentTime - m_lastPaintTime;
            if (deltaTime > 33) {  // More than 33ms = less than 30 FPS
                qDebug() << "Slow frame detected:" << deltaTime << "ms";
            }
        }
        m_lastPaintTime = currentTime;

        // Redraw OpenCascade view - this makes OCCT's OpenGL context current
        if (m_viewerManager) {
            m_viewerManager->redraw();
        }

        // Initialize grid renderer after OCCT redraw when its context is current
        if (m_openGLContextReady && !m_gridInitialized && !m_gridRenderer) {
            qDebug() << "Initializing grid renderer with OCCT context current...";

            m_gridRenderer = std::make_unique<TyrexGridOverlayRenderer>();

            if (m_gridRenderer->initialize()) {
                m_gridRenderer->setView(m_viewerManager->view());
                m_gridRenderer->setGridEnabled(true);
                m_gridInitialized = true;

                qDebug() << "Grid renderer initialized successfully!";
                emit glContextInitializedAndCurrent();
            }
            else {
                qCritical() << "Failed to initialize grid renderer!";
                m_gridRenderer.reset();
                m_openGLContextReady = false;
            }
        }

        // Draw OpenGL overlay if ready - OCCT context is still current
        if (m_useOpenGLGrid && m_gridRenderer && m_canvasOverlay && m_gridInitialized) {
            m_gridRenderer->renderFromOverlay(m_canvasOverlay.get(),
                width(), height(),
                m_currentCursorPos);
        }
    }

    void TyrexViewWidget::resizeEvent(QResizeEvent* event)
    {
        if (m_viewerManager) {
            // Schedule resize for next update
            m_needsResize = true;
            requestUpdate(UpdateManager::Priority::High);
        }

        QWidget::resizeEvent(event);
    }

    void TyrexViewWidget::mousePressEvent(QMouseEvent* event)
    {
        if (m_viewerManager) {
            m_viewerManager->mousePress(event);
        }
    }

    void TyrexViewWidget::mouseMoveEvent(QMouseEvent* event)
    {
        m_currentCursorPos = event->pos();

        if (m_viewerManager) {
            m_viewerManager->mouseMove(event);
        }

        // Update cursor world position
        if (m_canvasOverlay) {
            gp_Pnt2d worldPos = m_canvasOverlay->screenToWorld(event->pos());
            emit cursorWorldPosition(worldPos.X(), worldPos.Y());
        }

        // Request low-priority update for cursor display
        if (m_useOpenGLGrid && m_gridRenderer) {
            requestUpdate(UpdateManager::Priority::Low);
        }
    }

    void TyrexViewWidget::mouseReleaseEvent(QMouseEvent* event)
    {
        if (m_viewerManager) {
            m_viewerManager->mouseRelease(event);
        }
    }

    void TyrexViewWidget::wheelEvent(QWheelEvent* event)
    {
        if (m_viewerManager) {
            m_viewerManager->mouseWheel(event);
        }

        // Update grid after zoom
        if (m_canvasOverlay) {
            m_canvasOverlay->updateViewParameters();
            requestUpdate(UpdateManager::Priority::Normal);
        }
    }

#if QT_VERSION >= QT_VERSION_CHECK(6, 0, 0)
    void TyrexViewWidget::enterEvent(QEnterEvent* event)
#else
    void TyrexViewWidget::enterEvent(QEvent* event)
#endif
    {
        m_cursorInWidget = true;
        QWidget::enterEvent(event);
    }

    void TyrexViewWidget::leaveEvent(QEvent* event)
    {
        m_cursorInWidget = false;
        QWidget::leaveEvent(event);
    }

    std::shared_ptr<TyrexViewerManager> TyrexViewWidget::viewerManager() const
    {
        return m_viewerManager;
    }

    std::shared_ptr<TyrexCanvasOverlay> TyrexViewWidget::canvasOverlay() const
    {
        return m_canvasOverlay;
    }

    void TyrexViewWidget::setGridEnabled(bool enabled)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridVisible(enabled);
        }

        if (m_gridRenderer) {
            m_gridRenderer->setGridEnabled(enabled);
        }

        requestUpdate(UpdateManager::Priority::Normal);
    }

    void TyrexViewWidget::setAxisVisible(bool visible)
    {
        if (m_canvasOverlay) {
            GridConfig config = m_canvasOverlay->getGridConfig();
            config.showAxes = visible;
            m_canvasOverlay->setGridConfig(config);
        }
    }

    void TyrexViewWidget::setGridStyle(GridStyle style)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridStyle(style);
        }

        if (m_gridRenderer) {
            m_gridRenderer->setGridStyle(style);
        }
    }

    void TyrexViewWidget::setGridSpacing(double spacing)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridSpacing(spacing);
        }
    }

    void TyrexViewWidget::setSnapToGrid(bool enabled)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setSnapEnabled(enabled);
            emit snapToGridChanged(enabled);
        }
    }

    void TyrexViewWidget::setSketchModeGrid(bool enabled)
    {
        if (m_canvasOverlay) {
            GridConfig config;
            if (enabled) {
                // Sketch mode settings
                config = GridConfig::autocadStyle();
                config.style = GridStyle::Lines;
                config.showAxes = true;
                config.showOriginMarker = true;
                config.snapEnabled = true;
            }
            else {
                // 3D mode settings
                config = GridConfig::darkTheme();
                config.snapEnabled = false;
            }
            m_canvasOverlay->setGridConfig(config);
        }
    }

    void TyrexViewWidget::refreshGrid()
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->forceUpdate();
            requestUpdate(UpdateManager::Priority::Immediate);
        }
    }

    void TyrexViewWidget::debugGridState()
    {
        qDebug() << "=== TyrexViewWidget Grid State ===";
        qDebug() << "Grid initialized:" << m_gridInitialized;
        qDebug() << "Using OpenGL grid:" << m_useOpenGLGrid;
        qDebug() << "Update pending:" << m_updatePending;
        qDebug() << "OpenGL context ready:" << m_openGLContextReady;

        if (m_canvasOverlay) {
            qDebug() << "Overlay present - Grid visible:" << m_canvasOverlay->isGridVisible();
            qDebug() << "Current spacing:" << m_canvasOverlay->getCurrentGridSpacing();
        }

        if (m_gridRenderer) {
            qDebug() << "Renderer present - Grid enabled:" << m_gridRenderer->isGridEnabled();
        }
    }

    void TyrexViewWidget::enableDebugMode(bool enable)
    {
        m_debugMode = enable;
        if (enable) {
            qDebug() << "TyrexViewWidget debug mode enabled";
        }
    }

} // namespace TyrexCAD