#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexRendering/TyrexGridOverlayRenderer.h" 
#include "TyrexInteraction/TyrexInteractionManager.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"

#include <QDebug>
#include <QTimer>
#include <QOpenGLContext>
#include <QSurfaceFormat>
#include <QEvent>
#include <QMouseEvent>
#include <QWheelEvent>
#include <QEnterEvent>

namespace TyrexCAD {

    TyrexViewWidget::TyrexViewWidget(QWidget* parent)
        : QOpenGLWidget(parent),
        m_gridRenderer(nullptr),
        m_canvasOverlay(nullptr),
        m_gridInitialized(false),
        m_cursorInWidget(false),
        m_useOpenGLGrid(true)  // Use OpenGL grid by default
    {
        // Set OpenGL format
        QSurfaceFormat format;
        format.setDepthBufferSize(24);
        format.setStencilBufferSize(8);
        format.setSamples(4);
        format.setVersion(3, 3);
        format.setProfile(QSurfaceFormat::CoreProfile);
        setFormat(format);

        // Initialize viewer manager
        m_viewerManager = std::make_shared<TyrexViewerManager>();

        // Enable mouse tracking for coordinate display
        setMouseTracking(true);
    }

    TyrexViewWidget::~TyrexViewWidget()
    {
        makeCurrent();
        m_gridRenderer.reset();
        m_canvasOverlay.reset();
        doneCurrent();
    }

    void TyrexViewWidget::initializeGL()
    {
        qDebug() << "=== TyrexViewWidget::initializeGL() ===";

        initializeOpenGLFunctions();

        if (!m_viewerManager) {
            qCritical() << "No viewer manager available!";
            return;
        }

        // Initialize viewer with this widget
        m_viewerManager->initializeViewer(this);

        // Initialize Grid Renderer only if using OpenGL grid
        if (m_useOpenGLGrid) {
            m_gridRenderer = std::make_unique<TyrexGridOverlayRenderer>();
            bool gridSuccess = m_gridRenderer->initialize();

            if (!gridSuccess) {
                qWarning() << "Failed to initialize grid renderer";
                m_useOpenGLGrid = false;
            }
            else {
                qDebug() << "Grid renderer initialized successfully";
                m_gridInitialized = true;

                // Set default grid configuration
                GridConfig defaultConfig;
                defaultConfig.backgroundColor = Quantity_Color(0.05, 0.05, 0.05, Quantity_TOC_RGB);
                defaultConfig.gridColorMajor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
                defaultConfig.gridColorMinor = Quantity_Color(0.2, 0.2, 0.2, Quantity_TOC_RGB);
                defaultConfig.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
                defaultConfig.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);
                defaultConfig.showAxes = true;
                defaultConfig.showOriginMarker = true;
                defaultConfig.baseSpacing = 10.0;
                defaultConfig.adaptiveSpacing = true;
                defaultConfig.snapEnabled = true;

                m_gridRenderer->setGridConfig(defaultConfig);
                m_gridRenderer->setGridEnabled(true);

                // Set view handle immediately if available
                if (m_viewerManager && !m_viewerManager->view().IsNull()) {
                    m_gridRenderer->setView(m_viewerManager->view());
                    qDebug() << "Grid renderer view handle set immediately";
                }
            }
        }

