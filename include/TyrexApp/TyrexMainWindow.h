/***************************************************************************
 * Copyright (c) 2025 TyrexCAD development team                          *
 * *
 * This file is part of the TyrexCAD CAx development system.             *
 * *
 ***************************************************************************/

#ifndef TYREX_MAIN_WINDOW_H
#define TYREX_MAIN_WINDOW_H

#include <QMainWindow>
#include <memory>
#include <QTimer> // For QTimer
#include <QLabel> // For QLabel
#include <QInputDialog> // For QInputDialog

 // Include required headers
#include "TyrexCore/TyrexCommandManager.h" // Assuming this exists and is correct

// OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <Standard_DefineHandle.hxx>

class QAction;
class QMenu;
class QToolBar;
class QActionGroup;

namespace TyrexCAD {
    class TyrexViewerManager;
    class TyrexModelSpace;
    class TyrexSketchManager;
    // Forward declare GridConfig and GridStyle if their full definition (from TyrexCanvasOverlay.h)
    // isn't available through other includes here.
    // However, TyrexViewWidget will likely need the full definition.
    // struct GridConfig; // Forward declaration if needed
    // enum class GridStyle; // Forward declaration if needed

    class TyrexMainWindow : public QMainWindow
    {
        Q_OBJECT
    public:
        explicit TyrexMainWindow(QWidget* parent = nullptr);
        ~TyrexMainWindow();

    private slots:
        // Create test geometry for demo
        void createTestGeometry();

        /**
         * @brief Creates and adds a sample line entity to the model space
         */
        void addSampleEntity();

        /**
         * @brief Creates a sample line directly without using the command system
         */
        void createSampleLine();

        // Command-related slots
        void startLineCommand();
        void onCommandFinished();

        // File operations
        void newFile();
        void openFile();
        void saveFile();
        void saveFileAs();

        // Help
        void about();

        // === SKETCH MODE SLOTS ===
        /**
         * @brief Toggle between sketch and 3D mode
         */
        void toggleSketchMode();

        /**
         * @brief Enter 2D parametric sketching mode
         */
        void enterSketchMode();

        /**
         * @brief Exit sketch mode and return to 3D modeling
         */
        void exitSketchMode();

        /**
         * @brief Start sketch line command
         */
        void startSketchLineCommand();

        /**
         * @brief Start sketch circle command
         */
        void startSketchCircleCommand();

        /**
         * @brief Handle sketch entity selection
         * @param entityId ID of selected entity
         */
        void onSketchEntitySelected(const std::string& entityId);

        /**
         * @brief Handle sketch entity modification
         * @param entityId ID of modified entity
         */
        void onSketchEntityModified(const std::string& entityId);

    private:
        void setupUI();
        void createActions();
        void createMenus();
        void createToolbars();
        void setupConnections();
        void initializeViewers();
        void initializeCommandSystem();


        // === SKETCH SYSTEM METHODS ===
        /**
         * @brief Initialize the sketching system
         */
        void initializeSketchSystem();

        /**
         * @brief Create sketch-related actions
         */
        void createSketchActions();

        /**
         * @brief Create advanced sketch actions (grid, snap, ortho)
         */
        void createAdvancedSketchActions();

        /**
         * @brief Create sketch-related menus
         */
        void createSketchMenus();

        /**
         * @brief Create sketch-related toolbars
         */
        void createSketchToolbars();

        /**
         * @brief Update UI for sketch mode changes
         */
        void updateSketchModeUI();

        /**
         * @brief Update sketch status bar with detailed information
         */
        void updateSketchStatusBar();

        /**
         * @brief Setup sketch mode specific toolbars
         */
        void setupSketchModeToolbars();

        /**
         * @brief Restore normal toolbars when exiting sketch mode
         */
        void restoreNormalToolbars();

        /**
         * @brief Update property panel with entity information
         * @param entityId ID of the entity to display
         */
        void updatePropertyPanel(const std::string& entityId);

        /**
         * @brief Clear the property panel
         */
        void clearPropertyPanel();

        /**
         * @brief Set document modified state
         * @param modified True if document is modified
         */
        void setDocumentModified(bool modified);

        /**
         * @brief Update status bar with custom message
         * @param message Message to display
         */
        void updateStatusBar(const QString& message);

        /**
         * @brief Setup status bar with widgets
         */
        void setupStatusBar();

        /**
         * @brief Create view menu
         */
        void createViewMenu();

        /**
         * @brief Initialize connections between components
         */
        void initializeConnections();

    private:
        // === CORE COMPONENTS ===
        std::shared_ptr<TyrexViewerManager> m_viewerManager;
        std::unique_ptr<TyrexModelSpace> m_modelSpace;
        TyrexCommandManager* m_commandManager; // Owned by TyrexMainWindow

        // === SKETCH SYSTEM ===
        std::shared_ptr<TyrexSketchManager> m_sketchManager;
        bool m_isInSketchMode;

        // === STANDARD ACTIONS ===
        QAction* m_newAction;
        QAction* m_openAction;
        QAction* m_saveAction;
        QAction* m_saveAsAction;
        QAction* m_exitAction;
        QAction* m_aboutAction;

        // Add command actions
        QAction* m_lineAction;
        QAction* m_directLineAction;

        // Test action
        QAction* m_testGeometryAction;

        // === SKETCH ACTIONS ===
        QAction* m_sketchModeAction;
        QAction* m_exitSketchAction;
        QAction* m_sketchLineAction;
        QAction* m_sketchCircleAction;

        // === ADVANCED SKETCH ACTIONS ===
        QAction* m_toggleGridAction;
        QAction* m_toggleSnapAction;
        QAction* m_toggleOrthoAction;

        // Grid style actions
        QActionGroup* m_gridStyleGroup;
        QAction* m_gridLinesAction;
        QAction* m_gridDotsAction;
        QAction* m_gridCrossesAction;

        // === ADVANCED GRID ACTIONS ===
        QAction* m_gridSpacingAction;          // Added
        QAction* m_toggleCoordinatesAction;  // Added

        // === MENUS ===
        QMenu* m_fileMenu;
        QMenu* m_editMenu;
        QMenu* m_viewMenu;
        QMenu* m_toolsMenu;
        QMenu* m_drawMenu;
        QMenu* m_sketchMenu;        // New sketch menu
        QMenu* m_helpMenu;

        // === TOOLBARS ===
        QToolBar* m_fileToolBar;
        QToolBar* m_editToolBar;
        QToolBar* m_viewToolBar;
        QToolBar* m_drawToolBar;
        QToolBar* m_sketchToolBar;  // New sketch toolbar

        // === STATUS BAR WIDGETS ===
        QLabel* m_coordinateLabel;        // Added
        QLabel* m_gridStatusLabel;          // Added
    };

} // namespace TyrexCAD
#endif // TYREX_MAIN_WINDOW_H