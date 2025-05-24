/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexApp/TyrexMainWindow.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexCanvas/TyrexModelSpace.h"
#include "TyrexEntities/TyrexLineEntity.h"
#include "TyrexEntities/TyrexCircleEntity.h"
#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexCore/TyrexCommandManager.h"
#include "TyrexCore/TyrexLineCommand.h"
#include "TyrexInteraction/TyrexInteractionManager.h"
#include "TyrexCore/TyrexSelectionMode.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h" // للوصول إلى GridStyle

 // Include sketch system
#include "TyrexSketch/TyrexSketch.h"
#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexSketch/TyrexSketchConfig.h"
#include "TyrexSketch/TyrexSketchDisplayHelper.h"

// OpenCascade
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <gp_Pnt.hxx>
#include <Quantity_Color.hxx>
#include <Quantity_NameOfColor.hxx>
#include <V3d_TypeOfOrientation.hxx>
#include <AIS_InteractiveContext.hxx>
#include <V3d_View.hxx>

// Qt
#include <QStatusBar>
#include <QDockWidget>
#include <QVBoxLayout>
#include <QTimer>
#include <QMenuBar>
#include <QToolBar>
#include <QAction>
#include <QFileDialog>
#include <QMessageBox>
#include <QDebug>
#include <QActionGroup>
#include <QToolButton>

namespace TyrexCAD {

    TyrexMainWindow::TyrexMainWindow(QWidget* parent)
        : QMainWindow(parent),
        m_viewerManager(nullptr),
        m_modelSpace(nullptr),
        m_commandManager(nullptr),
        m_sketchManager(nullptr),
        m_isInSketchMode(false),
        m_lineAction(nullptr),
        m_directLineAction(nullptr),
        m_testGeometryAction(nullptr),
        m_sketchModeAction(nullptr),
        m_exitSketchAction(nullptr),
        m_sketchLineAction(nullptr),
        m_sketchCircleAction(nullptr),
        m_toggleGridAction(nullptr),
        m_toggleSnapAction(nullptr),
        m_toggleOrthoAction(nullptr),
        m_gridStyleGroup(nullptr),
        m_gridLinesAction(nullptr),
        m_gridDotsAction(nullptr),
        m_gridCrossesAction(nullptr)
    {
        setupUI();
        initializeViewers();
        createActions();
        createMenus();
        createToolbars();
        setupConnections();

        // Set window title
        setWindowTitle("TyrexCAD");
        resize(1200, 800);
    }

    TyrexMainWindow::~TyrexMainWindow()
    {
        // Clean up pointers
        delete m_commandManager;
        m_commandManager = nullptr;
    }

    void TyrexMainWindow::setupUI()
    {
        // Show status message
        statusBar()->showMessage("Initializing...");
    }

    void TyrexMainWindow::initializeViewers()
    {
        qDebug() << "=== TyrexMainWindow::initializeViewers() ===";

        // Create view widget
        auto viewWidget = new TyrexViewWidget(this);
        setCentralWidget(viewWidget);
        qDebug() << "View widget created and set as central widget";

        // Connect to viewer initialization
        connect(viewWidget, &TyrexViewWidget::viewerInitialized, this, [this, viewWidget]() {
            qDebug() << "=== MainWindow received viewerInitialized signal ===";

            // Store viewer manager from view widget
            m_viewerManager = viewWidget->viewerManager();

            if (m_viewerManager) {
                qDebug() << "Viewer manager retrieved successfully";

                // Verify OpenCascade components
                Handle(AIS_InteractiveContext) context = m_viewerManager->context();
                Handle(V3d_View) view = m_viewerManager->view();

                if (context.IsNull()) {
                    qCritical() << "AIS Context is null!";
                    return;
                }
                if (view.IsNull()) {
                    qCritical() << "V3d View is null!";
                    return;
                }
                qDebug() << "OpenCascade components verified OK";

                // Create model space with OpenCascade context
                m_modelSpace = std::make_unique<TyrexModelSpace>(context);
                qDebug() << "Model space created";

                // Initialize command system
                initializeCommandSystem();
                qDebug() << "Command system initialized";

                // Initialize sketch system
                initializeSketchSystem();
                qDebug() << "Sketch system initialized";

                // Create test geometry immediately
                QTimer::singleShot(200, this, [this]() {
                    qDebug() << "Timer fired - calling createTestGeometry()";
                    createTestGeometry();
                    });

                // Update status
                statusBar()->showMessage("System initialized - creating test shapes...", 3000);
            }
            else {
                qCritical() << "Failed to retrieve viewer manager!";
                statusBar()->showMessage("Failed to initialize 3D viewer", 5000);
            }
            });

        qDebug() << "View widget signal connected";
    }

    void TyrexMainWindow::initializeCommandSystem()
    {
        qDebug() << "=== TyrexMainWindow::initializeCommandSystem() ===";

        if (!m_viewerManager || !m_modelSpace) {
            qCritical() << "Cannot initialize command system - missing components:"
                << "ViewerManager:" << (m_viewerManager ? "OK" : "NULL")
                << "ModelSpace:" << (m_modelSpace ? "OK" : "NULL");
            return;
        }

        // Create command manager
        m_commandManager = new TyrexCommandManager(this);
        qDebug() << "Command manager created";

        // Connect command signals
        connect(m_commandManager, &TyrexCommandManager::commandStarted,
            this, [this](const std::string& cmdName) {
                QString cmdDisplay = QString::fromStdString(cmdName);
                if (m_isInSketchMode) {
                    statusBar()->showMessage(QString("Sketch Command: %1 - Click to begin").arg(cmdDisplay));
                }
                else {
                    statusBar()->showMessage(QString("Command: %1 - Click to place first point").arg(cmdDisplay));
                }
                qDebug() << "Command started:" << cmdDisplay;
            });

        connect(m_commandManager, &TyrexCommandManager::commandFinished,
            this, &TyrexMainWindow::onCommandFinished);

        connect(m_commandManager, &TyrexCommandManager::commandCanceled,
            this, [this]() {
                statusBar()->showMessage("Command canceled", 2000);
                qDebug() << "Command canceled";
            });

        // Get the interaction manager from the viewer manager
        auto interactionManager = m_viewerManager->interactionManager();

        // Connect interaction manager
        if (interactionManager) {
            qDebug() << "Interaction manager retrieved successfully";
            interactionManager->setCommandManager(m_commandManager);
            qDebug() << "Command manager connected to interaction manager";
        }
        else {
            qCritical() << "Failed to get interaction manager from viewer manager";
        }

        // Set references in command manager
        m_commandManager->setModelSpace(m_modelSpace.get());
        m_commandManager->setViewerManager(m_viewerManager.get());

        // Update status bar
        statusBar()->showMessage("Command system initialized", 2000);
        qDebug() << "Command system initialization completed";
    }

