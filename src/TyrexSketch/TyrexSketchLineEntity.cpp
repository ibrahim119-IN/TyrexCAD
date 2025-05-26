/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexSketch/TyrexSketchLineEntity.h"

 // OpenCascade includes
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <gp_Vec2d.hxx>
#include <Standard_Real.hxx>
#include <TopoDS.hxx>

// Qt includes
#include <QDebug>
#include <cmath>
#include <algorithm>

namespace TyrexCAD {

    TyrexSketchLineEntity::TyrexSketchLineEntity(const std::string& id,
        const gp_Pln& plane,
        const gp_Pnt2d& startPoint,
        const gp_Pnt2d& endPoint)
        : TyrexSketchEntity(id, SketchEntityType::Line, plane)
        , m_startPoint(startPoint)
        , m_endPoint(endPoint)
    {
        updateShape();
        qDebug() << QString("Created TyrexSketchLineEntity: %1").arg(QString::fromStdString(id));
    }

    TyrexSketchLineEntity::~TyrexSketchLineEntity() = default;

    const gp_Pnt2d& TyrexSketchLineEntity::getStartPoint() const
    {
        return m_startPoint;
    }

    void TyrexSketchLineEntity::setStartPoint(const gp_Pnt2d& point)
    {
        m_startPoint = point;
        updateShape();
    }

    const gp_Pnt2d& TyrexSketchLineEntity::getEndPoint() const
    {
        return m_endPoint;
    }

    void TyrexSketchLineEntity::setEndPoint(const gp_Pnt2d& point)
    {
        m_endPoint = point;
        updateShape();
    }

    gp_Pnt2d TyrexSketchLineEntity::getMidpoint() const
    {
        return gp_Pnt2d(
            (m_startPoint.X() + m_endPoint.X()) * 0.5,
            (m_startPoint.Y() + m_endPoint.Y()) * 0.5
        );
    }

    double TyrexSketchLineEntity::getLength() const
    {
        return m_startPoint.Distance(m_endPoint);
    }

    gp_Vec2d TyrexSketchLineEntity::getDirection() const
    {
        gp_Vec2d direction(m_startPoint, m_endPoint);
        if (direction.Magnitude() > 1e-6) {
            direction.Normalize();
        }
        return direction;
    }

    double TyrexSketchLineEntity::getAngle() const
    {
        gp_Vec2d direction(m_startPoint, m_endPoint);
        if (direction.Magnitude() < 1e-6) {
            return 0.0;
        }
        return std::atan2(direction.Y(), direction.X());
    }

