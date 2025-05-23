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
        , m_previewLine(nullptr)
        , m_previewShape(nullptr)
    {
        qDebug() << "TyrexSketchLineCommand created";
    }

    TyrexSketchLineCommand::~TyrexSketchLineCommand()
    {
        cleanupPreview();
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
        cleanupPreview();

        qDebug() << "Sketch line command started - click to place first point";
    }

    void TyrexSketchLineCommand::cancel()
    {
        // Clean up preview
        cleanupPreview();

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

            // Enhanced validation with meaningful threshold
            const double MIN_LINE_LENGTH = 1.0; // 1 unit minimum length
            double lineLength = m_firstPoint.Distance(m_secondPoint);

            if (lineLength < MIN_LINE_LENGTH) {
                qWarning() << QString("Line too short (length: %1). Minimum length is %2 units")
                    .arg(lineLength, 0, 'f', 3)
                    .arg(MIN_LINE_LENGTH);

                // Clean up preview and don't finish if too short
                cleanupPreview();

                if (!m_continuousMode) {
                    m_isFinished = true;
                }
                return;
            }

            // Remove preview before creating final shape
            cleanupPreview();

            // Create the actual line entity
            if (createLine()) {
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

        // Validate line length before showing preview
        const double MIN_PREVIEW_LENGTH = 1.0;
        double currentLength = m_firstPoint.Distance(currentPoint);

        if (currentLength >= MIN_PREVIEW_LENGTH) {
            updatePreview(currentPoint);
        }
        else {
            // Remove preview for too short lines
            removePreview();
        }
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

    bool TyrexSketchLineCommand::createLine()
    {
        if (!m_sketchManager) {
            qCritical() << "Cannot create line - sketch manager is null";
            return false;
        }

        try {
            // Generate unique ID for the line
            std::string lineId = generateLineId();

            // Calculate line length for debugging
            double lineLength = m_firstPoint.Distance(m_secondPoint);
            qDebug() << QString("Creating sketch line with ID: %1, length: %2")
                .arg(QString::fromStdString(lineId))
                .arg(lineLength, 0, 'f', 3);

            // Create the line entity with explicit sketch plane
            auto lineEntity = std::make_shared<TyrexSketchLineEntity>(
                lineId,
                m_sketchManager->sketchPlane(),
                m_firstPoint,
                m_secondPoint
            );

            // Set sketch-specific color (blue for lines in sketch mode)
            Quantity_Color sketchColor(0.2, 0.5, 1.0, Quantity_TOC_RGB); // Light blue
            lineEntity->setColor(sketchColor);

            // Force shape update before adding to manager
            lineEntity->updateShape();

            // Add the entity to sketch manager - this will display it
            m_sketchManager->addSketchEntity(lineEntity);

            // Force immediate redraw to ensure visibility
            m_sketchManager->redrawSketch();

            qDebug() << QString("Sketch line entity created and displayed successfully");

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

        try {
            // Remove existing preview if any
            removePreview();

            // Convert 2D points to 3D using the sketch plane
            gp_Pnt startPoint3D = m_sketchManager->sketchToWorld(m_firstPoint);
            gp_Pnt endPoint3D = m_sketchManager->sketchToWorld(currentPoint);

            // Create preview edge
            BRepBuilderAPI_MakeEdge edgeMaker(startPoint3D, endPoint3D);
            if (edgeMaker.IsDone()) {
                TopoDS_Edge previewEdge = edgeMaker.Edge();
                m_previewShape = new AIS_Shape(previewEdge);

                // Set preview appearance (light gray dashed line)
                Quantity_Color previewColor(0.6, 0.6, 0.6, Quantity_TOC_RGB);
                m_previewShape->SetColor(previewColor);
                m_previewShape->SetWidth(1.5);
                m_previewShape->SetTransparency(0.3);

                // Set dashed line style
                Handle(Prs3d_LineAspect) lineAspect = new Prs3d_LineAspect(
                    previewColor, Aspect_TOL_DASH, 1.5);
                m_previewShape->Attributes()->SetLineAspect(lineAspect);

                // Display preview
                context->Display(m_previewShape, Standard_False);
                context->UpdateCurrentViewer();

                qDebug() << QString("Preview updated for line from (%1,%2) to (%3,%4)")
                    .arg(m_firstPoint.X(), 0, 'f', 2)
                    .arg(m_firstPoint.Y(), 0, 'f', 2)
                    .arg(currentPoint.X(), 0, 'f', 2)
                    .arg(currentPoint.Y(), 0, 'f', 2);
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "OpenCascade error updating line preview:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error updating line preview";
        }
    }

    void TyrexSketchLineCommand::removePreview()
    {
        if (!m_previewShape.IsNull() && m_sketchManager) {
            Handle(AIS_InteractiveContext) context = m_sketchManager->context();
            if (!context.IsNull()) {
                try {
                    context->Remove(m_previewShape, Standard_True);
                    context->UpdateCurrentViewer();
                    qDebug() << "Preview line removed";
                }
                catch (const Standard_Failure& ex) {
                    qWarning() << "Error removing preview:" << ex.GetMessageString();
                }
            }
            m_previewShape.Nullify();
        }
    }

    void TyrexSketchLineCommand::cleanupPreview()
    {
        // Remove AIS preview shape
        removePreview();

        // Clean up entity-based preview (legacy)
        if (m_previewLine && m_sketchManager) {
            try {
                m_sketchManager->removeSketchEntity(m_previewLine->getId());
                m_previewLine = nullptr;
                m_sketchManager->redrawSketch();
                qDebug() << "Preview line entity cleaned up";
            }
            catch (const std::exception& ex) {
                qWarning() << "Error cleaning up preview entity:" << ex.what();
            }
        }
    }

    std::string TyrexSketchLineCommand::generateLineId() const
    {
        // Generate unique ID using timestamp and counter
        static int counter = 0;
        std::stringstream ss;
        ss << "sketch_line_" << std::setfill('0') << std::setw(6) << ++counter;
        return ss.str();
    }

} // namespace TyrexCAD