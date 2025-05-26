/***************************************************************************
 * Copyright (c) 2025 TyrexCAD development team                          *
 * *
 * This file is part of the TyrexCAD CAx development system.             *
 * *
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
#include <Prs3d_Drawer.hxx>       
#include <TopoDS.hxx>

// Qt includes
#include <QDebug>
#include <sstream>
#include <iomanip>
#include <chrono>

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
        m_isStarted = true;
        m_isFinished = false;
        m_firstPointSet = false;
        removePreview();

        qDebug() << "Sketch line command started - click to set first point";
    }

    void TyrexSketchLineCommand::cancel()
    {
        removePreview();
        m_firstPointSet = false;
        m_isFinished = true;

        qDebug() << "Sketch line command cancelled";
    }

    bool TyrexSketchLineCommand::isFinished() const
    {
        return m_isFinished;
    }

    void TyrexSketchLineCommand::onMousePress(const QPoint& point)
    {
        if (!m_sketchManager) {
            qWarning() << "No sketch manager available";
            return;
        }

        gp_Pnt2d sketchPoint = m_sketchManager->screenToSketch(point);

        if (!m_firstPointSet) {
            // Set first point
            m_firstPoint = sketchPoint;
            m_firstPointSet = true;
            updatePreview(m_firstPoint);

            qDebug() << "First point set at:" << m_firstPoint.X() << m_firstPoint.Y();
            qDebug() << "Move mouse and click to set second point";
        }
        else {
            // Set second point and create line
            m_secondPoint = sketchPoint;

            qDebug() << "Second point set at:" << m_secondPoint.X() << m_secondPoint.Y();

            if (createLine()) {
                if (m_continuousMode) {
                    // In continuous mode, start next line from end point
                    m_firstPoint = m_secondPoint;
                    m_firstPointSet = true;
                    updatePreview(m_firstPoint);
                }
                else {
                    // Single line mode - finish command
                    m_isFinished = true;
                }
                qDebug() << "Line created successfully";
            }
            else {
                qWarning() << "Failed to create line";
                cancel();
            }
        }
    }

    void TyrexSketchLineCommand::onMouseMove(const QPoint& point)
    {
        if (!m_firstPointSet || !m_sketchManager) {
            return;
        }

        // Update preview with current mouse position
        gp_Pnt2d currentPoint = m_sketchManager->screenToSketch(point);
        updatePreview(currentPoint);
    }

    void TyrexSketchLineCommand::onMouseRelease(const QPoint& point)
    {
        // No action needed on mouse release for line command
        Q_UNUSED(point);
    }

    void TyrexSketchLineCommand::setContinuousMode(bool continuous)
    {
        m_continuousMode = continuous;
    }

    bool TyrexSketchLineCommand::isContinuousMode() const
    {
        return m_continuousMode;
    }

    void TyrexSketchLineCommand::setMinimumLength(double minLength)
    {
        m_minimumLength = std::max(0.001, minLength);
    }

    double TyrexSketchLineCommand::getMinimumLength() const
    {
        return m_minimumLength;
    }

    bool TyrexSketchLineCommand::createLine()
    {
        if (!m_sketchManager) {
            return false;
        }

        if (!validateLine(m_firstPoint, m_secondPoint)) {
            qWarning() << "Invalid line parameters";
            return false;
        }

        try {
            // Generate unique ID
            std::string lineId = generateLineId();

            // Create line entity
            auto lineEntity = std::make_shared<TyrexSketchLineEntity>(
                lineId,
                m_sketchManager->sketchPlane(),
                m_firstPoint,
                m_secondPoint
            );

            // Add to sketch manager
            m_sketchManager->addSketchEntity(lineEntity);

            // Clean up preview
            removePreview();

            return true;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "OpenCascade error creating line:" << ex.GetMessageString();
            return false;
        }
        catch (const std::exception& ex) {
            qWarning() << "Error creating line:" << ex.what();
            return false;
        }
        catch (...) {
            qWarning() << "Unknown error creating line";
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

        double distance = m_firstPoint.Distance(currentPoint);
        if (distance < m_minimumLength * 0.5) {
            removePreview();
            return;
        }

        try {
            removePreview();

            // Convert to 3D points
            gp_Pnt startPoint3D = m_sketchManager->sketchToWorld(m_firstPoint);
            gp_Pnt endPoint3D = m_sketchManager->sketchToWorld(currentPoint);

            // Create preview edge
            BRepBuilderAPI_MakeEdge edgeMaker(startPoint3D, endPoint3D);
            if (edgeMaker.IsDone()) {
                TopoDS_Edge previewEdge = edgeMaker.Edge();
                m_previewShape = new AIS_Shape(previewEdge);

                // Set preview appearance
                Quantity_Color previewColor(0.0, 0.8, 0.8, Quantity_TOC_RGB);
                m_previewShape->SetColor(previewColor);
                m_previewShape->SetWidth(2.0);
                m_previewShape->SetTransparency(0.2);

                // Set dashed line style
                Handle(Prs3d_Drawer) drawer = m_previewShape->Attributes();
                if (drawer.IsNull()) {
                    drawer = new Prs3d_Drawer();
                    m_previewShape->SetAttributes(drawer);
                }

                Handle(Prs3d_LineAspect) lineAspect = new Prs3d_LineAspect(
                    previewColor, Aspect_TOL_DASH, 2.0);
                drawer->SetLineAspect(lineAspect);

                // Display preview
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
        if (m_previewShape.IsNull() || !m_sketchManager) {
            return;
        }

        Handle(AIS_InteractiveContext) context = m_sketchManager->context();
        if (context.IsNull()) {
            m_previewShape.Nullify();
            return;
        }

        try {
            if (context->IsDisplayed(m_previewShape)) {
                context->Remove(m_previewShape, Standard_False);
                context->UpdateCurrentViewer();
            }
            m_previewShape.Nullify();
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error removing preview:" << ex.GetMessageString();
            m_previewShape.Nullify();
        }
        catch (...) {
            qWarning() << "Unknown error removing preview";
            m_previewShape.Nullify();
        }
    }

    std::string TyrexSketchLineCommand::generateLineId() const
    {
        static int lineCounter = 0;
        std::stringstream ss;
        ss << "sketch_line_" << ++lineCounter << "_"
            << std::chrono::system_clock::now().time_since_epoch().count();
        return ss.str();
    }

    bool TyrexSketchLineCommand::validateLine(const gp_Pnt2d& start, const gp_Pnt2d& end) const
    {
        double distance = start.Distance(end);
        return distance >= m_minimumLength;
    }

} // namespace TyrexCAD