#include "TyrexSketch/TyrexSketchCircleCommand.h"
#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexSketch/TyrexSketchCircleEntity.h"
#include "TyrexCore/CoordinateConverter.h"
#include "TyrexCore/SafeHandleUtils.h"

#include <BRepBuilderAPI_MakeEdge.hxx>
#include <GC_MakeCircle.hxx>
#include <Geom_Circle.hxx>
#include <TopoDS_Edge.hxx>
#include <AIS_Shape.hxx>
#include <Quantity_Color.hxx>
#include <AIS_InteractiveContext.hxx>
#include <gp_Circ2d.hxx>
#include <gce_MakeCirc2d.hxx>
#include <ElCLib.hxx>

#include <QDebug>
#include <cmath>
#include <sstream>

namespace TyrexCAD {

    TyrexSketchCircleCommand::TyrexSketchCircleCommand(TyrexSketchManager* sketchManager,
        CircleMode mode)
        : TyrexCommand("Sketch Circle")
        , m_sketchManager(sketchManager)
        , m_mode(mode)
        , m_centerPointSet(false)
        , m_isCreating(false)
        , m_minimumRadius(0.1)
    {
        qDebug() << "TyrexSketchCircleCommand created with mode:" << static_cast<int>(mode);
    }

    TyrexSketchCircleCommand::~TyrexSketchCircleCommand()
    {
        removePreview();
        qDebug() << "TyrexSketchCircleCommand destroyed";
    }

    void TyrexSketchCircleCommand::start()
    {
        m_isStarted = true;
        m_isFinished = false;
        m_centerPointSet = false;
        m_isCreating = false;
        m_points.clear();
        removePreview();

        switch (m_mode) {
        case CircleMode::CenterRadius:
            qDebug() << "Circle command started - click to set center point";
            break;
        case CircleMode::ThreePoints:
            qDebug() << "Circle command started - click to set first point";
            break;
        case CircleMode::TwoPoints:
            qDebug() << "Circle command started - click to set first diameter point";
            break;
        }
    }

    void TyrexSketchCircleCommand::cancel()
    {
        removePreview();
        m_centerPointSet = false;
        m_points.clear();
        m_isFinished = true;
        m_isCreating = false;

        qDebug() << "Circle command cancelled";
    }

    bool TyrexSketchCircleCommand::isFinished() const
    {
        return m_isFinished;
    }

    void TyrexSketchCircleCommand::onMousePress(const QPoint& point)
    {
        if (!m_sketchManager) {
            qWarning() << "No sketch manager available";
            return;
        }

        gp_Pnt2d sketchPoint = m_sketchManager->screenToSketch(point);

        switch (m_mode) {
        case CircleMode::CenterRadius:
            if (!m_centerPointSet) {
                m_centerPoint = sketchPoint;
                m_centerPointSet = true;
                m_isCreating = true;
                updatePreview(m_centerPoint);
                qDebug() << "Center point set, move mouse to set radius";
            }
            else {
                m_radiusPoint = sketchPoint;
                if (createCircle()) {
                    m_isFinished = true;
                }
            }
            break;

        case CircleMode::ThreePoints:
            m_points.push_back(sketchPoint);
            if (m_points.size() == 1) {
                qDebug() << "First point set, click for second point";
            }
            else if (m_points.size() == 2) {
                m_isCreating = true;
                updatePreview(sketchPoint);
                qDebug() << "Second point set, click for third point";
            }
            else if (m_points.size() == 3) {
                if (createCircle()) {
                    m_isFinished = true;
                }
            }
            break;

        case CircleMode::TwoPoints:
            m_points.push_back(sketchPoint);
            if (m_points.size() == 1) {
                m_isCreating = true;
                updatePreview(sketchPoint);
                qDebug() << "First diameter point set, click for second point";
            }
            else if (m_points.size() == 2) {
                if (createCircle()) {
                    m_isFinished = true;
                }
            }
            break;
        }
    }

    void TyrexSketchCircleCommand::onMouseMove(const QPoint& point)
    {
        if (!m_isCreating || !m_sketchManager) {
            return;
        }

        gp_Pnt2d sketchPoint = m_sketchManager->screenToSketch(point);
        updatePreview(sketchPoint);
    }

    void TyrexSketchCircleCommand::onMouseRelease(const QPoint& point)
    {
        Q_UNUSED(point);
        // No action needed on mouse release
    }

