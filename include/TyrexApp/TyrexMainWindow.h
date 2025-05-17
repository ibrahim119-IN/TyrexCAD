#ifndef TYREX_MAIN_WINDOW_H
#define TYREX_MAIN_WINDOW_H

#include <QMainWindow>
#include <memory>
#include <QTimer>

// Add this include to fix the undefined type error
#include "TyrexCore/TyrexCommandManager.h"

// OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <Standard_DefineHandle.hxx>

class QAction;
class QMenu;
class QToolBar;

namespace TyrexCAD {
    class TyrexViewerManager;
    class TyrexModelSpace;
    // TyrexCommandManager already included above

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
         *
         * Demonstrates how to create a TyrexLineEntity and add it to the application's
         * model space. Creates a horizontal line along the X-axis from (0,0,0) to (200,0,0)
         * with bright cyan color, and ensures it's visible.
         */
        void addSampleEntity();

        /**
         * @brief Creates a sample line directly without using the command system
         *
         * This is a simplified method to create a line directly, bypassing the command
         * system to demonstrate basic line creation functionality.
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

    private:
        void setupUI();
        void createActions();
        void createMenus();
        void createToolbars();
        void setupConnections();
        void initializeViewers();
        void initializeCommandSystem();

    private:
        // Using smart pointers for RAII
        std::shared_ptr<TyrexViewerManager> m_viewerManager;
        std::unique_ptr<TyrexModelSpace> m_modelSpace;

        // Command manager (option 1: raw pointer)
        TyrexCommandManager* m_commandManager = nullptr;
        // Alternative option (would need different initialization):
        // std::unique_ptr<TyrexCommandManager> m_commandManager;

        // Actions
        QAction* m_newAction;
        QAction* m_openAction;
        QAction* m_saveAction;
        QAction* m_saveAsAction;
        QAction* m_exitAction;
        QAction* m_aboutAction;

        // Add command actions
        QAction* m_lineAction;
        QAction* m_directLineAction;

        // Menus
        QMenu* m_fileMenu;
        QMenu* m_editMenu;
        QMenu* m_viewMenu;
        QMenu* m_toolsMenu;
        QMenu* m_drawMenu;
        QMenu* m_helpMenu;

        // Toolbars
        QToolBar* m_fileToolBar;
        QToolBar* m_editToolBar;
        QToolBar* m_viewToolBar;
        QToolBar* m_drawToolBar;
    };

} // namespace TyrexCAD
#endif // TYREX_MAIN_WINDOW_H