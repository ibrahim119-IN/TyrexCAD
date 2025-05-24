/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexRendering/TyrexGridOverlayRenderer.h"
#include "TyrexInteraction/TyrexInteractionManager.h"

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <Standard_DefineHandle.hxx>
#include <V3d_View.hxx>

// Qt includes
#include <QMouseEvent>
#include <QWheelEvent>
#include <QResizeEvent>
#include <QShowEvent>
#include <QVBoxLayout>
#include <QDebug>
#include <QTimer>
#include <QOpenGLContext>
#include <QSurfaceFormat>

namespace TyrexCAD {

    TyrexViewWidget::TyrexViewWidget(QWidget* parent)
        : QOpenGLWidget(parent)
        , m_viewerManager(nullptr)
        , m_interactionManager(nullptr)
        , m_gridRenderer(nullptr)
        , m_gridInitialized(false)
        , m_currentCursorPos(-1, -1)
        , m_cursorInWidget(false)
    {
        // Set widget properties for optimal OpenGL rendering
        setAttribute(Qt::WA_OpaquePaintEvent);
        setAttribute(Qt::WA_NoSystemBackground);
        setMouseTracking(true);
        setFocusPolicy(Qt::StrongFocus);
        setMinimumSize(400, 300);

        qDebug() << "TyrexViewWidget constructed with enhanced grid support";

        // Initialize after construction
        QTimer::singleShot(50, this, &TyrexViewWidget::initializeManagers);
    }

    TyrexViewWidget::~TyrexViewWidget()
    {
        // Cleanup grid renderer in OpenGL context
        makeCurrent(); // Ensure OpenGL context is active
        m_gridRenderer.reset();
        doneCurrent();

        qDebug() << "TyrexViewWidget destructor completed";
    }

    std::shared_ptr<TyrexViewerManager> TyrexViewWidget::viewerManager() const
    {
        return m_viewerManager;
    }

    TyrexInteractionManager* TyrexViewWidget::interactionManager() const
    {
        return m_interactionManager.get();
    }

    void TyrexViewWidget::initializeGL()
    {
        // Initialize OpenGL functions
        if (!initializeOpenGLFunctions()) {
            qCritical() << "Failed to initialize OpenGL functions in TyrexViewWidget";
            return;
        }

        // Set OpenGL state for CAD rendering
        glEnable(GL_DEPTH_TEST);
        glEnable(GL_MULTISAMPLE);
        glClearColor(0.1f, 0.1f, 0.1f, 1.0f);

        qDebug() << "TyrexViewWidget OpenGL initialized";

        // Setup grid renderer after OpenGL is ready
        setupGridRenderer();
    }

    void TyrexViewWidget::paintGL()
    {
        // Clear buffers
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        // === 1. Render OpenCascade scene first ===
        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            try {
                // Let OpenCascade render the 3D scene
                Handle(V3d_View) view = m_viewerManager->view();
                view->Redraw();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "OpenCascade rendering error:" << ex.GetMessageString();
            }
            catch (...) {
                qWarning() << "Unknown OpenCascade rendering error";
            }
        }

        // === 2. Render grid overlay on top ===
        if (m_gridRenderer && m_gridInitialized) {
            try {
                // Render grid with current cursor position for coordinate display
                m_gridRenderer->render(width(), height(), m_currentCursorPos);
            }
            catch (const std::exception& ex) {
                qWarning() << "Grid rendering error:" << ex.what();
            }
            catch (...) {
                qWarning() << "Unknown grid rendering error";
            }
        }

