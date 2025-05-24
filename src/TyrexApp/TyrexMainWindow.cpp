/***************************************************************************
 * Copyright (c) 2025 TyrexCAD development team                          *
 * *
 * This file is part of the TyrexCAD CAx development system.             *
 * *
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
#include "TyrexCanvas/TyrexCanvasOverlay.h" // For TyrexCAD::GridStyle and TyrexCAD::GridConfig

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
#include <QApplication> // Ensure qApp is available
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
#include <QInputDialog> 
#include <QLabel>       

namespace TyrexCAD {

    TyrexMainWindow::TyrexMainWindow(QWidget* parent)
        : QMainWindow(parent),
        m_viewerManager(nullptr),
        m_modelSpace(nullptr),
        m_commandManager(nullptr),
        m_sketchManager(nullptr),
        m_isInSketchMode(false),
        m_newAction(nullptr),
        m_openAction(nullptr),
        m_saveAction(nullptr),
        m_saveAsAction(nullptr),
        m_exitAction(nullptr),
        m_aboutAction(nullptr),
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
        m_gridCrossesAction(nullptr),
        m_gridSpacingAction(nullptr),
        m_toggleCoordinatesAction(nullptr),
        m_coordinateLabel(nullptr),
        m_gridStatusLabel(nullptr)
    {
        setupUI();
        initializeViewers();
    }

    TyrexMainWindow::~TyrexMainWindow()
    {
        delete m_commandManager;
        m_commandManager = nullptr;
    }

    void TyrexMainWindow::setupUI()
    {
        statusBar()->showMessage("Initializing UI...");
        setWindowTitle("TyrexCAD");
        resize(1200, 800);
    }

    void TyrexMainWindow::initializeViewers()
    {
        qDebug() << "=== TyrexMainWindow::initializeViewers() ===";

        auto viewWidget = new TyrexViewWidget(this);
        setCentralWidget(viewWidget);
        qDebug() << "View widget created and set as central widget";

        connect(viewWidget, &TyrexViewWidget::viewerInitialized, this, [this, viewWidget]() {
            qDebug() << "=== MainWindow received viewerInitialized signal ===";
            m_viewerManager = viewWidget->viewerManager();

            if (m_viewerManager && !m_viewerManager->view().IsNull() && !m_viewerManager->context().IsNull()) {
                qDebug() << "Viewer manager, View, and Context retrieved successfully";
                m_modelSpace = std::make_unique<TyrexModelSpace>(m_viewerManager->context());
                qDebug() << "Model space created";

                initializeCommandSystem();
                initializeSketchSystem();

                createActions();
                createMenus();
                createToolbars();
                setupConnections();
                setupStatusBar();
                initializeConnections();

                QTimer::singleShot(200, this, &TyrexMainWindow::createTestGeometry);
                statusBar()->showMessage("System initialized.", 3000);
            }
            else {
                qCritical() << "Failed to retrieve viewer manager or its components (View/Context are NULL).";
                statusBar()->showMessage("Critical Error: Failed to initialize 3D viewer components.", 5000);
            }
            });
    }

    void TyrexMainWindow::initializeCommandSystem()
    {
        qDebug() << "=== TyrexMainWindow::initializeCommandSystem() ===";
        if (!m_viewerManager || !m_modelSpace) {
            qCritical() << "Cannot initialize command system - missing components.";
            return;
        }

        m_commandManager = new TyrexCommandManager(this);
        connect(m_commandManager, &TyrexCommandManager::commandStarted, this, [this](const std::string& cmdName) {
            QString cmdDisplay = QString::fromStdString(cmdName);
            updateStatusBar(QString(m_isInSketchMode ? "Sketch Command: %1" : "Command: %1").arg(cmdDisplay));
            qDebug() << "Command started:" << cmdDisplay;
            });
        connect(m_commandManager, &TyrexCommandManager::commandFinished, this, &TyrexMainWindow::onCommandFinished);
        connect(m_commandManager, &TyrexCommandManager::commandCanceled, this, [this]() {
            updateStatusBar("Command canceled");
            qDebug() << "Command canceled";
            });

        if (m_viewerManager && m_viewerManager->interactionManager()) {
            m_viewerManager->interactionManager()->setCommandManager(m_commandManager);
        }
        else {
            qCritical() << "Interaction manager is null in initializeCommandSystem.";
        }
        m_commandManager->setModelSpace(m_modelSpace.get());
        if (m_viewerManager) m_commandManager->setViewerManager(m_viewerManager.get());
        qDebug() << "Command system initialized.";
    }

    void TyrexMainWindow::initializeSketchSystem()
    {
        qDebug() << "=== TyrexMainWindow::initializeSketchSystem() ===";
        if (!m_viewerManager || m_viewerManager->context().IsNull()) {
            qCritical() << "Cannot initialize sketch system - viewer manager or context is null.";
            return;
        }
        try {
            m_sketchManager = Sketch::createSketchManager(m_viewerManager->context(), m_viewerManager.get(), this);
            connect(m_sketchManager.get(), &TyrexSketchManager::sketchModeEntered, this, [this]() {
                updateSketchModeUI();
                setupSketchModeToolbars();
                updateSketchStatusBar();
                });
            connect(m_sketchManager.get(), &TyrexSketchManager::sketchModeExited, this, [this]() {
                updateSketchModeUI();
                restoreNormalToolbars();
                updateStatusBar("3D Modeling Mode");
                });
            connect(m_sketchManager.get(), &TyrexSketchManager::entitySelected, this, &TyrexMainWindow::onSketchEntitySelected);
            connect(m_sketchManager.get(), &TyrexSketchManager::entityModified, this, &TyrexMainWindow::onSketchEntityModified);
            connect(m_sketchManager.get(), &TyrexSketchManager::selectionCleared, this, &TyrexMainWindow::clearPropertyPanel);

            if (m_viewerManager && m_viewerManager->interactionManager()) {
                m_viewerManager->interactionManager()->setSketchManager(m_sketchManager.get());
            }
            else {
                qCritical() << "Interaction manager is null in initializeSketchSystem.";
            }
            qDebug() << "Sketch system initialized.";
        }
        catch (const std::exception& ex) {
            qCritical() << "Error initializing sketch system:" << ex.what();
        }
    }

    void TyrexMainWindow::initializeConnections()
    {
        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget) {
            connect(viewWidget, &TyrexViewWidget::cursorWorldPosition, this, [this](double x, double y) {
                if (m_coordinateLabel && m_toggleCoordinatesAction && m_toggleCoordinatesAction->isChecked()) {
                    m_coordinateLabel->setText(QString("X: %1, Y: %2").arg(x, 0, 'f', 2).arg(y, 0, 'f', 2));
                }
                else if (m_coordinateLabel) {
                    m_coordinateLabel->setText("X: --, Y: --");
                }
                });
            connect(viewWidget, &TyrexViewWidget::gridConfigChanged, this, &TyrexMainWindow::updateSketchStatusBar);
        }
    }


    void TyrexMainWindow::onCommandFinished()
    {
        updateStatusBar(QString("%1 command completed.").arg(m_isInSketchMode ? "Sketch" : "3D"));
        qDebug() << "Command finished notification received";
    }

    void TyrexMainWindow::startLineCommand()
    {
        if (!m_commandManager) {
            qWarning() << "Command manager not initialized for Line command.";
            return;
        }
        m_commandManager->createAndStartCommand("Line");
    }

    void TyrexMainWindow::createSampleLine()
    {
        if (!m_viewerManager || !m_modelSpace) {
            qWarning() << "Cannot create sample line - components not initialized.";
            return;
        }
        try {
            auto lineEntity = std::make_shared<TyrexLineEntity>(
                "sample_line_direct", "default", Quantity_Color(0.0, 1.0, 1.0, Quantity_TOC_RGB),
                gp_Pnt(10, 10, 0), gp_Pnt(110, 110, 0));
            m_modelSpace->addEntity(lineEntity);
            if (m_viewerManager) m_viewerManager->fitAll();
            updateStatusBar("Direct sample line created.");
        }
        catch (const std::exception& ex) {
            qCritical() << "Exception creating sample line:" << ex.what();
        }
    }

    void TyrexMainWindow::createTestGeometry()
    {
        if (!m_modelSpace || !m_viewerManager || m_viewerManager->context().IsNull()) {
            qCritical() << "Cannot create test geometry - missing components.";
            return;
        }
        try {
            m_modelSpace->clear();
            Quantity_Color colors[] = { Quantity_NOC_RED, Quantity_NOC_GREEN, Quantity_NOC_BLUE, Quantity_NOC_YELLOW, Quantity_NOC_CYAN };
            gp_Pnt points[] = { gp_Pnt(-50,-50,0), gp_Pnt(50,-50,0), gp_Pnt(50,50,0), gp_Pnt(-50,50,0) };
            const char* ids[] = { "line_1", "line_2", "line_3", "line_4" };

            for (int i = 0; i < 4; ++i) {
                auto line = std::make_shared<TyrexLineEntity>(ids[i], "default", colors[i], points[i], points[(i + 1) % 4]);
                m_modelSpace->addEntity(line);
            }
            auto diag = std::make_shared<TyrexLineEntity>("diag_line", "default", colors[4], points[0], points[2]);
            m_modelSpace->addEntity(diag);

            m_modelSpace->drawAll();
            if (!m_viewerManager->view().IsNull()) {
                m_viewerManager->view()->SetProj(V3d_Zpos);
                m_viewerManager->fitAll();
            }
            updateStatusBar("Test geometry created.");
        }
        catch (const std::exception& ex) {
            qCritical() << "Exception creating test geometry:" << ex.what();
        }
    }

    void TyrexMainWindow::addSampleEntity() { createSampleLine(); }

    void TyrexMainWindow::createActions()
    {
        m_newAction = new QAction(tr("&New"), this);
        m_newAction->setShortcuts(QKeySequence::New);
        connect(m_newAction, &QAction::triggered, this, &TyrexMainWindow::newFile);

        m_openAction = new QAction(tr("&Open..."), this);
        m_openAction->setShortcuts(QKeySequence::Open);
        connect(m_openAction, &QAction::triggered, this, &TyrexMainWindow::openFile);

        m_saveAction = new QAction(tr("&Save"), this);
        m_saveAction->setShortcuts(QKeySequence::Save);
        connect(m_saveAction, &QAction::triggered, this, &TyrexMainWindow::saveFile);

        m_saveAsAction = new QAction(tr("Save &As..."), this);
        m_saveAsAction->setShortcuts(QKeySequence::SaveAs);
        connect(m_saveAsAction, &QAction::triggered, this, &TyrexMainWindow::saveFileAs);

        m_exitAction = new QAction(tr("E&xit"), this);
        m_exitAction->setShortcuts(QKeySequence::Quit);
        connect(m_exitAction, &QAction::triggered, qApp, &QApplication::quit); // Use qApp here

        m_lineAction = new QAction(tr("&Line (3D)"), this);
        connect(m_lineAction, &QAction::triggered, this, &TyrexMainWindow::startLineCommand);

        m_directLineAction = new QAction(tr("&Direct Line (3D)"), this);
        connect(m_directLineAction, &QAction::triggered, this, &TyrexMainWindow::addSampleEntity);

        m_testGeometryAction = new QAction(tr("Create Test &Shapes"), this);
        connect(m_testGeometryAction, &QAction::triggered, this, &TyrexMainWindow::createTestGeometry);

        m_aboutAction = new QAction(tr("&About"), this);
        connect(m_aboutAction, &QAction::triggered, this, &TyrexMainWindow::about);

        createSketchActions();
        createAdvancedSketchActions();
    }

    void TyrexMainWindow::createSketchActions()
    {
        m_sketchModeAction = new QAction(tr("&Sketch Mode"), this);
        m_sketchModeAction->setCheckable(true);
        connect(m_sketchModeAction, &QAction::triggered, this, &TyrexMainWindow::toggleSketchMode);

        m_exitSketchAction = new QAction(tr("Exit &Sketch"), this);
        m_exitSketchAction->setVisible(false);
        connect(m_exitSketchAction, &QAction::triggered, this, &TyrexMainWindow::exitSketchMode);

        m_sketchLineAction = new QAction(tr("Sketch &Line"), this);
        m_sketchLineAction->setEnabled(false);
        connect(m_sketchLineAction, &QAction::triggered, this, &TyrexMainWindow::startSketchLineCommand);

        m_sketchCircleAction = new QAction(tr("Sketch &Circle"), this);
        m_sketchCircleAction->setEnabled(false);
        connect(m_sketchCircleAction, &QAction::triggered, this, &TyrexMainWindow::startSketchCircleCommand);
    }

    void TyrexMainWindow::createAdvancedSketchActions()
    {
        m_toggleGridAction = new QAction(tr("Toggle &Grid"), this);
        m_toggleGridAction->setCheckable(true);
        m_toggleGridAction->setChecked(true);
        connect(m_toggleGridAction, &QAction::triggered, this, [this](bool checked) {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) viewWidget->setGridEnabled(checked);
            updateSketchStatusBar();
            });

        m_gridSpacingAction = new QAction(tr("Grid &Spacing..."), this);
        connect(m_gridSpacingAction, &QAction::triggered, this, [this]() {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                TyrexCAD::GridConfig config = viewWidget->getGridConfig();
                bool ok;
                double newSpacing = QInputDialog::getDouble(this, tr("Grid Spacing"), tr("Enter grid spacing:"),
                    config.baseSpacing, 0.01, 10000.0, 2, &ok);
                if (ok) {
                    config.baseSpacing = newSpacing;
                    viewWidget->setGridConfig(config);
                }
            }
            });

        m_toggleSnapAction = new QAction(tr("Toggle &Snap"), this);
        m_toggleSnapAction->setCheckable(true);
        m_toggleSnapAction->setChecked(true);
        connect(m_toggleSnapAction, &QAction::triggered, this, [this](bool checked) {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) {
                TyrexCAD::GridConfig config = viewWidget->getGridConfig();
                config.snapEnabled = checked;
                viewWidget->setGridConfig(config);
            }
            updateSketchStatusBar();
            });

        m_toggleOrthoAction = new QAction(tr("Toggle &Ortho"), this);
        m_toggleOrthoAction->setCheckable(true);
        m_toggleOrthoAction->setChecked(false);
        connect(m_toggleOrthoAction, &QAction::triggered, this, [this](bool checked) {
            if (m_sketchManager) {
                // TyrexCAD::TyrexSketchConfig sketchCfg = m_sketchManager->getSketchConfig(); //
                // sketchCfg.interaction.orthoMode = checked;
                // m_sketchManager->setSketchConfig(sketchCfg); //
                // The above lines were commented out as getSketchConfig/setSketchConfig are not currently members of TyrexSketchManager
                // Placeholder until a proper config mechanism is implemented in TyrexSketchManager
                qDebug() << "Ortho mode toggled: " << checked << "(Implementation in SketchManager needed)";
            }
            updateSketchStatusBar();
            });

        m_gridStyleGroup = new QActionGroup(this);
        m_gridLinesAction = new QAction(tr("Grid &Lines"), this);
        m_gridLinesAction->setCheckable(true);
        m_gridLinesAction->setChecked(true);
        m_gridStyleGroup->addAction(m_gridLinesAction);
        connect(m_gridLinesAction, &QAction::triggered, this, [this]() {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) viewWidget->setGridStyle(TyrexCAD::GridStyle::Lines);
            updateSketchStatusBar();
            });

        m_gridDotsAction = new QAction(tr("Grid &Dots"), this);
        m_gridDotsAction->setCheckable(true);
        m_gridStyleGroup->addAction(m_gridDotsAction);
        connect(m_gridDotsAction, &QAction::triggered, this, [this]() {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) viewWidget->setGridStyle(TyrexCAD::GridStyle::Dots);
            updateSketchStatusBar();
            });

        m_gridCrossesAction = new QAction(tr("Grid &Crosses"), this);
        m_gridCrossesAction->setCheckable(true);
        m_gridStyleGroup->addAction(m_gridCrossesAction);
        connect(m_gridCrossesAction, &QAction::triggered, this, [this]() {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) viewWidget->setGridStyle(TyrexCAD::GridStyle::Crosses);
            updateSketchStatusBar();
            });

        m_toggleCoordinatesAction = new QAction(tr("Show &Coordinates"), this);
        m_toggleCoordinatesAction->setCheckable(true);
        m_toggleCoordinatesAction->setChecked(true);
        connect(m_toggleCoordinatesAction, &QAction::triggered, this, [this](bool checked) {
            auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
            if (viewWidget) viewWidget->setCoordinateDisplayEnabled(checked);
            if (m_coordinateLabel) m_coordinateLabel->setVisible(checked);
            updateSketchStatusBar();
            });
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
        createViewMenu();
        m_drawMenu = menuBar()->addMenu(tr("&Draw"));
        m_drawMenu->addAction(m_lineAction);
        m_drawMenu->addAction(m_directLineAction);
        createSketchMenus();
        m_toolsMenu = menuBar()->addMenu(tr("&Tools"));
        m_helpMenu = menuBar()->addMenu(tr("&Help"));
        m_helpMenu->addAction(m_aboutAction);
    }

    void TyrexMainWindow::createViewMenu()
    {
        m_viewMenu = menuBar()->addMenu(tr("&View"));
        QMenu* gridMenu = m_viewMenu->addMenu(tr("&Grid Options"));
        gridMenu->addAction(m_toggleGridAction);
        gridMenu->addAction(m_toggleSnapAction);
        gridMenu->addSeparator();
        gridMenu->addAction(m_gridLinesAction);
        gridMenu->addAction(m_gridDotsAction);
        gridMenu->addAction(m_gridCrossesAction);
        gridMenu->addSeparator();
        gridMenu->addAction(m_gridSpacingAction);

        m_viewMenu->addAction(m_toggleCoordinatesAction);
        m_viewMenu->addSeparator();
        m_viewMenu->addAction(m_testGeometryAction);
    }

    void TyrexMainWindow::createSketchMenus()
    {
        m_sketchMenu = menuBar()->addMenu(tr("&Sketch"));
        m_sketchMenu->addAction(m_sketchModeAction);
        m_sketchMenu->addAction(m_exitSketchAction);
        m_sketchMenu->addSeparator();
        m_sketchMenu->addAction(m_sketchLineAction);
        m_sketchMenu->addAction(m_sketchCircleAction);
        m_sketchMenu->addSeparator();
        m_sketchMenu->addAction(m_toggleOrthoAction);
    }

    void TyrexMainWindow::createToolbars()
    {
        m_fileToolBar = addToolBar(tr("File"));
        m_fileToolBar->setObjectName("FileToolBar");
        m_fileToolBar->addAction(m_newAction);
        m_fileToolBar->addAction(m_openAction);
        m_fileToolBar->addAction(m_saveAction);

        m_drawToolBar = addToolBar(tr("3D Draw"));
        m_drawToolBar->setObjectName("DrawToolBar");
        m_drawToolBar->addAction(m_lineAction);
        m_drawToolBar->addAction(m_directLineAction);

        createSketchToolbars();
        if (m_sketchToolBar) m_sketchToolBar->setVisible(false);
    }

    void TyrexMainWindow::createSketchToolbars()
    {
        m_sketchToolBar = addToolBar(tr("Sketch"));
        m_sketchToolBar->setObjectName("SketchToolBar");
        m_sketchToolBar->addAction(m_sketchLineAction);
        m_sketchToolBar->addAction(m_sketchCircleAction);
        m_sketchToolBar->addSeparator();
        m_sketchToolBar->addAction(m_toggleGridAction);
        m_sketchToolBar->addAction(m_toggleSnapAction);
        m_sketchToolBar->addAction(m_toggleOrthoAction);

        QToolButton* gridStyleButton = new QToolButton(this);
        gridStyleButton->setText(tr("Grid Style"));
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

    void TyrexMainWindow::setupConnections() { /* For any other general connections */ }

    void TyrexMainWindow::setupStatusBar()
    {
        m_coordinateLabel = new QLabel("X: --, Y: --");
        m_coordinateLabel->setMinimumWidth(150);
        m_coordinateLabel->setFrameStyle(QFrame::Panel | QFrame::Sunken);
        if (m_toggleCoordinatesAction) {
            m_coordinateLabel->setVisible(m_toggleCoordinatesAction->isChecked());
        }
        else {
            m_coordinateLabel->setVisible(false);
        }

        m_gridStatusLabel = new QLabel("Grid: ON Snap: ON Ortho: OFF");
        m_gridStatusLabel->setMinimumWidth(200);
        m_gridStatusLabel->setFrameStyle(QFrame::Panel | QFrame::Sunken);

        statusBar()->addPermanentWidget(m_gridStatusLabel);
        statusBar()->addPermanentWidget(m_coordinateLabel);
        updateSketchStatusBar();
    }


    void TyrexMainWindow::updateSketchModeUI()
    {
        m_isInSketchMode = m_sketchManager && m_sketchManager->isInSketchMode();
        qDebug() << "Updating UI for sketch mode change. Is in sketch mode: " << m_isInSketchMode;

        if (m_sketchModeAction) m_sketchModeAction->setChecked(m_isInSketchMode);
        if (m_sketchModeAction) m_sketchModeAction->setText(m_isInSketchMode ? tr("Exit Sketch Mode") : tr("Enter Sketch Mode"));

        if (m_exitSketchAction) m_exitSketchAction->setVisible(m_isInSketchMode);
        if (m_sketchLineAction) m_sketchLineAction->setEnabled(m_isInSketchMode);
        if (m_sketchCircleAction) m_sketchCircleAction->setEnabled(m_isInSketchMode);

        if (m_drawToolBar) m_drawToolBar->setVisible(!m_isInSketchMode);
        if (m_sketchToolBar) m_sketchToolBar->setVisible(m_isInSketchMode);

        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget) {
            viewWidget->setSketchModeGrid(m_isInSketchMode);
        }

        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            if (m_isInSketchMode) {
                m_viewerManager->set2DMode();
            }
            else {
                m_viewerManager->set3DMode();
            }
        }
        updateSketchStatusBar();
    }

    void TyrexMainWindow::toggleSketchMode()
    {
        if (!m_sketchManager) {
            qWarning() << "Sketch manager not initialized.";
            if (m_sketchModeAction) m_sketchModeAction->setChecked(false);
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
        if (!m_sketchManager) return;
        if (m_commandManager && m_commandManager->activeCommand()) m_commandManager->cancelCommand();

        m_sketchManager->enterSketchMode();
    }

    void TyrexMainWindow::exitSketchMode()
    {
        if (!m_sketchManager) return;
        if (m_commandManager && m_commandManager->activeCommand()) m_commandManager->cancelCommand();

        m_sketchManager->exitSketchMode();
    }

    void TyrexMainWindow::startSketchLineCommand()
    {
        if (!m_sketchManager || !m_sketchManager->isInSketchMode() || !m_commandManager) return;
        auto lineCommand = std::make_shared<TyrexSketchLineCommand>(m_sketchManager.get());
        m_commandManager->startCommand(lineCommand);
    }

    void TyrexMainWindow::startSketchCircleCommand()
    {
        if (!m_sketchManager || !m_sketchManager->isInSketchMode() || !m_commandManager) return;
        auto circleCommand = std::make_shared<TyrexSketchCircleCommand>(m_sketchManager.get());
        m_commandManager->startCommand(circleCommand);
    }

    void TyrexMainWindow::onSketchEntitySelected(const std::string& entityId) {
        updateStatusBar(QString("Selected sketch entity: %1").arg(QString::fromStdString(entityId)));
        updatePropertyPanel(entityId);
    }

    void TyrexMainWindow::onSketchEntityModified(const std::string& entityId) {
        updateStatusBar(QString("Modified sketch entity: %1").arg(QString::fromStdString(entityId)));
        setDocumentModified(true);
    }

    void TyrexMainWindow::updateSketchStatusBar() {
        if (!m_gridStatusLabel) return;

        QString gridText = "Grid: ";
        gridText += (m_toggleGridAction && m_toggleGridAction->isChecked()) ? "ON" : "OFF";

        QString snapText = " Snap: ";
        snapText += (m_toggleSnapAction && m_toggleSnapAction->isChecked()) ? "ON" : "OFF";

        QString orthoText = " Ortho: ";
        orthoText += (m_toggleOrthoAction && m_toggleOrthoAction->isChecked()) ? "ON" : "OFF";

        m_gridStatusLabel->setText(gridText + snapText + orthoText);

        if (m_coordinateLabel && m_toggleCoordinatesAction) {
            m_coordinateLabel->setVisible(m_toggleCoordinatesAction->isChecked());
        }
    }

    void TyrexMainWindow::setupSketchModeToolbars() { if (m_sketchToolBar) m_sketchToolBar->setVisible(true); }
    void TyrexMainWindow::restoreNormalToolbars() { if (m_sketchToolBar) m_sketchToolBar->setVisible(false); }
    void TyrexMainWindow::updatePropertyPanel(const std::string& entityId) { /* Placeholder */ }
    void TyrexMainWindow::clearPropertyPanel() { /* Placeholder */ }
    void TyrexMainWindow::setDocumentModified(bool modified) { setWindowModified(modified); }
    void TyrexMainWindow::updateStatusBar(const QString& message) { statusBar()->showMessage(message, 3000); }

    void TyrexMainWindow::newFile() { updateStatusBar(tr("New file action...")); }
    void TyrexMainWindow::openFile() { updateStatusBar(tr("Open file action...")); }
    void TyrexMainWindow::saveFile() { updateStatusBar(tr("Save file action...")); }
    void TyrexMainWindow::saveFileAs() { updateStatusBar(tr("Save file as action...")); }
    void TyrexMainWindow::about() {
        QMessageBox::about(this, tr("About TyrexCAD"),
            tr("TyrexCAD - A CAD application.\nVersion 0.1 Alpha"));
    }

} // namespace TyrexCAD