#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"
#include "TyrexRendering/TyrexGridOverlayRenderer.h"

#include <QDebug>
#include <QPaintEvent>
#include <QResizeEvent>
#include <QMouseEvent>
#include <QWheelEvent>
#include <QApplication>

namespace TyrexCAD {

    TyrexViewWidget::TyrexViewWidget(QWidget* parent)
        : QWidget(parent),
        m_gridInitialized(false),
        m_cursorInWidget(false),
        m_useOpenGLGrid(false),
        m_needsResize(false),
        m_debugMode(false),
        m_paintEventCount(0)
    {
        // Set widget attributes
        setAttribute(Qt::WA_OpaquePaintEvent);
        setAttribute(Qt::WA_PaintOnScreen);
        setAttribute(Qt::WA_NoSystemBackground);
        setAttribute(Qt::WA_NativeWindow);

        // Set focus policy
        setFocusPolicy(Qt::StrongFocus);

        // Enable mouse tracking
        setMouseTracking(true);

        // Create update timer
        m_updateTimer = new QTimer(this);
        m_updateTimer->setInterval(16); // ~60 FPS
        connect(m_updateTimer, &QTimer::timeout, this, [this]() {
            if (m_needsResize && m_viewerManager) {
                m_viewerManager->resizeViewer(width(), height());
                m_needsResize = false;
            }
            update();
            });
        m_updateTimer->start();

        // Initialize after widget is ready
        QTimer::singleShot(100, this, &TyrexViewWidget::initialize);
    }

    TyrexViewWidget::~TyrexViewWidget()
    {
        if (m_updateTimer) {
            m_updateTimer->stop();
        }
    }

    void TyrexViewWidget::initialize()
    {
        qDebug() << "Initializing TyrexViewWidget...";

        // Create viewer manager
        m_viewerManager = std::make_shared<TyrexViewerManager>(this);

        // Initialize viewer with this widget
        m_viewerManager->initializeViewer(this);

        // Initialize overlay systems
        initializeOverlay();

        // Create grid renderer if using OpenGL grid
        if (m_useOpenGLGrid) {
            m_gridRenderer = std::make_unique<TyrexGridOverlayRenderer>();
            if (m_gridRenderer->initialize()) {
                m_gridRenderer->setView(m_viewerManager->view());
                m_gridRenderer->setGridEnabled(true);
            }
        }

        m_gridInitialized = true;

        qDebug() << "Canvas overlay initialized and grid enabled";
        emit viewerInitialized();
    }

    void TyrexViewWidget::initializeOverlay()
    {
        if (!m_viewerManager || m_viewerManager->view().IsNull()) {
            qWarning() << "Cannot initialize overlay - viewer not ready";
            return;
        }

        m_canvasOverlay = std::make_shared<TyrexCanvasOverlay>(
            m_viewerManager->context(),
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

        // Set default configuration
        GridConfig config = m_canvasOverlay->getGridConfig();
        config.showAxes = true;
        config.showOriginMarker = true;
        config.adaptiveSpacing = true;
        config.snapEnabled = false;
        m_canvasOverlay->setGridConfig(config);
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
    }

    void TyrexViewWidget::setAxisVisible(bool visible)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setAxisVisible(visible);
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
            // Configure grid for sketch mode
            GridConfig config = m_canvasOverlay->getGridConfig();
            if (enabled) {
                // Sketch mode settings
                config.backgroundColor = Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB);
                config.gridColorMajor = Quantity_Color(0.4, 0.4, 0.4, Quantity_TOC_RGB);
                config.gridColorMinor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
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
        }
    }

    void TyrexViewWidget::debugGridState()
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->debugGridState();
        }
    }

    void TyrexViewWidget::paintEvent(QPaintEvent* event)
    {
        // تعليق رسائل debug المزعجة
        /*
        if (m_debugMode) {
            m_paintEventCount++;
            if (m_paintEventCount % 10 == 0) {
                qint64 elapsed = m_paintTimer.elapsed();
                if (elapsed > 0) {
                    double fps = 10000.0 / elapsed;
                    qDebug() << "Paint event #" << m_paintEventCount
                             << "at" << elapsed << "ms"
                             << "(" << fps << "FPS)";
                }
                m_paintTimer.restart();
            }
        }
        */

        // Redraw OpenCascade view
        if (m_viewerManager) {
            m_viewerManager->redraw();
        }

        // Draw OpenGL overlay if enabled
        if (m_useOpenGLGrid && m_gridRenderer && m_gridInitialized) {
            m_gridRenderer->render(width(), height(), m_currentCursorPos);
        }
    }

    void TyrexViewWidget::resizeEvent(QResizeEvent* event)
    {
        if (m_viewerManager) {
            // Schedule resize for next update
            m_needsResize = true;
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

} // namespace TyrexCAD