        // Force OpenGL flush for immediate display
        glFlush();
    }

    void TyrexViewWidget::resizeGL(int w, int h)
    {
        // Update OpenCascade viewport
        if (m_viewerManager) {
            m_viewerManager->handleResize();
        }

        // Grid will automatically adapt to new viewport size in next render
        qDebug() << "TyrexViewWidget resized to:" << w << "x" << h;
    }

    void TyrexViewWidget::setupGridRenderer()
    {
        if (m_gridRenderer) {
            return; // Already initialized
        }

        try {
            // Create grid renderer
            m_gridRenderer = std::make_unique<TyrexGridOverlayRenderer>();

            // Initialize with current OpenGL context
            if (!m_gridRenderer->initialize()) {
                qCritical() << "Failed to initialize grid renderer";
                m_gridRenderer.reset();
                return;
            }

            // Set default AutoCAD-style configuration
            GridConfig config;
            config.baseSpacing = 10.0;
            config.majorFactor = 5;
            config.minorColor = QColor(60, 60, 60, 150);    // Dark gray
            config.majorColor = QColor(100, 100, 100, 200); // Medium gray
            config.axisColorX = QColor(255, 80, 80, 255);   // Red X-axis
            config.axisColorY = QColor(80, 255, 80, 255);   // Green Y-axis
            config.showAxes = true;
            config.showOriginMarker = true;
            config.adaptiveSpacing = true;
            config.minPixelSpacing = 20.0;
            config.maxPixelSpacing = 80.0;
            config.style = GridStyle::Lines;                // Default to lines
            config.showCoordinates = false;                  // Off by default
            config.snapEnabled = true;

            m_gridRenderer->setGridConfig(config);
            m_gridRenderer->setGridEnabled(true); // Enable by default
            m_gridInitialized = true;

            qDebug() << "Grid renderer initialized successfully with enhanced features";

        }
        catch (const std::exception& ex) {
            qCritical() << "Exception setting up grid renderer:" << ex.what();
            m_gridRenderer.reset();
        }
        catch (...) {
            qCritical() << "Unknown exception setting up grid renderer";
            m_gridRenderer.reset();
        }
    }

    void TyrexViewWidget::initializeManagers()
    {
        if (m_viewerManager) {
            qDebug() << "Managers already initialized, skipping";
            return;
        }

        qDebug() << "Starting manager initialization...";

        try {
            // Create viewer manager
            m_viewerManager = std::make_shared<TyrexViewerManager>(this);

            if (!m_viewerManager) {
                qCritical() << "Failed to create viewer manager!";
                return;
            }

            // Verify OpenCascade components
            Handle(AIS_InteractiveContext) context = m_viewerManager->context();
            Handle(V3d_View) view = m_viewerManager->view();

            if (context.IsNull() || view.IsNull()) {
                qCritical() << "Viewer manager created but context/view is null!";
                return;
            }

            // === Connect grid renderer to view ===
            if (m_gridRenderer) {
                m_gridRenderer->setView(view);
                qDebug() << "Grid renderer connected to OpenCascade view";
            }

            // Create interaction manager
            m_interactionManager = std::make_unique<TyrexInteractionManager>();

            if (!m_interactionManager) {
                qCritical() << "Failed to create interaction manager!";
                return;
            }

            // Connect managers
            m_interactionManager->setViewerManager(m_viewerManager.get());
            m_viewerManager->setInteractionManager(m_interactionManager.get());

            // Setup initial view
            view->SetProj(V3d_Zpos);  // Top view for sketch mode
            view->SetImmediateUpdate(Standard_True);
            view->FitAll();
            view->Redraw();

            // === Connect view change signals to grid updates ===
            connect(m_viewerManager.get(), &TyrexViewerManager::viewChanged,
                this, [this]() {
                    // Grid will automatically update on next paintGL() call
                    update(); // Trigger repaint
                });

            emit viewerInitialized();
            qDebug() << "Manager initialization completed with enhanced grid integration";

        }
        catch (const Standard_Failure& ex) {
            qCritical() << "OpenCascade error during initialization:" << ex.GetMessageString();
        }
        catch (const std::exception& ex) {
            qCritical() << "Error during initialization:" << ex.what();
        }
        catch (...) {
            qCritical() << "Unknown error during initialization";
        }
    }

    // === Grid control methods implementation ===

    void TyrexViewWidget::setGridEnabled(bool enabled)
    {
        if (m_gridRenderer) {
            m_gridRenderer->setGridEnabled(enabled);
            update(); // Trigger repaint
            qDebug() << "Grid" << (enabled ? "enabled" : "disabled");
        }
    }

    bool TyrexViewWidget::isGridEnabled() const
    {
        return m_gridRenderer ? m_gridRenderer->isGridEnabled() : false;
    }

    void TyrexViewWidget::setGridConfig(const GridConfig& config)
    {
        if (m_gridRenderer) {
            m_gridRenderer->setGridConfig(config);
            update(); // Trigger repaint
            emit gridConfigChanged();
            qDebug() << "Grid configuration updated";
        }
    }

    const GridConfig& TyrexViewWidget::getGridConfig() const
    {
        static GridConfig defaultConfig;
        return m_gridRenderer ? m_gridRenderer->getGridConfig() : defaultConfig;
    }

    void TyrexViewWidget::setGridStyle(GridStyle style)
    {
        if (m_gridRenderer) {
            m_gridRenderer->setGridStyle(style);
            update(); // Trigger repaint
            qDebug() << "Grid style changed to:" << static_cast<int>(style);
        }
    }

    GridStyle TyrexViewWidget::getGridStyle() const
    {
        return m_gridRenderer ? m_gridRenderer->getGridStyle() : GridStyle::Lines;
    }

    bool TyrexViewWidget::snapToGrid(double worldX, double worldY,
        double& snappedX, double& snappedY) const
    {
        if (m_gridRenderer) {
            return m_gridRenderer->snapToGrid(worldX, worldY, snappedX, snappedY);
        }

        snappedX = worldX;
        snappedY = worldY;
        return false;
    }

    void TyrexViewWidget::screenToWorld(const QPoint& screenPos,
        double& worldX, double& worldY) const
    {
        if (m_gridRenderer) {
            m_gridRenderer->screenToWorld(screenPos.x(), screenPos.y(), worldX, worldY);
        }
        else {
            worldX = screenPos.x();
            worldY = screenPos.y();
        }
    }

    double TyrexViewWidget::getCurrentGridSpacing() const
    {
        return m_gridRenderer ? m_gridRenderer->getCurrentGridSpacing() : 1.0;
    }

    void TyrexViewWidget::setCoordinateDisplayEnabled(bool enabled)
    {
        if (m_gridRenderer) {
            GridConfig config = m_gridRenderer->getGridConfig();
            config.showCoordinates = enabled;
            m_gridRenderer->setGridConfig(config);
            update();
        }
    }

    bool TyrexViewWidget::isCoordinateDisplayEnabled() const
    {
        return m_gridRenderer ? m_gridRenderer->getGridConfig().showCoordinates : false;
    }

    void TyrexViewWidget::setSketchModeGrid(bool enabled)
    {
        if (!m_gridRenderer) {
            return;
        }

        if (enabled) {
            // Use sketch-specific grid settings
            GridConfig sketchConfig;
            sketchConfig.baseSpacing = 10.0;
            sketchConfig.majorFactor = 5;
            sketchConfig.minorColor = QColor(60, 60, 60, 150);
            sketchConfig.majorColor = QColor(100, 100, 100, 200);
            sketchConfig.axisColorX = QColor(255, 0, 0, 255);
            sketchConfig.axisColorY = QColor(0, 255, 0, 255);
            sketchConfig.showAxes = true;
            sketchConfig.showOriginMarker = true;
            sketchConfig.style = GridStyle::Lines;
            sketchConfig.showCoordinates = true;
            sketchConfig.snapEnabled = true;
            sketchConfig.adaptiveSpacing = true;

            m_gridRenderer->setGridConfig(sketchConfig);
            m_gridRenderer->setGridEnabled(true);
        }
        else {
            // Restore default grid settings
            GridConfig defaultConfig;
            m_gridRenderer->setGridConfig(defaultConfig);
        }

        update();
    }

    // === Event handling with cursor tracking ===

    void TyrexViewWidget::mousePressEvent(QMouseEvent* e)
    {
        if (m_interactionManager) {
            m_interactionManager->onMousePress(e->button(), e->pos());
        }
        e->accept();
    }

    void TyrexViewWidget::mouseMoveEvent(QMouseEvent* e)
    {
        // Update cursor position for coordinate display
        updateCursorPosition(e->pos());

        if (m_interactionManager) {
            m_interactionManager->onMouseMove(e->pos(), e->modifiers());
        }
        e->accept();
    }

    void TyrexViewWidget::mouseReleaseEvent(QMouseEvent* e)
    {
        if (m_interactionManager) {
            m_interactionManager->onMouseRelease(e->button(), e->pos());
        }
        e->accept();
    }

    void TyrexViewWidget::wheelEvent(QWheelEvent* e)
    {
        if (m_interactionManager) {
            m_interactionManager->onMouseWheel(e->angleDelta().y(), e->position().toPoint());
        }
        e->accept();
    }

    void TyrexViewWidget::updateCursorPosition(const QPoint& pos)
    {
        m_currentCursorPos = pos;
        m_cursorInWidget = true;

        // Emit world position signal if grid renderer is available
        if (m_gridRenderer) {
            double worldX, worldY;
            screenToWorld(pos, worldX, worldY);

            // Apply snap if enabled
            double snappedX = worldX, snappedY = worldY;
            if (m_gridRenderer->getGridConfig().snapEnabled) {
                m_gridRenderer->snapToGrid(worldX, worldY, snappedX, snappedY);
            }

            emit cursorWorldPosition(snappedX, snappedY);
        }

        // Trigger repaint to update coordinate display
        if (isCoordinateDisplayEnabled()) {
            update();
        }
    }

} // namespace TyrexCAD