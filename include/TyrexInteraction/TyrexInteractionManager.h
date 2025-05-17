/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_INTERACTION_MANAGER_H
#define TYREX_INTERACTION_MANAGER_H

#include <QPoint>
#include <Qt>
#include <memory>
#include <string>

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <Standard_DefineHandle.hxx>
#include <gp_Pnt.hxx>

// Forward declarations
class AIS_InteractiveContext;
class V3d_View;

namespace TyrexCAD {
    // Forward declarations
    class TyrexViewerManager;
    class TyrexModelSpace;
    class TyrexCommandManager;

    /**
     * @brief Manager for user interactions with the CAD model
     */
    class TyrexInteractionManager {
    public:
        /**
         * @brief Default constructor
         */
        TyrexInteractionManager();

        /**
         * @brief Destructor
         */
        ~TyrexInteractionManager();

        /**
         * @brief Set the viewer manager for this interaction manager
         * @param viewerManager Pointer to the viewer manager
         */
        void setViewerManager(TyrexViewerManager* viewerManager);

        /**
         * @brief Set the command manager for this interaction manager
         * @param commandManager Pointer to the command manager
         */
        void setCommandManager(TyrexCommandManager* commandManager);

        /**
         * @brief Handle mouse press events
         * @param button The button that was pressed
         * @param position Position where mouse was pressed
         */
        void onMousePress(Qt::MouseButton button, const QPoint& position);

        /**
         * @brief Handle mouse move events
         * @param position Current mouse position
         * @param modifiers Keyboard modifiers during move
         */
        void onMouseMove(const QPoint& position, Qt::KeyboardModifiers modifiers = Qt::NoModifier);

        /**
         * @brief Handle mouse release events
         * @param button The button that was released
         * @param position Position where mouse was released
         */
        void onMouseRelease(Qt::MouseButton button, const QPoint& position);

        /**
         * @brief Handle mouse wheel events
         * @param delta Wheel delta amount (positive=zoom in, negative=zoom out)
         * @param position Current mouse position
         */
        void onMouseWheel(int delta, const QPoint& position);

    private:
        // Private members
        TyrexViewerManager* m_viewerManager;     // Viewer manager reference
        TyrexCommandManager* m_commandManager;   // Command manager reference

        // Last mouse state
        QPoint m_lastMousePosition;

        // Selection state
        bool m_isSelecting;

        // View control state
        bool m_isPanning;
        bool m_isRotating;
    };

} // namespace TyrexCAD

#endif // TYREX_INTERACTION_MANAGER_H