    void TyrexSketchLineEntity::updateShape()
    {
        if (!validatePoints()) {
            qWarning() << QString("Cannot update line shape - invalid points (distance: %1)")
                .arg(m_startPoint.Distance(m_endPoint), 0, 'f', 6);
            return;
        }

        try {
            // Convert 2D points to 3D using the sketch plane
            gp_Pnt startPoint3D = sketchTo3D(m_startPoint);  // Fixed typo here
            gp_Pnt endPoint3D = sketchTo3D(m_endPoint);      // Fixed typo here

            qDebug() << QString("Creating line from (%1,%2,%3) to (%4,%5,%6)")
                .arg(startPoint3D.X(), 0, 'f', 3)
                .arg(startPoint3D.Y(), 0, 'f', 3)
                .arg(startPoint3D.Z(), 0, 'f', 3)
                .arg(endPoint3D.X(), 0, 'f', 3)
                .arg(endPoint3D.Y(), 0, 'f', 3)
                .arg(endPoint3D.Z(), 0, 'f', 3);

            // Create an edge (line segment)
            BRepBuilderAPI_MakeEdge edgeMaker(startPoint3D, endPoint3D);
            if (edgeMaker.IsDone()) {
                m_shape = edgeMaker.Shape();

                // Force AIS shape creation
                createAISShape();

                qDebug() << QString("Line shape created successfully for entity: %1")
                    .arg(QString::fromStdString(m_id));
            }
            else {
                qWarning() << "Failed to create line edge in BRepBuilderAPI_MakeEdge";
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "OpenCascade error updating line shape:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error updating line shape";
        }
    }

    std::vector<gp_Pnt2d> TyrexSketchLineEntity::getControlPoints() const
    {
        return { m_startPoint, m_endPoint };
    }

    bool TyrexSketchLineEntity::setControlPoint(int index, const gp_Pnt2d& newPosition)
    {
        if (index == 0) {
            setStartPoint(newPosition);
            return true;
        }
        else if (index == 1) {
            setEndPoint(newPosition);
            return true;
        }
        return false;
    }

    int TyrexSketchLineEntity::getControlPointCount() const
    {
        return 2;
    }

    void TyrexSketchLineEntity::moveBy(const gp_Pnt2d& offset)
    {
        m_startPoint.Translate(gp_Vec2d(offset.X(), offset.Y()));
        m_endPoint.Translate(gp_Vec2d(offset.X(), offset.Y()));
        updateShape();
    }

    bool TyrexSketchLineEntity::isNearPoint(const gp_Pnt2d& point, double tolerance) const
    {
        return getPerpendicularDistance(point) <= tolerance &&
            isPointOnSegment(point, tolerance);
    }

    gp_Pnt2d TyrexSketchLineEntity::getClosestPoint(const gp_Pnt2d& point) const
    {
        // Vector from start to end
        gp_Vec2d lineVec(m_startPoint, m_endPoint);

        if (lineVec.Magnitude() < 1e-6) {
            // Degenerate line, return start point
            return m_startPoint;
        }

        // Vector from start to point
        gp_Vec2d pointVec(m_startPoint, point);

        // Project point onto line
        Standard_Real t = pointVec.Dot(lineVec) / lineVec.SquareMagnitude();

        // Clamp to line segment
        t = std::max(0.0, std::min(1.0, t));

        // Calculate closest point
        return getPointForParameter(t);
    }

    void TyrexSketchLineEntity::getBounds2D(gp_Pnt2d& minPt, gp_Pnt2d& maxPt) const
    {
        minPt.SetX(std::min(m_startPoint.X(), m_endPoint.X()));
        minPt.SetY(std::min(m_startPoint.Y(), m_endPoint.Y()));
        maxPt.SetX(std::max(m_startPoint.X(), m_endPoint.X()));
        maxPt.SetY(std::max(m_startPoint.Y(), m_endPoint.Y()));
    }

    std::shared_ptr<TyrexSketchEntity> TyrexSketchLineEntity::clone(const std::string& newId) const
    {
        return std::make_shared<TyrexSketchLineEntity>(newId, m_sketchPlane, m_startPoint, m_endPoint);
    }

    bool TyrexSketchLineEntity::isValid() const
    {
        return validatePoints();
    }

    void TyrexSketchLineEntity::setPoints(const gp_Pnt2d& startPoint, const gp_Pnt2d& endPoint)
    {
        m_startPoint = startPoint;
        m_endPoint = endPoint;
        updateShape();
    }

    bool TyrexSketchLineEntity::isHorizontal(double tolerance) const
    {
        return std::abs(getAngle()) <= tolerance ||
            std::abs(std::abs(getAngle()) - M_PI) <= tolerance;
    }

    bool TyrexSketchLineEntity::isVertical(double tolerance) const
    {
        double angle = std::abs(getAngle());
        return std::abs(angle - M_PI / 2.0) <= tolerance ||
            std::abs(angle - 3.0 * M_PI / 2.0) <= tolerance;
    }

    double TyrexSketchLineEntity::getPerpendicularDistance(const gp_Pnt2d& point) const
    {
        gp_Vec2d lineVec(m_startPoint, m_endPoint);

        if (lineVec.Magnitude() < 1e-6) {
            // Degenerate line
            return point.Distance(m_startPoint);
        }

        gp_Vec2d pointVec(m_startPoint, point);

        // Cross product gives twice the area of the triangle
        double crossProduct = lineVec.X() * pointVec.Y() - lineVec.Y() * pointVec.X();

        return std::abs(crossProduct) / lineVec.Magnitude();
    }

    bool TyrexSketchLineEntity::isPointOnSegment(const gp_Pnt2d& point, double tolerance) const
    {
        double t = getParameterForPoint(point);
        return t >= -tolerance && t <= (1.0 + tolerance);
    }

    double TyrexSketchLineEntity::getParameterForPoint(const gp_Pnt2d& point) const
    {
        gp_Vec2d lineVec(m_startPoint, m_endPoint);

        if (lineVec.Magnitude() < 1e-6) {
            return 0.0;
        }

        gp_Vec2d pointVec(m_startPoint, point);
        return pointVec.Dot(lineVec) / lineVec.SquareMagnitude();
    }

    gp_Pnt2d TyrexSketchLineEntity::getPointForParameter(double t) const
    {
        gp_Vec2d lineVec(m_startPoint, m_endPoint);
        return gp_Pnt2d(
            m_startPoint.X() + t * lineVec.X(),
            m_startPoint.Y() + t * lineVec.Y()
        );
    }

    bool TyrexSketchLineEntity::validatePoints() const
    {
        // Check that start and end points are different
        return m_startPoint.Distance(m_endPoint) > 1e-6;
    }

} // namespace TyrexCAD