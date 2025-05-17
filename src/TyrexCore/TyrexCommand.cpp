/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCore/TyrexCommand.h"
#include <QDebug>

namespace TyrexCAD {

    TyrexCommand::TyrexCommand(const std::string& name)
        : m_name(name)
        , m_isStarted(false)
        , m_isFinished(false)
    {
    }

    TyrexCommand::~TyrexCommand()
    {
    }

    const std::string& TyrexCommand::name() const
    {
        return m_name;
    }

    void TyrexCommand::start()
    {
        m_isStarted = true;
        m_isFinished = false;
        qDebug() << "Command started:" << QString::fromStdString(m_name);
    }

    void TyrexCommand::cancel()
    {
        m_isStarted = false;
        m_isFinished = false;
        qDebug() << "Command canceled:" << QString::fromStdString(m_name);
    }

    void TyrexCommand::onMousePress(const QPoint& /*point*/)
    {
        // Base implementation does nothing
    }

    void TyrexCommand::onMouseMove(const QPoint& /*point*/)
    {
        // Base implementation does nothing
    }

    void TyrexCommand::onMouseRelease(const QPoint& /*point*/)
    {
        // Base implementation does nothing
    }

    bool TyrexCommand::isFinished() const
    {
        return m_isFinished;
    }

} // namespace TyrexCAD