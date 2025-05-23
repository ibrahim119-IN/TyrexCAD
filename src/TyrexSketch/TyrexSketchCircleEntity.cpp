/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexSketch/TyrexSketchCircleEntity.h"

 // OpenCascade includes
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <gp_Circ.hxx>
#include <gp_Ax2.hxx>
#include <gp_Dir.hxx>
#include <gp_Vec2d.hxx>
#include <Standard_Real.hxx>
#include <TopoDS.hxx>

// Qt includes
#include <QDebug>
#include <cmath>
#include <algorithm>

namespace TyrexCAD {

    TyrexSketchCircleEntity::TyrexSketchCircleEntity(const std::string& id,
        const gp_Pln& plane,
        const gp_Pnt2d& center,
        double radius)
        : TyrexSketchEntity(id, SketchEntityType::Circle, plane)
        , m_center(center)
        , m_radius(radius)
    {
        normalizeRadius();
        updateShape();
        qDebug() << QString("Created TyrexSketchCircleEntity: %1").arg(QString::fromStdString(id));
    }

    TyrexSketchCircleEntity::TyrexSketchCircleEntity(const std::string& id,
        const gp_Pln& plane,
        const gp_Pnt2d& center,
        const gp_Pnt2d& pointOnCircle)
        : TyrexSketchEntity(id, SketchEntityType::Circle, plane)
        , m_center(center)
        , m_radius(center.Distance(pointOnCircle))
    {
        normalizeRadius();
        updateShape();
        qDebug() << QString("Created TyrexSketchCircleEntity: %1").arg(QString::fromStdString(id));
    }

    TyrexSketchCircleEntity::~TyrexSketchCircleEntity() = default;

    const gp_Pnt2d& TyrexSketchCircleEntity::getCenter() const
    {
        return m_center;
    }

    void TyrexSketchCircleEntity::setCenter(const gp_Pnt2d& center)
    {
        m_center = center;
        updateShape();
    }

    double TyrexSketchCircleEntity::getRadius() const
    {
        return m_radius;
    }

    void TyrexSketchCircleEntity::setRadius(double radius)
    {
        m_radius = std::abs(radius); // Ensure positive radius
        normalizeRadius();
        updateShape();
    }

    gp_Pnt2d TyrexSketchCircleEntity::getRadiusControlPoint() const
    {
        return gp_Pnt2d(m_center.X() + m_radius, m_center.Y());
    }

    void TyrexSketchCircleEntity::setRadiusFromPoint(const gp_Pnt2d& pointOnCircle)
    {
        m_radius = m_center.Distance(pointOnCircle);
        normalizeRadius();
        updateShape();
    }

    double TyrexSketchCircleEntity::getDiameter() const
    {
        return 2.0 * m_radius;
    }

    double TyrexSketchCircleEntity::getCircumference() const
    {
        return 2.0 * M_PI * m_radius;
    }

    double TyrexSketchCircleEntity::getArea() const
    {
        return M_PI * m_radius * m_radius;
    }

