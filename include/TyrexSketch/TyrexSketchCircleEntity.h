/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_SKETCH_CIRCLE_ENTITY_H
#define TYREX_SKETCH_CIRCLE_ENTITY_H

#include "TyrexSketch/TyrexSketchEntity.h"

namespace TyrexCAD {

    /**
     * @brief 2D circle entity for parametric sketching
     *
     * Represents a circle in 2D sketch space with center point and radius.
     * Provides two control points: center and a point on the circumference
     * for radius control. Supports interactive editing and is prepared
     * for constraint-based design.
     */
    class TyrexSketchCircleEntity : public TyrexSketchEntity {
    public:
        /**
         * @brief Constructor with center and radius
         * @param id Unique identifier for this circle
         * @param plane Sketch plane this circle belongs to
         * @param center Center point in 2D sketch coordinates
         * @param radius Radius in sketch units
         */
        TyrexSketchCircleEntity(const std::string& id,
            const gp_Pln& plane,
            const gp_Pnt2d& center,
            double radius);

        /**
         * @brief Constructor with center and point on circumference
         * @param id Unique identifier for this circle
         * @param plane Sketch plane this circle belongs to
         * @param center Center point in 2D sketch coordinates
         * @param pointOnCircle Point on circumference in 2D sketch coordinates
         */
        TyrexSketchCircleEntity(const std::string& id,
            const gp_Pln& plane,
            const gp_Pnt2d& center,
            const gp_Pnt2d& pointOnCircle);

        /**
         * @brief Virtual destructor
         */
        virtual ~TyrexSketchCircleEntity() override;

        /**
         * @brief Get the center point of the circle
         * @return Center point in 2D sketch coordinates
         */
        const gp_Pnt2d& getCenter() const;

        /**
         * @brief Set the center point of the circle
         * @param center New center point in 2D sketch coordinates
         */
        void setCenter(const gp_Pnt2d& center);

        /**
         * @brief Get the radius of the circle
         * @return Radius in sketch units
         */
        double getRadius() const;

        /**
         * @brief Set the radius of the circle
         * @param radius New radius in sketch units (must be positive)
         */
        void setRadius(double radius);

        /**
         * @brief Get a point on the circumference for radius control
         * This point is at angle 0 (positive X direction from center)
         * @return Point on circumference
         */
        gp_Pnt2d getRadiusControlPoint() const;

        /**
         * @brief Set the radius by specifying a point on the circumference
         * @param pointOnCircle Point on desired circumference
         */
        void setRadiusFromPoint(const gp_Pnt2d& pointOnCircle);

        /**
         * @brief Get the diameter of the circle
         * @return Diameter in sketch units
         */
        double getDiameter() const;

        /**
         * @brief Get the circumference of the circle
         * @return Circumference in sketch units
         */
        double getCircumference() const;

        /**
         * @brief Get the area of the circle
         * @return Area in sketch units squared
         */
        double getArea() const;

        // Implementation of base class methods

        /**
         * @brief Update the 3D shape representation from 2D geometry
         */
        virtual void updateShape() override;

        /**
         * @brief Get the 2D control points (center and radius control point)
         * @return Vector containing center [0] and radius control point [1]
         */
        virtual std::vector<gp_Pnt2d> getControlPoints() const override;

        /**
         * @brief Set a control point to a new position
         * @param index 0 for center, 1 for radius control point
         * @param newPosition New 2D position for the control point
         * @return True if the point was successfully moved
         */
        virtual bool setControlPoint(int index, const gp_Pnt2d& newPosition) override;

        /**
         * @brief Get the number of control points (always 2 for circles)
         * @return 2 (center and radius control point)
         */
        virtual int getControlPointCount() const override;

        /**
         * @brief Move the entire circle by a 2D offset
         * @param offset 2D offset vector
         */
        virtual void moveBy(const gp_Pnt2d& offset) override;

