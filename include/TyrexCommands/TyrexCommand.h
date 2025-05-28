/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_COMMAND_H
#define TYREX_COMMAND_H

#include <string>
#include <vector>
#include <QPoint>
#include <QObject>
#include <gp_Pnt2d.hxx>

namespace TyrexCAD {

    // Forward declarations
    class TyrexSnapManager;

    /**
     * @brief Base class for all CAD commands with state machine support
     */
    class TyrexCommand : public QObject {
        Q_OBJECT

    public:
        /**
         * @brief Command execution states
         */
        enum State {
            IDLE,           ///< Command not started
            WAITING_FIRST,  ///< Waiting for first input
            WAITING_SECOND, ///< Waiting for second input
            WAITING_THIRD,  ///< Waiting for third input (for complex commands)
            PREVIEW,        ///< Showing preview
            VALIDATING,     ///< Validating input
            PROCESSING,     ///< Processing the command
            FINISHED,       ///< Command completed
            CANCELLED       ///< Command cancelled
        };

        /**
         * @brief Constructor
         * @param name Command name
         * @param parent Parent QObject
         */
        explicit TyrexCommand(const std::string& name, QObject* parent = nullptr);

        /**
         * @brief Virtual destructor
         */
        virtual ~TyrexCommand();

        /**
         * @brief Get the command name
         * @return Command name
         */
        const std::string& name() const;

        /**
         * @brief Start the command
         */
        virtual void start();

        /**
         * @brief Cancel the command
         */
        virtual void cancel();

        /**
         * @brief Handle mouse press with snap support
         * @param point Mouse position
         */
        virtual void onMousePress(const QPoint& point);

        /**
         * @brief Handle mouse move with snap support
         * @param point Mouse position
         */
        virtual void onMouseMove(const QPoint& point);

        /**
         * @brief Handle mouse release
         * @param point Mouse position
         */
        virtual void onMouseRelease(const QPoint& point);

        /**
         * @brief Handle keyboard input
         * @param key Key code
         * @param modifiers Keyboard modifiers
         */
        virtual void onKeyPress(int key, Qt::KeyboardModifiers modifiers);

        /**
         * @brief Check if command is finished
         * @return True if command is finished
         */
        virtual bool isFinished() const;

        /**
         * @brief Get current state
         * @return Current command state
         */
        State currentState() const;

        /**
         * @brief Set snap manager
         * @param snapManager Snap manager instance
         */
        void setSnapManager(TyrexSnapManager* snapManager);

    signals:
        /**
         * @brief Emitted when state changes
         * @param oldState Previous state
         * @param newState New state
         */
        void stateChanged(State oldState, State newState);

        /**
         * @brief Emitted to update status bar
         * @param message Status message
         */
        void statusMessage(const QString& message);

        /**
         * @brief Emitted when preview needs update
         */
        void previewUpdateRequired();

    protected:
        /**
         * @brief Transition to new state
         * @param newState Target state
         */
        void transitionTo(State newState);

        /**
         * @brief Called when entering a new state
         * @param state New state
         */
        virtual void onEnterState(State state);

        /**
         * @brief Called when exiting a state
         * @param state Old state
         */
        virtual void onExitState(State state);

        /**
         * @brief Validate current input
         * @return True if input is valid
         */
        virtual bool validateInput();

        /**
         * @brief Update preview based on current state
         * @param currentPoint Current mouse position
         */
        virtual void updatePreview(const gp_Pnt2d& currentPoint);

        /**
         * @brief Clean up preview objects
         */
        virtual void cleanupPreview();

        /**
         * @brief Process the command with validated input
         * @return True if processing successful
         */
        virtual bool processCommand();

        /**
         * @brief Get state name for debugging
         * @param state State to convert
         * @return State name as string
         */
        static QString stateToString(State state);

        /**
         * @brief Apply snap if enabled
         * @param screenPos Screen position
         * @return Snapped world position
         */
        gp_Pnt2d applySnap(const QPoint& screenPos);

    protected:
        std::string m_name;              ///< Command name
        State m_currentState;            ///< Current state
        bool m_isStarted;                ///< Whether command has been started
        bool m_isFinished;               ///< Whether command is finished
        TyrexSnapManager* m_snapManager; ///< Snap manager reference (not owned)

        // Common data storage for commands
        std::vector<gp_Pnt2d> m_inputPoints;  ///< Collected input points
        gp_Pnt2d m_currentPreviewPoint;       ///< Current preview position
    };

} // namespace TyrexCAD

#endif // TYREX_COM