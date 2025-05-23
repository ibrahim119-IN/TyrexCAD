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
    class TyrexSketchManager;

    /**
     * @brief Manager for user interactions with the CAD model
     *
     * Extended to support both 3D modeling and 2D sketching modes
     */
    class TyrexInteractionManager {
    public:
        /**
         * @brief Interaction modes supported by the manager
         */
        enum class InteractionMode {
            Model3D,    ///< Standard 3D modeling mode
            Sketch2D    ///< 2D parametric sketching mode
        };

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
         * @brief Set the sketch manager for 2D sketching operations
         * @param sketchManager Pointer to the sketch manager
         */
        void setSketchManager(TyrexSketchManager* sketchManager);

        /**
         * @brief Set the current interaction mode
         * @param mode New interaction mode
         */
        void setInteractionMode(InteractionMode mode);

        /**
         * @brief Get the current interaction mode
         * @return Current interaction mode
         */
        InteractionMode getInteractionMode() const;

        /**
         * @brief Check if currently in sketch mode
         * @return True if in sketch mode
         */
        bool isInSketchMode() const;

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

        /**
         * @brief Handle key press events
         * @param key The key that was pressed
         * @param modifiers Keyboard modifiers
         */
        void onKeyPress(int key, Qt::KeyboardModifiers modifiers);

        /**
         * @brief Handle key release events
         * @param key The key that was released
         * @param modifiers Keyboard modifiers
         */
        void onKeyRelease(int key, Qt::KeyboardModifiers modifiers);

    private:
        // Core components
        TyrexViewerManager* m_viewerManager;     // Viewer manager reference
        TyrexCommandManager* m_commandManager;   // Command manager reference
        TyrexSketchManager* m_sketchManager;     // Sketch manager reference

        // Current interaction mode
        InteractionMode m_currentMode;

        // Last mouse state
        QPoint m_lastMousePosition;

        // 3D model interaction state
        bool m_isSelecting;
        bool m_isPanning;
        bool m_isRotating;
        bool m_isZooming;

        // Keyboard state
        Qt::KeyboardModifiers m_currentModifiers;

        /**
         * @brief Handle mouse press in 3D modeling mode
         * @param button The button that was pressed
         * @param position Position where mouse was pressed
         */
        void handleModel3DMousePress(Qt::MouseButton button, const QPoint& position);

        /**
         * @brief Handle mouse press in 2D sketching mode
         * @param button The button that was pressed
         * @param position Position where mouse was pressed
         */
        void handleSketch2DMousePress(Qt::MouseButton button, const QPoint& position);

        /**
         * @brief Handle mouse move in 3D modeling mode
         * @param position Current mouse position
         * @param modifiers Keyboard modifiers during move
         */
        void handleModel3DMouseMove(const QPoint& position, Qt::KeyboardModifiers modifiers);

        /**
         * @brief Handle mouse move in 2D sketching mode
         * @param position Current mouse position
         * @param modifiers Keyboard modifiers during move
         */
        void handleSketch2DMouseMove(const QPoint& position, Qt::KeyboardModifiers modifiers);

        /**
         * @brief Handle mouse release in 3D modeling mode
         * @param button The button that was released
         * @param position Position where mouse was released
         */
        void handleModel3DMouseRelease(Qt::MouseButton button, const QPoint& position);

        /**
         * @brief Handle mouse release in 2D sketching mode
         * @param button The button that was released
         * @param position Position where mouse was released
         */
        void handleSketch2DMouseRelease(Qt::MouseButton button, const QPoint& position);

        /**
         * @brief Handle wheel event in 3D modeling mode
         * @param delta Wheel delta amount
         * @param position Current mouse position
         */
        void handleModel3DWheel(int delta, const QPoint& position);

        /**
         * @brief Handle wheel event in 2D sketching mode
         * @param delta Wheel delta amount
         * @param position Current mouse position
         */
        void handleSketch2DWheel(int delta, const QPoint& position);

        /**
         * @brief Update cursor based on current interaction state
         */
        void updateCursor();

        /**
         * @brief Reset all interaction states
         */
        void resetInteractionStates();
    };

} // namespace TyrexCAD

#endif // TYREX_INTERACTION_MANAGER_H