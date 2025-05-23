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
#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexSketch/TyrexSketchEntity.h"
 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <AIS_InteractiveContext.hxx>
#include <V3d_View.hxx>
#include <gp_Pnt.hxx>
#include <AIS_Shape.hxx>

// Qt includes
#include <QDebug>
#include <QApplication>
#include <QCursor>

namespace TyrexCAD {

    TyrexInteractionManager::TyrexInteractionManager()
        : m_viewerManager(nullptr)
        , m_commandManager(nullptr)
        , m_sketchManager(nullptr)
        , m_currentMode(InteractionMode::Model3D)
        , m_lastMousePosition(0, 0)
        , m_isSelecting(false)
        , m_isPanning(false)
        , m_isRotating(false)
        , m_isZooming(false)
        , m_currentModifiers(Qt::NoModifier)
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

    void TyrexInteractionManager::setSketchManager(TyrexSketchManager* sketchManager)
    {
        m_sketchManager = sketchManager;
        qDebug() << "Sketch manager set in interaction manager";
    }

    void TyrexInteractionManager::setInteractionMode(InteractionMode mode)
    {
        if (m_currentMode == mode) {
            return; // No change
        }

        qDebug() << "Changing interaction mode from" << static_cast<int>(m_currentMode)
            << "to" << static_cast<int>(mode);

        // Reset states when changing modes
        resetInteractionStates();

        m_currentMode = mode;
        updateCursor();

        qDebug() << "Interaction mode changed to" <<
            (mode == InteractionMode::Model3D ? "3D Model" : "2D Sketch");
    }

    TyrexInteractionManager::InteractionMode TyrexInteractionManager::getInteractionMode() const
    {
        return m_currentMode;
    }

    bool TyrexInteractionManager::isInSketchMode() const
    {
        return m_currentMode == InteractionMode::Sketch2D;
    }

    void TyrexInteractionManager::onMousePress(Qt::MouseButton button, const QPoint& position)
    {
        m_lastMousePosition = position;

        if (m_currentMode == InteractionMode::Model3D) {
            handleModel3DMousePress(button, position);
        }
        else if (m_currentMode == InteractionMode::Sketch2D) {
            handleSketch2DMousePress(button, position);
        }
    }

    void TyrexInteractionManager::onMouseMove(const QPoint& position, Qt::KeyboardModifiers modifiers)
    {
        m_currentModifiers = modifiers;

        if (m_currentMode == InteractionMode::Model3D) {
            handleModel3DMouseMove(position, modifiers);
        }
        else if (m_currentMode == InteractionMode::Sketch2D) {
            handleSketch2DMouseMove(position, modifiers);
        }

        m_lastMousePosition = position;
    }

    void TyrexInteractionManager::onMouseRelease(Qt::MouseButton button, const QPoint& position)
    {
        if (m_currentMode == InteractionMode::Model3D) {
            handleModel3DMouseRelease(button, position);
        }
        else if (m_currentMode == InteractionMode::Sketch2D) {
            handleSketch2DMouseRelease(button, position);
        }

        m_lastMousePosition = position;
    }

    void TyrexInteractionManager::onMouseWheel(int delta, const QPoint& position)
    {
        if (m_currentMode == InteractionMode::Model3D) {
            handleModel3DWheel(delta, position);
        }
        else if (m_currentMode == InteractionMode::Sketch2D) {
            handleSketch2DWheel(delta, position);
        }
    }

    void TyrexInteractionManager::onKeyPress(int key, Qt::KeyboardModifiers modifiers)
    {
        m_currentModifiers = modifiers;

        // Common key handling for both modes
        switch (key) {
        case Qt::Key_Escape:
            // Cancel active command or operations
            if (m_commandManager && m_commandManager->activeCommand()) {
                m_commandManager->cancelCommand();
            }
            resetInteractionStates();
            break;

        case Qt::Key_Delete:
            // Delete selected objects (sketch mode only)
            if (m_currentMode == InteractionMode::Sketch2D && m_sketchManager) {
                auto selectedEntities = m_sketchManager->getSelectedEntities();
                for (auto& entity : selectedEntities) {
                    m_sketchManager->removeSketchEntity(entity->getId());
                }
                m_sketchManager->clearSelection();
            }
            break;

        default:
            // Mode-specific key handling can be added here
            break;
        }
    }

    void TyrexInteractionManager::onKeyRelease(int key, Qt::KeyboardModifiers modifiers)
    {
        m_currentModifiers = modifiers;
        // Update cursor in case modifier keys changed
        updateCursor();
    }

