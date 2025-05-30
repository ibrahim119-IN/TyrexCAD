/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexApp/TyrexMainWindow.h"
#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexInteraction/TyrexInteractionManager.h"
#include "TyrexCore/TyrexCommandManager.h"
#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexCanvas/TyrexModelSpace.h"
#include "TyrexEntities/TyrexLineEntity.h"
#include "TyrexEntities/TyrexCircleEntity.h"
#include "TyrexEntities/TyrexEntity.h"
#include "TyrexCore/TyrexLineCommand.h"
#include "TyrexSketch/TyrexSketchLineCommand.h"
#include "TyrexSketch/TyrexSketchCircleCommand.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"
#include "TyrexRendering/TyrexUnifiedGridSystem.h"
#include "TyrexSnapping/TyrexSnapManager.h"
#include "TyrexLayers/TyrexLayerManager.h"
#include "TyrexCore/CoordinateConverter.h"

#include <QMenuBar>
#include <QToolBar>
#include <QStatusBar>
#include <QDockWidget>
#include <QListWidget>
#include <QVBoxLayout>
#include <QLabel>
#include <QTimer>
#include <QDebug>
#include <QMessageBox>
#include <QSlider>
#include <QSpinBox>
#include <QComboBox>
#include <QActionGroup>
#include <QFileDialog>
#include <QInputDialog>
#include <QKeyEvent>
#include <QApplication>
#include <QMainWindow>
#include <QAction>
#include <QFrame>
#include <QDebug>
#include <QThread>
#include <Standard_Failure.hxx>
#include <Standard_Transient.hxx>
#include <gp_Pnt.hxx>
#include <Quantity_Color.hxx>
#include <V3d_View.hxx>
#include <V3d_Viewer.hxx>

namespace TyrexCAD {

    TyrexMainWindow::TyrexMainWindow(QWidget* parent)
        : QMainWindow(parent),
        m_commandManager(nullptr),
        m_isInSketchMode(false),
        m_componentsInitialized(false),
        m_initializationAttempts(0),
        m_coordinateLabel(nullptr),
        m_gridStatusLabel(nullptr),
        m_fileToolBar(nullptr),
        m_editToolBar(nullptr),
        m_viewToolBar(nullptr),
        m_drawToolBar(nullptr),
        m_sketchToolBar(nullptr),
        m_gridStyleGroup(nullptr),
        m_debugMode(false),
        m_openGLDependentComponentsInitialized(false)
    {
        setWindowTitle("TyrexCAD");
        setGeometry(100, 100, 1200, 800);

        setupUI();
        createActions();
        createAdvancedSketchActions();
        createSketchActions();
        createMenus();
        createToolbars();
        createDockWindows();
        setupStatusBar();

        // Enable debug mode by default in development
#ifdef DEBUG
        enableDebugMode(true);
#endif

        QTimer::singleShot(100, this, &TyrexMainWindow::initialize);
    }

    TyrexMainWindow::~TyrexMainWindow()
    {
        qDebug() << "TyrexMainWindow destroyed";
    }

    void TyrexMainWindow::setupUI()
    {
        auto* viewWidget = new TyrexViewWidget(this);
        setCentralWidget(viewWidget);
    }

    void TyrexMainWindow::initialize()
    {
        qDebug() << "=== TyrexMainWindow::initialize() ===";

        auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (!viewWidget) {
            qCritical() << "Failed to get view widget!";
            return;
        }

        // Wait for window to be fully visible
        QApplication::processEvents();

        m_viewerManager = viewWidget->viewerManager();
        if (!m_viewerManager) {
            qCritical() << "Failed to get viewer manager!";
            return;
        }

        initializeConnections();

        // Connect to viewer initialized signal
        connect(viewWidget, &TyrexViewWidget::viewerInitialized, this, [this]() {
            qDebug() << "=== Viewer Initialized Signal Received ===";
            m_initializationAttempts = 0; // Reset attempts counter
            initializeComponentsAfterViewer();
            });

        // CRITICAL: Connect to OpenGL context ready signal for deferred initialization
        connect(viewWidget, &TyrexViewWidget::glContextInitializedAndCurrent,
            this, &TyrexMainWindow::onOpenGLReadyForGrid);

        // Also attempt initialization with multiple retries
        QTimer* initTimer = new QTimer(this);
        connect(initTimer, &QTimer::timeout, this, [this, initTimer]() {
            m_initializationAttempts++;
            qDebug() << "=== Initialization attempt #" << m_initializationAttempts << " ===";

            if (m_componentsInitialized || m_initializationAttempts > 10) {
                initTimer->stop();
                initTimer->deleteLater();

                if (!m_componentsInitialized) {
                    qCritical() << "Failed to initialize components after 10 attempts!";
                    QMessageBox::critical(this, "Initialization Error",
                        "Failed to initialize CAD components. Some features may not work properly.");
                }
                return;
            }

            if (checkViewerReadiness()) {
                initializeComponentsAfterViewer();
                if (m_componentsInitialized) {
                    initTimer->stop();
                    initTimer->deleteLater();
                }
            }
            });

        initTimer->start(500); // Try every 500ms
    }

    bool TyrexMainWindow::checkViewerReadiness()
    {
        if (!m_viewerManager) {
            qDebug() << "Viewer manager not available";
            return false;
        }

        if (m_viewerManager->context().IsNull()) {
            qDebug() << "Viewer context is null";
            return false;
        }

        if (m_viewerManager->view().IsNull()) {
            qDebug() << "Viewer view is null";
            return false;
        }

        qDebug() << "Viewer is ready";
        return true;
    }