    bool TyrexSketchCircleCommand::createCircle()
    {
        if (!m_sketchManager) {
            return false;
        }

        try {
            gp_Pnt2d center;
            double radius = 0.0;
            bool validCircle = false;

            switch (m_mode) {
            case CircleMode::CenterRadius:
                center = m_centerPoint;
                radius = m_centerPoint.Distance(m_radiusPoint);
                validCircle = radius > m_minimumRadius;
                break;

            case CircleMode::ThreePoints:
                if (m_points.size() == 3) {
                    validCircle = calculateCircleFromThreePoints(
                        m_points[0], m_points[1], m_points[2], center, radius);
                }
                break;

            case CircleMode::TwoPoints:
                if (m_points.size() == 2) {
                    center = gp_Pnt2d((m_points[0].X() + m_points[1].X()) / 2.0,
                        (m_points[0].Y() + m_points[1].Y()) / 2.0);
                    radius = m_points[0].Distance(m_points[1]) / 2.0;
                    validCircle = radius > m_minimumRadius;
                }
                break;
            }

            if (!validCircle) {
                qWarning() << "Invalid circle parameters";
                return false;
            }

            // Create circle entity
            static int circleCount = 0;
            std::stringstream idStream;
            idStream << "circle_" << ++circleCount << "_"
                << std::chrono::system_clock::now().time_since_epoch().count();

            auto circleEntity = std::make_shared<TyrexSketchCircleEntity>(
                idStream.str(),
                m_sketchManager->sketchPlane(),
                center,
                radius
            );

            // Add to sketch manager
            m_sketchManager->addSketchEntity(circleEntity);

            // Clean up
            removePreview();

            qDebug() << "Circle created: center=" << center.X() << "," << center.Y()
                << " radius=" << radius;

            return true;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "OpenCascade error creating circle:" << ex.GetMessageString();
            return false;
        }
        catch (const std::exception& ex) {
            qWarning() << "Error creating circle:" << ex.what();
            return false;
        }
        catch (...) {
            qWarning() << "Unknown error creating circle";
            return false;
        }
    }

    void TyrexSketchCircleCommand::updatePreview(const gp_Pnt2d& currentPoint)
    {
        if (!m_sketchManager) {
            return;
        }

        Handle(AIS_InteractiveContext) context = m_sketchManager->context();
        if (context.IsNull()) {
            return;
        }

        try {
            removePreview();

            gp_Pnt2d center;
            double radius = 0.0;
            bool validPreview = false;

            switch (m_mode) {
            case CircleMode::CenterRadius:
                if (m_centerPointSet) {
                    center = m_centerPoint;
                    radius = m_centerPoint.Distance(currentPoint);
                    validPreview = radius > m_minimumRadius * 0.1;
                }
                break;

            case CircleMode::ThreePoints:
                if (m_points.size() == 2) {
                    validPreview = calculateCircleFromThreePoints(
                        m_points[0], m_points[1], currentPoint, center, radius);
                }
                break;

            case CircleMode::TwoPoints:
                if (m_points.size() == 1) {
                    center = gp_Pnt2d((m_points[0].X() + currentPoint.X()) / 2.0,
                        (m_points[0].Y() + currentPoint.Y()) / 2.0);
                    radius = m_points[0].Distance(currentPoint) / 2.0;
                    validPreview = radius > m_minimumRadius * 0.1;
                }
                break;
            }

            if (!validPreview) {
                return;
            }

            // Convert to 3D
            gp_Pnt center3D = m_sketchManager->sketchToWorld(center);
            gp_Dir normal = m_sketchManager->sketchPlane().Axis().Direction();
            gp_Ax2 axis(center3D, normal);

            // Create circle
            Handle(Geom_Circle) geomCircle = new Geom_Circle(axis, radius);
            TopoDS_Edge circleEdge = BRepBuilderAPI_MakeEdge(geomCircle);

            m_previewShape = new AIS_Shape(circleEdge);

            // Set preview appearance
            SAFE_HANDLE_CALL(m_previewShape, SetColor(Quantity_Color(0.0, 0.8, 0.8, Quantity_TOC_RGB)));
            SAFE_HANDLE_CALL(m_previewShape, SetWidth(2.0));
            SAFE_HANDLE_CALL(m_previewShape, SetTransparency(0.3));

            // Display preview
            context->Display(m_previewShape, Standard_False);
            context->UpdateCurrentViewer();
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating circle preview:" << ex.GetMessageString();
            removePreview();
        }
        catch (...) {
            qWarning() << "Unknown error updating circle preview";
            removePreview();
        }
    }

    void TyrexSketchCircleCommand::removePreview()
    {
        if (!m_previewShape.IsNull() && m_sketchManager) {
            Handle(AIS_InteractiveContext) context = m_sketchManager->context();
            SAFE_HANDLE_CALL_OR(context, Remove(m_previewShape, Standard_False), {
                qWarning() << "Cannot remove preview - null context";
                });

            m_previewShape.Nullify();

            SAFE_HANDLE_CALL(context, UpdateCurrentViewer());
        }
    }

    bool TyrexSketchCircleCommand::calculateCircleFromThreePoints(const gp_Pnt2d& p1,
        const gp_Pnt2d& p2,
        const gp_Pnt2d& p3,
        gp_Pnt2d& center,
        double& radius)
    {
        try {
            // Check if points are collinear
            gp_Vec2d v1(p1, p2);
            gp_Vec2d v2(p1, p3);
            double cross = v1.Crossed(v2);

            if (std::abs(cross) < 1e-6) {
                qWarning() << "Points are collinear, cannot create circle";
                return false;
            }

            // Create circle from three points
            gce_MakeCirc2d circleMaker(p1, p2, p3);
            if (circleMaker.IsDone()) {
                gp_Circ2d circle2d = circleMaker.Value();
                center = circle2d.Location();
                radius = circle2d.Radius();
                return radius > m_minimumRadius;
            }

            return false;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error calculating circle from three points:" << ex.GetMessageString();
            return false;
        }
        catch (...) {
            qWarning() << "Unknown error calculating circle from three points";
            return false;
        }
    }

} // namespace TyrexCAD