    void TyrexInteractionManager::handleModel3DMousePress(Qt::MouseButton button, const QPoint& position)
    {
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

        // Check if there's an active command first
        bool commandHandled = false;
        if (m_commandManager && m_commandManager->activeCommand()) {
            // Let the command manager handle the click
            if (button == Qt::LeftButton) {
                m_commandManager->onMousePress(position);
                commandHandled = true;
                qDebug() << "Mouse press forwarded to active command";
            }
        }

        // If no command handled the event, proceed with default behavior
        if (!commandHandled) {
            if (button == Qt::LeftButton) {
                // Default behavior: selection
                m_isSelecting = true;
                m_viewerManager->selectEntityAt(position);
                qDebug() << "Default selection behavior triggered";
            }
            else if (button == Qt::RightButton) {
                // Start rotation
                m_isRotating = true;
                qDebug() << "Rotation mode started";
            }
            else if (button == Qt::MiddleButton) {
                // Start panning
                m_isPanning = true;
                qDebug() << "Panning mode started";
            }
        }

        updateCursor();
    }

    void TyrexInteractionManager::handleSketch2DMousePress(Qt::MouseButton button, const QPoint& position)
    {
        if (!m_sketchManager) {
            qWarning() << "Cannot handle sketch mouse press - sketch manager not initialized";
            return;
        }

        // Check if there's an active command first
        bool commandHandled = false;
        if (m_commandManager && m_commandManager->activeCommand()) {
            // Let the command manager handle the click
            if (button == Qt::LeftButton) {
                m_commandManager->onMousePress(position);
                commandHandled = true;
                qDebug() << "Sketch mouse press forwarded to active command";
            }
        }

        // If no command handled the event, let sketch manager handle it
        if (!commandHandled) {
            if (button == Qt::LeftButton) {
                // Let sketch manager handle selection and dragging
                bool handled = m_sketchManager->onMousePress(position);
                qDebug() << "Sketch manager handled mouse press:" << handled;
            }
            else if (button == Qt::RightButton) {
                // Context menu or rotation (depending on implementation preference)
                // For now, treat as view rotation
                m_isRotating = true;
                qDebug() << "Sketch rotation mode started";
            }
            else if (button == Qt::MiddleButton) {
                // Start panning
                m_isPanning = true;
                qDebug() << "Sketch panning mode started";
            }
        }

        updateCursor();
    }

    void TyrexInteractionManager::handleModel3DMouseMove(const QPoint& position, Qt::KeyboardModifiers modifiers)
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

        // Check if there's an active command first
        bool commandHandled = false;
        if (m_commandManager && m_commandManager->activeCommand()) {
            m_commandManager->onMouseMove(position);
            commandHandled = true;
        }