    void TyrexMainWindow::initializeComponentsAfterViewer()
    {
        qDebug() << "=== Initializing Components After Viewer ===";

        if (!checkViewerReadiness()) {
            qDebug() << "Viewer not ready, aborting component initialization";
            return;
        }

        // Wait for OpenCascade to stabilize
        QApplication::processEvents();
        QThread::msleep(100);

        try {
            // Initialize layer manager first (NOT OpenGL dependent)
            if (!m_layerManager) {
                qDebug() << "Initializing layer manager...";
                m_layerManager = std::make_unique<TyrexLayerManager>(this);
                if (!m_layerManager->setupLayers(m_viewerManager->viewer())) {
                    qCritical() << "Failed to setup layers!";
                    return;
                }
                qDebug() << "Layer manager initialized successfully";
            }

            // DEFERRED: Do NOT initialize unified grid system here
            // It will be initialized in onOpenGLReadyForGrid()

            // Initialize model space (NOT OpenGL dependent)
            if (!m_modelSpace) {
                qDebug() << "Initializing model space...";
                initializeModelSpace();
                if (!m_modelSpace) {
                    qCritical() << "Failed to initialize model space!";
                    return;
                }
                qDebug() << "Model space initialized successfully";
            }

            // Initialize command manager (NOT OpenGL dependent)
            if (!m_commandManager) {
                qDebug() << "Initializing command manager...";
                initializeCommandManager();
                if (!m_commandManager) {
                    qCritical() << "Failed to initialize command manager!";
                    return;
                }
                qDebug() << "Command manager initialized successfully";
            }

            // Initialize sketch manager (NOT OpenGL dependent)
            if (!m_sketchManager) {
                qDebug() << "Initializing sketch manager...";
                initializeSketchManager();
                if (!m_sketchManager) {
                    qCritical() << "Failed to initialize sketch manager!";
                    return;
                }
                qDebug() << "Sketch manager initialized successfully";
            }

            m_componentsInitialized = true;
            qDebug() << "=== Non-OpenGL components initialized successfully ===";
            qDebug() << "=== Waiting for OpenGL context to be ready for grid initialization ===";

            updateStatusBar("TyrexCAD initializing...");

        }
        catch (const std::exception& e) {
            qCritical() << "Exception during component initialization:" << e.what();
            m_componentsInitialized = false;
        }
        catch (...) {
            qCritical() << "Unknown exception during component initialization";
            m_componentsInitialized = false;
        }
    }

    void TyrexMainWindow::onOpenGLReadyForGrid()
    {
        qDebug() << "=== OpenGL Context Ready - Initializing Grid System ===";

        if (m_openGLDependentComponentsInitialized) {
            qDebug() << "OpenGL dependent components already initialized";
            return;
        }

        if (!m_viewerManager || !m_layerManager) {
            qCritical() << "Cannot initialize grid - missing dependencies";
            return;
        }

        try {
            // Initialize unified grid system
            if (!m_unifiedGrid) {
                qDebug() << "Initializing unified grid system...";
                m_unifiedGrid = std::make_unique<TyrexUnifiedGridSystem>(this);
                if (!m_unifiedGrid->initialize(m_viewerManager,
                    m_layerManager->getLayerId(TyrexLayerManager::GRID_MAJOR))) {
                    qCritical() << "Failed to initialize unified grid!";
                    return;
                }
                qDebug() << "Unified grid system initialized successfully";
            }

            // Initialize snap manager (depends on grid overlay)
            if (!m_snapManager && m_unifiedGrid) {
                qDebug() << "Initializing snap manager...";
                m_snapManager = std::make_unique<TyrexSnapManager>(this);
                m_snapManager->setCanvasOverlay(m_unifiedGrid->overlay());
                m_snapManager->setModelSpace(m_modelSpace.get());
                m_snapManager->setCoordinateConverter(std::make_unique<CoordinateConverter>());

                // Configure default snap types
                m_snapManager->setActiveSnapTypes(
                    TyrexSnapManager::Grid |
                    TyrexSnapManager::Endpoint |
                    TyrexSnapManager::Midpoint
                );

                // Set snap manager in command manager
                if (m_commandManager) {
                    m_commandManager->setSnapManager(m_snapManager.get());
                }

                qDebug() << "Snap manager initialized successfully";
            }

            // Connect unified system signals
            connectUnifiedSystemSignals();

            m_openGLDependentComponentsInitialized = true;

            // Update UI to reflect grid state
            updateGridUI();
            updateSnapUI();

            updateStatusBar("TyrexCAD initialized successfully");
            qDebug() << "=== All OpenGL-dependent components initialized successfully ===";

        }
        catch (const std::exception& e) {
            qCritical() << "Exception during OpenGL-dependent component initialization:" << e.what();
        }
        catch (...) {
            qCritical() << "Unknown exception during OpenGL-dependent component initialization";
        }
    }

    void TyrexMainWindow::initializeModelSpace()
    {
        if (!m_viewerManager || m_viewerManager->context().IsNull()) {
            qCritical() << "Cannot initialize model space - invalid context";
            return;
        }

        try {
            m_modelSpace = std::make_unique<TyrexModelSpace>(m_viewerManager->context());
            qDebug() << "Model space created successfully";
        }
        catch (const Standard_Failure& e) {
            qCritical() << "OpenCascade error creating model space:" << e.GetMessageString();
            m_modelSpace.reset();
        }
        catch (const std::exception& e) {
            qCritical() << "Error creating model space:" << e.what();
            m_modelSpace.reset();
        }
    }

