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
#include "TyrexCanvas/TyrexCanvasOverlay.h"

// OpenCascade includes
#include <Standard_Handle.hxx>
#include <V3d_View.hxx>
#include <AIS_InteractiveContext.hxx>

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
#include <QThread> 

namespace TyrexCAD {

    TyrexViewWidget::TyrexViewWidget(QWidget* parent)
        : QOpenGLWidget(parent),
          m_gridRenderer(new TyrexGridOverlayRenderer()),
          m_canvasOverlay(nullptr),
          m_gridInitialized(false),
          m_cursorInWidget(false)
    {
        // Set OpenGL format with multisampling for antialiasing
        QSurfaceFormat format;
        format.setDepthBufferSize(24);
        format.setStencilBufferSize(8);
        format.setSamples(4); // Enable multisampling/antialiasing
        format.setVersion(3, 3);
        format.setProfile(QSurfaceFormat::CoreProfile);
        setFormat(format);

        // Initialize the viewer manager
        m_viewerManager = std::make_shared<TyrexViewerManager>();
        
        // Connect signals after initialization
        connect(this, &QOpenGLWidget::frameSwapped, this, [this]() {
            if (m_canvasOverlay) {
                m_canvasOverlay->update();
            }
        });

        // Schedule a delayed initialization for safety
        QTimer::singleShot(100, this, [this]() {
            if (m_viewerManager) {
                initializeOverlay();
                emit viewerInitialized();
            }
        });
    }

    TyrexViewWidget::~TyrexViewWidget()
    {
        // Cleanup grid renderer in OpenGL context
        if (QOpenGLContext::currentContext() == context()) {
            makeCurrent();
        }
        else if (context()) {
            makeCurrent();
        }

        m_gridRenderer.reset();
        m_canvasOverlay.reset();

        if (QOpenGLContext::currentContext() == context()) {
            doneCurrent();
        }

        qDebug() << "TyrexViewWidget destructor completed";
    }

    std::shared_ptr<TyrexViewerManager> TyrexViewWidget::viewerManager() const
    {
        return m_viewerManager;
    }

    TyrexInteractionManager* TyrexViewWidget::interactionManager() const
    {
        if (m_viewerManager) {
            return m_viewerManager->interactionManager();
        }
        return nullptr;
    }

    bool TyrexViewWidget::isGridEnabled() const
    {
        if (m_canvasOverlay) {
            return m_canvasOverlay->isGridVisible();
        }
        return false;
    }

