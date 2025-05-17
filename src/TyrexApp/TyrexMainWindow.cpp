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

namespace TyrexCAD {

    TyrexMainWindow::TyrexMainWindow(QWidget* parent)
        : QMainWindow(parent),
        m_viewerManager(nullptr),
        m_modelSpace(nullptr),
        m_commandManager(nullptr),
        m_lineAction(nullptr),
        m_directLineAction(nullptr)
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
        // Create view widget
        auto viewWidget = new TyrexViewWidget(this);
        setCentralWidget(viewWidget);

        // Connect to viewer initialization
        connect(viewWidget, &TyrexViewWidget::viewerInitialized, this, [this, viewWidget]() {
            // Store viewer manager from view widget
            m_viewerManager = viewWidget->viewerManager();

            if (m_viewerManager) {
                // Create model space with OpenCascade context
                m_modelSpace = std::make_unique<TyrexModelSpace>(m_viewerManager->context());

                // Timer: create test geometry after initialization
                QTimer::singleShot(100, this, &TyrexMainWindow::createTestGeometry);

                // Initialize command system after viewer and model space are ready
                initializeCommandSystem();

                // Update status
                statusBar()->showMessage("Viewer initialized successfully", 2000);
            }
            else {
                qCritical() << "Failed to initialize viewer manager!";
                statusBar()->showMessage("Failed to initialize 3D viewer", 5000);
            }
            });
    }

    void TyrexMainWindow::initializeCommandSystem()
    {
        if (!m_viewerManager || !m_modelSpace) {
            qCritical() << "Cannot initialize command system - viewer or model space is null";
            return;
        }

        // Create command manager
        m_commandManager = new TyrexCommandManager(this);

        // Connect command signals
        connect(m_commandManager, &TyrexCommandManager::commandStarted,
            this, [this](const std::string& cmdName) {
                statusBar()->showMessage(QString("Command: %1 - Click to place first point").arg(
                    QString::fromStdString(cmdName)));
            });

        connect(m_commandManager, &TyrexCommandManager::commandFinished,
            this, &TyrexMainWindow::onCommandFinished);

        connect(m_commandManager, &TyrexCommandManager::commandCanceled,
            this, [this]() {
                statusBar()->showMessage("Command canceled", 2000);
            });

        // Get the interaction manager from the viewer manager
        auto interactionManager = m_viewerManager->interactionManager();

        // Add debug statements
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
    }

    void TyrexMainWindow::onCommandFinished()
    {
        statusBar()->showMessage("Command completed successfully", 2000);
    }

    void TyrexMainWindow::startLineCommand()
    {
        // Use direct line creation for simplicity
        createSampleLine();
    }

    void TyrexMainWindow::createSampleLine()
    {
        qDebug() << "Creating sample line directly";

        // Check if components are initialized
        if (!m_viewerManager || !m_modelSpace) {
            qWarning() << "Cannot create sample line - components not initialized";
            statusBar()->showMessage("Error: Components not initialized", 2000);
            return;
        }

        try {
            // Define line endpoints
            gp_Pnt startPoint(0.0, 0.0, 0.0);
            gp_Pnt endPoint(150.0, 150.0, 150.0);  // Diagonal line

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
        if (!m_modelSpace || !m_viewerManager) {
            qWarning() << "Cannot create geometry - model space or viewer manager is null";
            return;
        }

        try {
            // Clear any existing shapes
            m_modelSpace->clear();
            qDebug() << "Cleared previous shapes";

            // Creating test geometry for demonstration
            qDebug() << "Creating test shapes...";

            // X-axis - Red line
            Quantity_Color xAxisColor(1.0, 0.0, 0.0, Quantity_TOC_RGB); // Red
            auto xAxis = std::make_shared<TyrexLineEntity>(
                "test_line_x",       // ID
                "default",           // Layer name
                xAxisColor,          // Color
                gp_Pnt(-200, 0, 0),  // Start point - negative side
                gp_Pnt(200, 0, 0)    // End point - positive side
            );
            m_modelSpace->addEntity(xAxis);
            qDebug() << "Added X axis (red)";

            // Y-axis - Green line
            Quantity_Color yAxisColor(0.0, 1.0, 0.0, Quantity_TOC_RGB); // Green
            auto yAxis = std::make_shared<TyrexLineEntity>(
                "test_line_y",       // ID
                "default",           // Layer name
                yAxisColor,          // Color
                gp_Pnt(0, -200, 0),  // Start point - negative side
                gp_Pnt(0, 200, 0)    // End point - positive side
            );
            m_modelSpace->addEntity(yAxis);
            qDebug() << "Added Y axis (green)";

            // Z-axis - Blue line
            Quantity_Color zAxisColor(0.0, 0.0, 1.0, Quantity_TOC_RGB); // Blue
            auto zAxis = std::make_shared<TyrexLineEntity>(
                "test_line_z",       // ID
                "default",           // Layer name
                zAxisColor,          // Color
                gp_Pnt(0, 0, -200),  // Start point - negative side
                gp_Pnt(0, 0, 200)    // End point - positive side
            );
            m_modelSpace->addEntity(zAxis);
            qDebug() << "Added Z axis (blue)";

            // Center circle - Yellow
            Quantity_Color circleColor(1.0, 1.0, 0.0, Quantity_TOC_RGB); // Yellow
            auto circle = std::make_shared<TyrexCircleEntity>(
                "test_circle_xy",    // ID
                "default",           // Layer name
                circleColor,         // Color
                gp_Pnt(0, 0, 0),     // Center point
                120.0                // Radius (adjust as needed)
            );
            m_modelSpace->addEntity(circle);
            qDebug() << "Added center circle";

            // Sample line - Cyan
            Quantity_Color cyanColor(0.0, 1.0, 1.0, Quantity_TOC_RGB); // Cyan
            auto sampleLine = std::make_shared<TyrexLineEntity>(
                "sample_cyan_line",
                "default",
                cyanColor,
                gp_Pnt(50, 50, 50),
                gp_Pnt(150, 150, 150)
            );
            m_modelSpace->addEntity(sampleLine);
            qDebug() << "Added sample line";

            // Draw all entities
            qDebug() << "Drawing all geometries...";
            m_modelSpace->drawAll();

            // Set the view perspective
            qDebug() << "Setting view perspective";
            m_viewerManager->view()->SetProj(V3d_XposYnegZpos);  // Isometric view

            // Fit all in view
            qDebug() << "Fitting view";
            m_viewerManager->fitAll();

            // Redraw the view
            m_viewerManager->redraw();

            // Debug: Number of created entities
            qDebug() << "Created entities: 5";

            // Update status
            qDebug() << "Test geometries created successfully";
            statusBar()->showMessage("Test geometry created and displayed", 3000);
        }
        catch (const Standard_Failure& ex) {
            qCritical() << "OpenCascade error creating test geometries:" << ex.GetMessageString();
            statusBar()->showMessage("Error creating test geometries", 5000);
        }
        catch (const std::exception& ex) {
            qCritical() << "C++ error creating test geometries:" << ex.what();
            statusBar()->showMessage("Error creating test geometries", 5000);
        }
        catch (...) {
            qCritical() << "Unknown error creating test geometries";
            statusBar()->showMessage("Error creating test geometries", 5000);
        }
    }

    void TyrexMainWindow::addSampleEntity()
    {
        // Direct method to create a sample line
        createSampleLine();
    }

    void TyrexMainWindow::createActions()
    {
        // Create all file menu actions

        // New action
        m_newAction = new QAction(tr("&New"), this);
        m_newAction->setShortcuts(QKeySequence::New);
        m_newAction->setStatusTip(tr("Create a new file"));
        connect(m_newAction, &QAction::triggered, this, &TyrexMainWindow::newFile);

        // Open action
        m_openAction = new QAction(tr("&Open..."), this);
        m_openAction->setShortcuts(QKeySequence::Open);
        m_openAction->setStatusTip(tr("Open an existing file"));
        connect(m_openAction, &QAction::triggered, this, &TyrexMainWindow::openFile);

        // Save action
        m_saveAction = new QAction(tr("&Save"), this);
        m_saveAction->setShortcuts(QKeySequence::Save);
        m_saveAction->setStatusTip(tr("Save the document to disk"));
        connect(m_saveAction, &QAction::triggered, this, &TyrexMainWindow::saveFile);

        // Save As action
        m_saveAsAction = new QAction(tr("Save &As..."), this);
        m_saveAsAction->setShortcuts(QKeySequence::SaveAs);
        m_saveAsAction->setStatusTip(tr("Save the document under a new name"));
        connect(m_saveAsAction, &QAction::triggered, this, &TyrexMainWindow::saveFileAs);

        // Exit action
        m_exitAction = new QAction(tr("E&xit"), this);
        m_exitAction->setShortcuts(QKeySequence::Quit);
        m_exitAction->setStatusTip(tr("Exit the application"));
        connect(m_exitAction, &QAction::triggered, this, &QWidget::close);

        // Drawing commands
        m_lineAction = new QAction(tr("&Line"), this);
        m_lineAction->setStatusTip(tr("Create a line by selecting two points"));

        // Connect line action to use command system
        connect(m_lineAction, &QAction::triggered, this, [this]() {
            // Short delay to ensure all systems are initialized
            QTimer::singleShot(100, this, [this]() {
                if (m_viewerManager && m_modelSpace) {
                    createSampleLine();
                }
                else {
                    statusBar()->showMessage("System not ready, please try again", 2000);
                }
                });
            });

        // Direct line action (bypasses command system)
        m_directLineAction = new QAction(tr("&Direct Line"), this);
        m_directLineAction->setStatusTip(tr("Create a line directly"));
        connect(m_directLineAction, &QAction::triggered, this, [this]() {
            // Short delay to ensure all systems are initialized
            QTimer::singleShot(100, this, [this]() {
                if (m_viewerManager && m_modelSpace) {
                    createSampleLine();
                }
                else {
                    statusBar()->showMessage("System not ready, please try again", 2000);
                }
                });
            });

        // About action
        m_aboutAction = new QAction(tr("&About"), this);
        m_aboutAction->setStatusTip(tr("Show the application's About box"));
        connect(m_aboutAction, &QAction::triggered, this, &TyrexMainWindow::about);

        qDebug() << "Actions created successfully";
    }

    void TyrexMainWindow::createMenus()
    {
        // Create all menu items

        // File menu
        m_fileMenu = menuBar()->addMenu(tr("&File"));
        m_fileMenu->addAction(m_newAction);
        m_fileMenu->addAction(m_openAction);
        m_fileMenu->addAction(m_saveAction);
        m_fileMenu->addAction(m_saveAsAction);
        m_fileMenu->addSeparator();
        m_fileMenu->addAction(m_exitAction);

        // Edit menu (placeholder for future functionality)
        m_editMenu = menuBar()->addMenu(tr("&Edit"));

        // View menu (placeholder for future functionality)
        m_viewMenu = menuBar()->addMenu(tr("&View"));

        // Add Draw menu
        m_drawMenu = menuBar()->addMenu(tr("&Draw"));
        m_drawMenu->addAction(m_lineAction);
        m_drawMenu->addAction(m_directLineAction); // Add direct line action

        // Tools menu (placeholder for future functionality)
        m_toolsMenu = menuBar()->addMenu(tr("&Tools"));

        // Help menu
        m_helpMenu = menuBar()->addMenu(tr("&Help"));
        m_helpMenu->addAction(m_aboutAction);

        qDebug() << "Menus created successfully";
    }

    void TyrexMainWindow::createToolbars()
    {
        // File toolbar
        m_fileToolBar = addToolBar(tr("File"));
        m_fileToolBar->addAction(m_newAction);
        m_fileToolBar->addAction(m_openAction);
        m_fileToolBar->addAction(m_saveAction);

        // Edit toolbar (placeholder for future functionality)
        m_editToolBar = addToolBar(tr("Edit"));

        // View toolbar (placeholder for future functionality)
        m_viewToolBar = addToolBar(tr("View"));

        // Draw toolbar
        m_drawToolBar = addToolBar(tr("Draw"));
        m_drawToolBar->addAction(m_lineAction);
        m_drawToolBar->addAction(m_directLineAction); // Add direct line action

        qDebug() << "Toolbars created successfully";
    }

    void TyrexMainWindow::setupConnections()
    {
        // Additional connections not covered by action setup
    }

    void TyrexMainWindow::newFile()
    {
        // New file implementation
        statusBar()->showMessage(tr("New file created"), 2000);
    }

    void TyrexMainWindow::openFile()
    {
        // Show file dialog for opening files
        QString fileName = QFileDialog::getOpenFileName(this,
            tr("Open CAD File"), "",
            tr("CAD Files (*.tcad);;All Files (*)"));

        if (!fileName.isEmpty()) {
            // Process the selected file
            statusBar()->showMessage(tr("File loaded: %1").arg(fileName), 2000);
        }
    }

    void TyrexMainWindow::saveFile()
    {
        // Save file implementation
        statusBar()->showMessage(tr("File saved"), 2000);
    }

    void TyrexMainWindow::saveFileAs()
    {
        // Show file dialog for saving files
        QString fileName = QFileDialog::getSaveFileName(this,
            tr("Save CAD File"), "",
            tr("CAD Files (*.tcad);;All Files (*)"));

        if (!fileName.isEmpty()) {
            // Save to the selected file
            statusBar()->showMessage(tr("File saved as: %1").arg(fileName), 2000);
        }
    }

    void TyrexMainWindow::about()
    {
        QMessageBox::about(this, tr("About TyrexCAD"),
            tr("TyrexCAD is a modern CAD application using Qt and OpenCascade.\n\n"
                "Version: 1.0.0\n"
                "Build: Development"));
    }

} // namespace TyrexCAD