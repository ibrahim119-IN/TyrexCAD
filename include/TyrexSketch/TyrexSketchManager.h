/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_SKETCH_MANAGER_H
#define TYREX_SKETCH_MANAGER_H

#include <memory>
#include <vector>
#include <unordered_map>
#include <QObject>
#include <QPoint>

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <Standard_DefineHandle.hxx>
#include <gp_Pnt2d.hxx>
#include <gp_Pln.hxx>
#include <V3d_View.hxx>
#include <AIS_InteractiveContext.hxx>

namespace TyrexCAD {

    // Forward declarations
    class TyrexSketchEntity;
    class TyrexViewerManager;

    /**
     * @brief Manages the interactive parametric sketching environment
     *
     * This class handles all 2D sketch entities within a specific sketch plane,
     * providing functionality for selection, editing, and real-time manipulation
     * of geometric entities in preparation for constraint-based design.
     */
    class TyrexSketchManager : public QObject {
        Q_OBJECT

    public:
        /**
         * @brief Selection and editing modes for sketch interaction
         */
        enum class InteractionMode {
            None,           ///< No interaction
            ObjectSelect,   ///< Select entire objects
            PointEdit,      ///< Edit individual points/endpoints
            DragObject,     ///< Drag entire object
            DragPoint       ///< Drag specific point
        };

        /**
         * @brief Types of control points on sketch entities
         */
        enum class ControlPointType {
            Endpoint,       ///< Line endpoint or circle center
            Midpoint,       ///< Line midpoint
            RadiusPoint     ///< Circle radius control point
        };

        /**
         * @brief Information about a control point
         */
        struct ControlPoint {
            std::shared_ptr<TyrexSketchEntity> entity;
            ControlPointType type;
            int index;          ///< Point index (e.g., 0 for start, 1 for end)
            gp_Pnt2d position;  ///< 2D position in sketch plane
        };

        /**
         * @brief Constructor
         * @param context OpenCascade interactive context
         * @param viewerManager Viewer manager for coordinate conversion
         * @param parent Parent QObject
         */
        explicit TyrexSketchManager(
            const Handle(AIS_InteractiveContext)& context,
            TyrexViewerManager* viewerManager,
            QObject* parent = nullptr);

        /**
         * @brief Destructor
         */
        ~TyrexSketchManager();

        /**
         * @brief Set the sketch plane (default is XY plane at Z=0)
         * @param plane The working plane for this sketch
         */
        void setSketchPlane(const gp_Pln& plane);

        /**
         * @brief Get the current sketch plane
         * @return The working plane
         */
        const gp_Pln& sketchPlane() const;

        /**
         * @brief Enter sketch mode - start managing 2D geometry
         */
        void enterSketchMode();

        /**
         * @brief Exit sketch mode - return to 3D modeling
         */
        void exitSketchMode();

        /**
         * @brief Check if currently in sketch mode
         * @return True if in sketch mode
         */
        bool isInSketchMode() const;

        /**
         * @brief Add a sketch entity to the manager
         * @param entity The entity to add
         */
        void addSketchEntity(std::shared_ptr<TyrexSketchEntity> entity);

        /**
         * @brief Remove a sketch entity
         * @param entityId ID of entity to remove
         */
        void removeSketchEntity(const std::string& entityId);

        /**
         * @brief Get all sketch entities
         * @return Vector of all managed sketch entities
         */
        std::vector<std::shared_ptr<TyrexSketchEntity>> getSketchEntities() const;

        /**
         * @brief Find sketch entity by ID
         * @param entityId Entity ID to search for
         * @return Shared pointer to entity or nullptr if not found
         */
        std::shared_ptr<TyrexSketchEntity> findSketchEntity(const std::string& entityId) const;

        /**
         * @brief Convert screen point to 2D sketch coordinates
         * @param screenPoint Screen coordinates
         * @return 2D point in sketch plane
         */
        gp_Pnt2d screenToSketch(const QPoint& screenPoint) const;

        /**
         * @brief Convert 2D sketch point to 3D world coordinates
         * @param sketchPoint 2D point in sketch plane
         * @return 3D point in world space
         */
        gp_Pnt sketchToWorld(const gp_Pnt2d& sketchPoint) const;

        /**
         * @brief Handle mouse press event in sketch mode
         * @param screenPos Screen coordinates of mouse press
         * @return True if event was handled
         */
        bool onMousePress(const QPoint& screenPos);

        /**
         * @brief Handle mouse move event in sketch mode
         * @param screenPos Current screen coordinates
         * @return True if event was handled
         */
        bool onMouseMove(const QPoint& screenPos);

        /**
         * @brief Handle mouse release event in sketch mode
         * @param screenPos Screen coordinates of mouse release
         * @return True if event was handled
         */
        bool onMouseRelease(const QPoint& screenPos);

        /**
         * @brief Select entity at given screen position
         * @param screenPos Screen coordinates
         * @return True if an entity was selected
         */
        bool selectEntityAt(const QPoint& screenPos);

        /**
         * @brief Clear all selections
         */
        void clearSelection();

        /**
         * @brief Get currently selected entities
         * @return Vector of selected entities
         */
        std::vector<std::shared_ptr<TyrexSketchEntity>> getSelectedEntities() const;