    void TyrexMainWindow::initializeSketchSystem()
    {
        qDebug() << "=== TyrexMainWindow::initializeSketchSystem() ===";

        if (!m_viewerManager) {
            qCritical() << "Cannot initialize sketch system - no viewer manager";
            return;
        }

        Handle(AIS_InteractiveContext) context = m_viewerManager->context();
        if (context.IsNull()) {
            qCritical() << "Cannot initialize sketch system - no AIS context";
            return;
        }

        try {
            // Create sketch manager with enhanced configuration
            m_sketchManager = Sketch::createSketchManager(context, m_viewerManager.get(), this);

            // Connect sketch manager signals with enhanced handlers
            connect(m_sketchManager.get(), &TyrexSketchManager::sketchModeEntered,
                this, [this]() {
                    updateSketchModeUI();
                    setupSketchModeToolbars();
                    updateStatusBar("Sketch Mode Active - Grid Snap: ON | Ortho: OFF | Dynamic Input: ON");
                });

            connect(m_sketchManager.get(), &TyrexSketchManager::sketchModeExited,
                this, [this]() {
                    updateSketchModeUI();
                    restoreNormalToolbars();
                    updateStatusBar("3D Modeling Mode");
                });

            connect(m_sketchManager.get(), &TyrexSketchManager::entitySelected,
                this, [this](const std::string& entityId) {
                    onSketchEntitySelected(entityId);
                    updatePropertyPanel(entityId);
                });

            connect(m_sketchManager.get(), &TyrexSketchManager::entityModified,
                this, [this](const std::string& entityId) {
                    onSketchEntityModified(entityId);
                    setDocumentModified(true);
                });

            connect(m_sketchManager.get(), &TyrexSketchManager::selectionCleared,
                this, [this]() {
                    clearPropertyPanel();
                    statusBar()->showMessage("Selection cleared", 2000);
                });

            // Set sketch manager in interaction manager
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget && viewWidget->interactionManager()) {
                viewWidget->interactionManager()->setSketchManager(m_sketchManager.get());
                qDebug() << "Sketch manager connected to interaction manager";
            }

            // Create sketch mode actions
            createAdvancedSketchActions();

            qDebug() << "Sketch system initialized successfully with enhanced features";
        }
        catch (const std::exception& ex) {
            qCritical() << "Error initializing sketch system:" << ex.what();
        }
    }

    void TyrexMainWindow::onCommandFinished()
    {
        if (m_isInSketchMode) {
            statusBar()->showMessage("Sketch command completed successfully", 2000);
        }
        else {
            statusBar()->showMessage("Command completed successfully", 2000);
        }
        qDebug() << "Command finished notification received";
    }

    void TyrexMainWindow::startLineCommand()
    {
        qDebug() << "=== TyrexMainWindow::startLineCommand() ===";

        if (!m_commandManager) {
            qWarning() << "Cannot start line command - command manager not initialized";
            statusBar()->showMessage("Error: Command system not ready", 3000);
            return;
        }

        // Use the command system to start the line command
        bool success = m_commandManager->createAndStartCommand("Line");

        if (success) {
            qDebug() << "Line command started successfully through command system";
            statusBar()->showMessage("Line command: Click to place first point", 0);
        }
        else {
            qWarning() << "Failed to start line command";
            statusBar()->showMessage("Error: Failed to start line command", 3000);
        }
    }

    void TyrexMainWindow::createSampleLine()
    {
        qDebug() << "=== TyrexMainWindow::createSampleLine() ===";

        // Check if components are initialized
        if (!m_viewerManager || !m_modelSpace) {
            qWarning() << "Cannot create sample line - components not initialized";
            statusBar()->showMessage("Error: Components not initialized", 2000);
            return;
        }

        try {
            // Define line endpoints
            gp_Pnt startPoint(0.0, 0.0, 0.0);
            gp_Pnt endPoint(100.0, 100.0, 0.0);  // Diagonal line in XY plane

            // Define line color (cyan)
            Quantity_Color lineColor(0.0, 1.0, 1.0, Quantity_TOC_RGB);

            // Create line entity
            auto lineEntity = std::make_shared<TyrexLineEntity>(
                "sample_line",    // ID
                "default",        // Layer
                lineColor,        // Color
                startPoint,       // Start point
                endPoint          // End point
            );

            // Add line to model space
            m_modelSpace->addEntity(lineEntity);
            qDebug() << "Sample line added to model space";

            // Update view
            m_viewerManager->fitAll();
            m_viewerManager->redraw();

            // Update status bar
            statusBar()->showMessage("Sample line created successfully", 3000);
            qDebug() << "Sample line creation completed";
        }
        catch (const std::exception& ex) {
            qCritical() << "Exception creating sample line:" << ex.what();
            statusBar()->showMessage("Error creating sample line", 3000);
        }
        catch (...) {
            qCritical() << "Unknown exception creating sample line";
            statusBar()->showMessage("Error creating sample line", 3000);
        }
    }

    void TyrexMainWindow::createTestGeometry()
    {
        qDebug() << "=== TyrexMainWindow::createTestGeometry() ===";

        if (!m_modelSpace || !m_viewerManager) {
            qCritical() << "Cannot create geometry - missing components"
                << "ModelSpace:" << (m_modelSpace ? "OK" : "NULL")
                << "ViewerManager:" << (m_viewerManager ? "OK" : "NULL");
            return;
        }

        try {
            // Clear existing shapes
            m_modelSpace->clear();
            qDebug() << "Model space cleared";

            // Get context
            Handle(AIS_InteractiveContext) context = m_viewerManager->context();
            if (context.IsNull()) {
                qCritical() << "AIS context is null!";
                return;
            }
            qDebug() << "Got AIS context - valid";

            // Create simple test shapes - a square made of 4 lines
            qDebug() << "Creating test entities...";

            // Bottom line (Red)
            Quantity_Color redColor(1.0, 0.0, 0.0, Quantity_TOC_RGB);
            auto bottomLine = std::make_shared<TyrexLineEntity>(
                "bottom_line", "default", redColor,
                gp_Pnt(-50, -50, 0), gp_Pnt(50, -50, 0)
            );
            m_modelSpace->addEntity(bottomLine);
            qDebug() << "Added bottom line (red)";

            // Right line (Green)
            Quantity_Color greenColor(0.0, 1.0, 0.0, Quantity_TOC_RGB);
            auto rightLine = std::make_shared<TyrexLineEntity>(
                "right_line", "default", greenColor,
                gp_Pnt(50, -50, 0), gp_Pnt(50, 50, 0)
            );
            m_modelSpace->addEntity(rightLine);
            qDebug() << "Added right line (green)";

            // Top line (Blue)
            Quantity_Color blueColor(0.0, 0.0, 1.0, Quantity_TOC_RGB);
            auto topLine = std::make_shared<TyrexLineEntity>(
                "top_line", "default", blueColor,
                gp_Pnt(50, 50, 0), gp_Pnt(-50, 50, 0)
            );
            m_modelSpace->addEntity(topLine);
            qDebug() << "Added top line (blue)";

            // Left line (Yellow)
            Quantity_Color yellowColor(1.0, 1.0, 0.0, Quantity_TOC_RGB);
            auto leftLine = std::make_shared<TyrexLineEntity>(
                "left_line", "default", yellowColor,
                gp_Pnt(-50, 50, 0), gp_Pnt(-50, -50, 0)
            );
            m_modelSpace->addEntity(leftLine);
            qDebug() << "Added left line (yellow)";

            // Diagonal line (Cyan)
            Quantity_Color cyanColor(0.0, 1.0, 1.0, Quantity_TOC_RGB);
            auto diagonalLine = std::make_shared<TyrexLineEntity>(
                "diagonal_line", "default", cyanColor,
                gp_Pnt(-50, -50, 0), gp_Pnt(50, 50, 0)
            );
            m_modelSpace->addEntity(diagonalLine);
            qDebug() << "Added diagonal line (cyan)";

            qDebug() << "All entities created, now drawing...";

            // Force draw all
            m_modelSpace->drawAll();
            qDebug() << "Model space drawAll() called";

            // Update view
            Handle(V3d_View) view = m_viewerManager->view();
            if (!view.IsNull()) {
                view->SetProj(V3d_Zpos);  // Top view
                view->SetImmediateUpdate(Standard_True);
                view->FitAll();
                view->ZFitAll();
                view->Redraw();
                view->Update();
                qDebug() << "View updated and fitted";
            }
            else {
                qWarning() << "View is null!";
            }

            // Force context update
            context->UpdateCurrentViewer();
            qDebug() << "Context updated";

            statusBar()->showMessage("Test shapes created successfully!", 3000);
            qDebug() << "=== createTestGeometry() completed successfully ===";
        }
        catch (const Standard_Failure& ex) {
            qCritical() << "OpenCascade error in createTestGeometry():" << ex.GetMessageString();
            statusBar()->showMessage("OpenCascade error creating shapes", 3000);
        }
        catch (const std::exception& ex) {
            qCritical() << "Standard error in createTestGeometry():" << ex.what();
            statusBar()->showMessage("Error creating shapes", 3000);
        }
        catch (...) {
            qCritical() << "Unknown error in createTestGeometry()";
            statusBar()->showMessage("Unknown error creating shapes", 3000);
        }
    }

    void TyrexMainWindow::addSampleEntity()
    {
        // Direct method to create a sample line
        createSampleLine();
    }

    void TyrexMainWindow::createActions()
    {
        qDebug() << "Creating actions...";

        // === FILE ACTIONS ===
        m_newAction = new QAction(tr("&New"), this);
        m_newAction->setShortcuts(QKeySequence::New);
        m_newAction->setStatusTip(tr("Create a new file"));
        connect(m_newAction, &QAction::triggered, this, &TyrexMainWindow::newFile);

        m_openAction = new QAction(tr("&Open..."), this);
        m_openAction->setShortcuts(QKeySequence::Open);
        m_openAction->setStatusTip(tr("Open an existing file"));
        connect(m_openAction, &QAction::triggered, this, &TyrexMainWindow::openFile);

        m_saveAction = new QAction(tr("&Save"), this);
        m_saveAction->setShortcuts(QKeySequence::Save);
        m_saveAction->setStatusTip(tr("Save the document to disk"));
        connect(m_saveAction, &QAction::triggered, this, &TyrexMainWindow::saveFile);

        m_saveAsAction = new QAction(tr("Save &As..."), this);
        m_saveAsAction->setShortcuts(QKeySequence::SaveAs);
        m_saveAsAction->setStatusTip(tr("Save the document under a new name"));
        connect(m_saveAsAction, &QAction::triggered, this, &TyrexMainWindow::saveFileAs);

        m_exitAction = new QAction(tr("E&xit"), this);
        m_exitAction->setShortcuts(QKeySequence::Quit);
        m_exitAction->setStatusTip(tr("Exit the application"));
        connect(m_exitAction, &QAction::triggered, this, &QWidget::close);

        // === 3D DRAWING COMMANDS ===
        m_lineAction = new QAction(tr("&Line"), this);
        m_lineAction->setStatusTip(tr("Create a line by selecting two points"));
        connect(m_lineAction, &QAction::triggered, this, [this]() {
            qDebug() << "Line action triggered";
            startLineCommand();
            });

        m_directLineAction = new QAction(tr("&Direct Line"), this);
        m_directLineAction->setStatusTip(tr("Create a line directly"));
        connect(m_directLineAction, &QAction::triggered, this, [this]() {
            qDebug() << "Direct line action triggered";
            QTimer::singleShot(100, this, [this]() {
                if (m_viewerManager && m_modelSpace) {
                    createSampleLine();
                }
                else {
                    statusBar()->showMessage("System not ready, please try again", 2000);
                }
                });
            });

        m_testGeometryAction = new QAction(tr("Create Test &Shapes"), this);
        m_testGeometryAction->setStatusTip(tr("Create test shapes for debugging"));
        connect(m_testGeometryAction, &QAction::triggered, this, [this]() {
            qDebug() << "Manual test geometry creation triggered";
            createTestGeometry();
            });

        // === SKETCH ACTIONS ===
        createSketchActions();

        // === HELP ACTIONS ===
        m_aboutAction = new QAction(tr("&About"), this);
        m_aboutAction->setStatusTip(tr("Show the application's About box"));
        connect(m_aboutAction, &QAction::triggered, this, &TyrexMainWindow::about);

        qDebug() << "Actions created successfully";
    }

    void TyrexMainWindow::createSketchActions()
    {
        qDebug() << "Creating sketch actions...";

        // Toggle sketch mode
        m_sketchModeAction = new QAction(tr("&Sketch Mode"), this);
        m_sketchModeAction->setShortcut(QKeySequence(tr("Ctrl+K")));
        m_sketchModeAction->setStatusTip(tr("Enter/Exit 2D parametric sketching mode"));
        m_sketchModeAction->setCheckable(true);
        m_sketchModeAction->setChecked(false);
        connect(m_sketchModeAction, &QAction::triggered, this, &TyrexMainWindow::toggleSketchMode);

        // Exit sketch mode (initially hidden)
        m_exitSketchAction = new QAction(tr("Exit &Sketch"), this);
        m_exitSketchAction->setShortcut(QKeySequence(tr("Esc")));
        m_exitSketchAction->setStatusTip(tr("Exit sketch mode and return to 3D modeling"));
        m_exitSketchAction->setVisible(false);
        connect(m_exitSketchAction, &QAction::triggered, this, &TyrexMainWindow::exitSketchMode);

        // Sketch line
        m_sketchLineAction = new QAction(tr("Sketch &Line"), this);
        m_sketchLineAction->setShortcut(QKeySequence(tr("L")));
        m_sketchLineAction->setStatusTip(tr("Draw a line segment in sketch mode"));
        m_sketchLineAction->setEnabled(false);
        connect(m_sketchLineAction, &QAction::triggered, this, &TyrexMainWindow::startSketchLineCommand);

        // Sketch circle
        m_sketchCircleAction = new QAction(tr("Sketch &Circle"), this);
        m_sketchCircleAction->setShortcut(QKeySequence(tr("C")));
        m_sketchCircleAction->setStatusTip(tr("Draw a circle in sketch mode"));
        m_sketchCircleAction->setEnabled(false);
        connect(m_sketchCircleAction, &QAction::triggered, this, &TyrexMainWindow::startSketchCircleCommand);

        qDebug() << "Sketch actions created successfully";
    }

    void TyrexMainWindow::createAdvancedSketchActions()
    {
        // Grid toggle action
        m_toggleGridAction = new QAction(tr("Toggle &Grid"), this);
        m_toggleGridAction->setShortcut(QKeySequence(tr("F7")));
        m_toggleGridAction->setCheckable(true);
        m_toggleGridAction->setChecked(true);
        m_toggleGridAction->setStatusTip(tr("Toggle grid visibility"));
        connect(m_toggleGridAction, &QAction::triggered, this, [this](bool checked) {
            if (m_sketchManager) {
                m_sketchManager->setGridVisible(checked);
                statusBar()->showMessage(checked ? "Grid ON" : "Grid OFF", 2000);
            }
            });

        // Snap toggle action
        m_toggleSnapAction = new QAction(tr("Toggle &Snap"), this);
        m_toggleSnapAction->setShortcut(QKeySequence(tr("F9")));
        m_toggleSnapAction->setCheckable(true);
        m_toggleSnapAction->setChecked(true);
        m_toggleSnapAction->setStatusTip(tr("Toggle grid snap"));
        connect(m_toggleSnapAction, &QAction::triggered, this, [this](bool checked) {
            if (m_sketchManager && m_sketchManager->canvasOverlay()) {
                auto config = m_sketchManager->canvasOverlay()->getGridConfig();
                // TODO: Add snap enable/disable to grid config
                statusBar()->showMessage(checked ? "Snap ON" : "Snap OFF", 2000);
            }
            });

        // Ortho mode action
        m_toggleOrthoAction = new QAction(tr("Toggle &Ortho"), this);
        m_toggleOrthoAction->setShortcut(QKeySequence(tr("F8")));
        m_toggleOrthoAction->setCheckable(true);
        m_toggleOrthoAction->setChecked(false);
        m_toggleOrthoAction->setStatusTip(tr("Toggle orthogonal mode"));
        connect(m_toggleOrthoAction, &QAction::triggered, this, [this](bool checked) {
            // TODO: Implement ortho mode in sketch manager
            statusBar()->showMessage(checked ? "Ortho ON" : "Ortho OFF", 2000);
            });

        // Grid style actions
        m_gridStyleGroup = new QActionGroup(this);

        m_gridLinesAction = new QAction(tr("Grid &Lines"), this);
        m_gridLinesAction->setCheckable(true);
        m_gridLinesAction->setChecked(true);
        m_gridStyleGroup->addAction(m_gridLinesAction);
        connect(m_gridLinesAction, &QAction::triggered, this, [this]() {
            if (m_sketchManager && m_sketchManager->canvasOverlay()) {
                m_sketchManager->canvasOverlay()->setGridStyle(GridStyle::Lines);
            }
            });

        m_gridDotsAction = new QAction(tr("Grid &Dots"), this);
        m_gridDotsAction->setCheckable(true);
        m_gridStyleGroup->addAction(m_gridDotsAction);
        connect(m_gridDotsAction, &QAction::triggered, this, [this]() {
            if (m_sketchManager && m_sketchManager->canvasOverlay()) {
                m_sketchManager->canvasOverlay()->setGridStyle(GridStyle::Dots);
            }
            });

        m_gridCrossesAction = new QAction(tr("Grid &Crosses"), this);
        m_gridCrossesAction->setCheckable(true);
        m_gridStyleGroup->addAction(m_gridCrossesAction);
        connect(m_gridCrossesAction, &QAction::triggered, this, [this]() {
            if (m_sketchManager && m_sketchManager->canvasOverlay()) {
                m_sketchManager->canvasOverlay()->setGridStyle(GridStyle::Crosses);
            }
            });
    }

    void TyrexMainWindow::createMenus()
    {
        // === FILE MENU ===
        m_fileMenu = menuBar()->addMenu(tr("&File"));
        m_fileMenu->addAction(m_newAction);
        m_fileMenu->addAction(m_openAction);
        m_fileMenu->addAction(m_saveAction);
        m_fileMenu->addAction(m_saveAsAction);
        m_fileMenu->addSeparator();
        m_fileMenu->addAction(m_exitAction);

        // === EDIT MENU ===
        m_editMenu = menuBar()->addMenu(tr("&Edit"));

        // === VIEW MENU ===
        m_viewMenu = menuBar()->addMenu(tr("&View"));
        m_viewMenu->addSeparator();
        m_viewMenu->addAction(m_testGeometryAction);

        // === DRAW MENU (3D) ===
        m_drawMenu = menuBar()->addMenu(tr("&Draw"));
        m_drawMenu->addAction(m_lineAction);
        m_drawMenu->addAction(m_directLineAction);

        // === SKETCH MENU ===
        createSketchMenus();

        // === TOOLS MENU ===
        m_toolsMenu = menuBar()->addMenu(tr("&Tools"));

        // === HELP MENU ===
        m_helpMenu = menuBar()->addMenu(tr("&Help"));
        m_helpMenu->addAction(m_aboutAction);

        qDebug() << "Menus created successfully";
    }

    void TyrexMainWindow::createSketchMenus()
    {
        m_sketchMenu = menuBar()->addMenu(tr("&Sketch"));
        m_sketchMenu->addAction(m_sketchModeAction);
        m_sketchMenu->addAction(m_exitSketchAction);
        m_sketchMenu->addSeparator();
        m_sketchMenu->addAction(m_sketchLineAction);
        m_sketchMenu->addAction(m_sketchCircleAction);

        qDebug() << "Sketch menus created successfully";
    }

    void TyrexMainWindow::createToolbars()
    {
        // === FILE TOOLBAR ===
        m_fileToolBar = addToolBar(tr("File"));
        m_fileToolBar->setObjectName("FileToolBar");
        m_fileToolBar->addAction(m_newAction);
        m_fileToolBar->addAction(m_openAction);
        m_fileToolBar->addAction(m_saveAction);

        // === EDIT TOOLBAR ===
        m_editToolBar = addToolBar(tr("Edit"));
        m_editToolBar->setObjectName("EditToolBar");

        // === VIEW TOOLBAR ===
        m_viewToolBar = addToolBar(tr("View"));
        m_viewToolBar->setObjectName("ViewToolBar");
        m_viewToolBar->addSeparator();
        m_viewToolBar->addAction(m_testGeometryAction);

        // === DRAW TOOLBAR (3D) ===
        m_drawToolBar = addToolBar(tr("Draw"));
        m_drawToolBar->setObjectName("DrawToolBar");
        m_drawToolBar->addAction(m_lineAction);
        m_drawToolBar->addAction(m_directLineAction);

        // === SKETCH TOOLBAR ===
        createSketchToolbars();

        qDebug() << "Toolbars created successfully";
    }

    void TyrexMainWindow::createSketchToolbars()
    {
        m_sketchToolBar = addToolBar(tr("Sketch"));
        m_sketchToolBar->setObjectName("SketchToolBar");

        // Mode control
        m_sketchToolBar->addAction(m_sketchModeAction);
        m_sketchToolBar->addAction(m_exitSketchAction);
        m_sketchToolBar->addSeparator();

        // Drawing tools
        m_sketchToolBar->addAction(m_sketchLineAction);
        m_sketchToolBar->addAction(m_sketchCircleAction);

        qDebug() << "Sketch toolbars created successfully";
    }

    void TyrexMainWindow::setupConnections()
    {
        // Additional connections not covered by action setup
    }

    void TyrexMainWindow::updateSketchModeUI()
    {
        bool inSketchMode = m_sketchManager && m_sketchManager->isInSketchMode();
        m_isInSketchMode = inSketchMode;

        qDebug() << "Updating UI for sketch mode:" << inSketchMode;

        // Update action states
        m_sketchModeAction->setChecked(inSketchMode);
        m_sketchModeAction->setText(inSketchMode ? tr("Exit Sketch &Mode") : tr("&Sketch Mode"));
        m_sketchModeAction->setStatusTip(inSketchMode ?
            tr("Exit sketch mode and return to 3D modeling") :
            tr("Enter 2D parametric sketching mode"));

        // Show/hide sketch-specific actions
        m_exitSketchAction->setVisible(inSketchMode);
        m_sketchLineAction->setEnabled(inSketchMode);
        m_sketchCircleAction->setEnabled(inSketchMode);

        // Update window title
        QString baseTitle = "TyrexCAD";
        if (inSketchMode) {
            setWindowTitle(baseTitle + " - Sketch Mode");
        }
        else {
            setWindowTitle(baseTitle);
        }

        // Update status bar
        if (inSketchMode) {
            statusBar()->showMessage("Sketch Mode Active - Select to edit, use tools to draw", 0);
        }
        else {
            statusBar()->showMessage("3D Modeling Mode", 3000);
        }

        // Update view settings for sketch mode
        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            Handle(V3d_View) view = m_viewerManager->view();
            if (inSketchMode) {
                // Set orthographic projection for sketch mode
                view->SetProj(V3d_Zpos); // Top view
                view->FitAll();
            }
            // In 3D mode, user can freely rotate/manipulate view
        }

        qDebug() << "UI update completed for sketch mode:" << inSketchMode;
    }

    void TyrexMainWindow::toggleSketchMode()
    {
        qDebug() << "=== TyrexMainWindow::toggleSketchMode() ===";

        if (!m_sketchManager) {
            qWarning() << "Cannot toggle sketch mode - sketch manager not initialized";
            statusBar()->showMessage("Error: Sketch system not initialized", 3000);
            return;
        }

        if (m_sketchManager->isInSketchMode()) {
            exitSketchMode();
        }
        else {
            enterSketchMode();
        }
    }

    void TyrexMainWindow::enterSketchMode()
    {
        qDebug() << "=== TyrexMainWindow::enterSketchMode() ===";

        if (!m_sketchManager) {
            qWarning() << "Cannot enter sketch mode - sketch manager not initialized";
            return;
        }

        // Cancel any active 3D commands
        if (m_commandManager && m_commandManager->activeCommand()) {
            m_commandManager->cancelCommand();
        }

        // Apply optimal 2D rendering settings
        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            TyrexSketchDisplayHelper::setupOptimal2DRendering(m_viewerManager->view());
        }

        // Set interaction manager to sketch mode
        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget && viewWidget->interactionManager()) {
            viewWidget->interactionManager()->setInteractionMode(
                TyrexInteractionManager::InteractionMode::Sketch2D);
        }

        // Enter sketch mode with enhanced features
        m_sketchManager->enterSketchMode();

        // Show sketch status in status bar
        updateSketchStatusBar();

        qDebug() << "Entered sketch mode successfully with enhanced UI";
    }

    void TyrexMainWindow::exitSketchMode()
    {
        qDebug() << "=== TyrexMainWindow::exitSketchMode() ===";

        if (!m_sketchManager) {
            return;
        }

        // Cancel any active sketch commands
        if (m_commandManager && m_commandManager->activeCommand()) {
            m_commandManager->cancelCommand();
        }

        // Exit sketch mode
        m_sketchManager->exitSketchMode();

        // Set interaction manager back to 3D mode
        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget && viewWidget->interactionManager()) {
            viewWidget->interactionManager()->setInteractionMode(
                TyrexInteractionManager::InteractionMode::Model3D);
        }

        qDebug() << "Exited sketch mode successfully";
    }

    void TyrexMainWindow::startSketchLineCommand()
    {
        qDebug() << "=== TyrexMainWindow::startSketchLineCommand() ===";

        if (!m_sketchManager || !m_sketchManager->isInSketchMode()) {
            qWarning() << "Cannot start sketch line - not in sketch mode";
            statusBar()->showMessage("Error: Not in sketch mode", 3000);
            return;
        }

        if (!m_commandManager) {
            qWarning() << "Cannot start sketch line - no command manager";
            return;
        }

        // Create and start sketch line command
        auto lineCommand = std::make_shared<TyrexSketchLineCommand>(m_sketchManager.get());
        m_commandManager->startCommand(lineCommand);

        statusBar()->showMessage("Sketch Line: Click first point", 0);
        qDebug() << "Started sketch line command";
    }

    void TyrexMainWindow::startSketchCircleCommand()
    {
        qDebug() << "=== TyrexMainWindow::startSketchCircleCommand() ===";

        if (!m_sketchManager || !m_sketchManager->isInSketchMode()) {
            qWarning() << "Cannot start sketch circle - not in sketch mode";
            statusBar()->showMessage("Error: Not in sketch mode", 3000);
            return;
        }

        if (!m_commandManager) {
            qWarning() << "Cannot start sketch circle - no command manager";
            return;
        }

        // Create and start sketch circle command
        auto circleCommand = std::make_shared<TyrexSketchCircleCommand>(m_sketchManager.get());
        m_commandManager->startCommand(circleCommand);

        statusBar()->showMessage("Sketch Circle: Click center point", 0);
        qDebug() << "Started sketch circle command";
    }

    void TyrexMainWindow::onSketchEntitySelected(const std::string& entityId)
    {
        statusBar()->showMessage(
            QString("Selected sketch entity: %1").arg(QString::fromStdString(entityId)), 3000);

        qDebug() << "Sketch entity selected:" << QString::fromStdString(entityId);
    }

    void TyrexMainWindow::onSketchEntityModified(const std::string& entityId)
    {
        statusBar()->showMessage(
            QString("Modified sketch entity: %1").arg(QString::fromStdString(entityId)), 2000);

        qDebug() << "Sketch entity modified:" << QString::fromStdString(entityId);

        // Here you could mark document as modified, update property panels, etc.
    }

    void TyrexMainWindow::updateSketchStatusBar()
    {
        if (!m_sketchManager || !m_sketchManager->isInSketchMode()) {
            return;
        }

        QString status = "Sketch Mode | ";

        // Grid status
        if (m_sketchManager->canvasOverlay()) {
            bool gridVisible = m_sketchManager->canvasOverlay()->isGridVisible();
            double spacing = m_sketchManager->canvasOverlay()->getCurrentGridSpacing();
            status += QString("Grid: %1 (Spacing: %2) | ")
                .arg(gridVisible ? "ON" : "OFF")
                .arg(spacing, 0, 'f', 2);
        }

        // Snap status
        status += QString("Snap: %1 | ").arg(m_toggleSnapAction->isChecked() ? "ON" : "OFF");

        // Ortho status
        status += QString("Ortho: %1 | ").arg(m_toggleOrthoAction->isChecked() ? "ON" : "OFF");

        // Selection count
        auto selected = m_sketchManager->getSelectedEntities();
        if (!selected.empty()) {
            status += QString("Selected: %1 objects").arg(selected.size());
        }
        else {
            status += "Ready";
        }

        statusBar()->showMessage(status);
    }

    void TyrexMainWindow::setupSketchModeToolbars()
    {
        // Add sketch-specific toolbar items
        if (m_sketchToolBar) {
            m_sketchToolBar->addSeparator();
            m_sketchToolBar->addAction(m_toggleGridAction);
            m_sketchToolBar->addAction(m_toggleSnapAction);
            m_sketchToolBar->addAction(m_toggleOrthoAction);
            m_sketchToolBar->addSeparator();

            // Grid style submenu
            QToolButton* gridStyleButton = new QToolButton();
            gridStyleButton->setText("Grid Style");
            gridStyleButton->setPopupMode(QToolButton::InstantPopup);

            QMenu* gridStyleMenu = new QMenu(gridStyleButton);
            gridStyleMenu->addAction(m_gridLinesAction);
            gridStyleMenu->addAction(m_gridDotsAction);
            gridStyleMenu->addAction(m_gridCrossesAction);
            gridStyleButton->setMenu(gridStyleMenu);

            m_sketchToolBar->addWidget(gridStyleButton);
        }
    }

    void TyrexMainWindow::restoreNormalToolbars()
    {
        // Remove sketch-specific toolbar items
        if (m_sketchToolBar) {
            // Clear extra actions added for sketch mode
            auto actions = m_sketchToolBar->actions();
            for (auto it = actions.rbegin(); it != actions.rend(); ++it) {
                if (*it == m_toggleGridAction ||
                    *it == m_toggleSnapAction ||
                    *it == m_toggleOrthoAction ||
                    (*it)->isSeparator()) {
                    m_sketchToolBar->removeAction(*it);
                }
            }
        }
    }

    // Add property panel update methods
    void TyrexMainWindow::updatePropertyPanel(const std::string& entityId)
    {
        // This would update a property panel with entity properties
        // For now, just show in status bar
        auto entity = m_sketchManager->findSketchEntity(entityId);
        if (entity) {
            QString info = QString("Selected: %1 (Type: %2)")
                .arg(QString::fromStdString(entityId))
                .arg(static_cast<int>(entity->getType()));
            statusBar()->showMessage(info, 5000);
        }
    }

    void TyrexMainWindow::clearPropertyPanel()
    {
        // Clear property panel
        statusBar()->showMessage("No selection", 2000);
    }

    void TyrexMainWindow::setDocumentModified(bool modified)
    {
        // Mark document as modified
        setWindowModified(modified);
    }

    void TyrexMainWindow::updateStatusBar(const QString& message)
    {
        statusBar()->showMessage(message);
    }

    // === FILE OPERATIONS ===
    void TyrexMainWindow::newFile()
    {
        statusBar()->showMessage(tr("New file created"), 2000);
    }

    void TyrexMainWindow::openFile()
    {
        QString fileName = QFileDialog::getOpenFileName(this,
            tr("Open CAD File"), "",
            tr("CAD Files (*.tcad);;All Files (*)"));

        if (!fileName.isEmpty()) {
            statusBar()->showMessage(tr("File loaded: %1").arg(fileName), 2000);
        }
    }

    void TyrexMainWindow::saveFile()
    {
        statusBar()->showMessage(tr("File saved"), 2000);
    }

    void TyrexMainWindow::saveFileAs()
    {
        QString fileName = QFileDialog::getSaveFileName(this,
            tr("Save CAD File"), "",
            tr("CAD Files (*.tcad);;All Files (*)"));

        if (!fileName.isEmpty()) {
            statusBar()->showMessage(tr("File saved as: %1").arg(fileName), 2000);
        }
    }

    void TyrexMainWindow::about()
    {
        QMessageBox::about(this, tr("About TyrexCAD"),
            tr("TyrexCAD is a modern CAD application using Qt and OpenCascade.\n\n"
                "Features:\n"
                "• 3D Modeling\n"
                "• 2D Parametric Sketching\n"
                "• Real-time interaction\n"
                "• Professional CAD tools\n\n"
                "Version: 1.0.0\n"
                "Build: Development"));
    }
    // Add these methods to TyrexMainWindow.cpp

    void TyrexMainWindow::createAdvancedSketchActions()
    {
        // Grid toggle action  
        m_toggleGridAction = new QAction(tr("Toggle &Grid"), this);
        m_toggleGridAction->setShortcut(QKeySequence(tr("F7")));
        m_toggleGridAction->setCheckable(true);
        m_toggleGridAction->setChecked(true);
        m_toggleGridAction->setStatusTip(tr("Toggle grid visibility"));

        connect(m_toggleGridAction, &QAction::triggered, this, [this](bool checked) {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setGridEnabled(checked);
                statusBar()->showMessage(checked ? "Grid ON" : "Grid OFF", 2000);
            }
            });

        // Grid spacing action
        m_gridSpacingAction = new QAction(tr("Grid &Spacing..."), this);
        connect(m_gridSpacingAction, &QAction::triggered, this, [this]() {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                GridConfig config = viewWidget->getGridConfig();

                // Show grid configuration dialog
                bool ok;
                double newSpacing = QInputDialog::getDouble(this,
                    tr("Grid Spacing"),
                    tr("Enter grid spacing:"),
                    config.baseSpacing, 0.1, 1000.0, 2, &ok);

                if (ok) {
                    config.baseSpacing = newSpacing;
                    viewWidget->setGridConfig(config);
                    statusBar()->showMessage(
                        QString("Grid spacing set to %1").arg(newSpacing), 2000);
                }
            }
            });

        // Snap toggle action
        m_toggleSnapAction = new QAction(tr("Toggle &Snap"), this);
        m_toggleSnapAction->setShortcut(QKeySequence(tr("F9")));
        m_toggleSnapAction->setCheckable(true);
        m_toggleSnapAction->setChecked(true);
        m_toggleSnapAction->setStatusTip(tr("Toggle grid snap"));
        connect(m_toggleSnapAction, &QAction::triggered, this, [this](bool checked) {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                GridConfig config = viewWidget->getGridConfig();
                config.snapEnabled = checked;
                viewWidget->setGridConfig(config);
                statusBar()->showMessage(checked ? "Snap ON" : "Snap OFF", 2000);
            }
            });

        // Ortho mode action
        m_toggleOrthoAction = new QAction(tr("Toggle &Ortho"), this);
        m_toggleOrthoAction->setShortcut(QKeySequence(tr("F8")));
        m_toggleOrthoAction->setCheckable(true);
        m_toggleOrthoAction->setChecked(false);
        m_toggleOrthoAction->setStatusTip(tr("Toggle orthogonal mode"));
        connect(m_toggleOrthoAction, &QAction::triggered, this, [this](bool checked) {
            // TODO: Implement ortho mode in sketch manager
            statusBar()->showMessage(checked ? "Ortho ON" : "Ortho OFF", 2000);
            });

        // Grid style actions
        m_gridStyleGroup = new QActionGroup(this);

        m_gridLinesAction = new QAction(tr("Grid &Lines"), this);
        m_gridLinesAction->setCheckable(true);
        m_gridLinesAction->setChecked(true);
        m_gridStyleGroup->addAction(m_gridLinesAction);
        connect(m_gridLinesAction, &QAction::triggered, this, [this]() {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setGridStyle(GridStyle::Lines);
                statusBar()->showMessage("Grid style: Lines", 2000);
            }
            });

        m_gridDotsAction = new QAction(tr("Grid &Dots"), this);
        m_gridDotsAction->setCheckable(true);
        m_gridStyleGroup->addAction(m_gridDotsAction);
        connect(m_gridDotsAction, &QAction::triggered, this, [this]() {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setGridStyle(GridStyle::Dots);
                statusBar()->showMessage("Grid style: Dots", 2000);
            }
            });

        m_gridCrossesAction = new QAction(tr("Grid &Crosses"), this);
        m_gridCrossesAction->setCheckable(true);
        m_gridStyleGroup->addAction(m_gridCrossesAction);
        connect(m_gridCrossesAction, &QAction::triggered, this, [this]() {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setGridStyle(GridStyle::Crosses);
                statusBar()->showMessage("Grid style: Crosses", 2000);
            }
            });

        // Coordinate display toggle
        m_toggleCoordinatesAction = new QAction(tr("Show &Coordinates"), this);
        m_toggleCoordinatesAction->setCheckable(true);
        m_toggleCoordinatesAction->setChecked(false);
        m_toggleCoordinatesAction->setStatusTip(tr("Show cursor coordinates"));
        connect(m_toggleCoordinatesAction, &QAction::triggered, this, [this](bool checked) {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setCoordinateDisplayEnabled(checked);
                statusBar()->showMessage(checked ? "Coordinates ON" : "Coordinates OFF", 2000);
            }
            });
    }

    void TyrexMainWindow::setupSketchModeToolbars()
    {
        // Add sketch-specific toolbar items
        if (m_sketchToolBar) {
            m_sketchToolBar->addSeparator();
            m_sketchToolBar->addAction(m_toggleGridAction);
            m_sketchToolBar->addAction(m_toggleSnapAction);
            m_sketchToolBar->addAction(m_toggleOrthoAction);
            m_sketchToolBar->addAction(m_toggleCoordinatesAction);
            m_sketchToolBar->addSeparator();

            // Grid style submenu
            QToolButton* gridStyleButton = new QToolButton();
            gridStyleButton->setText("Grid Style");
            gridStyleButton->setPopupMode(QToolButton::InstantPopup);

            QMenu* gridStyleMenu = new QMenu(gridStyleButton);
            gridStyleMenu->addAction(m_gridLinesAction);
            gridStyleMenu->addAction(m_gridDotsAction);
            gridStyleMenu->addAction(m_gridCrossesAction);
            gridStyleMenu->addSeparator();
            gridStyleMenu->addAction(m_gridSpacingAction);
            gridStyleButton->setMenu(gridStyleMenu);

            m_sketchToolBar->addWidget(gridStyleButton);
        }
    }

    void TyrexMainWindow::createViewMenu()
    {
        m_viewMenu = menuBar()->addMenu(tr("&View"));

        // Grid submenu
        QMenu* gridMenu = m_viewMenu->addMenu(tr("&Grid"));
        gridMenu->addAction(m_toggleGridAction);
        gridMenu->addAction(m_toggleSnapAction);
        gridMenu->addSeparator();
        gridMenu->addAction(m_gridLinesAction);
        gridMenu->addAction(m_gridDotsAction);
        gridMenu->addAction(m_gridCrossesAction);
        gridMenu->addSeparator();
        gridMenu->addAction(m_gridSpacingAction);

        m_viewMenu->addSeparator();
        m_viewMenu->addAction(m_toggleCoordinatesAction);
        m_viewMenu->addSeparator();
        m_viewMenu->addAction(m_testGeometryAction);
    }

    void TyrexMainWindow::initializeConnections()
    {
        // Connect to view widget signals
        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget) {
            // Connect cursor position updates
            connect(viewWidget, &TyrexViewWidget::cursorWorldPosition,
                this, [this](double x, double y) {
                    // Update status bar with current position
                    QString posText = QString("X: %1, Y: %2")
                        .arg(x, 0, 'f', 2)
                        .arg(y, 0, 'f', 2);

                    // Update a permanent widget in status bar
                    if (m_coordinateLabel) {
                        m_coordinateLabel->setText(posText);
                    }
                });
        }
    }

    
} // namespace TyrexCAD