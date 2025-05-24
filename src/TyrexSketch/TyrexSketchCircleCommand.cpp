/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexSketch/TyrexSketchCircleCommand.h"
#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexSketch/TyrexSketchCircleEntity.h"

 // OpenCascade includes
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <gp_Circ.hxx>
#include <gp_Ax2.hxx>
#include <TopoDS_Edge.hxx>
#include <AIS_Shape.hxx>
#include <Quantity_Color.hxx>
#include <Prs3d_LineAspect.hxx>
#include <Aspect_TypeOfLine.hxx>
#include <AIS_InteractiveContext.hxx>
#include <Graphic3d_AspectLine3d.hxx>
#include <Prs3d_Drawer.hxx>
// Qt includes
#include <QDebug>
#include <sstream>
#include <iomanip>
#include <cmath>

namespace TyrexCAD {

    TyrexSketchCircleCommand::TyrexSketchCircleCommand(TyrexSketchManager* sketchManager,
        CircleDefinitionMethod method)
        : TyrexCommand("Sketch Circle")
        , m_sketchManager(sketchManager)
        , m_definitionMethod(method)
        , m_centerPointSet(false)
        , m_centerPoint(0, 0)
        , m_radiusPoint(0, 0)
        , m_minimumRadius(2.0)
        , m_previewShape(nullptr)
    {
        qDebug() << "TyrexSketchCircleCommand created";
    }

    TyrexSketchCircleCommand::~TyrexSketchCircleCommand()
    {
        removePreview();
        qDebug() << "TyrexSketchCircleCommand destroyed";
    }

    void TyrexSketchCircleCommand::start()
    {
        TyrexCommand::start();

        // Reset state
        m_centerPointSet = false;
        m_centerPoint = gp_Pnt2d(0, 0);
        m_radiusPoint = gp_Pnt2d(0, 0);

        // Clean up any existing preview
        removePreview();

        qDebug() << "Sketch circle command started - click to place center point";
    }

    void TyrexSketchCircleCommand::cancel()
    {
        // Clean up preview
        removePreview();

        // Call base class cancel
        TyrexCommand::cancel();

        qDebug() << "Sketch circle command canceled";
    }

    bool TyrexSketchCircleCommand::isFinished() const
    {
        return m_isFinished;
    }

    void TyrexSketchCircleCommand::onMousePress(const QPoint& point)
    {
        if (!m_sketchManager) {
            qWarning() << "No sketch manager available";
            m_isFinished = true;
            return;
        }

        // Convert screen coordinates to 2D sketch coordinates
        gp_Pnt2d sketchPoint = m_sketchManager->screenToSketch(point);

        if (!m_centerPointSet) {
            // Set the center point
            m_centerPoint = sketchPoint;
            m_centerPointSet = true;

            qDebug() << QString("Center point set at (%1, %2)")
                .arg(m_centerPoint.X(), 0, 'f', 3)
                .arg(m_centerPoint.Y(), 0, 'f', 3);

            qDebug() << QString("Move mouse and click to set radius (minimum: %1)")
                .arg(m_minimumRadius);
        }
        else {
            // Set the radius/diameter point and create the circle
            m_radiusPoint = sketchPoint;

            // Calculate radius
            double radius = 0.0;
            if (m_definitionMethod == CircleDefinitionMethod::CenterRadius) {
                radius = calculateRadius(m_centerPoint, m_radiusPoint);
            }
            else if (m_definitionMethod == CircleDefinitionMethod::CenterDiameter) {
                radius = calculateRadiusFromDiameter(m_centerPoint, m_radiusPoint);
            }

            qDebug() << QString("Calculated radius: %1").arg(radius, 0, 'f', 3);

            // Validate circle
            if (!validateCircle(m_centerPoint, radius)) {
                qWarning() << QString("Circle too small! Radius %1 is below minimum of %2")
                    .arg(radius, 0, 'f', 3)
                    .arg(m_minimumRadius);

                // Clean up preview
                removePreview();

                // Don't finish command - let user try again
                return;
            }

            // Remove preview before creating final shape
            removePreview();

            // Create the actual circle entity
            if (createCircle()) {
                m_isFinished = true;
                qDebug() << QString("Circle command completed successfully with radius: %1")
                    .arg(radius, 0, 'f', 3);
            }
            else {
                qWarning() << "Failed to create circle entity";
                m_isFinished = true;
            }
        }
    }

    void TyrexSketchCircleCommand::onMouseMove(const QPoint& point)
    {
        if (!m_centerPointSet || !m_sketchManager) {
            return;
        }

        // Convert current mouse position to 2D coordinates
        gp_Pnt2d currentPoint = m_sketchManager->screenToSketch(point);

        // Update preview
        updatePreview(currentPoint);
    }

    void TyrexSketchCircleCommand::onMouseRelease(const QPoint& /*point*/)
    {
        // No specific action needed on mouse release for circle command
        // The click handling is done in onMousePress
    }

    void TyrexSketchCircleCommand::setDefinitionMethod(CircleDefinitionMethod method)
    {
        m_definitionMethod = method;
        qDebug() << "Circle definition method set to:" << static_cast<int>(method);
    }

    TyrexSketchCircleCommand::CircleDefinitionMethod TyrexSketchCircleCommand::getDefinitionMethod() const
    {
        return m_definitionMethod;
    }

    void TyrexSketchCircleCommand::setMinimumRadius(double minRadius)
    {
        m_minimumRadius = std::max(0.1, minRadius);
        qDebug() << "Minimum radius set to:" << m_minimumRadius;
    }