    void TyrexSketchCircleEntity::updateShape()
    {
        if (!validateRadius()) {
            qWarning() << QString("Cannot update circle shape - invalid radius: %1 (minimum: %2)")
                .arg(m_radius, 0, 'f', 6)
                .arg(1e-6);
            return;
        }

        try {
            // Convert center to 3D using the sketch plane
            gp_Pnt center3D = sketcht_o3D(m_center);

            qDebug() << QString("Creating circle at (%1,%2,%3) with radius %4")
                .arg(center3D.X(), 0, 'f', 3)
                .arg(center3D.Y(), 0, 'f', 3)
                .arg(center3D.Z(), 0, 'f', 3)
                .arg(m_radius, 0, 'f', 3);

            // Create coordinate system for the circle
            // Use the sketch plane normal as Z direction
            gp_Dir zDir = m_sketchPlane.Axis().Direction();
            gp_Ax2 axis(center3D, zDir);

            // Create a circle geometry
            gp_Circ circle(axis, m_radius);

            // Create an edge (full circle)
            BRepBuilderAPI_MakeEdge edgeMaker(circle);
            if (edgeMaker.IsDone()) {
                m_shape = edgeMaker.Shape();

                // Force AIS shape creation
                createAISShape();

                qDebug() << QString("Circle shape created successfully for entity: %1")
                    .arg(QString::fromStdString(m_id));
            }
            else {
                qWarning() << "Failed to create circle edge in BRepBuilderAPI_MakeEdge";
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "OpenCascade error updating circle shape:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error updating circle shape";
        }
    }

    std::vector<gp_Pnt2d> TyrexSketchCircleEntity::getControlPoints() const
    {
        return { m_center, getRadiusControlPoint() };
    }

    bool TyrexSketchCircleEntity::setControlPoint(int index, const gp_Pnt2d& newPosition)
    {
        if (index == 0) {
            setCenter(newPosition);
            return true;
        }
        else if (index == 1) {
            setRadiusFromPoint(newPosition);
            return true;
        }
        return false;
    }

    int TyrexSketchCircleEntity::getControlPointCount() const
    {
        return 2;
    }

    void TyrexSketchCircleEntity::moveBy(const gp_Pnt2d& offset)
    {
        m_center.Translate(gp_Vec2d(offset.X(), offset.Y()));
        updateShape();
    }

    bool TyrexSketchCircleEntity::isNearPoint(const gp_Pnt2d& point, double tolerance) const
    {
        double distance = std::abs(getDistanceFromCenter(point) - m_radius);
        return distance <= tolerance;
    }

    gp_Pnt2d TyrexSketchCircleEntity::getClosestPoint(const gp_Pnt2d& point) const
    {
        double distance = getDistanceFromCenter(point);

        if (distance < 1e-6) {
            // Point is at center, return any point on circle
            return getRadiusControlPoint();
        }

        // Get direction from center to point
        gp_Vec2d direction(m_center, point);
        direction.Normalize();

        // Scale to radius
        return gp_Pnt2d(
            m_center.X() + m_radius * direction.X(),
            m_center.Y() + m_radius * direction.Y()
        );
    }

    void TyrexSketchCircleEntity::getBounds2D(gp_Pnt2d& minPt, gp_Pnt2d& maxPt) const
    {
        minPt.SetX(m_center.X() - m_radius);
        minPt.SetY(m_center.Y() - m_radius);
        maxPt.SetX(m_center.X() + m_radius);
        maxPt.SetY(m_center.Y() + m_radius);
    }

    std::shared_ptr<TyrexSketchEntity> TyrexSketchCircleEntity::clone(const std::string& newId) const
    {
        return std::make_shared<TyrexSketchCircleEntity>(newId, m_sketchPlane, m_center, m_radius);
    }

    bool TyrexSketchCircleEntity::isValid() const
    {
        return validateRadius();
    }

    void TyrexSketchCircleEntity::setCenterAndRadius(const gp_Pnt2d& center, double radius)
    {
        m_center = center;
        m_radius = std::abs(radius);
        normalizeRadius();
        updateShape();
    }

    bool TyrexSketchCircleEntity::isPointInside(const gp_Pnt2d& point) const
    {
        return getDistanceFromCenter(point) < m_radius;
    }

    bool TyrexSketchCircleEntity::isPointOnCircumference(const gp_Pnt2d& point, double tolerance) const
    {
        return std::abs(getDistanceFromCenter(point) - m_radius) <= tolerance;
    }

    double TyrexSketchCircleEntity::getDistanceFromCenter(const gp_Pnt2d& point) const
    {
        return m_center.Distance(point);
    }

    double TyrexSketchCircleEntity::getAngleForPoint(const gp_Pnt2d& point) const
    {
        gp_Vec2d vec(m_center, point);
        double angle = std::atan2(vec.Y(), vec.X());

        // Normalize to 0-2π range
        if (angle < 0) {
            angle += 2.0 * M_PI;
        }

        return angle;
    }

    gp_Pnt2d TyrexSketchCircleEntity::getPointForAngle(double angle) const
    {
        return gp_Pnt2d(
            m_center.X() + m_radius * std::cos(angle),
            m_center.Y() + m_radius * std::sin(angle)
        );
    }

    gp_Vec2d TyrexSketchCircleEntity::getTangentAt(const gp_Pnt2d& point) const
    {
        // Get vector from center to point
        gp_Vec2d radialVec(m_center, point);

        if (radialVec.Magnitude() < 1e-6) {
            // Point is at center, return arbitrary tangent
            return gp_Vec2d(1, 0);
        }

        // Tangent is perpendicular to radial vector
        return gp_Vec2d(-radialVec.Y(), radialVec.X()).Normalized();
    }

    gp_Vec2d TyrexSketchCircleEntity::getNormalAt(const gp_Pnt2d& point) const
    {
        // Normal points outward from center
        gp_Vec2d normalVec(m_center, point);

        if (normalVec.Magnitude() < 1e-6) {
            // Point is at center, return arbitrary normal
            return gp_Vec2d(1, 0);
        }

        return normalVec.Normalized();
    }

    bool TyrexSketchCircleEntity::intersectsWith(const TyrexSketchCircleEntity& other) const
    {
        double centerDistance = m_center.Distance(other.m_center);
        double radiusSum = m_radius + other.m_radius;
        double radiusDiff = std::abs(m_radius - other.m_radius);

        // Circles intersect if center distance is between |r1-r2| and r1+r2
        return (centerDistance >= radiusDiff) && (centerDistance <= radiusSum);
    }

    int TyrexSketchCircleEntity::getIntersectionPoints(const TyrexSketchCircleEntity& other,
        gp_Pnt2d& intersection1,
        gp_Pnt2d& intersection2) const
    {
        double centerDistance = m_center.Distance(other.m_center);
        double radiusSum = m_radius + other.m_radius;
        double radiusDiff = std::abs(m_radius - other.m_radius);

        // Check if circles intersect
        if (centerDistance > radiusSum || centerDistance < radiusDiff) {
            return 0; // No intersection
        }

        if (centerDistance < 1e-6) {
            // Concentric circles
            if (std::abs(m_radius - other.m_radius) < 1e-6) {
                // Same circle - infinite intersections, return 0
                return 0;
            }
            else {
                // Different radii - no intersection
                return 0;
            }
        }

        if (std::abs(centerDistance - radiusSum) < 1e-6 ||
            std::abs(centerDistance - radiusDiff) < 1e-6) {
            // Circles touch at one point
            gp_Vec2d direction(m_center, other.m_center);
            direction.Normalize();

            intersection1 = gp_Pnt2d(
                m_center.X() + m_radius * direction.X(),
                m_center.Y() + m_radius * direction.Y()
            );

            return 1;
        }

        // Two intersection points
        gp_Vec2d centerVec(m_center, other.m_center);

        // Calculate intersection points using geometry
        double a = (m_radius * m_radius - other.m_radius * other.m_radius + centerDistance * centerDistance) / (2.0 * centerDistance);
        double h = std::sqrt(m_radius * m_radius - a * a);

        gp_Pnt2d midPoint(
            m_center.X() + a * centerVec.X() / centerDistance,
            m_center.Y() + a * centerVec.Y() / centerDistance
        );

        gp_Vec2d perpVec(-centerVec.Y() / centerDistance, centerVec.X() / centerDistance);

        intersection1 = gp_Pnt2d(
            midPoint.X() + h * perpVec.X(),
            midPoint.Y() + h * perpVec.Y()
        );

        intersection2 = gp_Pnt2d(
            midPoint.X() - h * perpVec.X(),
            midPoint.Y() - h * perpVec.Y()
        );

        return 2;
    }

    bool TyrexSketchCircleEntity::validateRadius() const
    {
        return m_radius > 1e-6; // Must be positive and not too small
    }

    void TyrexSketchCircleEntity::normalizeRadius()
    {
        if (m_radius < 1e-6) {
            qWarning() << "Circle radius too small, setting to minimum value";
            m_radius = 1e-6;
        }
    }

} // namespace TyrexCAD