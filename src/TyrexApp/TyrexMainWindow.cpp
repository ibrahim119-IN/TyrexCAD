// File: src/TyrexApp/TyrexMainWindow.cpp
#include "TyrexApp/TyrexMainWindow.h"
#include "TyrexCanvas/TyrexCanvasWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexInteraction/TyrexInteractionManager.h"
#include "TyrexCore/TyrexCommandManager.h"
#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexCanvas/TyrexModelSpace.h"
#include "TyrexEntities/TyrexLineEntity.h"
#include "TyrexEntities/TyrexCircleEntity.h"
#include "TyrexEntities/TyrexBoxEntity.h"

// Commands
#include "TyrexCore/TyrexLineCommand.h"
#include "TyrexSketch/TyrexSketchCircleCommand.h"
#include "TyrexCore/TyrexBoxCommand.h"
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

namespace TyrexCAD {

    TyrexMainWindow::TyrexMainWindow(QWidget* parent)
        : QMainWindow(parent),
        m_isInSketchMode(false)
    {
        setWindowTitle("TyrexCAD");
        setGeometry(100, 100, 1200, 800);

        setupUI();
        createActions();
        createMenus();
        createToolBars();
        createDockWindows();
        createStatusBar();

        // Initialize after UI is set up
        QTimer::singleShot(100, this, &TyrexMainWindow::initialize);
    }

    TyrexMainWindow::~TyrexMainWindow()
    {
        qDebug() << "TyrexMainWindow destroyed";
    }

    void TyrexMainWindow::setupUI()
    {
        // Create central widget (3D view)
        auto viewWidget = new TyrexViewWidget(this);
        setCentralWidget(viewWidget);

        // Initialize after creating view widget
        initializeConnections();
    }

