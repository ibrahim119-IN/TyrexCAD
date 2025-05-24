/***************************************************************************
 * Copyright (c) 2025 TyrexCAD development team                          *
 * *
 * This file is part of the TyrexCAD CAx development system.             *
 * *
 ***************************************************************************/

#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexRendering/TyrexGridOverlayRenderer.h" 
#include "TyrexInteraction/TyrexInteractionManager.h"


 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <V3d_View.hxx>

// Qt includes
#include <QMouseEvent>
#include <QWheelEvent>
#include <QResizeEvent>
#include <QShowEvent>
#include <QEnterEvent> 
#include <QDebug>
#include <QTimer>
#include <QOpenGLContext>
#include <QSurfaceFormat>
#include <QThread> // For QThread::currentThread()

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
        setAttribute(Qt::WA_OpaquePaintEvent);
        setAttribute(Qt::WA_NoSystemBackground);
        setMouseTracking(true);
        setFocusPolicy(Qt::StrongFocus);
        setMinimumSize(400, 300);
        qDebug() << "TyrexViewWidget constructed.";
        // initializeManagers will be called from initializeGL
    }

    TyrexViewWidget::~TyrexViewWidget()
    {
        // QOpenGLWidget's destructor will ensure its context is current when it cleans up.
        // If m_gridRenderer holds OpenGL resources, they should ideally be released
        // when the widget's context is current.
        if (m_gridRenderer) {
            // Check if we can make the context current
            if (isValid() && context()) { // isValid() for widget, context() for QOpenGLWidget
                bool madeCurrent = false;
                if (context()->thread() == QThread::currentThread()) {
                    // It's crucial to only call makeCurrent if this thread owns the context
                    // QOpenGLWidget usually handles this during its own destruction if we override cleanupGL.
                    // For explicit cleanup, we must be careful.
                    if (QOpenGLContext::currentContext() != context()) {
                        madeCurrent = context()->makeCurrent(this); // Use 'this' as QOpenGLWidget provides its surface
                    }
                    else {
                        madeCurrent = true; // Already current
                    }
                }

                if (madeCurrent) {
                    m_gridRenderer->cleanup(); // Call cleanup for OpenGL resources
                    if (QOpenGLContext::currentContext() == context()) { // Check if still current before doneCurrent
                        context()->doneCurrent();
                    }
                }
                else {
                    qWarning() << "TyrexViewWidget destructor: Could not make context current for this widget. Grid renderer may not be cleaned up properly via OpenGL.";
                }
            }
            else {
                qWarning() << "TyrexViewWidget destructor: Context not available or widget not valid. Grid renderer may not be cleaned up properly via OpenGL.";
            }
            m_gridRenderer.reset(); // Release unique_ptr memory
        }
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
        // This function is called by QOpenGLWidget after its context is made current.
        // Initialize QOpenGLFunctions for *this* widget instance.
        if (!initializeOpenGLFunctions()) {
            qCritical() << "TyrexViewWidget::initializeGL - Failed to initialize OpenGL functions for TyrexViewWidget itself.";
            return;
        }
        glEnable(GL_DEPTH_TEST);
        glEnable(GL_MULTISAMPLE);
        glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
        qDebug() << "TyrexViewWidget::initializeGL - Base OpenGL initialized.";

        // Now that the context for TyrexViewWidget is current and its QOpenGLFunctions are initialized,
        // we can initialize components that depend on it.
        initializeManagers();

        // Grid renderer setup requires the V3d_View from viewerManager, which is created in initializeManagers().
        // It also needs the current context to call its own initializeOpenGLFunctions().
        setupGridRenderer();
    }

    void TyrexViewWidget::paintGL()
    {
        // QOpenGLWidget makes its context current before calling paintGL.
        // OpenGL functions for this widget (and subsequently for m_gridRenderer if it uses the same context mechanism)
        // should be available.

        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            try {
                m_viewerManager->view()->Redraw();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "OpenCascade rendering error:" << ex.GetMessageString();
            }
            catch (...) {
                qWarning() << "Unknown OpenCascade rendering error";
            }
        }

        if (m_gridRenderer && m_gridInitialized) {
            try {
                QPoint renderCursorPos = (m_cursorInWidget && getGridConfig().showCoordinates) ? m_currentCursorPos : QPoint(-1, -1);
                // The render function of m_gridRenderer assumes its own QOpenGLFunctions are initialized
                // and that the context is current (which it is, due to paintGL).
                m_gridRenderer->render(width(), height(), renderCursorPos);
            }
            catch (const std::exception& ex) {
                qWarning() << "Grid rendering error:" << ex.what();
            }
            catch (...) {
                qWarning() << "Unknown grid rendering error";
            }
        }
    }

    void TyrexViewWidget::resizeGL(int w, int h)
    {
        // QOpenGLWidget makes its context current before calling resizeGL.
        if (m_viewerManager) {
            m_viewerManager->handleResize();
        }
        qDebug() << "TyrexViewWidget resized to:" << w << "x" << h;
        if (m_gridRenderer) m_gridRenderer->m_vboDirty = true;
    }

    void TyrexViewWidget::setupGridRenderer()
    {
        if (m_gridRenderer) {
            qDebug() << "Grid renderer already set up.";
            return;
        }
        // This function is called from initializeGL, so context is current.
        if (!m_viewerManager || m_viewerManager->view().IsNull()) {
            qWarning() << "TyrexViewWidget::setupGridRenderer - ViewerManager or V3d_View is null. Cannot setup grid renderer.";
            return;
        }

        try {
            m_gridRenderer = std::make_unique<TyrexGridOverlayRenderer>();

            // The TyrexGridOverlayRenderer::initialize() will call its own initializeOpenGLFunctions().
            // This requires the QOpenGLWidget's context to be current, which it is if called from initializeGL.
            if (!m_gridRenderer->initialize()) {
                qCritical() << "Failed to initialize grid renderer within TyrexViewWidget";
                m_gridRenderer.reset();
                return;
            }
            m_gridRenderer->setView(m_viewerManager->view());

            TyrexCAD::GridConfig config;
            // ... (config setup as before)
            config.backgroundColor = Quantity_Color(0.1, 0.1, 0.1, Quantity_TOC_RGB);
            config.baseSpacing = 10.0;
            config.majorLineInterval = 5;
            config.gridColorMinor = Quantity_Color(0.2, 0.2, 0.2, Quantity_TOC_RGB);
            config.gridColorMajor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
            config.axisColorX = Quantity_Color(1.0, 0.2, 0.2, Quantity_TOC_RGB);
            config.axisColorY = Quantity_Color(0.2, 1.0, 0.2, Quantity_TOC_RGB);
            config.showAxes = true;
            config.showOriginMarker = true;
            config.adaptiveSpacing = true;
            config.minSpacingPixels = 20.0;
            config.maxSpacingPixels = 80.0;
            config.style = TyrexCAD::GridStyle::Lines;
            config.showCoordinates = true;
            config.snapEnabled = true;

            m_gridRenderer->setGridConfig(config);
            m_gridRenderer->setGridEnabled(true);
            m_gridInitialized = true;
            qDebug() << "Grid renderer initialized and configured successfully in TyrexViewWidget.";
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
            qDebug() << "Managers already initialized.";
            return;
        }
        qDebug() << "Starting TyrexViewWidget manager initialization...";
        try {
            // TyrexViewWidget (this) is passed as parent to TyrexViewerManager
            m_viewerManager = std::make_shared<TyrexViewerManager>(this);
            if (!m_viewerManager || m_viewerManager->context().IsNull() || m_viewerManager->view().IsNull()) {
                qCritical() << "Failed to create viewer manager or its components are null!";
                m_viewerManager.reset();
                return;
            }

            m_interactionManager = std::make_unique<TyrexInteractionManager>();
            if (!m_interactionManager) {
                qCritical() << "Failed to create interaction manager!";
                return;
            }
            m_interactionManager->setViewerManager(m_viewerManager.get());
            if (m_viewerManager) m_viewerManager->setInteractionManager(m_interactionManager.get());

            if (!m_viewerManager->view().IsNull()) {
                m_viewerManager->view()->SetProj(V3d_Zpos);
                m_viewerManager->view()->SetImmediateUpdate(Standard_True);
                m_viewerManager->fitAll();
            }

            connect(m_viewerManager.get(), &TyrexViewerManager::viewChanged, this, QOverload<>::of(&QWidget::update)); // QWidget::update
            emit viewerInitialized();
            qDebug() << "TyrexViewWidget Manager initialization completed.";
        }
        catch (const Standard_Failure& ex) {
            qCritical() << "OpenCascade error during TyrexViewWidget initialization:" << ex.GetMessageString();
        }
        catch (const std::exception& ex) {
            qCritical() << "Error during TyrexViewWidget initialization:" << ex.what();
        }
    }

    // ... (rest of TyrexViewWidget.cpp methods from previous correct response)
    void TyrexViewWidget::setGridEnabled(bool enabled) {
        if (m_gridRenderer) {
            m_gridRenderer->setGridEnabled(enabled);
            update();
        }
    }
    bool TyrexViewWidget::isGridEnabled() const {
        return m_gridRenderer ? m_gridRenderer->isGridEnabled() : false;
    }
    void TyrexViewWidget::setGridConfig(const TyrexCAD::GridConfig& config) {
        if (m_gridRenderer) {
            m_gridRenderer->setGridConfig(config);
            update();
            emit gridConfigChanged();
        }
    }
    const TyrexCAD::GridConfig& TyrexViewWidget::getGridConfig() const {
        static TyrexCAD::GridConfig defaultConfig;
        return m_gridRenderer ? m_gridRenderer->getGridConfig() : defaultConfig;
    }
    void TyrexViewWidget::setGridStyle(TyrexCAD::GridStyle style) {
        if (m_gridRenderer) {
            m_gridRenderer->setGridStyle(style);
            update();
        }
    }
    TyrexCAD::GridStyle TyrexViewWidget::getGridStyle() const {
        return m_gridRenderer ? m_gridRenderer->getGridStyle() : TyrexCAD::GridStyle::Lines;
    }
    bool TyrexViewWidget::snapToGrid(double worldX, double worldY, double& snappedX, double& snappedY) const {
        if (m_gridRenderer) {
            return m_gridRenderer->snapToGrid(worldX, worldY, snappedX, snappedY);
        }
        snappedX = worldX; snappedY = worldY; return false;
    }
    void TyrexViewWidget::screenToWorld(const QPoint& screenPos, double& worldX, double& worldY) const {
        if (m_gridRenderer && m_initialized) { // Check if grid renderer is initialized
            m_gridRenderer->screenToWorld(screenPos.x(), screenPos.y(), worldX, worldY);
        }
        else if (m_viewerManager) {
            gp_Pnt p = m_viewerManager->screenToModel(screenPos);
            worldX = p.X();
            worldY = p.Y();
        }
        else {
            worldX = static_cast<double>(screenPos.x());
            worldY = static_cast<double>(screenPos.y());
        }
    }
    double TyrexViewWidget::getCurrentGridSpacing() const {
        return m_gridRenderer ? m_gridRenderer->getCurrentGridSpacing() : 1.0;
    }
    void TyrexViewWidget::setCoordinateDisplayEnabled(bool enabled) {
        if (m_gridRenderer) {
            TyrexCAD::GridConfig config = m_gridRenderer->getGridConfig();
            config.showCoordinates = enabled;
            m_gridRenderer->setGridConfig(config);
            update();
        }
    }
    bool TyrexViewWidget::isCoordinateDisplayEnabled() const {
        return m_gridRenderer ? m_gridRenderer->getGridConfig().showCoordinates : false;
    }

    void TyrexViewWidget::setSketchModeGrid(bool enabled) {
        if (!m_gridRenderer) return;
        TyrexCAD::GridConfig config;
        if (enabled) {
            // Sketch mode specific grid settings
            config.baseSpacing = 10.0;
            config.majorLineInterval = 5;
            // ... (other sketch-specific settings)
            config.style = TyrexCAD::GridStyle::Lines;
            config.showCoordinates = true;
            config.snapEnabled = true;
        }
        else {
            // Default 3D mode grid settings
            config = m_gridRenderer->getGridConfig(); // Start with current or a default
            config.baseSpacing = 25.0;
            config.showCoordinates = false;
            config.snapEnabled = false;
        }
        m_gridRenderer->setGridConfig(config);
        m_gridRenderer->setGridEnabled(enabled);
        update();
    }

    void TyrexViewWidget::mousePressEvent(QMouseEvent* e) {
        if (m_interactionManager) m_interactionManager->onMousePress(e->button(), e->pos());
        QOpenGLWidget::mousePressEvent(e);
    }
    void TyrexViewWidget::mouseMoveEvent(QMouseEvent* e) {
        updateCursorPosition(e->pos());
        if (m_interactionManager) m_interactionManager->onMouseMove(e->pos(), e->modifiers());
        QOpenGLWidget::mouseMoveEvent(e);
    }
    void TyrexViewWidget::mouseReleaseEvent(QMouseEvent* e) {
        if (m_interactionManager) m_interactionManager->onMouseRelease(e->button(), e->pos());
        QOpenGLWidget::mouseReleaseEvent(e);
    }
    void TyrexViewWidget::wheelEvent(QWheelEvent* e) {
        if (m_interactionManager) m_interactionManager->onMouseWheel(e->angleDelta().y(), e->position().toPoint());
        QOpenGLWidget::wheelEvent(e);
    }

    void TyrexViewWidget::enterEvent(QEnterEvent* event) { // QEnterEvent is correct
        m_cursorInWidget = true;
        if (event) updateCursorPosition(event->pos()); // Check if event is not null
        QOpenGLWidget::enterEvent(event);
    }

    void TyrexViewWidget::leaveEvent(QEvent* event) { // QEvent is correct base for leaveEvent
        m_cursorInWidget = false;
        m_currentCursorPos = QPoint(-1, -1); // Invalidate cursor position
        if (isCoordinateDisplayEnabled()) update(); // Repaint to remove coordinates
        QOpenGLWidget::leaveEvent(event);
    }

    void TyrexViewWidget::updateCursorPosition(const QPoint& pos) {
        m_currentCursorPos = pos;
        if (m_cursorInWidget && isCoordinateDisplayEnabled() && m_viewerManager) {
            double worldX, worldY;
            gp_Pnt modelPnt = m_viewerManager->screenToModel(pos);
            worldX = modelPnt.X();
            worldY = modelPnt.Y();

            if (m_gridRenderer && m_gridRenderer->isGridEnabled() && m_gridRenderer->getGridConfig().snapEnabled) {
                m_gridRenderer->snapToGrid(worldX, worldY, worldX, worldY);
            }
            emit cursorWorldPosition(worldX, worldY);
        }
        if (m_cursorInWidget && isCoordinateDisplayEnabled()) update();
    }

} // namespace TyrexCAD