    void TyrexMainWindow::initializeCommandManager()
    {
        if (!m_viewerManager || !m_modelSpace) {
            qCritical() << "Cannot initialize command manager - missing dependencies";
            return;
        }

        try {
            auto* interactionManager = new TyrexInteractionManager();
            interactionManager->setViewerManager(m_viewerManager.get());
            m_viewerManager->setInteractionManager(interactionManager);

            m_commandManager = new TyrexCommandManager(this);
            m_commandManager->setModelSpace(m_modelSpace.get());
            m_commandManager->setViewerManager(m_viewerManager.get());

            connect(m_commandManager, &TyrexCommandManager::commandStarted,
                this, [this](const std::string& commandName) {
                    updateStatusBar(QString("Command started: %1").arg(QString::fromStdString(commandName)));
                });
            connect(m_commandManager, &TyrexCommandManager::commandFinished,
                this, &TyrexMainWindow::onCommandFinished);
            connect(m_commandManager, &TyrexCommandManager::commandCanceled,
                this, []() { qDebug() << "Command canceled"; });

            interactionManager->setCommandManager(m_commandManager);
            qDebug() << "Command manager created and configured successfully";

        }
        catch (const std::exception& e) {
            qCritical() << "Error creating command manager:" << e.what();
            m_commandManager = nullptr;
        }
    }

    void TyrexMainWindow::initializeSketchManager()
    {
        if (!m_viewerManager || m_viewerManager->context().IsNull()) {
            qCritical() << "Cannot initialize sketch manager - invalid context";
            return;
        }

        try {
            qDebug() << "Creating TyrexSketchManager...";
            m_sketchManager = std::make_shared<TyrexSketchManager>(
                m_viewerManager->context(),
                m_viewerManager.get(),
                this
            );

            if (!m_sketchManager) {
                qCritical() << "Failed to create TyrexSketchManager!";
                return;
            }

            qDebug() << "TyrexSketchManager created, setting up connections...";
            setupConnections();

            if (auto* interactionManager = m_viewerManager->interactionManager()) {
                interactionManager->setSketchManager(m_sketchManager.get());
                qDebug() << "Sketch manager set in interaction manager";
            }

            qDebug() << "Sketch manager initialized completely";

        }
        catch (const Standard_Failure& e) {
            qCritical() << "OpenCascade error creating sketch manager:" << e.GetMessageString();
            m_sketchManager.reset();
        }
        catch (const std::exception& e) {
            qCritical() << "Error creating sketch manager:" << e.what();
            m_sketchManager.reset();
        }
        catch (...) {
            qCritical() << "Unknown error creating sketch manager";
            m_sketchManager.reset();
        }
    }

    void TyrexMainWindow::initializeUnifiedSystems()
    {
        // This method is now integrated into onOpenGLReadyForGrid
        // Kept for backward compatibility if needed
    }

    void TyrexMainWindow::connectUnifiedSystemSignals()
    {
        if (!m_unifiedGrid || !m_snapManager) {
            return;
        }

        // Grid system signals
        connect(m_unifiedGrid.get(), &TyrexUnifiedGridSystem::gridSpacingChanged,
            this, [this](double spacing) {
                updateStatusBar(QString("Grid spacing: %1").arg(spacing, 0, 'f', 2));
            });

        connect(m_unifiedGrid.get(), &TyrexUnifiedGridSystem::gridConfigChanged,
            this, &TyrexMainWindow::updateSketchStatusBar);

        connect(m_unifiedGrid.get(), &TyrexUnifiedGridSystem::gridVisibilityChanged,
            this, [this](bool visible) {
                if (m_toggleGridAction) {
                    m_toggleGridAction->setChecked(visible);
                }
                updateStatusBar(visible ? "Grid enabled" : "Grid disabled");
            });

        // Snap manager signals
        connect(m_snapManager.get(), &TyrexSnapManager::snapOccurred,
            this, [this](const TyrexSnapManager::SnapResult& result) {
                if (result.snapped) {
                    updateStatusBar(result.description);
                }
            });

        connect(m_snapManager.get(), &TyrexSnapManager::snapTypesChanged,
            this, [this](TyrexSnapManager::SnapTypes) {
                updateSnapUI();
            });

        // Layer manager signals
        if (m_layerManager) {
            connect(m_layerManager.get(), &TyrexLayerManager::layerVisibilityChanged,
                this, [this](TyrexLayerManager::LayerId layerId, bool visible) {
                    qDebug() << "Layer" << static_cast<int>(layerId)
                        << "visibility changed to" << visible;
                });
        }

        // Enable grid by default
        if (m_unifiedGrid) {
            m_unifiedGrid->setGridVisible(true);
            if (m_toggleGridAction) {
                m_toggleGridAction->setChecked(true);
            }
        }
    }

    bool TyrexMainWindow::ensureSketchManagerInitialized()
    {
        if (m_sketchManager) {
            qDebug() << "Sketch manager already initialized";
            return true;
        }

        qDebug() << "=== Attempting to initialize sketch manager on demand ===";

        if (!checkViewerReadiness()) {
            qCritical() << "Cannot initialize sketch manager - viewer not ready";
            return false;
        }

        initializeSketchManager();

        if (!m_sketchManager) {
            qCritical() << "Failed to initialize sketch manager on demand";
            return false;
        }

        qDebug() << "Sketch manager initialized successfully on demand";
        return true;
    }

    void TyrexMainWindow::initializeConnections()
    {
        auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (!viewWidget) {
            qCritical() << "No view widget found!";
            return;
        }

        connect(viewWidget, &TyrexViewWidget::cursorWorldPosition,
            this, [this](double x, double y) {
                if (m_coordinateLabel && m_toggleCoordinatesAction &&
                    m_toggleCoordinatesAction->isChecked()) {
                    m_coordinateLabel->setText(QString("X: %1, Y: %2")
                        .arg(x, 0, 'f', 2).arg(y, 0, 'f', 2));
                }
                else if (m_coordinateLabel) {
                    m_coordinateLabel->setText("X: --, Y: --");
                }
            });

        connect(viewWidget, &TyrexViewWidget::gridConfigChanged,
            this, &TyrexMainWindow::updateSketchStatusBar);

        connect(viewWidget, &TyrexViewWidget::gridSpacingChanged,
            this, [this](double spacing) {
                updateStatusBar(QString("Grid spacing: %1").arg(spacing, 0, 'f', 2));
            });
    }