        /**
         * @brief Get control points for given entity
         * @param entity The entity to get control points for
         * @return Vector of control points
         */
        std::vector<ControlPoint> getControlPoints(std::shared_ptr<TyrexSketchEntity> entity) const;

        /**
         * @brief Find control point near given screen position
         * @param screenPos Screen coordinates
         * @param tolerance Tolerance in pixels
         * @return Control point if found, nullptr structure if not
         */
        ControlPoint findControlPointAt(const QPoint& screenPos, double tolerance = 10.0) const;

        /**
         * @brief Update entity during drag operation
         * @param entity Entity being dragged
         * @param newPosition New position for drag operation
         */
        void updateEntityDrag(std::shared_ptr<TyrexSketchEntity> entity, const gp_Pnt2d& newPosition);

        /**
         * @brief Update control point during drag operation
         * @param controlPoint Control point being dragged
         * @param newPosition New position for the control point
         */
        void updateControlPointDrag(const ControlPoint& controlPoint, const gp_Pnt2d& newPosition);

        /**
         * @brief Redraw all sketch entities and control points
         */
        void redrawSketch();

        /**
         * @brief Get the OpenCascade interactive context
         * @return AIS context handle
         */
        Handle(AIS_InteractiveContext) context() const;

    signals:
        /**
         * @brief Emitted when a sketch entity is selected
         * @param entityId ID of selected entity
         */
        void entitySelected(const std::string& entityId);

        /**
         * @brief Emitted when selection is cleared
         */
        void selectionCleared();

        /**
         * @brief Emitted when an entity is modified
         * @param entityId ID of modified entity
         */
        void entityModified(const std::string& entityId);

        /**
         * @brief Emitted when entering sketch mode
         */
        void sketchModeEntered();

        /**
         * @brief Emitted when exiting sketch mode
         */
        void sketchModeExited();
        /**
        * @brief Get the canvas overlay system
        * @return Pointer to canvas overlay
         */
        TyrexCanvasOverlay* canvasOverlay() const;

        /**
         * @brief Set grid visibility
         * @param visible True to show grid
         */
        void setGridVisible(bool visible);

        /**
         * @brief Set axes visibility
         * @param visible True to show axes
         */
        void setAxesVisible(bool visible);

        /**
         * @brief Snap point to grid
         * @param point Input point
         * @return Snapped point if grid is active
         */
        gp_Pnt2d snapToGrid(const gp_Pnt2d& point) const;

    private:
        // Core components
        Handle(AIS_InteractiveContext) m_context;
        TyrexViewerManager* m_viewerManager;

        // Sketch state
        bool m_isInSketchMode;
        gp_Pln m_sketchPlane;

        // Entity management
        std::vector<std::shared_ptr<TyrexSketchEntity>> m_sketchEntities;
        std::unordered_map<std::string, std::shared_ptr<TyrexSketchEntity>> m_entityMap;

        // Canvas overlay system
        std::unique_ptr<TyrexCanvasOverlay> m_canvasOverlay;

        // Selection and interaction
        std::vector<std::shared_ptr<TyrexSketchEntity>> m_selectedEntities;
        InteractionMode m_currentMode;

        // Drag operation state
        bool m_isDragging;
        QPoint m_lastMousePos;
        std::shared_ptr<TyrexSketchEntity> m_draggedEntity;
        ControlPoint m_draggedControlPoint;
        gp_Pnt2d m_dragStartPosition;

        // Visual feedback
        std::vector<Handle(AIS_InteractiveObject)> m_controlPointObjects;
        std::vector<Handle(AIS_InteractiveObject)> m_highlightObjects;

        /**
         * @brief Update visual feedback for current selection
         */
        void updateSelectionVisuals();

        /**
         * @brief Show control points for selected entities
         */
        void showControlPoints();

        /**
         * @brief Hide all control points
         */
        void hideControlPoints();

        /**
         * @brief Create visual representation of a control point
         * @param point The control point to visualize
         * @return AIS object for the control point
         */
        Handle(AIS_InteractiveObject) createControlPointVisual(const ControlPoint& point);

        /**
         * @brief Highlight entity for hover feedback
         * @param entity Entity to highlight
         */
        void highlightEntity(std::shared_ptr<TyrexSketchEntity> entity);

        /**
         * @brief Remove highlight from entity
         * @param entity Entity to unhighlight
         */
        void unhighlightEntity(std::shared_ptr<TyrexSketchEntity> entity);

        /**
         * @brief Find entity at screen position with tolerance
         * @param screenPos Screen coordinates
         * @param tolerance Tolerance in pixels
         * @return Entity if found, nullptr otherwise
         */
        std::shared_ptr<TyrexSketchEntity> findEntityAt(const QPoint& screenPos, double tolerance = 10.0) const;

        /**
         * @brief Begin drag operation
         * @param entity Entity to drag (can be null for control point drag)
         * @param controlPoint Control point to drag (can be invalid for entity drag)
         * @param startPos Starting position in sketch coordinates
         */
        void beginDrag(std::shared_ptr<TyrexSketchEntity> entity,
            const ControlPoint& controlPoint,
            const gp_Pnt2d& startPos);

        /**
         * @brief End current drag operation
         */
        void endDrag();
    };

} // namespace TyrexCAD

#endif // TYREX_SKETCH_MANAGER_H