/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_MAIN_WINDOW_H
#define TYREX_MAIN_WINDOW_H

#include <QMainWindow>
#include <memory>

QT_BEGIN_NAMESPACE
class QAction;
class QMenu;
class QToolBar;
class QLabel;
class QActionGroup;
QT_END_NAMESPACE

namespace TyrexCAD {

    // Forward declarations
    class TyrexViewerManager;
    class TyrexCommandManager;
    class TyrexModelSpace;
    class TyrexSketchManager;
    class TyrexUnifiedGridSystem;
    class TyrexSnapManager;
    class TyrexLayerManager;

    /**
     * @brief Main application window for TyrexCAD
     *
     * This is the primary window that hosts all UI elements and manages
     * the overall application state.
     */
    class TyrexMainWindow : public QMainWindow
    {
        Q_OBJECT

    public:
        /**
         * @brief Constructor
         * @param parent Parent widget
         */
        explicit TyrexMainWindow(QWidget* parent = nullptr);

        /**
         * @brief Destructor
         */
        ~TyrexMainWindow();

        /**
         * @brief Enable or disable debug mode
         * @param enable True to enable debug mode
         */
        void enableDebugMode(bool enable);

    private slots:
        // File menu actions
        void newFile();
        void openFile();
        void saveFile();
        void saveFileAs();
        void about();

        // Edit menu actions
        // TODO: Add edit actions

        // Draw menu actions
        void startLineCommand();
        void createSampleLine();
        void addSampleEntity();

        // Sketch menu actions
        void toggleSketchMode();
        void enterSketchMode();
        void exitSketchMode();
        void startSketchLineCommand();
        void startSketchCircleCommand();

        // Command handling
        void onCommandFinished();

        // Sketch handling
        void onSketchEntitySelected(const std::string& entityId);
        void onSketchEntityModified(const std::string& entityId);

        // Test functionality
        void createTestGeometry();

        /**
         * @brief Called when OpenGL context is ready for grid initialization
         * This is a critical slot for deferred initialization of OpenGL-dependent components
         */
        void onOpenGLReadyForGrid();

    private:
        void setupUI();
        void createActions();
        void createAdvancedSketchActions();
        void createSketchActions();
        void createMenus();
        void createToolbars();
        void createDockWindows();
        void setupStatusBar();

        // Initialization methods
        void initialize();
        void initializeConnections();
        void initializeComponentsAfterViewer();
        void initializeModelSpace();
        void initializeCommandManager();
        void initializeSketchManager();

        // Unified systems initialization
        void initializeUnifiedSystems();
        void connectUnifiedSystemSignals();

        // Helper methods
        bool checkViewerReadiness();
        bool ensureSketchManagerInitialized();
        void setupConnections();
        void updateStatusBar(const QString& message);
        void updateSketchStatusBar();
        void updateSketchModeUI();
        void updatePropertyPanel(const std::string& entityId);
        void clearPropertyPanel();
        void setDocumentModified(bool modified);
        void createGeometryInternal();

        // UI update methods
        void updateGridUI();
        void updateSnapUI();

    private:
        // Core managers
        std::shared_ptr<TyrexViewerManager> m_viewerManager;
        std::unique_ptr<TyrexModelSpace> m_modelSpace;
        TyrexCommandManager* m_commandManager;
        std::shared_ptr<TyrexSketchManager> m_sketchManager;

        // Unified systems
        std::unique_ptr<TyrexUnifiedGridSystem> m_unifiedGrid;
        std::unique_ptr<TyrexSnapManager> m_snapManager;
        std::unique_ptr<TyrexLayerManager> m_layerManager;

        // Menus
        QMenu* m_fileMenu;
        QMenu* m_editMenu;
        QMenu* m_viewMenu;
        QMenu* m_drawMenu;
        QMenu* m_sketchMenu;
        QMenu* m_toolsMenu;
        QMenu* m_helpMenu;

        // Toolbars
        QToolBar* m_fileToolBar;
        QToolBar* m_editToolBar;
        QToolBar* m_viewToolBar;
        QToolBar* m_drawToolBar;
        QToolBar* m_sketchToolBar;

        // File actions
        QAction* m_newAction;
        QAction* m_openAction;
        QAction* m_saveAction;
        QAction* m_saveAsAction;
        QAction* m_exitAction;

        // Edit actions
        // TODO: Add edit actions

        // View actions
        QAction* m_toggleGridAction;
        QAction* m_toggleSnapAction;
        QAction* m_toggleOrthoAction;
        QAction* m_toggleCoordinatesAction;
        QAction* m_gridLinesAction;
        QAction* m_gridDotsAction;
        QAction* m_gridCrossesAction;
        QAction* m_gridSpacingAction;
        QActionGroup* m_gridStyleGroup;

        // Draw actions
        QAction* m_lineAction;
        QAction* m_directLineAction;

        // Sketch actions
        QAction* m_sketchModeAction;
        QAction* m_exitSketchAction;
        QAction* m_sketchLineAction;
        QAction* m_sketchCircleAction;

        // Tools actions
        QAction* m_testGeometryAction;

        // Help actions
        QAction* m_aboutAction;

        // Status bar widgets
        QLabel* m_coordinateLabel;
        QLabel* m_gridStatusLabel;

        // State
        bool m_isInSketchMode;
        bool m_componentsInitialized;
        int m_initializationAttempts;
        bool m_debugMode;
        bool m_openGLDependentComponentsInitialized;
    };

} // namespace TyrexCAD

#endif // TYREX_MAIN_WINDOW_H