/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_COMMAND_MANAGER_H
#define TYREX_COMMAND_MANAGER_H

#include <memory>
#include <QObject>
#include <QPoint>

namespace TyrexCAD {

    // Forward declaration
    class TyrexCommand;
    class TyrexModelSpace;
    class TyrexViewerManager;

    /**
     * @brief Manages active command and routes events in a CAD system
     *
     * Responsible for:
     * - Maintaining the active command
     * - Routing mouse events to the active command
     * - Managing command lifecycle (start, finish, cancel)
     */
    class TyrexCommandManager : public QObject {
        Q_OBJECT
    public:
        /**
         * @brief Constructor
         * @param parent Parent QObject
         */
        explicit TyrexCommandManager(QObject* parent = nullptr);

        /**
         * @brief Start a new command
         *
         * Cancels any active command and starts the new one
         *
         * @param command The command to start
         */
        void startCommand(std::shared_ptr<TyrexCommand> command);

        /**
         * @brief Cancel the active command
         */
        void cancelCommand();

        /**
         * @brief Handle mouse press event
         * @param screenPos Screen position of the event
         */
        void onMousePress(const QPoint& screenPos);

        /**
         * @brief Handle mouse move event
         * @param screenPos Screen position of the event
         */
        void onMouseMove(const QPoint& screenPos);

        /**
         * @brief Handle mouse release event
         * @param screenPos Screen position of the event
         */
        void onMouseRelease(const QPoint& screenPos);

        /**
         * @brief Get the active command
         * @return Shared pointer to active command or nullptr if none
         */
        std::shared_ptr<TyrexCommand> activeCommand() const;

        /**
         * @brief Create a command directly
         * @param commandName Name of the command to create
         * @return True if command was created and started
         */
        bool createAndStartCommand(const std::string& commandName);

    signals:
        /**
         * @brief Emitted when a command starts
         * @param commandName Name of the started command
         */
        void commandStarted(const std::string& commandName);

        /**
         * @brief Emitted when a command finishes
         */
        void commandFinished();

        /**
         * @brief Emitted when a command is canceled
         */
        void commandCanceled();

    private:
        // Check if command is finished after each event
        void checkCommandStatus();

        // Active command
        std::shared_ptr<TyrexCommand> m_activeCommand;

        // References to other managers (not owned)
        TyrexModelSpace* m_modelSpace;
        TyrexViewerManager* m_viewerManager;

    public:
        /**
         * @brief Set model space reference
         * @param modelSpace Pointer to model space
         */
        void setModelSpace(TyrexModelSpace* modelSpace);

        /**
         * @brief Set viewer manager reference
         * @param viewerManager Pointer to viewer manager
         */
        void setViewerManager(TyrexViewerManager* viewerManager);
    };

} // namespace TyrexCAD

#endif // TYREX_COMMAND_MANAGER_H