    double TyrexSketchCircleCommand::getMinimumRadius() const
    {
        return m_minimumRadius;
    }

    bool TyrexSketchCircleCommand::createCircle()
    {
        if (!m_sketchManager) {
            qCritical() << "Cannot create circle - sketch manager is null";
            return false;
        }

        try {
            // Calculate final radius
            double radius = 0.0;
            if (m_definitionMethod == CircleDefinitionMethod::CenterRadius) {
                radius = calculateRadius(m_centerPoint, m_radiusPoint);
            }
            else if (m_definitionMethod == CircleDefinitionMethod::CenterDiameter) {
                radius = calculateRadiusFromDiameter(m_centerPoint, m_radiusPoint);
            }

            // Generate unique ID
            std::string circleId = generateCircleId();

            // Create the circle entity
            auto circleEntity = std::make_shared<TyrexSketchCircleEntity>(
                circleId,
                m_sketchManager->sketchPlane(),
                m_centerPoint,
                radius
            );

            // Set sketch-specific color
            Quantity_Color sketchColor(1.0, 0.5, 0.0, Quantity_TOC_RGB); // Orange
            circleEntity->setColor(sketchColor);

            // Force shape update
            circleEntity->updateShape();

            // Add to sketch manager
            m_sketchManager->addSketchEntity(circleEntity);

            // Force redraw
            m_sketchManager->redrawSketch();

            qDebug() << QString("Sketch circle entity created with ID: %1, radius: %2")
                .arg(QString::fromStdString(circleId))
                .arg(radius, 0, 'f', 3);

            return true;
        }
        catch (const Standard_Failure& ex) {
            qCritical() << "OpenCascade error creating sketch circle:" << ex.GetMessageString();
            return false;
        }
        catch (const std::exception& ex) {
            qCritical() << "Error creating sketch circle:" << ex.what();
            return false;
        }
        catch (...) {
            qCritical() << "Unknown error creating sketch circle";
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

        // Calculate radius for preview
        double radius = 0.0;
        if (m_definitionMethod == CircleDefinitionMethod::CenterRadius) {
            radius = calculateRadius(m_centerPoint, currentPoint);
        }
        else if (m_definitionMethod == CircleDefinitionMethod::CenterDiameter) {
            radius = calculateRadiusFromDiameter(m_centerPoint, currentPoint);
        }

        // Check if radius is too small for preview
        if (radius < m_minimumRadius * 0.5) {
            removePreview();
            return;
        }

        try {
            // Remove existing preview
            removePreview();

            // Convert center to 3D
            gp_Pnt center3D = m_sketchManager->sketchToWorld(m_centerPoint);

            // Create coordinate system for the circle
            gp_Dir zDir = m_sketchManager->sketchPlane().Axis().Direction();
            gp_Ax2 axis(center3D, zDir);

            // Create circle geometry
            gp_Circ circle(axis, radius);

            // Create preview edge
            BRepBuilderAPI_MakeEdge edgeMaker(circle);
            if (edgeMaker.IsDone()) {
                TopoDS_Edge previewEdge = edgeMaker.Edge();
                m_previewShape = new AIS_Shape(previewEdge);

                // Set preview appearance
                Quantity_Color previewColor(1.0, 0.65, 0.0, Quantity_TOC_RGB); // Orange
                m_previewShape->SetColor(previewColor);
                m_previewShape->SetWidth(2.0);
                m_previewShape->SetTransparency(0.2);

                // Set dashed line style - OpenCascade 7.x compatible way
                Handle(Prs3d_Drawer) drawer = m_previewShape->Attributes();
                Handle(Graphic3d_AspectLine3d) lineAspect =
                    new Graphic3d_AspectLine3d(previewColor, Aspect_TOL_DASH, 2.0);
                drawer->SetLineAspect(new Prs3d_LineAspect(lineAspect));

                // Display preview
                context->Display(m_previewShape, Standard_False);
                context->UpdateCurrentViewer();
            }
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
            if (!context.IsNull()) {
                try {
                    context->Remove(m_previewShape, Standard_True);
                    m_previewShape.Nullify();
                }
                catch (const Standard_Failure& ex) {
                    qWarning() << "Error removing preview:" << ex.GetMessageString();
                }
                catch (...) {
                    qWarning() << "Unknown error removing preview";
                }
            }
        }
    }

    double TyrexSketchCircleCommand::calculateRadius(const gp_Pnt2d& centerPt, const gp_Pnt2d& radiusPt) const
    {
        return centerPt.Distance(radiusPt);
    }

    double TyrexSketchCircleCommand::calculateRadiusFromDiameter(const gp_Pnt2d& centerPt, const gp_Pnt2d& diameterPt) const
    {
        return centerPt.Distance(diameterPt) * 0.5;
    }

    std::string TyrexSketchCircleCommand::generateCircleId() const
    {
        static int counter = 0;
        std::stringstream ss;
        ss << "sketch_circle_" << std::setfill('0') << std::setw(6) << ++counter;
        return ss.str();
    }

    bool TyrexSketchCircleCommand::validateCircle(const gp_Pnt2d& center, double radius) const
    {
        // Check minimum radius
        if (radius < m_minimumRadius) {
            return false;
        }

        // Check for reasonable maximum
        const double MAX_RADIUS = 10000.0;
        if (radius > MAX_RADIUS) {
            qWarning() << QString("Circle too large! Maximum radius is %1").arg(MAX_RADIUS);
            return false;
        }

        return true;
    }

} // namespace TyrexCAD