    void TyrexViewWidget::setGridEnabled(bool enabled)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridVisible(enabled);
            update();
        }
    }

    void TyrexViewWidget::setGridConfig(const GridConfig& config)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridConfig(config);
            update();
            emit gridConfigChanged();
        }
    }

    const GridConfig& TyrexViewWidget::getGridConfig() const
    {
        static GridConfig defaultConfig;
        if (m_canvasOverlay) {
            return m_canvasOverlay->getGridConfig();
        }
        return defaultConfig;
    }

    void TyrexViewWidget::setGridStyle(GridStyle style)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridStyle(style);
            // Also update the grid renderer to match
            if (m_gridRenderer && m_gridInitialized) {
                m_gridRenderer->setGridStyle(style);
            }
            update();
        }
    }

    GridStyle TyrexViewWidget::getGridStyle() const
    {
        if (m_canvasOverlay) {
            return m_canvasOverlay->getGridStyle();
        }
        return GridStyle::Lines;
    }

    bool TyrexViewWidget::snapToGrid(double worldX, double worldY, double& snappedX, double& snappedY) const
    {
        if (m_canvasOverlay && m_canvasOverlay->getGridConfig().snapEnabled) {
            gp_Pnt2d point(worldX, worldY);
            gp_Pnt2d snapped = m_canvasOverlay->snapToGrid(point);
            snappedX = snapped.X();
            snappedY = snapped.Y();
            return (snappedX != worldX || snappedY != worldY);
        }
        else if (m_gridRenderer && m_gridInitialized) {
            // Fallback to grid renderer for snapping if canvas overlay isn't available
            return m_gridRenderer->snapToGrid(worldX, worldY, snappedX, snappedY);
        }
        
        snappedX = worldX;
        snappedY = worldY;
        return false;
    }

    void TyrexViewWidget::screenToWorld(const QPoint& screenPos, double& worldX, double& worldY) const
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
        if (m_canvasOverlay) {
            return m_canvasOverlay->getCurrentGridSpacing();
        }
        return 10.0;
    }

    void TyrexViewWidget::setCoordinateDisplayEnabled(bool enabled)
    {
        if (m_canvasOverlay) {
            GridConfig config = m_canvasOverlay->getGridConfig();
            config.showCoordinates = enabled;
            m_canvasOverlay->setGridConfig(config);
            update();
        }
    }

    bool TyrexViewWidget::isCoordinateDisplayEnabled() const
    {
        if (m_canvasOverlay) {
            return m_canvasOverlay->getGridConfig().showCoordinates;
        }
        return false;
    }

    void TyrexViewWidget::setSketchModeGrid(bool sketchMode)
    {
        if (m_canvasOverlay) {
            GridConfig config = m_canvasOverlay->getGridConfig();
            
            if (sketchMode) {
                // Enhanced grid for sketch mode
                config.showAxes = true;
                config.showOriginMarker = true;
                config.gridColorMajor = Quantity_Color(0.6, 0.6, 0.6, Quantity_TOC_RGB);
                config.gridColorMinor = Quantity_Color(0.4, 0.4, 0.4, Quantity_TOC_RGB);
                config.baseSpacing = 10.0;
                config.snapEnabled = true;
            } else {
                // Standard grid for 3D mode
                config.showAxes = true;
                config.showOriginMarker = true;
                config.gridColorMajor = Quantity_Color(0.5, 0.5, 0.5, Quantity_TOC_RGB);
                config.gridColorMinor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
                config.baseSpacing = 10.0;
                config.snapEnabled = false;
            }
            
            m_canvasOverlay->setGridConfig(config);
            update();
        }
    }

    void TyrexViewWidget::initializeGL()
    {
        qDebug() << "TyrexViewWidget::initializeGL()";
        initializeOpenGLFunctions();
        
        if (m_viewerManager) {
            m_viewerManager->initializeViewer(this);
            
            // Initialize overlay first to establish the canvas system
            initializeOverlay();
            
            // Now initialize OpenGL based grid renderer with proper connections to view
            if (m_gridRenderer) {
                // Connect grid renderer to the view
                if (!m_viewerManager->view().IsNull()) {
                    m_gridRenderer->setView(m_viewerManager->view());
                }
                
                bool success = m_gridRenderer->initialize();
                if (!success) {
                    qWarning() << "Failed to initialize grid renderer";
                }
                else {
                    qDebug() << "Grid renderer initialized successfully";
                    m_gridInitialized = true;
                    
                    // Sync grid configuration with canvas overlay
                    if (m_canvasOverlay) {
                        m_gridRenderer->setGridConfig(m_canvasOverlay->getGridConfig());
                        m_gridRenderer->setGridEnabled(m_canvasOverlay->isGridVisible());
                    }
                }
            }
        }
    }

    void TyrexViewWidget::initializeOverlay()
    {
        // Create or update canvas overlay
        if (!m_canvasOverlay && m_viewerManager) {
            auto context = m_viewerManager->context();
            auto view = m_viewerManager->view();
            
            if (!context.IsNull() && !view.IsNull()) {
                m_canvasOverlay = std::make_shared<TyrexCanvasOverlay>(context, view, this);
                
                // Connect signals
                connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridSpacingChanged, this, [this](double spacing) {
                    emit gridSpacingChanged(spacing);
                    if (m_gridRenderer && m_gridInitialized) {
                        // Update the grid renderer when spacing changes
                        m_gridRenderer->setGridConfig(m_canvasOverlay->getGridConfig());
                    }
                });
                
                connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridConfigChanged, this, [this]() {
                    emit gridConfigChanged();
                    if (m_gridRenderer && m_gridInitialized) {
                        // Keep grid renderer in sync with overlay
                        m_gridRenderer->setGridConfig(m_canvasOverlay->getGridConfig());
                        m_gridRenderer->setGridEnabled(m_canvasOverlay->isGridVisible());
                        update(); // Request a repaint to show changes
                    }
                });
                
                // Set default grid configuration
                GridConfig config = m_canvasOverlay->getGridConfig();
                config.showAxes = true;
                config.showOriginMarker = true;
                config.snapEnabled = true;
                m_canvasOverlay->setGridConfig(config);
                
                qDebug() << "Canvas overlay initialized";
            }
            else {
                qWarning() << "Cannot initialize canvas overlay - context or view is null";
            }
        }
    }

    void TyrexViewWidget::paintGL()
    {
        if (m_viewerManager) {
            m_viewerManager->redraw();
        }
        
        // Use grid renderer for OpenGL drawing based on canvas overlay settings
        if (m_gridRenderer && m_gridInitialized && m_canvasOverlay) {
            // Synchronize grid visibility state with canvas overlay
            m_gridRenderer->setGridEnabled(m_canvasOverlay->isGridVisible());
            
            // Get cursor position for coordinate display
            QPoint cursorPos(-1, -1);
            if (underMouse() && m_cursorInWidget) {
                cursorPos = m_currentCursorPos;
            }
            
            // Render the grid with current settings
            m_gridRenderer->render(width(), height(), cursorPos);
        }
    }

    void TyrexViewWidget::resizeGL(int width, int height)
    {
        if (m_viewerManager) {
            m_viewerManager->resizeViewer(width, height);
        }
        
        // Update our view extents for the grid when resizing
        if (m_canvasOverlay) {
            m_canvasOverlay->update();
        }
    }

    void TyrexViewWidget::mousePressEvent(QMouseEvent* event)
    {
        if (m_viewerManager) {
            m_viewerManager->mousePress(event);
        }
        
        updateCursorPosition(event->pos());
    }

    void TyrexViewWidget::mouseMoveEvent(QMouseEvent* event)
    {
        if (m_viewerManager) {
            m_viewerManager->mouseMove(event);
        }
        
        updateCursorPosition(event->pos());
    }

    void TyrexViewWidget::mouseReleaseEvent(QMouseEvent* event)
    {
        if (m_viewerManager) {
            m_viewerManager->mouseRelease(event);
        }
        
        updateCursorPosition(event->pos());
    }

    void TyrexViewWidget::wheelEvent(QWheelEvent* event)
    {
        if (m_viewerManager) {
            m_viewerManager->mouseWheel(event);
            
            // Update grid after zoom
            if (m_canvasOverlay) {
                m_canvasOverlay->update();
            }
        }
    }

    void TyrexViewWidget::leaveEvent(QEvent* event)
    {
        QOpenGLWidget::leaveEvent(event);
        m_cursorInWidget = false;
        emit cursorWorldPosition(0, 0); // Clear coordinates when cursor leaves
    }

    void TyrexViewWidget::updateCursorPosition(const QPoint& pos)
    {
        m_currentCursorPos = pos;
        m_cursorInWidget = true;
        
        // Calculate and emit world coordinates for cursor position
        double worldX = 0.0, worldY = 0.0;
        
        // Prefer using canvas overlay if available
        if (m_canvasOverlay && m_viewerManager && !m_viewerManager->view().IsNull()) {
            // Convert screen to world using View methods
            Standard_Real xv, yv, zv;
            m_viewerManager->view()->Convert(pos.x(), pos.y(), xv, yv, zv);
            worldX = xv;
            worldY = yv;
            
            // Apply snap if enabled
            if (m_canvasOverlay->getGridConfig().snapEnabled) {
                gp_Pnt2d point(worldX, worldY);
                gp_Pnt2d snapped = m_canvasOverlay->snapToGrid(point);
                worldX = snapped.X();
                worldY = snapped.Y();
            }
        } 
        // Fallback to grid renderer if available
        else if (m_gridRenderer && m_gridInitialized) {
            m_gridRenderer->screenToWorld(pos.x(), pos.y(), worldX, worldY);
            
            // Apply snap if needed
            double snappedX, snappedY;
            if (snapToGrid(worldX, worldY, snappedX, snappedY)) {
                worldX = snappedX;
                worldY = snappedY;
            }
        }
        
        emit cursorWorldPosition(worldX, worldY);
    }

} // namespace TyrexCAD