        // Initialize canvas overlay after viewer is ready (for OpenCascade grid option)
        if (!m_useOpenGLGrid) {
            QTimer::singleShot(50, this, [this]() {
                if (m_viewerManager && !m_viewerManager->view().IsNull()) {
                    initializeOverlay();

                    if (m_canvasOverlay) {
                        m_canvasOverlay->setGridVisible(true);
                        m_canvasOverlay->setAxisVisible(true);
                        m_canvasOverlay->update();
                    }

                    emit viewerInitialized();
                    update();
                }
                });
        }
        else {
            emit viewerInitialized();
        }
    }

    void TyrexViewWidget::paintGL()
    {
        // First, let OpenCascade render
        if (m_viewerManager) {
            m_viewerManager->redraw();
        }

        // Then render grid overlay using selected system
        if (m_useOpenGLGrid) {
            // Use OpenGL grid renderer
            if (m_gridRenderer && m_gridInitialized && m_gridRenderer->isGridEnabled()) {
                QPoint cursorPos = m_cursorInWidget ? m_currentCursorPos : QPoint(-1, -1);

                // Always ensure view is set before rendering
                if (m_viewerManager && !m_viewerManager->view().IsNull()) {
                    m_gridRenderer->setView(m_viewerManager->view());
                }

                m_gridRenderer->render(width(), height(), cursorPos);
            }
        }
        // Note: If using OpenCascade grid, it's already rendered as part of the viewer
    }

    void TyrexViewWidget::resizeGL(int width, int height)
    {
        if (m_viewerManager) {
            m_viewerManager->resizeViewer(width, height);
        }

        // Update appropriate grid system on resize
        if (m_useOpenGLGrid) {
            refreshGrid();
        }
        else if (m_canvasOverlay) {
            m_canvasOverlay->update();
        }

        update();
    }

    void TyrexViewWidget::mousePressEvent(QMouseEvent* event)
    {
        m_cursorInWidget = true;
        m_currentCursorPos = event->pos();

        if (m_viewerManager) {
            m_viewerManager->mousePress(event);
        }
        update();
    }

    void TyrexViewWidget::mouseReleaseEvent(QMouseEvent* event)
    {
        if (m_viewerManager) {
            m_viewerManager->mouseRelease(event);
        }
        update();
    }

    void TyrexViewWidget::mouseMoveEvent(QMouseEvent* event)
    {
        m_cursorInWidget = true;
        m_currentCursorPos = event->pos();

        if (m_viewerManager) {
            m_viewerManager->mouseMove(event);

            // Get world coordinates and emit signal
            if (m_useOpenGLGrid && m_gridRenderer) {
                double worldX, worldY;
                m_gridRenderer->screenToWorld(event->pos().x(), event->pos().y(), worldX, worldY);
                emit cursorWorldPosition(worldX, worldY);
            }
            else if (!m_useOpenGLGrid && m_canvasOverlay) {
                gp_Pnt2d worldPos = m_canvasOverlay->screenToWorld(event->pos());
                emit cursorWorldPosition(worldPos.X(), worldPos.Y());
            }
        }
        update();
    }

    void TyrexViewWidget::wheelEvent(QWheelEvent* event)
    {
        if (m_viewerManager) {
            m_viewerManager->mouseWheel(event);
        }
        update();
    }

#if QT_VERSION >= QT_VERSION_CHECK(6, 0, 0)
    void TyrexViewWidget::enterEvent(QEnterEvent* event)
    {
        Q_UNUSED(event);
        m_cursorInWidget = true;
        update();
    }
#else
    void TyrexViewWidget::enterEvent(QEvent* event)
    {
        Q_UNUSED(event);
        m_cursorInWidget = true;
        update();
    }
