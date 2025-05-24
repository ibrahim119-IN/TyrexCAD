/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexSketch/TyrexSketchLineCommand.h"
#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexSketch/TyrexSketchLineEntity.h"

 // OpenCascade includes
#include <BRepBuilderAPI_MakeEdge.hxx>
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

namespace TyrexCAD {

    TyrexSketchLineCommand::TyrexSketchLineCommand(TyrexSketchManager* sketchManager)
        : TyrexCommand("Sketch Line")
        , m_sketchManager(sketchManager)
        , m_firstPointSet(false)
        , m_firstPoint(0, 0)
        , m_secondPoint(0, 0)
        , m_continuousMode(false)
        , m_minimumLength(1.0)
        , m_previewShape(nullptr)
    {
        qDebug() << "TyrexSketchLineCommand created";
    }

    TyrexSketchLineCommand::~TyrexSketchLineCommand()
    {
        removePreview();
        qDebug() << "TyrexSketchLineCommand destroyed";
    }

    void TyrexSketchLineCommand::start()
    {
        TyrexCommand::start();

        // Reset state
        m_firstPointSet = false;
        m_firstPoint = gp_Pnt2d(0, 0);
        m_secondPoint = gp_Pnt2d(0, 0);

        // Clean up any existing preview
        removePreview();

        qDebug() << "Sketch line command started - click to place first point";
    }

    void TyrexSketchLineCommand::cancel()
    {
        // Clean up preview
        removePreview();

        // Call base class cancel
        TyrexCommand::cancel();

        qDebug() << "Sketch line command canceled";
    }

    bool TyrexSketchLineCommand::isFinished() const
    {
        return m_isFinished;
    }

    void TyrexSketchLineCommand::onMousePress(const QPoint& point)
    {
        if (!m_sketchManager) {
            qWarning() << "No sketch manager available";
            m_isFinished = true;
            return;
        }

        // Convert screen coordinates to 2D sketch coordinates
        gp_Pnt2d sketchPoint = m_sketchManager->screenToSketch(point);

        if (!m_firstPointSet) {
            // Set the first point
            m_firstPoint = sketchPoint;
            m_firstPointSet = true;

            qDebug() << QString("First point set at (%1, %2)")
                .arg(m_firstPoint.X(), 0, 'f', 3)
                .arg(m_firstPoint.Y(), 0, 'f', 3);

            qDebug() << "Move mouse to see preview, click to place second point";
        }
        else {
            // Set the second point and create the line
            m_secondPoint = sketchPoint;

            qDebug() << QString("Second point set at (%1, %2)")
                .arg(m_secondPoint.X(), 0, 'f', 3)
                .arg(m_secondPoint.Y(), 0, 'f', 3);

            // Validate line
            if (!validateLine(m_firstPoint, m_secondPoint)) {
                qWarning() << QString("Line too short! Minimum length is %1 units")
                    .arg(m_minimumLength);

                // Clean up preview
                removePreview();

                // Don't finish command - let user try again
                return;
            }

            // Remove preview before creating final shape
            removePreview();

            // Create the actual line entity
            if (createLine()) {
                double lineLength = m_firstPoint.Distance(m_secondPoint);
                qDebug() << QString("Line created successfully with length: %1")
                    .arg(lineLength, 0, 'f', 3);

                if (m_continuousMode) {
                    // In continuous mode, start next line from current end point
                    m_firstPoint = m_secondPoint;
                    m_firstPointSet = true;
                    qDebug() << "Continuous mode: Starting next line from current end point";
                }
                else {
                    // Single line mode - command is finished
                    m_isFinished = true;
                    qDebug() << "Line command completed";
                }
            }
            else {
                qWarning() << "Failed to create line entity";
                if (!m_continuousMode) {
                    m_isFinished = true;
                }
            }
        }
    }

    void TyrexSketchLineCommand::onMouseMove(const QPoint& point)
    {
        if (!m_firstPointSet || !m_sketchManager) {
            return;
        }

        // Convert current mouse position to 2D coordinates
        gp_Pnt2d currentPoint = m_sketchManager->screenToSketch(point);

        // Update preview
        updatePreview(currentPoint);
    }

    void TyrexSketchLineCommand::onMouseRelease(const QPoint& /*point*/)
    {
        // No specific action needed on mouse release for line command
        // The click handling is done in onMousePress
    }

    void TyrexSketchLineCommand::setContinuousMode(bool continuous)
    {
        m_continuousMode = continuous;
        qDebug() << "Continuous mode set to:" << continuous;
    }

