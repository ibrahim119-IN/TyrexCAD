/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_COMMAND_H
#define TYREX_COMMAND_H

#include <string>
#include <QPoint>
#include <QObject>

namespace TyrexCAD {

    // Forward declarations
    class TyrexSnapManager;

    /**
     * @brief Base class for all CAD commands
     */
    class TyrexCommand {
    public:
        /**
         * @brief Constructor
         * @param name Command name
         */
        explicit TyrexCommand(const std::string& name);

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
         * @brief Check if command is finished
         * @return True if command is finished
         */
        virtual bool isFinished() const;

        virtual void setSnapManager(TyrexSnapManager* snapManager) {
            m_snapManager = snapManager;
        }

    protected:
        TyrexSnapManager* m_snapManager = nullptr;
        std::string m_name;        ///< Command name
        bool m_isStarted;          ///< Whether command has been started
        bool m_isFinished;         ///< Whether command is finished
        // Remove this line: TyrexCommand(const std::string& name, QObject* parent);
    };

} // namespace TyrexCAD

#endif // TYREX_COMMAND_H