    void TyrexMainWindow::setupConnections()
    {
        if (!m_sketchManager) {
            qDebug() << "Cannot setup connections - sketch manager is null";
            return;
        }

        qDebug() << "Setting up sketch manager connections...";

        connect(m_sketchManager.get(), &TyrexSketchManager::sketchModeEntered,
            this, &TyrexMainWindow::updateSketchModeUI);
        connect(m_sketchManager.get(), &TyrexSketchManager::sketchModeExited,
            this, &TyrexMainWindow::updateSketchModeUI);
        connect(m_sketchManager.get(), &TyrexSketchManager::statusMessage,
            this, &TyrexMainWindow::updateStatusBar);
        connect(m_sketchManager.get(), &TyrexSketchManager::entitySelected,
            this, &TyrexMainWindow::onSketchEntitySelected);
        connect(m_sketchManager.get(), &TyrexSketchManager::entityModified,
            this, &TyrexMainWindow::onSketchEntityModified);

        qDebug() << "Sketch manager connections established";
    }

    void TyrexMainWindow::createActions()
    {
        m_newAction = new QAction(tr("&New"), this);
        m_newAction->setShortcut(QKeySequence::New);
        connect(m_newAction, &QAction::triggered, this, &TyrexMainWindow::newFile);

        m_openAction = new QAction(tr("&Open..."), this);
        m_openAction->setShortcut(QKeySequence::Open);
        connect(m_openAction, &QAction::triggered, this, &TyrexMainWindow::openFile);

        m_saveAction = new QAction(tr("&Save"), this);
        m_saveAction->setShortcut(QKeySequence::Save);
        connect(m_saveAction, &QAction::triggered, this, &TyrexMainWindow::saveFile);

        m_saveAsAction = new QAction(tr("Save &As..."), this);
        m_saveAsAction->setShortcut(QKeySequence::SaveAs);
        connect(m_saveAsAction, &QAction::triggered, this, &TyrexMainWindow::saveFileAs);

        m_exitAction = new QAction(tr("E&xit"), this);
        m_exitAction->setShortcut(QKeySequence::Quit);
        connect(m_exitAction, &QAction::triggered, this, &QWidget::close);

        m_lineAction = new QAction(tr("&Line"), this);
        m_lineAction->setShortcut(Qt::Key_L);
        connect(m_lineAction, &QAction::triggered, this, &TyrexMainWindow::startLineCommand);

        m_directLineAction = new QAction(tr("&Direct Line"), this);
        connect(m_directLineAction, &QAction::triggered, this, &TyrexMainWindow::createSampleLine);

        m_aboutAction = new QAction(tr("&About"), this);
        connect(m_aboutAction, &QAction::triggered, this, &TyrexMainWindow::about);

        m_testGeometryAction = new QAction(tr("Create Test Geometry"), this);
        connect(m_testGeometryAction, &QAction::triggered, this, &TyrexMainWindow::createTestGeometry);
    }

    void TyrexMainWindow::createAdvancedSketchActions()
    {
        m_toggleGridAction = new QAction(tr("Show &Grid"), this);
        m_toggleGridAction->setCheckable(true);
        m_toggleGridAction->setChecked(true);
        m_toggleGridAction->setShortcut(Qt::Key_F7);
        connect(m_toggleGridAction, &QAction::triggered, this, [this](bool checked) {
            if (m_unifiedGrid) {
                m_unifiedGrid->setGridVisible(checked);
            }
            });

        m_toggleSnapAction = new QAction(tr("Snap to Grid"), this);
        m_toggleSnapAction->setCheckable(true);
        m_toggleSnapAction->setChecked(false);
        m_toggleSnapAction->setShortcut(Qt::Key_F9);
        connect(m_toggleSnapAction, &QAction::triggered, this, [this](bool checked) {
            if (m_snapManager) {
                m_snapManager->setEnabled(checked);
            }
            if (m_unifiedGrid) {
                m_unifiedGrid->setSnapEnabled(checked);
            }
            updateStatusBar(checked ? "Snap enabled" : "Snap disabled");
            });

        m_toggleOrthoAction = new QAction(tr("Ortho Mode"), this);
        m_toggleOrthoAction->setCheckable(true);
        m_toggleOrthoAction->setChecked(false);
        m_toggleOrthoAction->setShortcut(Qt::Key_F8);

        m_gridStyleGroup = new QActionGroup(this);

        m_gridLinesAction = new QAction(tr("Grid Lines"), this);
        m_gridLinesAction->setCheckable(true);
        m_gridLinesAction->setChecked(true);
        m_gridStyleGroup->addAction(m_gridLinesAction);

        m_gridDotsAction = new QAction(tr("Grid Dots"), this);
        m_gridDotsAction->setCheckable(true);
        m_gridStyleGroup->addAction(m_gridDotsAction);

        m_gridCrossesAction = new QAction(tr("Grid Crosses"), this);
        m_gridCrossesAction->setCheckable(true);
        m_gridStyleGroup->addAction(m_gridCrossesAction);

        connect(m_gridLinesAction, &QAction::triggered, this, [this]() {
            if (m_unifiedGrid) {
                m_unifiedGrid->setGridStyle(GridStyle::Lines);
            }
            });

        connect(m_gridDotsAction, &QAction::triggered, this, [this]() {
            if (m_unifiedGrid) {
                m_unifiedGrid->setGridStyle(GridStyle::Dots);
            }
            });

        connect(m_gridCrossesAction, &QAction::triggered, this, [this]() {
            if (m_unifiedGrid) {
                m_unifiedGrid->setGridStyle(GridStyle::Crosses);
            }
            });

        m_gridSpacingAction = new QAction(tr("Grid Spacing..."), this);
        connect(m_gridSpacingAction, &QAction::triggered, this, [this]() {
            bool ok;
            double currentSpacing = m_unifiedGrid ? m_unifiedGrid->getCurrentGridSpacing() : 10.0;
            double spacing = QInputDialog::getDouble(this, tr("Grid Spacing"),
                tr("Enter grid spacing:"), currentSpacing, 1.0, 1000.0, 1, &ok);
            if (ok && m_unifiedGrid) {
                m_unifiedGrid->setGridSpacing(spacing);
            }
            });

        m_toggleCoordinatesAction = new QAction(tr("Show Coordinates"), this);
        m_toggleCoordinatesAction->setCheckable(true);
        m_toggleCoordinatesAction->setChecked(true);
    }