    bool TyrexSketchLineCommand::isContinuousMode() const
    {
        return m_continuousMode;
    }

    void TyrexSketchLineCommand::setMinimumLength(double minLength)
    {
        m_minimumLength = std::max(0.1, minLength);
        qDebug() << "Minimum line length set to:" << m_minimumLength;
    }

    double TyrexSketchLineCommand::getMinimumLength() const
    {
        return m_minimumLength;
    }

    bool TyrexSketchLineCommand::createLine()
    {
        if (!m_sketchManager) {
            qCritical() << "Cannot create line - sketch manager is null";
            return false;
        }

        try {
            // Generate unique ID for the line
            std::string lineId = generateLineId();

            // Create the line entity
            auto lineEntity = std::make_shared<TyrexSketchLineEntity>(
                lineId,
                m_sketchManager->sketchPlane(),
                m_firstPoint,
                m_secondPoint
            );

            // Set sketch-specific color
            Quantity_Color sketchColor(0.2, 0.5, 1.0, Quantity_TOC_RGB); // Light blue
            lineEntity->setColor(sketchColor);

            // Force shape update
            lineEntity->updateShape();

            // Add to sketch manager
            m_sketchManager->addSketchEntity(lineEntity);

            // Force redraw
            m_sketchManager->redrawSketch();

            qDebug() << QString("Sketch line entity created with ID: %1")
                .arg(QString::fromStdString(lineId));

            return true;
        }
        catch (const Standard_Failure& ex) {
            qCritical() << "OpenCascade error creating sketch line:" << ex.GetMessageString();
            return false;
        }
        catch (const std::exception& ex) {
            qCritical() << "Error creating sketch line:" << ex.what();
            return false;
        }
        catch (...) {
            qCritical() << "Unknown error creating sketch line";
            return false;
        }
    }

    void TyrexSketchLineCommand::updatePreview(const gp_Pnt2d& currentPoint)
    {
        if (!m_sketchManager) {
            return;
        }

        Handle(AIS_InteractiveContext) context = m_sketchManager->context();
        if (context.IsNull()) {
            return;
        }

        // Validate preview line
        double distance = m_firstPoint.Distance(currentPoint);
        if (distance < m_minimumLength * 0.5) {
            // Too short for preview - remove any existing preview
            removePreview();
            return;
        }

        try {
            // Remove existing preview if any
            removePreview();

            // Convert 2D points to 3D
            gp_Pnt startPoint3D = m_sketchManager->sketchToWorld(m_firstPoint);
            gp_Pnt endPoint3D = m_sketchManager->sketchToWorld(currentPoint);

            // Create preview edge
            BRepBuilderAPI_MakeEdge edgeMaker(startPoint3D, endPoint3D);
            if (edgeMaker.IsDone()) {
                TopoDS_Edge previewEdge = edgeMaker.Edge();
                m_previewShape = new AIS_Shape(previewEdge);

                // Set preview appearance
                Quantity_Color previewColor(0.0, 0.8, 0.8, Quantity_TOC_RGB); // Cyan
                m_previewShape->SetColor(previewColor);
                m_previewShape->SetWidth(2.0);
                m_previewShape->SetTransparency(0.2);

                // Set dashed line style - OpenCascade 7.x compatible way
                Handle(Prs3d_Drawer) drawer = m_previewShape->Attributes();
                Handle(Graphic3d_AspectLine3d) lineAspect =
                    new Graphic3d_AspectLine3d(previewColor, Aspect_TOL_DASH, 2.0);
                drawer->SetLineAspect(new Prs3d_LineAspect(lineAspect));

                // Display preview without updating viewer immediately
                context->Display(m_previewShape, Standard_False);
                context->UpdateCurrentViewer();
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating line preview:" << ex.GetMessageString();
            removePreview();
        }
        catch (...) {
            qWarning() << "Unknown error updating line preview";
            removePreview();
        }
    }

    void TyrexSketchLineCommand::removePreview()
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

    std::string TyrexSketchLineCommand::generateLineId() const
    {
        static int counter = 0;
        std::stringstream ss;
        ss << "sketch_line_" << std::setfill('0') << std::setw(6) << ++counter;
        return ss.str();
    }

    bool TyrexSketchLineCommand::validateLine(const gp_Pnt2d& start, const gp_Pnt2d& end) const
    {
        double length = start.Distance(end);
        return length >= m_minimumLength;
    }

} // namespace TyrexCAD