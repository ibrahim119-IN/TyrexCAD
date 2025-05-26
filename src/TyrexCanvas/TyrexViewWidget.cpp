#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexRendering/TyrexGridOverlayRenderer.h" 
#include "TyrexInteraction/TyrexInteractionManager.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"

#include <QDebug>
#include <QTimer>
#include <QOpenGLContext>
#include <QSurfaceFormat>

namespace TyrexCAD {

    TyrexViewWidget::TyrexViewWidget(QWidget* parent)
        : QOpenGLWidget(parent),
        m_gridRenderer(nullptr),
        m_canvasOverlay(nullptr),
        m_gridInitialized(false),
        m_cursorInWidget(false)
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

        // DO NOT initialize overlay here - wait for OpenGL context
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

        // Initialize Grid Renderer
        m_gridRenderer = std::make_unique<TyrexGridOverlayRenderer>();
        bool gridSuccess = m_gridRenderer->initialize();

        if (!gridSuccess) {
            qWarning() << "Failed to initialize grid renderer";
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

            // CRITICAL FIX: Set view handle immediately if available
            if (m_viewerManager && !m_viewerManager->view().IsNull()) {
                m_gridRenderer->setView(m_viewerManager->view());
                qDebug() << "Grid renderer view handle set immediately";
            }
        }

        // Initialize canvas overlay AFTER viewer is ready
        QTimer::singleShot(50, this, [this]() {
            if (m_viewerManager && !m_viewerManager->view().IsNull()) {
                initializeOverlay();

                // CRITICAL FIX: Ensure grid renderer has view handle
                if (m_gridRenderer && m_gridInitialized) {
                    m_gridRenderer->setView(m_viewerManager->view());
                    qDebug() << "Grid renderer view handle updated after overlay init";
                }

                // Force initial grid display
                if (m_canvasOverlay) {
                    m_canvasOverlay->setGridVisible(true);
                    m_canvasOverlay->setAxisVisible(true);
                    m_canvasOverlay->update();
                }

                // Emit signal that everything is ready
                emit viewerInitialized();

                // Force a redraw
                update();
            }
            });
    }

    void TyrexViewWidget::paintGL()
    {
        // First, let OpenCascade render
        if (m_viewerManager) {
            m_viewerManager->redraw();
        }

        // Then render grid overlay using OpenGL
        if (m_gridRenderer && m_gridInitialized && m_gridRenderer->isGridEnabled()) {
            QPoint cursorPos = m_cursorInWidget ? m_currentCursorPos : QPoint(-1, -1);

            // CRITICAL FIX: Always ensure view is set before rendering
            if (m_viewerManager && !m_viewerManager->view().IsNull()) {
                m_gridRenderer->setView(m_viewerManager->view());
            }

            m_gridRenderer->render(width(), height(), cursorPos);
        }
    }

    void TyrexViewWidget::resizeGL(int width, int height)
    {
        if (m_viewerManager) {
            m_viewerManager->resizeViewer(width, height);
        }

        // Update canvas overlay on resize
        if (m_canvasOverlay) {
            m_canvasOverlay->update();
        }

        // Force grid refresh on resize
        refreshGrid();

        // Force redraw
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
            if (m_gridRenderer) {
                double worldX, worldY;
                m_gridRenderer->screenToWorld(event->pos().x(), event->pos().y(), worldX, worldY);
                emit cursorWorldPosition(worldX, worldY);
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

    void TyrexViewWidget::enterEvent(QEnterEvent* event)
    {
        m_cursorInWidget = true;
        update();
    }

    void TyrexViewWidget::leaveEvent(QEvent* event)
    {
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

        // Connect signals
        connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridSpacingChanged,
            this, &TyrexViewWidget::gridSpacingChanged);

        connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridConfigChanged,
            this, &TyrexViewWidget::gridConfigChanged);

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
        if (m_gridRenderer && m_gridInitialized && m_viewerManager && !m_viewerManager->view().IsNull()) {
            m_gridRenderer->setView(m_viewerManager->view());
            qDebug() << "Grid refreshed";
        }

        if (m_canvasOverlay) {
            m_canvasOverlay->update();
        }
    }

    void TyrexViewWidget::setGridEnabled(bool enabled)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridVisible(enabled);
            update();
        }

        if (m_gridRenderer) {
            m_gridRenderer->setGridEnabled(enabled);
            update();
        }
    }

    void TyrexViewWidget::setGridSpacing(double spacing)
    {
        if (m_canvasOverlay) {
            GridConfig config = m_canvasOverlay->getGridConfig();
            config.baseSpacing = spacing;
            m_canvasOverlay->setGridConfig(config);
            update();
        }

        if (m_gridRenderer) {
            auto config = m_gridRenderer->getGridConfig();
            config.baseSpacing = spacing;
            m_gridRenderer->setGridConfig(config);
            update();
        }
    }

    void TyrexViewWidget::setGridStyle(GridStyle style)
    {
        if (m_canvasOverlay) {
            GridConfig config = m_canvasOverlay->getGridConfig();
            config.style = style;
            m_canvasOverlay->setGridConfig(config);
            update();
        }

        if (m_gridRenderer) {
            auto config = m_gridRenderer->getGridConfig();
            config.style = style;
            m_gridRenderer->setGridConfig(config);
            update();
        }
    }

    void TyrexViewWidget::setAxisVisible(bool visible)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setAxisVisible(visible);
            update();
        }

        if (m_gridRenderer) {
            auto config = m_gridRenderer->getGridConfig();
            config.showAxes = visible;
            m_gridRenderer->setGridConfig(config);
            update();
        }
    }

    void TyrexViewWidget::setSnapToGrid(bool enabled)
    {
        if (m_canvasOverlay) {
            GridConfig config = m_canvasOverlay->getGridConfig();
            config.snapEnabled = enabled;
            m_canvasOverlay->setGridConfig(config);
            emit snapToGridChanged(enabled);
        }
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

        if (m_canvasOverlay) {
            m_canvasOverlay->setGridConfig(config);
        }

        if (m_gridRenderer) {
            m_gridRenderer->setGridConfig(config);
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