    void TyrexMainWindow::createSketchActions()
    {
        m_sketchModeAction = new QAction(tr("Enter Sketch Mode"), this);
        m_sketchModeAction->setCheckable(true);
        m_sketchModeAction->setShortcut(Qt::Key_S);
        connect(m_sketchModeAction, &QAction::triggered, this, &TyrexMainWindow::toggleSketchMode);

        m_exitSketchAction = new QAction(tr("Exit Sketch"), this);
        m_exitSketchAction->setShortcut(Qt::Key_Escape);
        m_exitSketchAction->setVisible(false);
        connect(m_exitSketchAction, &QAction::triggered, this, &TyrexMainWindow::exitSketchMode);

        m_sketchLineAction = new QAction(tr("Sketch &Line"), this);
        m_sketchLineAction->setShortcut(Qt::SHIFT | Qt::Key_L);
        m_sketchLineAction->setEnabled(false);
        connect(m_sketchLineAction, &QAction::triggered, this, &TyrexMainWindow::startSketchLineCommand);

        m_sketchCircleAction = new QAction(tr("Sketch &Circle"), this);
        m_sketchCircleAction->setShortcut(Qt::SHIFT | Qt::Key_C);
        m_sketchCircleAction->setEnabled(false);
        connect(m_sketchCircleAction, &QAction::triggered, this, &TyrexMainWindow::startSketchCircleCommand);
    }

    void TyrexMainWindow::createMenus()
    {
        m_fileMenu = menuBar()->addMenu(tr("&File"));
        m_fileMenu->addAction(m_newAction);
        m_fileMenu->addAction(m_openAction);
        m_fileMenu->addAction(m_saveAction);
        m_fileMenu->addAction(m_saveAsAction);
        m_fileMenu->addSeparator();
        m_fileMenu->addAction(m_exitAction);

        m_editMenu = menuBar()->addMenu(tr("&Edit"));

        m_viewMenu = menuBar()->addMenu(tr("&View"));
        m_viewMenu->addAction(m_toggleGridAction);
        m_viewMenu->addAction(m_toggleSnapAction);
        m_viewMenu->addAction(m_toggleOrthoAction);
        m_viewMenu->addSeparator();
        m_viewMenu->addAction(m_toggleCoordinatesAction);
        m_viewMenu->addSeparator();
        QMenu* gridStyleMenu = m_viewMenu->addMenu(tr("Grid Style"));
        gridStyleMenu->addAction(m_gridLinesAction);
        gridStyleMenu->addAction(m_gridDotsAction);
        gridStyleMenu->addAction(m_gridCrossesAction);
        m_viewMenu->addAction(m_gridSpacingAction);

        m_drawMenu = menuBar()->addMenu(tr("&Draw"));
        m_drawMenu->addAction(m_lineAction);
        m_drawMenu->addAction(m_directLineAction);
        m_drawMenu->addSeparator();
        m_drawMenu->addAction(m_sketchModeAction);

        m_sketchMenu = menuBar()->addMenu(tr("&Sketch"));
        m_sketchMenu->addAction(m_exitSketchAction);
        m_sketchMenu->addSeparator();
        m_sketchMenu->addAction(m_sketchLineAction);
        m_sketchMenu->addAction(m_sketchCircleAction);

        m_toolsMenu = menuBar()->addMenu(tr("&Tools"));
        m_toolsMenu->addAction(m_testGeometryAction);

        m_helpMenu = menuBar()->addMenu(tr("&Help"));
        m_helpMenu->addAction(m_aboutAction);
    }

    void TyrexMainWindow::createToolbars()
    {
        m_fileToolBar = addToolBar(tr("File"));
        m_fileToolBar->addAction(m_newAction);
        m_fileToolBar->addAction(m_openAction);
        m_fileToolBar->addAction(m_saveAction);

        m_viewToolBar = addToolBar(tr("View"));
        m_viewToolBar->addAction(m_toggleGridAction);
        m_viewToolBar->addAction(m_toggleSnapAction);
        m_viewToolBar->addAction(m_toggleOrthoAction);

        QToolBar* gridToolBar = addToolBar(tr("Grid Controls"));

        QLabel* spacingLabel = new QLabel("Grid Spacing: ");
        gridToolBar->addWidget(spacingLabel);

        QSlider* spacingSlider = new QSlider(Qt::Horizontal);
        spacingSlider->setMinimum(5);
        spacingSlider->setMaximum(100);
        spacingSlider->setValue(10);
        spacingSlider->setFixedWidth(100);
        gridToolBar->addWidget(spacingSlider);

        QSpinBox* spacingSpinBox = new QSpinBox();
        spacingSpinBox->setMinimum(5);
        spacingSpinBox->setMaximum(100);
        spacingSpinBox->setValue(10);
        spacingSpinBox->setSuffix(" units");
        gridToolBar->addWidget(spacingSpinBox);

        connect(spacingSlider, &QSlider::valueChanged, spacingSpinBox, &QSpinBox::setValue);
        connect(spacingSpinBox, QOverload<int>::of(&QSpinBox::valueChanged),
            spacingSlider, &QSlider::setValue);
        connect(spacingSpinBox, QOverload<int>::of(&QSpinBox::valueChanged),
            this, [this](int value) {
                if (m_unifiedGrid) {
                    m_unifiedGrid->setGridSpacing(static_cast<double>(value));
                }
            });

        gridToolBar->addSeparator();

        QLabel* styleLabel = new QLabel("Grid Style: ");
        gridToolBar->addWidget(styleLabel);

        QComboBox* styleCombo = new QComboBox();
        styleCombo->addItems({ "Lines", "Dots", "Crosses" });
        gridToolBar->addWidget(styleCombo);

        connect(styleCombo, QOverload<int>::of(&QComboBox::currentIndexChanged),
            this, [this](int index) {
                if (m_unifiedGrid) {
                    m_unifiedGrid->setGridStyle(static_cast<GridStyle>(index));
                }
            });

        m_drawToolBar = addToolBar(tr("Draw"));
        m_drawToolBar->addAction(m_lineAction);
        m_drawToolBar->addAction(m_directLineAction);
        m_drawToolBar->addSeparator();
        m_drawToolBar->addAction(m_sketchModeAction);

        m_sketchToolBar = addToolBar(tr("Sketch"));
        m_sketchToolBar->addAction(m_exitSketchAction);
        m_sketchToolBar->addSeparator();
        m_sketchToolBar->addAction(m_sketchLineAction);
        m_sketchToolBar->addAction(m_sketchCircleAction);
        m_sketchToolBar->setVisible(false);
    }

