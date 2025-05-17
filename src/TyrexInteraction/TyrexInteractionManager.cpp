/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexInteraction/TyrexInteractionManager.h"
#include "TyrexCore/TyrexCommandManager.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexCanvas/TyrexModelSpace.h"

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <AIS_InteractiveContext.hxx>
#include <V3d_View.hxx>
#include <gp_Pnt.hxx>
#include <AIS_Shape.hxx>

// Qt includes
#include <QDebug>

namespace TyrexCAD {

    TyrexInteractionManager::TyrexInteractionManager()
        : m_viewerManager(nullptr)
        , m_commandManager(nullptr)
        , m_lastMousePosition(0, 0)
        , m_isSelecting(false)
        , m_isPanning(false)
        , m_isRotating(false)
    {
        qDebug() << "TyrexInteractionManager constructed";
    }

    TyrexInteractionManager::~TyrexInteractionManager()
    {
        qDebug() << "TyrexInteractionManager destroyed";
    }

    void TyrexInteractionManager::setViewerManager(TyrexViewerManager* viewerManager)
    {
        m_viewerManager = viewerManager;
        qDebug() << "Viewer manager set in interaction manager";
    }

    void TyrexInteractionManager::setCommandManager(TyrexCommandManager* commandManager)
    {
        m_commandManager = commandManager;
        qDebug() << "Command manager set in interaction manager";
    }

    void TyrexInteractionManager::onMousePress(Qt::MouseButton button, const QPoint& position)
    {
        m_lastMousePosition = position;

        if (!m_viewerManager) {
            qWarning() << "Cannot handle mouse press - viewer manager not initialized";
            return;
        }

        Handle(AIS_InteractiveContext) context = m_viewerManager->context();
        Handle(V3d_View) view = m_viewerManager->view();

        if (context.IsNull() || view.IsNull()) {
            qWarning() << "Cannot handle mouse press - viewer components not initialized";
            return;
        }

        if (button == Qt::LeftButton) {
            // Try to execute active command if exists
            if (m_commandManager && m_commandManager->activeCommand()) {
                // Let the command manager handle the click
                m_commandManager->onMousePress(position);
            }
            else {
                // Default behavior: selection
                m_isSelecting = true;

                // Do selection operation
                if (m_viewerManager) {
                    m_viewerManager->selectEntityAt(position);
                }
            }
        }
        else if (button == Qt::RightButton) {
            // Start rotation
            m_isRotating = true;
        }
        else if (button == Qt::MiddleButton) {
            // Start panning
            m_isPanning = true;
        }
    }

    void TyrexInteractionManager::onMouseMove(const QPoint& position, Qt::KeyboardModifiers modifiers)
    {
        if (!m_viewerManager) {
            return;
        }

        Handle(AIS_InteractiveContext) context = m_viewerManager->context();
        Handle(V3d_View) view = m_viewerManager->view();

        if (context.IsNull() || view.IsNull()) {
            return;
        }

        // Calculate movement delta
        QPoint delta = position - m_lastMousePosition;

        if (m_isPanning && m_viewerManager) {
            // Pan the view
            m_viewerManager->pan(delta.x(), delta.y());
        }
        else if (m_isRotating && m_viewerManager) {
            // Rotate the view
            m_viewerManager->rotate(delta.x(), delta.y());
        }
        else {
            // Default behavior: update dynamic highlight
            if (m_viewerManager) {
                m_viewerManager->highlightEntityAt(position);
            }

            // Update command system if active
            if (m_commandManager && m_commandManager->activeCommand()) {
                m_commandManager->onMouseMove(position);
            }
        }

        m_lastMousePosition = position;
    }

    void TyrexInteractionManager::onMouseRelease(Qt::MouseButton button, const QPoint& position)
    {
        if (button == Qt::LeftButton && m_isSelecting) {
            m_isSelecting = false;

            // Finalize selection if needed
        }
        else if (button == Qt::RightButton) {
            m_isRotating = false;
        }
        else if (button == Qt::MiddleButton) {
            m_isPanning = false;
        }

        // Update command system if active
        if (m_commandManager && m_commandManager->activeCommand()) {
            m_commandManager->onMouseRelease(position);
        }

        // Update last position
        m_lastMousePosition = position;
    }

    void TyrexInteractionManager::onMouseWheel(int delta, const QPoint& position)
    {
        if (!m_viewerManager) {
            return;
        }

        // Determine zoom factor
        const double zoomFactor = delta > 0 ? 1.1 : 0.9;

        // Apply zoom
        m_viewerManager->zoom(zoomFactor);
    }

} // namespace TyrexCAD