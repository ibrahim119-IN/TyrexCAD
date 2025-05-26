/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_SKETCH_ENTITY_H
#define TYREX_SKETCH_ENTITY_H

#include <string>
#include <vector>
#include <memory>

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <gp_Pnt2d.hxx>
#include <gp_Pln.hxx>
#include <TopoDS_Shape.hxx>
#include <AIS_Shape.hxx>
#include <AIS_InteractiveContext.hxx>
#include <Quantity_Color.hxx>
#include <Aspect_TypeOfLine.hxx>

namespace TyrexCAD {

    /**
     * @brief Type of sketch entity for identification and constraint handling
     */
    enum class SketchEntityType {
        Line,
        Circle,
        Arc,
        Point
    };

    /**
     * @brief Base class for all 2D sketch entities
     *
     * Provides common functionality for parametric sketch geometry including:
     * - 2D coordinate storage and manipulation
     * - Visual representation update
     * - Constraint preparation interfaces
     * - Selection and editing support
     */
    class TyrexSketchEntity {
    public:
        /**
         * @brief Constructor
         * @param id Unique identifier for this entity
         * @param type Type of sketch entity
         * @param plane The sketch plane this entity belongs to
         */
        TyrexSketchEntity(const std::string& id,
            SketchEntityType type,
            const gp_Pln& plane);

        /**
         * @brief Virtual destructor
         */
        virtual ~TyrexSketchEntity();

        /**
         * @brief Get the unique ID of this entity
         * @return Entity ID
         */
        const std::string& getId() const;

        /**
         * @brief Get the type of this sketch entity
         * @return Entity type
         */
        SketchEntityType getType() const;

        /**
         * @brief Get the sketch plane this entity belongs to
         * @return The sketch plane
         */
        const gp_Pln& getSketchPlane() const;

        /**
         * @brief Set the sketch plane for this entity
         * @param plane New sketch plane
         */
        void setSketchPlane(const gp_Pln& plane);

        /**
         * @brief Update the 3D shape representation from 2D geometry
         * Must be implemented by derived classes
         */
        virtual void updateShape() = 0;

        /**
         * @brief Get the 2D control points for this entity
         * These are the points that can be manipulated by the user
         * Must be implemented by derived classes
         * @return Vector of 2D control points
         */
        virtual std::vector<gp_Pnt2d> getControlPoints() const = 0;

        /**
         * @brief Set a control point to a new position
         * Must be implemented by derived classes
         * @param index Index of the control point to move
         * @param newPosition New 2D position for the control point
         * @return True if the point was successfully moved
         */
        virtual bool setControlPoint(int index, const gp_Pnt2d& newPosition) = 0;

        /**
         * @brief Get the number of control points for this entity
         * @return Number of control points
         */
        virtual int getControlPointCount() const = 0;

        /**
         * @brief Move the entire entity by a 2D offset
         * Must be implemented by derived classes
         * @param offset 2D offset vector
         */
        virtual void moveBy(const gp_Pnt2d& offset) = 0;

        /**
         * @brief Check if a 2D point is near this entity
         * Must be implemented by derived classes
         * @param point 2D point to test
         * @param tolerance Distance tolerance in sketch units
         * @return True if point is within tolerance of entity
         */
        virtual bool isNearPoint(const gp_Pnt2d& point, double tolerance = 5.0) const = 0;

        /**
         * @brief Get the closest point on this entity to a given 2D point
         * Must be implemented by derived classes
         * @param point Input 2D point
         * @return Closest point on entity
         */
        virtual gp_Pnt2d getClosestPoint(const gp_Pnt2d& point) const = 0;

        /**
         * @brief Draw this entity in the given context
         * @param context OpenCascade interactive context
         * @param isSelected Whether entity is currently selected
         */
        virtual void draw(const Handle(AIS_InteractiveContext)& context, bool isSelected = false);

        /**
         * @brief Remove this entity from the display context
         * @param context OpenCascade interactive context
         */
        virtual void undraw(const Handle(AIS_InteractiveContext)& context);

        /**
         * @brief Get the AIS shape for this entity
         * @return OpenCascade AIS shape handle
         */
        Handle(AIS_Shape) getAISShape() const;

        /**
         * @brief Get the TopoDS shape for this entity
         * @return OpenCascade shape
         */
        const TopoDS_Shape& getShape() const;

        /**
         * @brief Set the color of this entity
         * @param color New color
         */
        void setColor(const Quantity_Color& color);

        /**
         * @brief Get the color of this entity
         * @return Entity color
         */
        const Quantity_Color& getColor() const;

        /**
         * @brief Set whether this entity is selected
         * @param selected Selection state
         */
        void setSelected(bool selected);

        /**
         * @brief Check if this entity is selected
         * @return True if selected
         */
        bool isSelected() const;

        /**
         * @brief Set whether this entity is highlighted (hovered)
         * @param highlighted Highlight state
         */
        void setHighlighted(bool highlighted);

        /**
         * @brief Check if this entity is highlighted
         * @return True if highlighted
         */
        bool isHighlighted() const;

        /**
         * @brief Set the line style for this entity
         * @param lineStyle Line style (solid, dashed, etc.)
         */
        void setLineStyle(Aspect_TypeOfLine lineStyle);

        /**
         * @brief Get the line style of this entity
         * @return Line style
         */
        Aspect_TypeOfLine getLineStyle() const;

        /**
         * @brief Convert a 2D sketch point to 3D world coordinates
         * @param sketchPoint 2D point in sketch plane
         * @return 3D point in world space
         */
        gp_Pnt sketcht_o3D(const gp_Pnt2d& sketchPoint) const;

        /**
         * @brief Convert a 3D world point to 2D sketch coordinates
         * @param worldPoint 3D point in world space
         * @return 2D point in sketch plane
         */
        gp_Pnt2d worldToSketch(const gp_Pnt& worldPoint) const;

        /**
         * @brief Get bounding box of this entity in 2D
         * @param minPt Output minimum point
         * @param maxPt Output maximum point
         */
        virtual void getBounds2D(gp_Pnt2d& minPt, gp_Pnt2d& maxPt) const = 0;

        /**
         * @brief Clone this entity with a new ID
         * Must be implemented by derived classes
         * @param newId ID for the cloned entity
         * @return New instance of this entity type
         */
        virtual std::shared_ptr<TyrexSketchEntity> clone(const std::string& newId) const = 0;

        /**
         * @brief Check if this entity is geometrically valid
         * @return True if entity has valid geometry
         */
        virtual bool isValid() const = 0;

    protected:
        /**
         * @brief Update the visual appearance of the entity
         */
        void updateVisuals();

        /**
         * @brief Create AIS shape from TopoDS shape
         */
        void createAISShape();

    protected:
        std::string m_id;                     ///< Unique identifier
        SketchEntityType m_type;              ///< Entity type
        gp_Pln m_sketchPlane;                 ///< Sketch plane this entity belongs to

        TopoDS_Shape m_shape;                 ///< 3D shape representation
        Handle(AIS_Shape) m_aisShape;         ///< Interactive shape for display

        Quantity_Color m_color;               ///< Entity color
        bool m_isSelected;                    ///< Selection state
        bool m_isHighlighted;                 ///< Highlight state
        Aspect_TypeOfLine m_lineStyle;        ///< Line style

        // Visual properties
        double m_lineWidth;                   ///< Line width for display
        bool m_isVisible;                     ///< Visibility state
    };

} // namespace TyrexCAD

#endif // TYREX_SKETCH_ENTITY_H