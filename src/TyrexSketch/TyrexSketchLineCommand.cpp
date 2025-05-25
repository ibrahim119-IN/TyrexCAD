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
        , m_previewShape(nullptr) // Correctly initialized
    {
        qDebug() << "TyrexSketchLineCommand created";
    }

    TyrexSketchLineCommand::~TyrexSketchLineCommand()
    {
        removePreview();
        qDebug() << "TyrexSketchLineCommand destroyed";
    }

    void TyrexSketchLineCommand::start() {}
    void TyrexSketchLineCommand::cancel() {}
    bool TyrexSketchLineCommand::isFinished() const { return false; }
    void TyrexSketchLineCommand::onMousePress(const QPoint&) {}
    void TyrexSketchLineCommand::onMouseMove(const QPoint&) {}
    void TyrexSketchLineCommand::onMouseRelease(const QPoint&) {}

    void TyrexSketchLineCommand::updatePreview(const gp_Pnt2d& currentPoint)
    {
        if (!m_sketchManager) { // PRIORITY 5 style: direct check (not a Handle)
            return;
        }

        Handle(AIS_InteractiveContext) context = m_sketchManager->context();
        if (context.IsNull()) { // PRIORITY 1 / PRIORITY 5 fix for Handle
            return;
        }

        double distance = m_firstPoint.Distance(currentPoint);
        if (distance < m_minimumLength * 0.5) {
            removePreview();
            return;
        }
        try {
            removePreview();
            gp_Pnt startPoint3D = m_sketchManager->sketchToWorld(m_firstPoint);
            gp_Pnt endPoint3D = m_sketchManager->sketchToWorld(currentPoint);
            BRepBuilderAPI_MakeEdge edgeMaker(startPoint3D, endPoint3D);
            if (edgeMaker.IsDone()) {
                TopoDS_Edge previewEdge = edgeMaker.Edge();
                m_previewShape = new AIS_Shape(previewEdge);
                Quantity_Color previewColor(0.0, 0.8, 0.8, Quantity_TOC_RGB);
                m_previewShape->SetColor(previewColor);
                m_previewShape->SetWidth(2.0);
                m_previewShape->SetTransparency(0.2);

                Handle(Prs3d_Drawer) drawer = m_previewShape->Attributes();
                if (drawer.IsNull()) { // PRIORITY 1 / PRIORITY 5 fix for Handle
                    drawer = new Prs3d_Drawer();
                    m_previewShape->SetAttributes(drawer);
                }
                // CATEGORY 1 Fix was already applied here from previous report:
                Handle(Prs3d_LineAspect) lineAspect = new Prs3d_LineAspect(
                    previewColor, Aspect_TOL_DASH, 2.0);
                drawer->SetLineAspect(lineAspect); // Use .get() if direct assignment doesn't work, but this is standard.

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
        if (m_previewShape.IsNull() || !m_sketchManager) { // PRIORITY 1 / PRIORITY 5 fix for Handle
            return;
        }
        Handle(AIS_InteractiveContext) context = m_sketchManager->context();
        if (context.IsNull()) { // PRIORITY 1 / PRIORITY 5 fix for Handle
            m_previewShape.Nullify(); // Still nullify if context is bad
            return;
        }
        try {
            if (context->IsDisplayed(m_previewShape)) {
                context->Remove(m_previewShape, Standard_False);
                context->UpdateCurrentViewer();
            }
            m_previewShape.Nullify();
        }
        // ... (catch blocks remain the same)
        catch (const Standard_Failure& ex) {
            qWarning() << "Error removing preview:" << ex.GetMessageString();
            m_previewShape.Nullify(); // Ensure nullification on error
        }
        catch (...) {
            qWarning() << "Unknown error removing preview";
            m_previewShape.Nullify(); // Ensure nullification on error
        }
    }

    // ... (generateLineId, validateLine, createLine methods remain same as previous correct version)

} // namespace TyrexCAD