    void TyrexMainWindow::createDockWindows()
    {
        QDockWidget* propertiesDock = new QDockWidget(tr("Properties"), this);
        QListWidget* propertiesList = new QListWidget(propertiesDock);
        propertiesDock->setWidget(propertiesList);
        addDockWidget(Qt::RightDockWidgetArea, propertiesDock);

        QDockWidget* entitiesDock = new QDockWidget(tr("Entities"), this);
        QListWidget* entitiesList = new QListWidget(entitiesDock);
        entitiesDock->setWidget(entitiesList);
        addDockWidget(Qt::LeftDockWidgetArea, entitiesDock);
    }

    void TyrexMainWindow::setupStatusBar()
    {
        statusBar()->showMessage(tr("Ready"));

        m_coordinateLabel = new QLabel("X: --, Y: --");
        m_coordinateLabel->setFrameStyle(QFrame::Panel | QFrame::Sunken);
        m_coordinateLabel->setMinimumWidth(150);
        statusBar()->addPermanentWidget(m_coordinateLabel);

        m_gridStatusLabel = new QLabel("Grid: ON");
        m_gridStatusLabel->setFrameStyle(QFrame::Panel | QFrame::Sunken);
        m_gridStatusLabel->setMinimumWidth(100);
        statusBar()->addPermanentWidget(m_gridStatusLabel);
    }

    void TyrexMainWindow::updateStatusBar(const QString& message)
    {
        statusBar()->showMessage(message, 5000);
    }

    void TyrexMainWindow::updateSketchStatusBar()
    {
        if (m_isInSketchMode) {
            if (m_gridStatusLabel) {
                m_gridStatusLabel->setText("Sketch Mode");
            }

            if (m_unifiedGrid) {
                GridConfig config = m_unifiedGrid->getGridConfig();
                QString snapStatus = config.snapEnabled ? "ON" : "OFF";
                updateStatusBar(QString("Sketch Mode - Snap: %1").arg(snapStatus));
            }
        }
        else {
            if (m_gridStatusLabel) {
                m_gridStatusLabel->setText("3D Mode");
            }
        }
    }

    void TyrexMainWindow::updateSketchModeUI()
    {
        m_isInSketchMode = m_sketchManager && m_sketchManager->isInSketchMode();
        qDebug() << "=== Updating UI for sketch mode: " << m_isInSketchMode << " ===";

        if (m_sketchModeAction) {
            m_sketchModeAction->setChecked(m_isInSketchMode);
            m_sketchModeAction->setText(m_isInSketchMode ?
                tr("Exit Sketch Mode") : tr("Enter Sketch Mode"));
        }

        if (m_exitSketchAction) m_exitSketchAction->setVisible(m_isInSketchMode);
        if (m_sketchLineAction) m_sketchLineAction->setEnabled(m_isInSketchMode);
        if (m_sketchCircleAction) m_sketchCircleAction->setEnabled(m_isInSketchMode);

        if (m_drawToolBar) m_drawToolBar->setVisible(!m_isInSketchMode);
        if (m_sketchToolBar) m_sketchToolBar->setVisible(m_isInSketchMode);

        if (m_isInSketchMode && m_unifiedGrid) {
            m_unifiedGrid->setGridVisible(true);
            if (m_toggleGridAction) m_toggleGridAction->setChecked(true);
        }

        updateSketchStatusBar();
    }

    void TyrexMainWindow::updateGridUI()
    {
        if (!m_unifiedGrid) {
            return;
        }

        // Update grid visibility toggle
        if (m_toggleGridAction) {
            m_toggleGridAction->setChecked(m_unifiedGrid->isGridVisible());
        }

        // Update snap toggle
        if (m_toggleSnapAction) {
            m_toggleSnapAction->setChecked(m_unifiedGrid->isSnapEnabled());
        }

        // Update grid style
        GridStyle currentStyle = m_unifiedGrid->getGridStyle();
        switch (currentStyle) {
        case GridStyle::Lines:
            if (m_gridLinesAction) m_gridLinesAction->setChecked(true);
            break;
        case GridStyle::Dots:
            if (m_gridDotsAction) m_gridDotsAction->setChecked(true);
            break;
        case GridStyle::Crosses:
            if (m_gridCrossesAction) m_gridCrossesAction->setChecked(true);
            break;
        }
    }