    void TyrexMainWindow::initialize()
    {
        qDebug() << "=== TyrexMainWindow::initialize() ===";

        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
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

        // Wait for viewer initialization
        connect(viewWidget, &TyrexViewWidget::viewerInitialized, this, [this]() {
            qDebug() << "Viewer initialized signal received";

            // Initialize model space
            m_modelSpace = std::make_shared<TyrexModelSpace>(m_viewerManager->context());

            // Initialize interaction manager
            m_interactionManager = std::make_unique<TyrexInteractionManager>(
                m_viewerManager->context(),
                m_viewerManager.get()
            );
            m_viewerManager->setInteractionManager(m_interactionManager.get());

            // Initialize command manager
            m_commandManager = std::make_unique<TyrexCommandManager>(this);
            connect(m_commandManager.get(), &TyrexCommandManager::statusMessage,
                this, &TyrexMainWindow::updateStatusBar);

            // Initialize sketch manager
            m_sketchManager = std::make_unique<TyrexSketchManager>(
                m_viewerManager->context(),
                m_viewerManager.get(),
                this
            );

            // Connect sketch manager signals
            connect(m_sketchManager.get(), &TyrexSketchManager::sketchModeEntered,
                this, &TyrexMainWindow::updateSketchModeUI);
            connect(m_sketchManager.get(), &TyrexSketchManager::sketchModeExited,
                this, &TyrexMainWindow::updateSketchModeUI);
            connect(m_sketchManager.get(), &TyrexSketchManager::statusMessage,
                this, &TyrexMainWindow::updateStatusBar);

            // Set sketch manager in interaction manager
            m_interactionManager->setSketchManager(m_sketchManager.get());

            // Enable grid by default
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                viewWidget->setGridEnabled(true);
                if (m_toggleGridAction) {
                    m_toggleGridAction->setChecked(true);
                }
            }

            updateStatusBar("TyrexCAD initialized successfully");
            });
    }

    void TyrexMainWindow::initializeConnections()
    {
        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
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

        m_exitAction = new QAction(tr("E&xit"), this);
        m_exitAction->setShortcut(QKeySequence::Quit);
        connect(m_exitAction, &QAction::triggered, this, &QWidget::close);

        // View actions
        m_toggleGridAction = new QAction(tr("Show &Grid"), this);
        m_toggleGridAction->setCheckable(true);
        m_toggleGridAction->setChecked(true);
        m_toggleGridAction->setShortcut(Qt::Key_F1);
        connect(m_toggleGridAction, &QAction::triggered, this, &TyrexMainWindow::toggleGrid);

        m_toggleAxisAction = new QAction(tr("Show &Axes"), this);
        m_toggleAxisAction->setCheckable(true);
        m_toggleAxisAction->setChecked(true);
        connect(m_toggleAxisAction, &QAction::triggered, this, &TyrexMainWindow::toggleAxes);

        m_toggleCoordinatesAction = new QAction(tr("Show &Coordinates"), this);
        m_toggleCoordinatesAction->setCheckable(true);
        m_toggleCoordinatesAction->setChecked(true);
        connect(m_toggleCoordinatesAction, &QAction::triggered, this, &TyrexMainWindow::toggleCoordinates);

        m_fitAllAction = new QAction(tr("&Fit All"), this);
        m_fitAllAction->setShortcut(Qt::Key_F);
        connect(m_fitAllAction, &QAction::triggered, this, &TyrexMainWindow::fitAll);

        // Draw actions
        m_lineAction = new QAction(tr("&Line"), this);
        m_lineAction->setShortcut(Qt::Key_L);
        connect(m_lineAction, &QAction::triggered, this, &TyrexMainWindow::startLineCommand);

        m_circleAction = new QAction(tr("&Circle"), this);
        m_circleAction->setShortcut(Qt::Key_C);
        connect(m_circleAction, &QAction::triggered, this, &TyrexMainWindow::startCircleCommand);

        m_boxAction = new QAction(tr("&Box"), this);
        m_boxAction->setShortcut(Qt::Key_B);
        connect(m_boxAction, &QAction::triggered, this, &TyrexMainWindow::startBoxCommand);

        // Sketch mode actions
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

        // Test action
        m_testGeometryAction = new QAction(tr("Create Test Geometry"), this);
        connect(m_testGeometryAction, &QAction::triggered, this, &TyrexMainWindow::createTestGeometry);
    }

    void TyrexMainWindow::createMenus()
    {
        // File menu
        QMenu* fileMenu = menuBar()->addMenu(tr("&File"));
        fileMenu->addAction(m_newAction);
        fileMenu->addAction(m_openAction);
        fileMenu->addAction(m_saveAction);
        fileMenu->addSeparator();
        fileMenu->addAction(m_exitAction);

        // View menu
        QMenu* viewMenu = menuBar()->addMenu(tr("&View"));
        viewMenu->addAction(m_toggleGridAction);
        viewMenu->addAction(m_toggleAxisAction);
        viewMenu->addAction(m_toggleCoordinatesAction);
        viewMenu->addSeparator();
        viewMenu->addAction(m_fitAllAction);

        // Draw menu
        QMenu* drawMenu = menuBar()->addMenu(tr("&Draw"));
        drawMenu->addAction(m_lineAction);
        drawMenu->addAction(m_circleAction);
        drawMenu->addAction(m_boxAction);
        drawMenu->addSeparator();
        drawMenu->addAction(m_sketchModeAction);

        // Sketch menu
        QMenu* sketchMenu = menuBar()->addMenu(tr("&Sketch"));
        sketchMenu->addAction(m_exitSketchAction);
        sketchMenu->addSeparator();
        sketchMenu->addAction(m_sketchLineAction);
        sketchMenu->addAction(m_sketchCircleAction);

        // Tools menu (for testing)
        QMenu* toolsMenu = menuBar()->addMenu(tr("&Tools"));
        toolsMenu->addAction(m_testGeometryAction);
    }

    void TyrexMainWindow::createToolBars()
    {
        // File toolbar
        QToolBar* fileToolBar = addToolBar(tr("File"));
        fileToolBar->addAction(m_newAction);
        fileToolBar->addAction(m_openAction);
        fileToolBar->addAction(m_saveAction);

        // View toolbar
        QToolBar* viewToolBar = addToolBar(tr("View"));
        viewToolBar->addAction(m_toggleGridAction);
        viewToolBar->addAction(m_toggleAxisAction);
        viewToolBar->addAction(m_fitAllAction);

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
                auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
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
                auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
                if (viewWidget) {
                    viewWidget->setGridStyle(static_cast<GridStyle>(index));
                }
            });

        // Draw toolbar
        m_drawToolBar = addToolBar(tr("Draw"));
        m_drawToolBar->addAction(m_lineAction);
        m_drawToolBar->addAction(m_circleAction);
        m_drawToolBar->addAction(m_boxAction);
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
        m_propertiesList = new QListWidget(propertiesDock);
        propertiesDock->setWidget(m_propertiesList);
        addDockWidget(Qt::RightDockWidgetArea, propertiesDock);

        // Entities dock
        QDockWidget* entitiesDock = new QDockWidget(tr("Entities"), this);
        m_entitiesList = new QListWidget(entitiesDock);
        entitiesDock->setWidget(m_entitiesList);
        addDockWidget(Qt::LeftDockWidgetArea, entitiesDock);
    }

    void TyrexMainWindow::createStatusBar()
    {
        // Main status message
        statusBar()->showMessage(tr("Ready"));

        // Add coordinate display
        m_coordinateLabel = new QLabel("X: --, Y: --");
        m_coordinateLabel->setFrameStyle(QFrame::Panel | QFrame::Sunken);
        m_coordinateLabel->setMinimumWidth(150);
        statusBar()->addPermanentWidget(m_coordinateLabel);

        // Add mode indicator
        m_modeLabel = new QLabel("3D Mode");
        m_modeLabel->setFrameStyle(QFrame::Panel | QFrame::Sunken);
        m_modeLabel->setMinimumWidth(100);
        statusBar()->addPermanentWidget(m_modeLabel);
    }

    void TyrexMainWindow::updateStatusBar(const QString& message)
    {
        statusBar()->showMessage(message, 5000); // Show for 5 seconds
    }

    void TyrexMainWindow::updateSketchStatusBar()
    {
        if (m_isInSketchMode) {
            m_modeLabel->setText("Sketch Mode");

            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget && viewWidget->canvasOverlay()) {
                GridConfig config = viewWidget->canvasOverlay()->getGridConfig();
                QString snapStatus = config.snapEnabled ? "ON" : "OFF";
                updateStatusBar(QString("Sketch Mode - Snap: %1").arg(snapStatus));
            }
        }
        else {
            m_modeLabel->setText("3D Mode");
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
        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget) {
            viewWidget->setSketchModeGrid(m_isInSketchMode);

            // Force grid visibility in sketch mode
            if (m_isInSketchMode) {
                viewWidget->setGridEnabled(true);
                if (m_toggleGridAction) m_toggleGridAction->setChecked(true);
            }
        }

        // Update interaction manager
        if (m_viewerManager && m_viewerManager->interactionManager()) {
            m_viewerManager->interactionManager()->setInteractionMode(
                m_isInSketchMode ?
                TyrexInteractionManager::InteractionMode::Sketch2D :
                TyrexInteractionManager::InteractionMode::Model3D
            );
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
        // TODO: Implement file opening
        updateStatusBar("Open file dialog");
    }

    void TyrexMainWindow::saveFile()
    {
        // TODO: Implement file saving
        updateStatusBar("File saved");
    }

    // View operations
    void TyrexMainWindow::toggleGrid()
    {
        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget) {
            bool enabled = m_toggleGridAction->isChecked();
            viewWidget->setGridEnabled(enabled);
            updateStatusBar(enabled ? "Grid enabled" : "Grid disabled");
        }
    }

    void TyrexMainWindow::toggleAxes()
    {
        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget) {
            bool visible = m_toggleAxisAction->isChecked();
            viewWidget->setAxisVisible(visible);
            updateStatusBar(visible ? "Axes visible" : "Axes hidden");
        }
    }

    void TyrexMainWindow::toggleCoordinates()
    {
        bool visible = m_toggleCoordinatesAction->isChecked();
        if (!visible && m_coordinateLabel) {
            m_coordinateLabel->setText("X: --, Y: --");
        }
        updateStatusBar(visible ? "Coordinates display enabled" : "Coordinates display disabled");
    }

    void TyrexMainWindow::fitAll()
    {
        if (m_viewerManager) {
            m_viewerManager->fitAll();
            updateStatusBar("Fit all objects in view");
        }
    }

    // Drawing commands
    void TyrexMainWindow::startLineCommand()
    {
        if (!m_commandManager || !m_modelSpace) {
            return;
        }

        auto command = std::make_unique<TyrexLineCommand>(
            m_viewerManager->context(), m_modelSpace.get());
        m_commandManager->executeCommand(std::move(command));
    }

    void TyrexMainWindow::startCircleCommand()
    {
        if (!m_commandManager || !m_modelSpace) {
            return;
        }

        auto command = std::make_unique<TyrexCircleCommand>(
            m_viewerManager->context(), m_modelSpace.get());
        m_commandManager->executeCommand(std::move(command));
    }

    void TyrexMainWindow::startBoxCommand()
    {
        if (!m_commandManager || !m_modelSpace) {
            return;
        }

        auto command = std::make_unique<TyrexBoxCommand>(
            m_viewerManager->context(), m_modelSpace.get());
        m_commandManager->executeCommand(std::move(command));
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

        auto command = std::make_unique<TyrexSketchLineCommand>(
            m_viewerManager->context(),
            m_sketchManager.get(),
            m_viewerManager->view()
        );
        m_commandManager->executeCommand(std::move(command));
    }

    void TyrexMainWindow::startSketchCircleCommand()
    {
        if (!m_commandManager || !m_sketchManager) {
            return;
        }

        auto command = std::make_unique<TyrexSketchCircleCommand>(
            m_viewerManager->context(),
            m_sketchManager.get(),
            m_viewerManager->view()
        );
        m_commandManager->executeCommand(std::move(command));
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
                auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
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