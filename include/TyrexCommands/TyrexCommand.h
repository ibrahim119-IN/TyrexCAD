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
#include <Qt>
#include <gp_Pnt2d.hxx>

namespace TyrexCAD {

    // Forward declaration
    class TyrexSnapManager;

    /**
     * @brief Base class for all CAD commands
     */
    class TyrexCommand : public QObject {
        Q_OBJECT
    public:
        /**
         * @brief Command states
         */
        enum State {
            IDLE,
            WAITING_FIRST,
            WAITING_SECOND,
            WAITING_THIRD,
            PREVIEW,
            VALIDATING,
            PROCESSING,
            FINISHED,
            CANCELLED
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
         * @brief Handle mouse press
         * @param point Mouse position
         */
        virtual void onMousePress(const QPoint& point);

        /**
         * @brief Handle mouse move
         * @param point Mouse position
         */
        virtual void onMouseMove(const QPoint& point);

        /**
         * @brief Handle mouse release
         * @param point Mouse position
         */
        virtual void onMouseRelease(const QPoint& point);

        /**
         * @brief Handle key press
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
         * @brief Get current command state
         * @return Current state
         */
        State currentState() const;

        /**
         * @brief Set snap manager for the command
         * @param snapManager Pointer to snap manager
         */
        virtual void setSnapManager(TyrexSnapManager* snapManager);

    signals:
        /**
         * @brief Emitted when status message should be displayed
         * @param message Status message
         */
        void statusMessage(const QString& message);

        /**
         * @brief Emitted when preview needs update
         */
        void previewUpdateRequired();

        /**
         * @brief Emitted when state changes
         * @param oldState Previous state
         * @param newState New state
         */
        void stateChanged(State oldState, State newState);

    protected:
        /**
         * @brief Transition to new state
         * @param newState Target state
         */
        void transitionTo(State newState);

        /**
         * @brief Called when entering a state
         * @param state State being entered
         */
        virtual void onEnterState(State state);

        /**
         * @brief Called when exiting a state
         * @param state State being exited
         */
        virtual void onExitState(State state);

        /**
         * @brief Validate input points
         * @return True if input is valid
         */
        virtual bool validateInput();

        /**
         * @brief Update preview geometry
         * @param currentPoint Current mouse position
         */
        virtual void updatePreview(const gp_Pnt2d& currentPoint);

        /**
         * @brief Cleans up any preview objects created during the command
         */
        virtual void cleanupPreview();

        /**
         * @brief Process the command with validated input
         * @return True if successful
         */
        virtual bool processCommand();

        /**
         * @brief Convert state to string
         * @param state State to convert
         * @return String representation
         */
        static QString stateToString(State state);

        /**
         * @brief Apply snap to screen position
         * @param screenPos Screen position
         * @return Snapped world position
         */
        gp_Pnt2d applySnap(const QPoint& screenPos);

    protected:
        std::string m_name;                         ///< Command name
        bool m_isStarted;                          ///< Whether command has been started
        bool m_isFinished;                         ///< Whether command is finished
        TyrexSnapManager* m_snapManager;           ///< Snap manager reference
        State m_currentState;                      ///< Current state of the command
        std::vector<gp_Pnt2d> m_inputPoints;      ///< Collected input points
        gp_Pnt2d m_currentPreviewPoint;           ///< Current preview point
    };

} // namespace TyrexCAD

#endif // TYREX_COMMAND_H