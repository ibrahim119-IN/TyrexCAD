// File: src/TyrexApp/TyrexMainWindow.cpp
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


// Commands
#include "TyrexCore/TyrexLineCommand.h"
#include "TyrexSketch/TyrexSketchLineCommand.h"
#include "TyrexSketch/TyrexSketchCircleCommand.h"

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
#include <QDebug>
#include <QWidget>
#include <QLabel>
#include <QFrame>



namespace TyrexCAD {

    TyrexMainWindow::TyrexMainWindow(QWidget* parent)
        : QMainWindow(parent),
        m_commandManager(nullptr),
        m_isInSketchMode(false),
        m_coordinateLabel(nullptr),
        m_gridStatusLabel(nullptr),
        m_fileToolBar(nullptr),
        m_editToolBar(nullptr),
        m_viewToolBar(nullptr),
        m_drawToolBar(nullptr),
        m_sketchToolBar(nullptr),
        m_gridStyleGroup(nullptr)
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

        // Initialize after UI is set up
        QTimer::singleShot(100, this, &TyrexMainWindow::initialize);
        initializeConnections();    
    }

    TyrexMainWindow::~TyrexMainWindow()
    {
        qDebug() << "TyrexMainWindow destroyed";
    }

    void TyrexMainWindow::setupUI()
    {
        // Create central widget (3D view)
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

        // Get viewer manager from view widget
        m_viewerManager = viewWidget->viewerManager();
        if (!m_viewerManager) {
            qCritical() << "Failed to get viewer manager!";
            return;
        }

        // Initialize connections first
        TyrexCAD::TyrexMainWindow::initializeConnections();

        // Wait for viewer initialization
        connect(viewWidget, &TyrexViewWidget::viewerInitialized, this, [this]() {
            qDebug() << "Viewer initialized signal received";

            // Initialize model space
            m_modelSpace = std::make_unique<TyrexModelSpace>(m_viewerManager->context());

            // Initialize interaction manager
            auto* interactionManager = new TyrexInteractionManager();
            interactionManager->setViewerManager(m_viewerManager.get());
            m_viewerManager->setInteractionManager(interactionManager);

            // Initialize command manager
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

            // Set command manager in interaction manager
            interactionManager->setCommandManager(m_commandManager);

            // Initialize sketch manager
            m_sketchManager = std::make_shared<TyrexSketchManager>(
                m_viewerManager->context(),
                m_viewerManager.get(),
                this
            );

            // Setup sketch manager connections
            setupConnections();

            // Set sketch manager in interaction manager
            interactionManager->setSketchManager(m_sketchManager.get());

            // Enable grid by default
            auto* vw = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (vw) {
                vw->setGridEnabled(true);
                if (m_toggleGridAction) {
                    m_toggleGridAction->setChecked(true);
                }
            }

            updateStatusBar("TyrexCAD initialized successfully");
            });
    }

    void TyrexMainWindow::initializeConnections()
    {
        auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (!viewWidget) {
            qCritical() << "No view widget found!";
            return;
        }

        // Connect cursor position updates
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

        // Connect grid configuration changes
        connect(viewWidget, &TyrexViewWidget::gridConfigChanged,
            this, &TyrexMainWindow::updateSketchStatusBar);

        // Connect grid spacing changes
        connect(viewWidget, &TyrexViewWidget::gridSpacingChanged,
            this, [this](double spacing) {
                updateStatusBar(QString("Grid spacing: %1").arg(spacing, 0, 'f', 2));
            });
    }

    void TyrexMainWindow::setupConnections()
    {
        if (!m_sketchManager) {
            return;
        }

        // Connect sketch manager signals
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
    }

    void TyrexMainWindow::createActions()
    {
        // File actions
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

        // Draw actions
        m_lineAction = new QAction(tr("&Line"), this);
        m_lineAction->setShortcut(Qt::Key_L);
        connect(m_lineAction, &QAction::triggered, this, &TyrexMainWindow::startLineCommand);

        m_directLineAction = new QAction(tr("&Direct Line"), this);
        connect(m_directLineAction, &QAction::triggered, this, &TyrexMainWindow::createSampleLine);

        // Help actions
        m_aboutAction = new QAction(tr("&About"), this);
        connect(m_aboutAction, &QAction::triggered, this, &TyrexMainWindow::about);

        // Test action
        m_testGeometryAction = new QAction(tr("Create Test Geometry"), this);
        connect(m_testGeometryAction, &QAction::triggered, this, &TyrexMainWindow::createTestGeometry);
    }

    void TyrexMainWindow::createAdvancedSketchActions()
    {
        // Toggle Grid
        m_toggleGridAction = new QAction(tr("Show &Grid"), this);
        m_toggleGridAction->setCheckable(true);
        m_toggleGridAction->setChecked(true);
        m_toggleGridAction->setShortcut(Qt::Key_F7);
        connect(m_toggleGridAction, &QAction::triggered, this, [this](bool checked) {
            auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setGridEnabled(checked);
                updateStatusBar(checked ? "Grid enabled" : "Grid disabled");
            }
            });

        // Toggle Snap
        m_toggleSnapAction = new QAction(tr("Snap to Grid"), this);
        m_toggleSnapAction->setCheckable(true);
        m_toggleSnapAction->setChecked(false);
        m_toggleSnapAction->setShortcut(Qt::Key_F9);
        connect(m_toggleSnapAction, &QAction::triggered, this, [this](bool checked) {
            auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setSnapToGrid(checked);
                updateStatusBar(checked ? "Snap enabled" : "Snap disabled");
            }
            });

        // Toggle Ortho
        m_toggleOrthoAction = new QAction(tr("Ortho Mode"), this);
        m_toggleOrthoAction->setCheckable(true);
        m_toggleOrthoAction->setChecked(false);
        m_toggleOrthoAction->setShortcut(Qt::Key_F8);

        // Grid style group
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

        // Connect grid style actions
        connect(m_gridLinesAction, &QAction::triggered, this, [this]() {
            auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setGridStyle(GridStyle::Lines);
            }
            });

        connect(m_gridDotsAction, &QAction::triggered, this, [this]() {
            auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setGridStyle(GridStyle::Dots);
            }
            });

        connect(m_gridCrossesAction, &QAction::triggered, this, [this]() {
            auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setGridStyle(GridStyle::Crosses);
            }
            });

        // Additional actions
        m_gridSpacingAction = new QAction(tr("Grid Spacing..."), this);
        connect(m_gridSpacingAction, &QAction::triggered, this, [this]() {
            bool ok;
            double spacing = QInputDialog::getDouble(this, tr("Grid Spacing"),
                tr("Enter grid spacing:"), 10.0, 1.0, 1000.0, 1, &ok);
            if (ok) {
                auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
                if (viewWidget) {
                    viewWidget->setGridSpacing(spacing);
                }
            }
            });

        m_toggleCoordinatesAction = new QAction(tr("Show Coordinates"), this);
        m_toggleCoordinatesAction->setCheckable(true);
        m_toggleCoordinatesAction->setChecked(true);
    }

    void TyrexMainWindow::createSketchActions()
    {
        // Sketch mode action
        m_sketchModeAction = new QAction(tr("Enter Sketch Mode"), this);
        m_sketchModeAction->setCheckable(true);
        m_sketchModeAction->setShortcut(Qt::Key_S);
        connect(m_sketchModeAction, &QAction::triggered, this, &TyrexMainWindow::toggleSketchMode);

        // Exit sketch action
        m_exitSketchAction = new QAction(tr("Exit Sketch"), this);
        m_exitSketchAction->setShortcut(Qt::Key_Escape);
        m_exitSketchAction->setVisible(false);
        connect(m_exitSketchAction, &QAction::triggered, this, &TyrexMainWindow::exitSketchMode);

        // Sketch line action
        m_sketchLineAction = new QAction(tr("Sketch &Line"), this);
        m_sketchLineAction->setShortcut(Qt::SHIFT | Qt::Key_L);
        m_sketchLineAction->setEnabled(false);
        connect(m_sketchLineAction, &QAction::triggered, this, &TyrexMainWindow::startSketchLineCommand);

        // Sketch circle action
        m_sketchCircleAction = new QAction(tr("Sketch &Circle"), this);
        m_sketchCircleAction->setShortcut(Qt::SHIFT | Qt::Key_C);
        m_sketchCircleAction->setEnabled(false);
        connect(m_sketchCircleAction, &QAction::triggered, this, &TyrexMainWindow::startSketchCircleCommand);
    }

    void TyrexMainWindow::createMenus()
    {
        // File menu
        m_fileMenu = menuBar()->addMenu(tr("&File"));
        m_fileMenu->addAction(m_newAction);
        m_fileMenu->addAction(m_openAction);
        m_fileMenu->addAction(m_saveAction);
        m_fileMenu->addAction(m_saveAsAction);
        m_fileMenu->addSeparator();
        m_fileMenu->addAction(m_exitAction);

        // Edit menu
        m_editMenu = menuBar()->addMenu(tr("&Edit"));

        // View menu
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

        // Draw menu
        m_drawMenu = menuBar()->addMenu(tr("&Draw"));
        m_drawMenu->addAction(m_lineAction);
        m_drawMenu->addAction(m_directLineAction);
        m_drawMenu->addSeparator();
        m_drawMenu->addAction(m_sketchModeAction);

        // Sketch menu
        m_sketchMenu = menuBar()->addMenu(tr("&Sketch"));
        m_sketchMenu->addAction(m_exitSketchAction);
        m_sketchMenu->addSeparator();
        m_sketchMenu->addAction(m_sketchLineAction);
        m_sketchMenu->addAction(m_sketchCircleAction);

        // Tools menu
        m_toolsMenu = menuBar()->addMenu(tr("&Tools"));
        m_toolsMenu->addAction(m_testGeometryAction);

        // Help menu
        m_helpMenu = menuBar()->addMenu(tr("&Help"));
        m_helpMenu->addAction(m_aboutAction);
    }

    void TyrexMainWindow::createToolbars()
    {
        // File toolbar
        m_fileToolBar = addToolBar(tr("File"));
        m_fileToolBar->addAction(m_newAction);
        m_fileToolBar->addAction(m_openAction);
        m_fileToolBar->addAction(m_saveAction);

        // View toolbar
        m_viewToolBar = addToolBar(tr("View"));
        m_viewToolBar->addAction(m_toggleGridAction);
        m_viewToolBar->addAction(m_toggleSnapAction);
        m_viewToolBar->addAction(m_toggleOrthoAction);

        // Grid control toolbar
        QToolBar* gridToolBar = addToolBar(tr("Grid Controls"));

        // Grid spacing control
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

        // Connect slider and spinbox
        connect(spacingSlider, &QSlider::valueChanged, spacingSpinBox, &QSpinBox::setValue);
        connect(spacingSpinBox, QOverload<int>::of(&QSpinBox::valueChanged),
            spacingSlider, &QSlider::setValue);
        connect(spacingSpinBox, QOverload<int>::of(&QSpinBox::valueChanged),
            this, [this](int value) {
                auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
                if (viewWidget) {
                    viewWidget->setGridSpacing(static_cast<double>(value));
                }
            });

        gridToolBar->addSeparator();

        // Grid style control
        QLabel* styleLabel = new QLabel("Grid Style: ");
        gridToolBar->addWidget(styleLabel);

        QComboBox* styleCombo = new QComboBox();
        styleCombo->addItems({ "Lines", "Dots", "Crosses" });
        gridToolBar->addWidget(styleCombo);

        connect(styleCombo, QOverload<int>::of(&QComboBox::currentIndexChanged),
            this, [this](int index) {
                auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
                if (viewWidget) {
                    viewWidget->setGridStyle(static_cast<GridStyle>(index));
                }
            });

        // Draw toolbar
        m_drawToolBar = addToolBar(tr("Draw"));
        m_drawToolBar->addAction(m_lineAction);
        m_drawToolBar->addAction(m_directLineAction);
        m_drawToolBar->addSeparator();
        m_drawToolBar->addAction(m_sketchModeAction);

        // Sketch toolbar (hidden by default)
        m_sketchToolBar = addToolBar(tr("Sketch"));
        m_sketchToolBar->addAction(m_exitSketchAction);
        m_sketchToolBar->addSeparator();
        m_sketchToolBar->addAction(m_sketchLineAction);
        m_sketchToolBar->addAction(m_sketchCircleAction);
        m_sketchToolBar->setVisible(false);
    }

    void TyrexMainWindow::createDockWindows()
    {
        // Properties dock
        QDockWidget* propertiesDock = new QDockWidget(tr("Properties"), this);
        QListWidget* propertiesList = new QListWidget(propertiesDock);
        propertiesDock->setWidget(propertiesList);
        addDockWidget(Qt::RightDockWidgetArea, propertiesDock);

        // Entities dock
        QDockWidget* entitiesDock = new QDockWidget(tr("Entities"), this);
        QListWidget* entitiesList = new QListWidget(entitiesDock);
        entitiesDock->setWidget(entitiesList);
        addDockWidget(Qt::LeftDockWidgetArea, entitiesDock);
    }

    void TyrexMainWindow::setupStatusBar()
    {
        // Main status message
        statusBar()->showMessage(tr("Ready"));

        // Add coordinate display
        m_coordinateLabel = new QLabel("X: --, Y: --");
        m_coordinateLabel->setFrameStyle(QFrame::Panel | QFrame::Sunken);
        m_coordinateLabel->setMinimumWidth(150);
        statusBar()->addPermanentWidget(m_coordinateLabel);

        // Add grid status
        m_gridStatusLabel = new QLabel("Grid: ON");
        m_gridStatusLabel->setFrameStyle(QFrame::Panel | QFrame::Sunken);
        m_gridStatusLabel->setMinimumWidth(100);
        statusBar()->addPermanentWidget(m_gridStatusLabel);
    }

    void TyrexMainWindow::updateStatusBar(const QString& message)
    {
        statusBar()->showMessage(message, 5000); // Show for 5 seconds
    }

    void TyrexMainWindow::updateSketchStatusBar()
    {
        if (m_isInSketchMode) {
            if (m_gridStatusLabel) {
                m_gridStatusLabel->setText("Sketch Mode");
            }

            auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget && viewWidget->canvasOverlay()) {
                GridConfig config = viewWidget->canvasOverlay()->getGridConfig();
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

        // Update actions
        if (m_sketchModeAction) {
            m_sketchModeAction->setChecked(m_isInSketchMode);
            m_sketchModeAction->setText(m_isInSketchMode ?
                tr("Exit Sketch Mode") : tr("Enter Sketch Mode"));
        }

        // Enable/disable sketch actions
        if (m_exitSketchAction) m_exitSketchAction->setVisible(m_isInSketchMode);
        if (m_sketchLineAction) m_sketchLineAction->setEnabled(m_isInSketchMode);
        if (m_sketchCircleAction) m_sketchCircleAction->setEnabled(m_isInSketchMode);

        // Update toolbars
        if (m_drawToolBar) m_drawToolBar->setVisible(!m_isInSketchMode);
        if (m_sketchToolBar) m_sketchToolBar->setVisible(m_isInSketchMode);

        // Update grid for sketch mode
        auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget) {
            viewWidget->setSketchModeGrid(m_isInSketchMode);

            // Force grid visibility in sketch mode
            if (m_isInSketchMode) {
                viewWidget->setGridEnabled(true);
                if (m_toggleGridAction) m_toggleGridAction->setChecked(true);
            }
        }

        updateSketchStatusBar();
    }

    // File operations
    void TyrexMainWindow::newFile()
    {
        // TODO: Implement new file
        updateStatusBar("New file created");
    }

    void TyrexMainWindow::openFile()
    {
        QString fileName = QFileDialog::getOpenFileName(this,
            tr("Open File"), "", tr("TyrexCAD Files (*.txc);;All Files (*)"));
        if (!fileName.isEmpty()) {
            // TODO: Implement file opening
            updateStatusBar(QString("Opened: %1").arg(fileName));
        }
    }

    void TyrexMainWindow::saveFile()
    {
        // TODO: Implement file saving
        updateStatusBar("File saved");
    }

    void TyrexMainWindow::saveFileAs()
    {
        QString fileName = QFileDialog::getSaveFileName(this,
            tr("Save File As"), "", tr("TyrexCAD Files (*.txc);;All Files (*)"));
        if (!fileName.isEmpty()) {
            // TODO: Implement file saving
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

    // Drawing commands
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

    // Sketch mode operations
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
        if (!m_sketchManager) {
            qWarning() << "Sketch manager not initialized";
            return;
        }

        qDebug() << "=== TyrexMainWindow::enterSketchMode() ===";

        // Cancel any active 3D commands
        if (m_commandManager && m_commandManager->activeCommand()) {
            m_commandManager->cancelCommand();
        }

        // Enter sketch mode
        m_sketchManager->enterSketchMode();

        // Update status
        updateStatusBar("Entered 2D Sketch Mode");
    }

    void TyrexMainWindow::exitSketchMode()
    {
        if (!m_sketchManager) {
            return;
        }

        qDebug() << "=== TyrexMainWindow::exitSketchMode() ===";

        // Cancel any active sketch commands
        if (m_commandManager && m_commandManager->activeCommand()) {
            m_commandManager->cancelCommand();
        }

        // Exit sketch mode
        m_sketchManager->exitSketchMode();

        // Update status
        updateStatusBar("Returned to 3D Modeling Mode");
    }

    void TyrexMainWindow::startSketchLineCommand()
    {
        if (!m_commandManager || !m_sketchManager) {
            return;
        }

        auto command = std::make_shared<TyrexSketchLineCommand>(m_sketchManager.get());
        m_commandManager->startCommand(command);
    }

    void TyrexMainWindow::startSketchCircleCommand()
    {
        if (!m_commandManager || !m_sketchManager) {
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
        // TODO: Update property panel with entity information
        Q_UNUSED(entityId);
    }

    void TyrexMainWindow::clearPropertyPanel()
    {
        // TODO: Clear property panel
    }

    void TyrexMainWindow::setDocumentModified(bool modified)
    {
        setWindowModified(modified);
    }

    // Test functions
    void TyrexMainWindow::createTestGeometry()
    {
        if (!m_modelSpace || !m_viewerManager || m_viewerManager->context().IsNull()) {
            qCritical() << "Cannot create test geometry - missing components.";
            return;
        }

        try {
            m_modelSpace->clear();

            // Create a square with diagonal
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

            // Create square
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

            // Draw all entities
            m_modelSpace->drawAll();

            // Set view to show all
            if (!m_viewerManager->view().IsNull()) {
                m_viewerManager->view()->SetProj(V3d_Zpos);
                m_viewerManager->fitAll();

                // Force grid update after fit
                auto* viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
                if (viewWidget) {
                    viewWidget->update();
                }
            }

            updateStatusBar("Test geometry created.");

        }
        catch (const std::exception& ex) {
            qCritical() << "Exception creating test geometry:" << ex.what();
        }
    }

} // namespace TyrexCAD