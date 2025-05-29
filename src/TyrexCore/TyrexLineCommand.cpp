/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCommands/TyrexCommand.h"
#include "TyrexSnapping/TyrexSnapManager.h"
#include "TyrexCore/CoordinateConverter.h"
#include <QDebug>
#include <V3d_View.hxx>
#include <gp_Pnt2d.hxx>
#include <Standard_Failure.hxx>
#include <QPoint>
#include <QString>
#include <QObject>
#include <vector>
#include <string>

namespace TyrexCAD {

    TyrexCommand::TyrexCommand(const std::string& name, QObject* parent)
        : QObject(parent)
        , m_name(name)
        , m_currentState(IDLE)
        , m_isStarted(false)
        , m_isFinished(false)
        , m_snapManager(nullptr)
    {
    }

    TyrexCommand::~TyrexCommand()
    {
        cleanupPreview();
    }

    const std::string& TyrexCommand::name() const
    {
        return m_name;
    }

    void TyrexCommand::start()
    {
        m_isStarted = true;
        m_isFinished = false;
        m_inputPoints.clear();

        transitionTo(WAITING_FIRST);

        qDebug() << "Command started:" << QString::fromStdString(m_name);
        emit statusMessage(QString("%1 command: Specify first point").arg(QString::fromStdString(m_name)));
    }

    void TyrexCommand::cancel()
    {
        qDebug() << "Command canceled:" << QString::fromStdString(m_name);

        cleanupPreview();
        transitionTo(CANCELLED);

        m_isStarted = false;
        m_isFinished = true;

        emit statusMessage(QString("%1 command cancelled").arg(QString::fromStdString(m_name)));
    }

    void TyrexCommand::onMousePress(const QPoint& point)
    {
        if (!m_isStarted || m_isFinished) {
            return;
        }

        // Apply snap if available
        gp_Pnt2d worldPoint = applySnap(point);

        // Handle based on current state
        switch (m_currentState) {
        case WAITING_FIRST:
            m_inputPoints.push_back(worldPoint);
            transitionTo(WAITING_SECOND);
            emit statusMessage(QString("%1: Specify second point").arg(QString::fromStdString(m_name)));
            break;

        case WAITING_SECOND:
            m_inputPoints.push_back(worldPoint);
            transitionTo(VALIDATING);

            if (validateInput()) {
                transitionTo(PROCESSING);
                if (processCommand()) {
                    transitionTo(FINISHED);
                    m_isFinished = true;
                }
                else {
                    cancel();
                }
            }
            else {
                emit statusMessage("Invalid input, please try again");
                m_inputPoints.pop_back();
                transitionTo(WAITING_SECOND);
            }
            break;

        case WAITING_THIRD:
            m_inputPoints.push_back(worldPoint);
            // Subclasses handle additional points
            break;

        default:
            break;
        }
    }

    void TyrexCommand::onMouseMove(const QPoint& point)
    {
        if (!m_isStarted || m_isFinished) {
            return;
        }

        // Apply snap if available
        gp_Pnt2d worldPoint = applySnap(point);
        m_currentPreviewPoint = worldPoint;

        // Update preview based on state
        if (m_currentState == WAITING_SECOND ||
            m_currentState == WAITING_THIRD ||
            m_currentState == PREVIEW) {
            updatePreview(worldPoint);
            emit previewUpdateRequired();
        }
    }

    void TyrexCommand::onMouseRelease(const QPoint& /*point*/)
    {
        // Base implementation does nothing
    }

    void TyrexCommand::onKeyPress(int key, Qt::KeyboardModifiers /*modifiers*/)
    {
        if (key == Qt::Key_Escape) {
            cancel();
        }
    }

    bool TyrexCommand::isFinished() const
    {
        return m_isFinished || m_currentState == FINISHED || m_currentState == CANCELLED;
    }

    TyrexCommand::State TyrexCommand::currentState() const
    {
        return m_currentState;
    }

    void TyrexCommand::setSnapManager(TyrexSnapManager* snapManager)
    {
        m_snapManager = snapManager;
    }

    void TyrexCommand::transitionTo(State newState)
    {
        if (m_currentState == newState) {
            return;
        }

        State oldState = m_currentState;

        qDebug() << QString("Command %1: %2 -> %3")
            .arg(QString::fromStdString(m_name))
            .arg(stateToString(oldState))
            .arg(stateToString(newState));

        // Exit old state
        onExitState(oldState);

        // Update state
        m_currentState = newState;

        // Enter new state
        onEnterState(newState);

        // Emit signal
        emit stateChanged(oldState, newState);
    }

    void TyrexCommand::onEnterState(State state)
    {
        // Base implementation - subclasses override
        switch (state) {
        case PREVIEW:
            // Start showing preview
            break;

        case PROCESSING:
            emit statusMessage(QString("Processing %1...").arg(QString::fromStdString(m_name)));
            break;

        case FINISHED:
            cleanupPreview();
            emit statusMessage(QString("%1 completed").arg(QString::fromStdString(m_name)));
            break;

        case CANCELLED:
            cleanupPreview();
            break;

        default:
            break;
        }
    }

    void TyrexCommand::onExitState(State state)
    {
        // Base implementation - subclasses override
        if (state == PREVIEW) {
            cleanupPreview();
        }
    }

    bool TyrexCommand::validateInput()
    {
        // Base implementation - check we have at least 2 points
        return m_inputPoints.size() >= 2;
    }

    void TyrexCommand::updatePreview(const gp_Pnt2d& /*currentPoint*/)
    {
        // Base implementation does nothing
        // Subclasses override to update preview
    }

    void TyrexCommand::cleanupPreview()
    {
        // Base implementation does nothing
        // Subclasses can override this to clean up preview objects
    }

    bool TyrexCommand::processCommand()
    {
        // Base implementation does nothing
        // Subclasses override to process the command
        qWarning() << "processCommand not implemented for" << QString::fromStdString(m_name);
        return false;
    }

    QString TyrexCommand::stateToString(State state)
    {
        switch (state) {
        case IDLE:           return "IDLE";
        case WAITING_FIRST:  return "WAITING_FIRST";
        case WAITING_SECOND: return "WAITING_SECOND";
        case WAITING_THIRD:  return "WAITING_THIRD";
        case PREVIEW:        return "PREVIEW";
        case VALIDATING:     return "VALIDATING";
        case PROCESSING:     return "PROCESSING";
        case FINISHED:       return "FINISHED";
        case CANCELLED:      return "CANCELLED";
        default:             return "UNKNOWN";
        }
    }

    gp_Pnt2d TyrexCommand::applySnap(const QPoint& screenPos)
    {
        if (!m_snapManager || !m_snapManager->isEnabled()) {
            // No snap - convert directly
            // TODO: Need view access for proper conversion
            return gp_Pnt2d(screenPos.x(), screenPos.y());
        }

        // Use snap manager
        // TODO: Need view handle
        Handle(V3d_View) view; // This needs to be provided
        auto snapResult = m_snapManager->snap(screenPos, view);

        if (snapResult.snapped) {
            emit statusMessage(snapResult.description);
            return snapResult.point;
        }

        // No snap occurred - convert directly
        return gp_Pnt2d(screenPos.x(), screenPos.y());
    }

} // namespace TyrexCAD