    void TyrexMainWindow::updateSnapUI()
    {
        if (!m_snapManager) {
            return;
        }

        bool snapEnabled = m_snapManager->isEnabled();
        if (m_toggleSnapAction) {
            m_toggleSnapAction->setChecked(snapEnabled);
        }

        // Update status bar with active snap types
        auto activeTypes = m_snapManager->getActiveSnapTypes();
        QStringList typeNames;

        if (activeTypes & TyrexSnapManager::Grid) typeNames << "Grid";
        if (activeTypes & TyrexSnapManager::Endpoint) typeNames << "Endpoint";
        if (activeTypes & TyrexSnapManager::Midpoint) typeNames << "Midpoint";
        if (activeTypes & TyrexSnapManager::Center) typeNames << "Center";
        if (activeTypes & TyrexSnapManager::Intersection) typeNames << "Intersection";

        if (!typeNames.isEmpty()) {
            updateStatusBar(QString("Active snaps: %1").arg(typeNames.join(", ")));
        }
    }

    void TyrexMainWindow::newFile()
    {
        updateStatusBar("New file created");
    }

    void TyrexMainWindow::openFile()
    {
        QString fileName = QFileDialog::getOpenFileName(this,
            tr("Open File"), "", tr("TyrexCAD Files (*.txc);;All Files (*)"));
        if (!fileName.isEmpty()) {
            updateStatusBar(QString("Opened: %1").arg(fileName));
        }
    }

    void TyrexMainWindow::saveFile()
    {
        updateStatusBar("File saved");
    }

    void TyrexMainWindow::saveFileAs()
    {
        QString fileName = QFileDialog::getSaveFileName(this,
            tr("Save File As"), "", tr("TyrexCAD Files (*.txc);;All Files (*)"));
        if (!fileName.isEmpty()) {
            updateStatusBar(QString("Saved as: %1").arg(fileName));
        }
    }

    void TyrexMainWindow::about()
    {
        QMessageBox::about(this, tr("About TyrexCAD"),
            tr("TyrexCAD - A Modern CAD System\n\n"
                "Version 1.0\n\n"
                "Built with Qt and OpenCascade"));
    }

    void TyrexMainWindow::startLineCommand()
    {
        if (!m_commandManager || !m_modelSpace || !m_viewerManager) {
            return;
        }

        auto command = std::make_shared<TyrexLineCommand>(
            m_modelSpace.get(), m_viewerManager.get());
        m_commandManager->startCommand(command);
    }

    void TyrexMainWindow::addSampleEntity()
    {
        if (!m_modelSpace) return;

        auto line = std::make_shared<TyrexLineEntity>(
            "sample_line", "default", Quantity_NOC_YELLOW,
            gp_Pnt(0, 0, 0), gp_Pnt(100, 100, 0));
        m_modelSpace->addEntity(line);
        m_modelSpace->drawAll();
        updateStatusBar("Sample line entity added");
    }

    void TyrexMainWindow::createSampleLine()
    {
        addSampleEntity();
    }

    void TyrexMainWindow::onCommandFinished()
    {
        qDebug() << "Command finished";
        updateStatusBar("Ready");
    }

    void TyrexMainWindow::toggleSketchMode()
    {
        if (m_sketchModeAction->isChecked()) {
            enterSketchMode();
        }
        else {
            exitSketchMode();
        }
    }

    void TyrexMainWindow::enterSketchMode()
    {
        qDebug() << "=== TyrexMainWindow::enterSketchMode() ===";

        if (!ensureSketchManagerInitialized()) {
            qCritical() << "Cannot enter sketch mode - sketch manager initialization failed";
            QMessageBox::warning(this, "Error",
                "Cannot enter sketch mode. Sketch manager initialization failed.\n"
                "Please try restarting the application.");

            // Uncheck the action
            if (m_sketchModeAction) {
                m_sketchModeAction->setChecked(false);
            }
            return;
        }

        if (m_commandManager && m_commandManager->activeCommand()) {
            m_commandManager->cancelCommand();
        }

        m_sketchManager->enterSketchMode();

        updateStatusBar("Entered 2D Sketch Mode");
    }

    void TyrexMainWindow::exitSketchMode()
    {
        if (!m_sketchManager) {
            qDebug() << "No sketch manager available to exit sketch mode";
            return;
        }

        qDebug() << "=== TyrexMainWindow::exitSketchMode() ===";

        if (m_commandManager && m_commandManager->activeCommand()) {
            m_commandManager->cancelCommand();
        }

        m_sketchManager->exitSketchMode();

        updateStatusBar("Returned to 3D Modeling Mode");
    }

    void TyrexMainWindow::startSketchLineCommand()
    {
        if (!m_commandManager) {
            qWarning() << "No command manager available";
            return;
        }

        if (!ensureSketchManagerInitialized()) {
            QMessageBox::warning(this, "Error", "Sketch manager not initialized");
            return;
        }

        auto command = std::make_shared<TyrexSketchLineCommand>(m_sketchManager.get());
        m_commandManager->startCommand(command);
    }

    void TyrexMainWindow::startSketchCircleCommand()
    {
        if (!m_commandManager) {
            qWarning() << "No command manager available";
            return;
        }

        if (!ensureSketchManagerInitialized()) {
            QMessageBox::warning(this, "Error", "Sketch manager not initialized");
            return;
        }

        auto command = std::make_shared<TyrexSketchCircleCommand>(
            m_sketchManager.get(), TyrexSketchCircleCommand::CircleMode::CenterRadius);
        m_commandManager->startCommand(command);
    }

    void TyrexMainWindow::onSketchEntitySelected(const std::string& entityId)
    {
        updatePropertyPanel(entityId);
        updateStatusBar(QString("Selected: %1").arg(QString::fromStdString(entityId)));
    }

    void TyrexMainWindow::onSketchEntityModified(const std::string& entityId)
    {
        updatePropertyPanel(entityId);
        setDocumentModified(true);
    }

    void TyrexMainWindow::updatePropertyPanel(const std::string& entityId)
    {
        Q_UNUSED(entityId);
    }

    void TyrexMainWindow::clearPropertyPanel()
    {
    }

    void TyrexMainWindow::setDocumentModified(bool modified)
    {
        setWindowModified(modified);
    }

