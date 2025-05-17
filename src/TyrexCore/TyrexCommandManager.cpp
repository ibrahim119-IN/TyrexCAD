/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCore/TyrexCommandManager.h"
#include "TyrexCore/TyrexCommand.h"
#include "TyrexCore/TyrexLineCommand.h"
#include "TyrexCanvas/TyrexModelSpace.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include <QDebug>

namespace TyrexCAD {

    TyrexCommandManager::TyrexCommandManager(QObject* parent)
        : QObject(parent)
        , m_activeCommand(nullptr)
        , m_modelSpace(nullptr)
        , m_viewerManager(nullptr)
    {
        qDebug() << "TyrexCommandManager created";
    }

    void TyrexCommandManager::startCommand(std::shared_ptr<TyrexCommand> command)
    {
        // If there's already an active command, cancel it
        if (m_activeCommand) {
            cancelCommand();
        }

        // Set the new command as active
        m_activeCommand = command;

        // If the new command is valid, start it
        if (m_activeCommand) {
            qDebug() << "Starting command:" << QString::fromStdString(m_activeCommand->name());

            // Start the command
            m_activeCommand->start();

            // Emit the command started signal
            emit commandStarted(m_activeCommand->name());
        }
    }

    void TyrexCommandManager::cancelCommand()
    {
        if (m_activeCommand) {
            qDebug() << "Canceling command:" << QString::fromStdString(m_activeCommand->name());

            // Cancel the command
            m_activeCommand->cancel();

            // Clear the active command
            m_activeCommand.reset();

            // Emit the command canceled signal
            emit commandCanceled();
        }
    }

    void TyrexCommandManager::onMousePress(const QPoint& screenPos)
    {
        if (m_activeCommand) {
            m_activeCommand->onMousePress(screenPos);
            checkCommandStatus();
        }
    }

    void TyrexCommandManager::onMouseMove(const QPoint& screenPos)
    {
        if (m_activeCommand) {
            m_activeCommand->onMouseMove(screenPos);
            checkCommandStatus();
        }
    }

    void TyrexCommandManager::onMouseRelease(const QPoint& screenPos)
    {
        if (m_activeCommand) {
            m_activeCommand->onMouseRelease(screenPos);
            checkCommandStatus();
        }
    }

    std::shared_ptr<TyrexCommand> TyrexCommandManager::activeCommand() const
    {
        return m_activeCommand;
    }

    bool TyrexCommandManager::createAndStartCommand(const std::string& commandName)
    {
        if (commandName == "Line") {
            if (m_modelSpace && m_viewerManager) {
                auto lineCommand = std::make_shared<TyrexLineCommand>(m_modelSpace, m_viewerManager);
                startCommand(lineCommand);
                return true;
            }
            else {
                qWarning() << "Cannot create Line command - missing modelSpace or viewerManager";
                return false;
            }
        }
        // Add more command types as needed

        qWarning() << "Unknown command type:" << QString::fromStdString(commandName);
        return false;
    }

    void TyrexCommandManager::checkCommandStatus()
    {
        if (m_activeCommand && m_activeCommand->isFinished()) {
            qDebug() << "Command finished:" << QString::fromStdString(m_activeCommand->name());

            // Clear the active command
            m_activeCommand.reset();

            // Emit the command finished signal
            emit commandFinished();
        }
    }

    void TyrexCommandManager::setModelSpace(TyrexModelSpace* modelSpace)
    {
        m_modelSpace = modelSpace;
        qDebug() << "ModelSpace set in CommandManager";
    }

    void TyrexCommandManager::setViewerManager(TyrexViewerManager* viewerManager)
    {
        m_viewerManager = viewerManager;
        qDebug() << "ViewerManager set in CommandManager";
    }

} // namespace TyrexCAD