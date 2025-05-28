#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexRendering/TyrexGridOverlayRenderer.h" 
#include "TyrexInteraction/TyrexInteractionManager.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"

#include <QDebug>
#include <QTimer>
#include <QPaintEvent>
#include <QResizeEvent>
#include <QMouseEvent>
#include <QWheelEvent>
#include <QEnterEvent>
#include <QApplication>

namespace TyrexCAD {

    TyrexViewWidget::TyrexViewWidget(QWidget* parent)
        : QWidget(parent),
        m_gridRenderer(nullptr),
        m_canvasOverlay(nullptr),
        m_gridInitialized(false),
        m_cursorInWidget(false),
        m_useOpenGLGrid(false)  // Use OpenCascade grid by default with QWidget
    {
        // Set widget attributes for OpenCascade
        setAttribute(Qt::WA_PaintOnScreen);
        setAttribute(Qt::WA_NoSystemBackground);
        setBackgroundRole(QPalette::NoRole);
        setFocusPolicy(Qt::StrongFocus);

        // Initialize viewer manager
        m_viewerManager = std::make_shared<TyrexViewerManager>();

        // Enable mouse tracking for coordinate display
        setMouseTracking(true);

        // Defer initialization until widget is visible
        QTimer::singleShot(0, this, &TyrexViewWidget::initialize);
    }

    TyrexViewWidget::~TyrexViewWidget()
    {
        if (m_gridRenderer) {
            m_gridRenderer.reset();
        }
        m_canvasOverlay.reset();
    }

    void TyrexViewWidget::initialize()
    {
        if (!m_viewerManager) {
            return;
        }

        // Initialize viewer with this widget
        m_viewerManager->initializeViewer(this);

        // Initialize overlay systems
        initializeOverlay();

        emit viewerInitialized();
    }

    void TyrexViewWidget::paintEvent(QPaintEvent* event)
    {
        Q_UNUSED(event);

        if (m_viewerManager) {
            m_viewerManager->redraw();
        }

        // Note: Since we're using WNT_Window directly, OpenCascade handles all rendering
        // Grid is rendered as part of the OpenCascade scene
    }

    void TyrexViewWidget::resizeEvent(QResizeEvent* event)
    {
        QWidget::resizeEvent(event);

        if (m_viewerManager) {
            m_viewerManager->resizeViewer(width(), height());
        }

        // Update grid system on resize
        if (m_canvasOverlay) {
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
            if (m_canvasOverlay) {
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
        m_canvasOverlay->setGridConfig(config);

        // Enable grid by default
        m_canvasOverlay->setGridVisible(true);
        m_canvasOverlay->setAxisVisible(true);

        qDebug() << "Canvas overlay initialized and grid enabled";
    }

    void TyrexViewWidget::refreshGrid()
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->update();
        }
    }

    void TyrexViewWidget::setGridEnabled(bool enabled)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridVisible(enabled);
        }
        update();
    }

    void TyrexViewWidget::setGridSpacing(double spacing)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridSpacing(spacing);
        }
        update();
    }

    void TyrexViewWidget::setGridStyle(GridStyle style)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridStyle(style);
        }
        update();
    }

    void TyrexViewWidget::setAxisVisible(bool visible)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setAxisVisible(visible);
        }
        update();
    }

    void TyrexViewWidget::setSnapToGrid(bool enabled)
    {
        if (m_canvasOverlay) {
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

        if (m_canvasOverlay) {
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