        // Handle view manipulation only if no command is active or command doesn't handle mouse move
        if (!commandHandled) {
            if (m_isPanning && m_viewerManager) {
                // Pan the view
                m_viewerManager->pan(delta.x(), delta.y());
                qDebug() << QString("Panning by (%1, %2)").arg(delta.x()).arg(delta.y());
            }
            else if (m_isRotating && m_viewerManager) {
                // Rotate the view
                m_viewerManager->rotate(delta.x(), delta.y());
                qDebug() << QString("Rotating by (%1, %2)").arg(delta.x()).arg(delta.y());
            }
            else {
                // Default behavior: update dynamic highlight
                m_viewerManager->highlightEntityAt(position);
            }
        }
    }

    void TyrexInteractionManager::handleSketch2DMouseMove(const QPoint& position, Qt::KeyboardModifiers modifiers)
    {
        if (!m_sketchManager) {
            return;
        }

        // Calculate movement delta
        QPoint delta = position - m_lastMousePosition;

        // Check if there's an active command first
        bool commandHandled = false;
        if (m_commandManager && m_commandManager->activeCommand()) {
            m_commandManager->onMouseMove(position);
            commandHandled = true;
        }

        // Handle sketch-specific mouse move
        if (!commandHandled) {
            if (m_isPanning && m_viewerManager) {
                // Pan the view (same as 3D mode)
                m_viewerManager->pan(delta.x(), delta.y());
                qDebug() << QString("Sketch panning by (%1, %2)").arg(delta.x()).arg(delta.y());
            }
            else if (m_isRotating && m_viewerManager) {
                // Rotate the view (can be limited in sketch mode)
                m_viewerManager->rotate(delta.x(), delta.y());
                qDebug() << QString("Sketch rotating by (%1, %2)").arg(delta.x()).arg(delta.y());
            }
            else {
                // Let sketch manager handle hover and drag operations
                m_sketchManager->onMouseMove(position);
            }
        }
    }

    void TyrexInteractionManager::handleModel3DMouseRelease(Qt::MouseButton button, const QPoint& position)
    {
        // Check if there's an active command first
        bool commandHandled = false;
        if (m_commandManager && m_commandManager->activeCommand()) {
            if (button == Qt::LeftButton) {
                m_commandManager->onMouseRelease(position);
                commandHandled = true;
                qDebug() << "Mouse release forwarded to active command";
            }
        }

        // Handle view state changes
        if (button == Qt::LeftButton && m_isSelecting) {
            m_isSelecting = false;
            qDebug() << "Selection mode ended";
        }
        else if (button == Qt::RightButton && m_isRotating) {
            m_isRotating = false;
            qDebug() << "Rotation mode ended";
        }
        else if (button == Qt::MiddleButton && m_isPanning) {
            m_isPanning = false;
            qDebug() << "Panning mode ended";
        }

        updateCursor();
    }

    void TyrexInteractionManager::handleSketch2DMouseRelease(Qt::MouseButton button, const QPoint& position)
    {
        // Check if there's an active command first
        bool commandHandled = false;
        if (m_commandManager && m_commandManager->activeCommand()) {
            if (button == Qt::LeftButton) {
                m_commandManager->onMouseRelease(position);
                commandHandled = true;
                qDebug() << "Sketch mouse release forwarded to active command";
            }
        }

        // Let sketch manager handle the release
        if (!commandHandled && button == Qt::LeftButton) {
            m_sketchManager->onMouseRelease(position);
        }

        // Handle view state changes
        if (button == Qt::RightButton && m_isRotating) {
            m_isRotating = false;
            qDebug() << "Sketch rotation mode ended";
        }
        else if (button == Qt::MiddleButton && m_isPanning) {
            m_isPanning = false;
            qDebug() << "Sketch panning mode ended";
        }

        updateCursor();
    }

    void TyrexInteractionManager::handleModel3DWheel(int delta, const QPoint& position)
    {
        if (!m_viewerManager) {
            return;
        }

        // Determine zoom factor based on wheel delta
        const double zoomFactor = delta > 0 ? 1.1 : 0.9;

        // Apply zoom centered on current mouse position
        m_viewerManager->zoom(zoomFactor);

        qDebug() << QString("3D Zoom applied with factor %1 at position (%2, %3)")
            .arg(zoomFactor).arg(position.x()).arg(position.y());
    }

    void TyrexInteractionManager::handleSketch2DWheel(int delta, const QPoint& position)
    {
        if (!m_viewerManager) {
            return;
        }

        // In sketch mode, zoom might be constrained differently
        const double zoomFactor = delta > 0 ? 1.1 : 0.9;

        // Apply zoom - same as 3D for now, but could be customized
        m_viewerManager->zoom(zoomFactor);

        qDebug() << QString("Sketch Zoom applied with factor %1 at position (%2, %3)")
            .arg(zoomFactor).arg(position.x()).arg(position.y());
    }

    void TyrexInteractionManager::updateCursor()
    {
        // Create a default cursor
        QCursor cursor = Qt::ArrowCursor;

        // Set cursor based on current state
        if (m_isPanning) {
            cursor = Qt::ClosedHandCursor;
        }
        else if (m_isRotating) {
            cursor = Qt::SizeAllCursor;
        }
        else if (m_isZooming) {
            cursor = Qt::SizeVerCursor;
        }
        else if (m_currentMode == InteractionMode::Sketch2D) {
            // Special cursors for sketch mode
            if (m_commandManager && m_commandManager->activeCommand()) {
                cursor = Qt::CrossCursor;
            }
            else {
                cursor = Qt::ArrowCursor;
            }
        }

        // Note: Normally we'd apply this to the view widget
        // For now, we'll just debug the cursor state
        qDebug() << "Cursor state updated";
    }

    void TyrexInteractionManager::resetInteractionStates()
    {
        m_isSelecting = false;
        m_isPanning = false;
        m_isRotating = false;
        m_isZooming = false;

        updateCursor();

        qDebug() << "Interaction states reset";
    }

} // namespace TyrexCAD