        /**
         * @brief Check if a 2D point is near this circle
         * @param point 2D point to test
         * @param tolerance Distance tolerance in sketch units
         * @return True if point is within tolerance of circle circumference
         */
        virtual bool isNearPoint(const gp_Pnt2d& point, double tolerance = 5.0) const override;

        /**
         * @brief Get the closest point on this circle to a given 2D point
         * @param point Input 2D point
         * @return Closest point on circle circumference
         */
        virtual gp_Pnt2d getClosestPoint(const gp_Pnt2d& point) const override;

        /**
         * @brief Get bounding box of this circle in 2D
         * @param minPt Output minimum point
         * @param maxPt Output maximum point
         */
        virtual void getBounds2D(gp_Pnt2d& minPt, gp_Pnt2d& maxPt) const override;

        /**
         * @brief Clone this circle with a new ID
         * @param newId ID for the cloned circle
         * @return New TyrexSketchCircleEntity instance
         */
        virtual std::shared_ptr<TyrexSketchEntity> clone(const std::string& newId) const override;

        /**
         * @brief Check if this circle is geometrically valid
         * @return True if radius is positive
         */
        virtual bool isValid() const override;

        /**
         * @brief Set both center and radius at once
         * @param center New center point
         * @param radius New radius
         */
        void setCenterAndRadius(const gp_Pnt2d& center, double radius);

        /**
         * @brief Check if a point is inside the circle
         * @param point Input 2D point
         * @return True if point is inside circle
         */
        bool isPointInside(const gp_Pnt2d& point) const;

        /**
         * @brief Check if a point is on the circle circumference
         * @param point Input 2D point
         * @param tolerance Distance tolerance
         * @return True if point is on circumference within tolerance
         */
        bool isPointOnCircumference(const gp_Pnt2d& point, double tolerance = 1e-6) const;

        /**
         * @brief Get the distance from center to a point
         * @param point Input 2D point
         * @return Distance from center to point
         */
        double getDistanceFromCenter(const gp_Pnt2d& point) const;

        /**
         * @brief Get the angle of a point relative to center
         * @param point Point on or near the circle
         * @return Angle in radians (0 to 2π)
         */
        double getAngleForPoint(const gp_Pnt2d& point) const;

        /**
         * @brief Get point on circle for given angle
         * @param angle Angle in radians (0 = positive X direction)
         * @return Point on circle circumference
         */
        gp_Pnt2d getPointForAngle(double angle) const;

        /**
         * @brief Get tangent vector at given point on circle
         * @param point Point on circle circumference
         * @return Tangent vector (normalized)
         */
        gp_Vec2d getTangentAt(const gp_Pnt2d& point) const;

        /**
         * @brief Get normal vector at given point on circle (pointing outward)
         * @param point Point on circle circumference
         * @return Normal vector (normalized)
         */
        gp_Vec2d getNormalAt(const gp_Pnt2d& point) const;

        /**
         * @brief Check if this circle intersects with another circle
         * @param other Other circle to test intersection with
         * @return True if circles intersect
         */
        bool intersectsWith(const TyrexSketchCircleEntity& other) const;

        /**
         * @brief Get intersection points with another circle
         * @param other Other circle
         * @param intersection1 First intersection point (if exists)
         * @param intersection2 Second intersection point (if exists)
         * @return Number of intersection points (0, 1, or 2)
         */
        int getIntersectionPoints(const TyrexSketchCircleEntity& other,
            gp_Pnt2d& intersection1,
            gp_Pnt2d& intersection2) const;

    private:
        gp_Pnt2d m_center;        ///< Center point in 2D sketch coordinates
        double m_radius;          ///< Radius in sketch units

        /**
         * @brief Validate that radius is positive
         * @return True if radius is valid (positive)
         */
        bool validateRadius() const;

        /**
         * @brief Ensure radius is always positive
         */
        void normalizeRadius();
    };

} // namespace TyrexCAD

#endif // TYREX_SKETCH_CIRCLE_ENTITY_H