    void TyrexMainWindow::createTestGeometry()
    {
        qDebug() << "=== Starting createTestGeometry ===";

        // Debug unified systems
        if (m_unifiedGrid) {
            m_unifiedGrid->debugState();
        }

        if (m_layerManager) {
            qDebug() << "Layer manager initialized";
        }

        if (m_snapManager) {
            qDebug() << "Snap manager enabled:" << m_snapManager->isEnabled();
            qDebug() << "Active snap types:" << static_cast<int>(m_snapManager->getActiveSnapTypes());
        }

        // Check system state with debug
        if (m_viewerManager) {
            m_viewerManager->checkGraphicsDriver();
        }

        // Comprehensive component checking
        if (!m_viewerManager) {
            QMessageBox::warning(this, "Warning", "Viewer Manager not initialized");
            return;
        }

        if (!m_modelSpace) {
            QMessageBox::warning(this, "Warning", "Model Space not initialized");
            return;
        }

        auto context = m_viewerManager->context();
        auto view = m_viewerManager->view();

        if (context.IsNull() || view.IsNull()) {
            QMessageBox::critical(this, "Error", "Viewer context is not available");
            return;
        }

        try {
            // Stop automatic updates temporarily
            context->SetAutomaticHilight(Standard_False);

            // Clear with safe implementation
            m_modelSpace->clear();

            // Verify context is still valid
            if (m_viewerManager->context().IsNull()) {
                qCritical() << "Context became null after clear!";
                return;
            }

            // Create test geometry using internal function
            createGeometryInternal();

            // Restore automatic highlighting
            context->SetAutomaticHilight(Standard_True);

            // Draw all entities
            m_modelSpace->drawAll();

            // Update view
            if (!view.IsNull()) {
                view->FitAll();
                view->Redraw();
            }

            updateStatusBar("Test geometry created successfully");

        }
        catch (const Standard_Failure& ex) {
            QMessageBox::critical(this, "Error",
                QString("Failed to create geometry: %1").arg(ex.GetMessageString()));
        }
    }

    void TyrexMainWindow::createGeometryInternal()
    {
        // Create test geometry
        Quantity_Color colors[] = {
            Quantity_NOC_RED,
            Quantity_NOC_GREEN,
            Quantity_NOC_BLUE,
            Quantity_NOC_YELLOW,
            Quantity_NOC_CYAN
        };

        gp_Pnt points[] = {
            gp_Pnt(-50, -50, 0),
            gp_Pnt(50, -50, 0),
            gp_Pnt(50, 50, 0),
            gp_Pnt(-50, 50, 0)
        };

        const char* ids[] = { "line_1", "line_2", "line_3", "line_4" };

        // Create square lines
        for (int i = 0; i < 4; ++i) {
            auto line = std::make_shared<TyrexLineEntity>(
                ids[i], "default", colors[i],
                points[i], points[(i + 1) % 4]
            );
            m_modelSpace->addEntity(line);
        }

        // Create diagonal
        auto diag = std::make_shared<TyrexLineEntity>(
            "diag_line", "default", colors[4],
            points[0], points[2]
        );
        m_modelSpace->addEntity(diag);
    }

    void TyrexMainWindow::enableDebugMode(bool enable)
    {
        m_debugMode = enable;

        auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget) {
            viewWidget->enableDebugMode(enable);
        }

        if (enable) {
            qDebug() << "=== Debug Mode Enabled ===";

            // Add debug menu if not exists
            QMenu* debugMenu = menuBar()->findChild<QMenu*>("debugMenu");
            if (!debugMenu) {
                debugMenu = menuBar()->addMenu(tr("&Debug"));
                debugMenu->setObjectName("debugMenu");

                QAction* checkSystemAction = new QAction(tr("Check System State"), this);
                connect(checkSystemAction, &QAction::triggered, this, [this]() {
                    qDebug() << "=== System State Check ===";
                    qDebug() << "Components initialized:" << m_componentsInitialized;
                    qDebug() << "OpenGL dependent components initialized:" << m_openGLDependentComponentsInitialized;
                    qDebug() << "Model space:" << (m_modelSpace ? "OK" : "NULL");
                    qDebug() << "Command manager:" << (m_commandManager ? "OK" : "NULL");
                    qDebug() << "Sketch manager:" << (m_sketchManager ? "OK" : "NULL");
                    qDebug() << "Unified grid:" << (m_unifiedGrid ? "OK" : "NULL");
                    qDebug() << "Snap manager:" << (m_snapManager ? "OK" : "NULL");
                    qDebug() << "Layer manager:" << (m_layerManager ? "OK" : "NULL");

                    if (m_viewerManager) {
                        m_viewerManager->checkGraphicsDriver();
                    }

                    if (m_unifiedGrid) {
                        m_unifiedGrid->debugState();
                    }
                    });
                debugMenu->addAction(checkSystemAction);

                QAction* forceInitAction = new QAction(tr("Force Component Initialization"), this);
                connect(forceInitAction, &QAction::triggered, this, [this]() {
                    qDebug() << "=== Forcing component initialization ===";
                    initializeComponentsAfterViewer();
                    });
                debugMenu->addAction(forceInitAction);

                QAction* forceOpenGLInitAction = new QAction(tr("Force OpenGL Component Init"), this);
                connect(forceOpenGLInitAction, &QAction::triggered, this, [this]() {
                    qDebug() << "=== Forcing OpenGL component initialization ===";
                    onOpenGLReadyForGrid();
                    });
                debugMenu->addAction(forceOpenGLInitAction);

                QAction* toggleDebugOutput = new QAction(tr("Toggle Debug Output"), this);
                toggleDebugOutput->setCheckable(true);
                toggleDebugOutput->setChecked(true);
                debugMenu->addAction(toggleDebugOutput);
            }
        }
        else {
            qDebug() << "=== Debug Mode Disabled ===";
        }
    }

} // namespace TyrexCAD