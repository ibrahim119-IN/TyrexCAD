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
#include <QTimer>
#include <QLabel>
#include <QInputDialog>

#include "TyrexCore/TyrexCommandManager.h"

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

    class TyrexMainWindow : public QMainWindow
    {
        Q_OBJECT
    public:
        explicit TyrexMainWindow(QWidget* parent = nullptr);
        ~TyrexMainWindow();

    private slots:
        void initialize();
        void createTestGeometry();
        void addSampleEntity();
        void createSampleLine();
        void startLineCommand();
        void onCommandFinished();
        void newFile();
        void openFile();
        void saveFile();
        void saveFileAs();
        void about();
        void toggleSketchMode();
        void enterSketchMode();
        void exitSketchMode();
        void startSketchLineCommand();
        void startSketchCircleCommand();
        void onSketchEntitySelected(const std::string& entityId);
        void onSketchEntityModified(const std::string& entityId);

    private:
        void setupUI();
        void createActions();
        void createMenus();
        void createToolbars();
        void createDockWindows();
        void setupConnections();
        void initializeConnections();
        void createSketchActions();
        void createAdvancedSketchActions();
        void updateSketchModeUI();
        void updateSketchStatusBar();
        void updatePropertyPanel(const std::string& entityId);
        void clearPropertyPanel();
        void setDocumentModified(bool modified);
        void updateStatusBar(const QString& message);
        void setupStatusBar();
        void initializeModelSpace();
        void initializeCommandManager();
        void initializeSketchManager();

    private:
        // Core components
        std::shared_ptr<TyrexViewerManager> m_viewerManager;
        std::unique_ptr<TyrexModelSpace> m_modelSpace;
        TyrexCommandManager* m_commandManager;

        // Sketch system
        std::shared_ptr<TyrexSketchManager> m_sketchManager;
        bool m_isInSketchMode;

        // Actions
        QAction* m_newAction;
        QAction* m_openAction;
        QAction* m_saveAction;
        QAction* m_saveAsAction;
        QAction* m_exitAction;
        QAction* m_aboutAction;
        QAction* m_lineAction;
        QAction* m_directLineAction;
        QAction* m_testGeometryAction;
        QAction* m_sketchModeAction;
        QAction* m_exitSketchAction;
        QAction* m_sketchLineAction;
        QAction* m_sketchCircleAction;
        QAction* m_toggleGridAction;
        QAction* m_toggleSnapAction;
        QAction* m_toggleOrthoAction;
        QActionGroup* m_gridStyleGroup;
        QAction* m_gridLinesAction;
        QAction* m_gridDotsAction;
        QAction* m_gridCrossesAction;
        QAction* m_gridSpacingAction;
        QAction* m_toggleCoordinatesAction;

        // Menus
        QMenu* m_fileMenu;
        QMenu* m_editMenu;
        QMenu* m_viewMenu;
        QMenu* m_toolsMenu;
        QMenu* m_drawMenu;
        QMenu* m_sketchMenu;
        QMenu* m_helpMenu;

        // Toolbars
        QToolBar* m_fileToolBar;
        QToolBar* m_editToolBar;
        QToolBar* m_viewToolBar;
        QToolBar* m_drawToolBar;
        QToolBar* m_sketchToolBar;

        // Status bar widgets
        QLabel* m_coordinateLabel;
        QLabel* m_gridStatusLabel;
    };

} // namespace TyrexCAD
#endif // TYREX_MAIN_WINDOW_H