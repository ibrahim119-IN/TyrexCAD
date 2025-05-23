/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_SKETCH_LINE_ENTITY_H
#define TYREX_SKETCH_LINE_ENTITY_H

#include "TyrexSketch/TyrexSketchEntity.h"

namespace TyrexCAD {

    /**
     * @brief 2D line entity for parametric sketching
     *
     * Represents a line segment in 2D sketch space with two control points
     * (start and end). Supports interactive editing, dragging, and is prepared
     * for constraint-based design.
     */
    class TyrexSketchLineEntity : public TyrexSketchEntity {
    public:
        /**
         * @brief Constructor with start and end points
         * @param id Unique identifier for this line
         * @param plane Sketch plane this line belongs to
         * @param startPoint Start point in 2D sketch coordinates
         * @param endPoint End point in 2D sketch coordinates
         */
        TyrexSketchLineEntity(const std::string& id,
            const gp_Pln& plane,
            const gp_Pnt2d& startPoint,
            const gp_Pnt2d& endPoint);

        /**
         * @brief Virtual destructor
         */
        virtual ~TyrexSketchLineEntity() override;

        /**
         * @brief Get the start point of the line
         * @return Start point in 2D sketch coordinates
         */
        const gp_Pnt2d& getStartPoint() const;

        /**
         * @brief Set the start point of the line
         * @param point New start point in 2D sketch coordinates
         */
        void setStartPoint(const gp_Pnt2d& point);

        /**
         * @brief Get the end point of the line
         * @return End point in 2D sketch coordinates
         */
        const gp_Pnt2d& getEndPoint() const;

        /**
         * @brief Set the end point of the line
         * @param point New end point in 2D sketch coordinates
         */
        void setEndPoint(const gp_Pnt2d& point);

        /**
         * @brief Get the midpoint of the line
         * @return Midpoint in 2D sketch coordinates
         */
        gp_Pnt2d getMidpoint() const;

        /**
         * @brief Get the length of the line
         * @return Length in sketch units
         */
        double getLength() const;

        /**
         * @brief Get the direction vector of the line (normalized)
         * @return Direction vector from start to end
         */
        gp_Vec2d getDirection() const;

        /**
         * @brief Get the angle of the line relative to X-axis
         * @return Angle in radians
         */
        double getAngle() const;

        // Implementation of base class methods

        /**
         * @brief Update the 3D shape representation from 2D geometry
         */
        virtual void updateShape() override;

        /**
         * @brief Get the 2D control points (start and end points)
         * @return Vector containing start point [0] and end point [1]
         */
        virtual std::vector<gp_Pnt2d> getControlPoints() const override;

        /**
         * @brief Set a control point to a new position
         * @param index 0 for start point, 1 for end point
         * @param newPosition New 2D position for the control point
         * @return True if the point was successfully moved
         */
        virtual bool setControlPoint(int index, const gp_Pnt2d& newPosition) override;

        /**
         * @brief Get the number of control points (always 2 for lines)
         * @return 2 (start and end points)
         */
        virtual int getControlPointCount() const override;

        /**
         * @brief Move the entire line by a 2D offset
         * @param offset 2D offset vector
         */
        virtual void moveBy(const gp_Pnt2d& offset) override;

        /**
         * @brief Check if a 2D point is near this line
         * @param point 2D point to test
         * @param tolerance Distance tolerance in sketch units
         * @return True if point is within tolerance of line
         */
        virtual bool isNearPoint(const gp_Pnt2d& point, double tolerance = 5.0) const override;

        /**
         * @brief Get the closest point on this line to a given 2D point
         * @param point Input 2D point
         * @return Closest point on line segment
         */
        virtual gp_Pnt2d getClosestPoint(const gp_Pnt2d& point) const override;

        /**
         * @brief Get bounding box of this line in 2D
         * @param minPt Output minimum point
         * @param maxPt Output maximum point
         */
        virtual void getBounds2D(gp_Pnt2d& minPt, gp_Pnt2d& maxPt) const override;

        /**
         * @brief Clone this line with a new ID
         * @param newId ID for the cloned line
         * @return New TyrexSketchLineEntity instance
         */
        virtual std::shared_ptr<TyrexSketchEntity> clone(const std::string& newId) const override;

        /**
         * @brief Check if this line is geometrically valid
         * @return True if start and end points are different
         */
        virtual bool isValid() const override;

        /**
         * @brief Set both start and end points at once
         * @param startPoint New start point
         * @param endPoint New end point
         */
        void setPoints(const gp_Pnt2d& startPoint, const gp_Pnt2d& endPoint);

        /**
         * @brief Check if this line is horizontal (parallel to X-axis)
         * @param tolerance Angular tolerance in radians
         * @return True if line is horizontal within tolerance
         */
        bool isHorizontal(double tolerance = 1e-6) const;

        /**
         * @brief Check if this line is vertical (parallel to Y-axis)
         * @param tolerance Angular tolerance in radians
         * @return True if line is vertical within tolerance
         */
        bool isVertical(double tolerance = 1e-6) const;

        /**
         * @brief Get the perpendicular distance from a point to the infinite line
         * @param point Input 2D point
         * @return Perpendicular distance to the infinite line
         */
        double getPerpendicularDistance(const gp_Pnt2d& point) const;

        /**
         * @brief Check if point lies on the line segment (not just the infinite line)
         * @param point Input 2D point
         * @param tolerance Distance tolerance
         * @return True if point is on the line segment
         */
        bool isPointOnSegment(const gp_Pnt2d& point, double tolerance = 1e-6) const;

        /**
         * @brief Get parameter t for point on line (0 = start, 1 = end)
         * @param point Point on or near the line
         * @return Parameter t (may be outside [0,1] for points beyond endpoints)
         */
        double getParameterForPoint(const gp_Pnt2d& point) const;

        /**
         * @brief Get point on line for given parameter
         * @param t Parameter (0 = start, 1 = end)
         * @return Point on line
         */
        gp_Pnt2d getPointForParameter(double t) const;

    private:
        gp_Pnt2d m_startPoint;    ///< Start point in 2D sketch coordinates
        gp_Pnt2d m_endPoint;      ///< End point in 2D sketch coordinates

        /**
         * @brief Validate that start and end points are different
         * @return True if points are valid (different)
         */
        bool validatePoints() const;
    };

} // namespace TyrexCAD

#endif // TYREX_SKETCH_LINE_ENTITY_H