#endif

    void TyrexViewWidget::leaveEvent(QEvent* event)
    {
        Q_UNUSED(event);
        m_cursorInWidget = false;
        emit cursorWorldPosition(0, 0);
        update();
    }

    void TyrexViewWidget::initializeOverlay()
    {
        if (m_canvasOverlay) {
            return; // Already initialized
        }

        if (!m_viewerManager) {
            qWarning() << "Cannot initialize overlay - no viewer manager";
            return;
        }

        auto context = m_viewerManager->context();
        auto view = m_viewerManager->view();

        if (context.IsNull() || view.IsNull()) {
            qWarning() << "Cannot initialize overlay - context or view is null";
            return;
        }

        m_canvasOverlay = std::make_shared<TyrexCanvasOverlay>(context, view, this);

        // Connect signals with lambda to handle void signal properly
        connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridSpacingChanged,
            this, &TyrexViewWidget::gridSpacingChanged);

        // Use lambda for gridConfigChanged to emit with parameter
        connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridConfigChanged,
            this, [this]() {
                emit gridConfigChanged(m_canvasOverlay->getGridConfig());
            });

        // Set default configuration
        GridConfig config = m_canvasOverlay->getGridConfig();
        config.showAxes = true;
        config.showOriginMarker = true;
        config.adaptiveSpacing = true;
        m_canvasOverlay->setGridConfig(config);

        // Enable grid by default
        m_canvasOverlay->setGridVisible(true);
        m_canvasOverlay->setAxisVisible(true);

        qDebug() << "Canvas overlay initialized and grid enabled";
    }

    void TyrexViewWidget::refreshGrid()
    {
        if (m_useOpenGLGrid && m_gridRenderer && m_gridInitialized &&
            m_viewerManager && !m_viewerManager->view().IsNull()) {
            m_gridRenderer->setView(m_viewerManager->view());
            qDebug() << "Grid refreshed";
        }

        if (!m_useOpenGLGrid && m_canvasOverlay) {
            m_canvasOverlay->update();
        }
    }

    void TyrexViewWidget::setGridEnabled(bool enabled)
    {
        if (m_useOpenGLGrid && m_gridRenderer) {
            m_gridRenderer->setGridEnabled(enabled);
        }
        else if (!m_useOpenGLGrid && m_canvasOverlay) {
            m_canvasOverlay->setGridVisible(enabled);
        }
        update();
    }

    void TyrexViewWidget::setGridSpacing(double spacing)
    {
        if (m_useOpenGLGrid && m_gridRenderer) {
            auto config = m_gridRenderer->getGridConfig();
            config.baseSpacing = spacing;
            m_gridRenderer->setGridConfig(config);
        }
        else if (!m_useOpenGLGrid && m_canvasOverlay) {
            m_canvasOverlay->setGridSpacing(spacing);
        }
        update();
    }

    void TyrexViewWidget::setGridStyle(GridStyle style)
    {
        if (m_useOpenGLGrid && m_gridRenderer) {
            m_gridRenderer->setGridStyle(style);
        }
        else if (!m_useOpenGLGrid && m_canvasOverlay) {
            m_canvasOverlay->setGridStyle(style);
        }
        update();
    }

    void TyrexViewWidget::setAxisVisible(bool visible)
    {
        if (m_useOpenGLGrid && m_gridRenderer) {
            auto config = m_gridRenderer->getGridConfig();
            config.showAxes = visible;
            m_gridRenderer->setGridConfig(config);
        }
        else if (!m_useOpenGLGrid && m_canvasOverlay) {
            m_canvasOverlay->setAxisVisible(visible);
        }
        update();
    }

    void TyrexViewWidget::setSnapToGrid(bool enabled)
    {
        if (m_useOpenGLGrid && m_gridRenderer) {
            auto config = m_gridRenderer->getGridConfig();
            config.snapEnabled = enabled;
            m_gridRenderer->setGridConfig(config);
        }
        else if (!m_useOpenGLGrid && m_canvasOverlay) {
            m_canvasOverlay->setSnapEnabled(enabled);
        }
        emit snapToGridChanged(enabled);
    }

    void TyrexViewWidget::setSketchModeGrid(bool sketchMode)
    {
        GridConfig config;

        if (sketchMode) {
            // Enhanced grid for sketch mode
            config.backgroundColor = Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB);
            config.gridColorMajor = Quantity_Color(0.4, 0.4, 0.4, Quantity_TOC_RGB);
            config.gridColorMinor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
            config.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
            config.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);
            config.style = GridStyle::Lines;
            config.showAxes = true;
            config.showOriginMarker = true;
            config.snapEnabled = true;
            config.baseSpacing = 10.0;
        }
        else {
            // Normal 3D mode grid
            config.backgroundColor = Quantity_Color(0.05, 0.05, 0.05, Quantity_TOC_RGB);
            config.gridColorMajor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
            config.gridColorMinor = Quantity_Color(0.2, 0.2, 0.2, Quantity_TOC_RGB);
            config.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
            config.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);
            config.style = GridStyle::Lines;
            config.showAxes = true;
            config.showOriginMarker = true;
            config.snapEnabled = false;
            config.baseSpacing = 10.0;
        }

        if (m_useOpenGLGrid && m_gridRenderer) {
            m_gridRenderer->setGridConfig(config);
        }
        else if (!m_useOpenGLGrid && m_canvasOverlay) {
            m_canvasOverlay->setGridConfig(config);
        }

        update();
    }

    std::shared_ptr<TyrexViewerManager> TyrexViewWidget::viewerManager() const
    {
        return m_viewerManager;
    }

    std::shared_ptr<TyrexCanvasOverlay> TyrexViewWidget::canvasOverlay() const
    {
        return m_canvasOverlay;
    }

} // namespace TyrexCAD