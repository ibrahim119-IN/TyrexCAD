/***************************************************************************
 * Copyright (c) 2025 TyrexCAD development team                          *
 * *
 * This file is part of the TyrexCAD CAx development system.             *
 * *
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
#include <Prs3d_Drawer.hxx>          

// Qt includes
#include <QDebug>
#include <sstream>
#include <iomanip>
#include <cmath>

namespace TyrexCAD {
    // ... (Constructor, Destructor, start, cancel, etc. same as previous correct version)

    void TyrexSketchCircleCommand::updatePreview(const gp_Pnt2d& currentPoint)
    {
        if (!m_sketchManager) { // PRIORITY 5 style
            return;
        }

        Handle(AIS_InteractiveContext) context = m_sketchManager->context();
        if (context.IsNull()) { // PRIORITY 1 / PRIORITY 5 fix for Handle
            return;
        }

        // ... (radius calculation logic same)
        double radius = 0.0;
        if (m_definitionMethod == CircleDefinitionMethod::CenterRadius) {
            radius = calculateRadius(m_centerPoint, currentPoint);
        }
        else if (m_definitionMethod == CircleDefinitionMethod::CenterDiameter) {
            radius = calculateRadiusFromDiameter(m_centerPoint, currentPoint);
        }

        if (radius < m_minimumRadius * 0.5) {
            removePreview();
            return;
        }

        try {
            removePreview();
            gp_Pnt center3D = m_sketchManager->sketchToWorld(m_centerPoint);
            gp_Dir zDir = m_sketchManager->sketchPlane().Axis().Direction();
            gp_Ax2 axis(center3D, zDir);
            gp_Circ circle(axis, radius);
            BRepBuilderAPI_MakeEdge edgeMaker(circle);
            if (edgeMaker.IsDone()) {
                TopoDS_Edge previewEdge = edgeMaker.Edge();
                m_previewShape = new AIS_Shape(previewEdge);
                Quantity_Color previewColor(1.0, 0.65, 0.0, Quantity_TOC_RGB);
                m_previewShape->SetColor(previewColor);
                m_previewShape->SetWidth(2.0);
                m_previewShape->SetTransparency(0.2);

                Handle(Prs3d_Drawer) drawer = m_previewShape->Attributes();
                if (drawer.IsNull()) { // PRIORITY 1 / PRIORITY 5 fix for Handle
                    drawer = new Prs3d_Drawer();
                    m_previewShape->SetAttributes(drawer);
                }
                // CATEGORY 1 Fix was already applied here:
                Handle(Prs3d_LineAspect) lineAspect = new Prs3d_LineAspect(
                    previewColor, Aspect_TOL_DASH, 2.0);
                drawer->SetLineAspect(lineAspect);

                context->Display(m_previewShape, Standard_False);
                context->UpdateCurrentViewer();
            }
        }
        // ... (catch blocks same)
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
        if (m_previewShape.IsNull() || !m_sketchManager) { // PRIORITY 1 / PRIORITY 5 fix
            return;
        }
        Handle(AIS_InteractiveContext) context = m_sketchManager->context();
        if (context.IsNull()) { // PRIORITY 1 / PRIORITY 5 fix
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
        // ... (catch blocks same)
        catch (const Standard_Failure& ex) {
            qWarning() << "Error removing preview:" << ex.GetMessageString();
            m_previewShape.Nullify();
        }
        catch (...) {
            qWarning() << "Unknown error removing preview";
            m_previewShape.Nullify();
        }
    }

    // ... (Rest of the TyrexSketchCircleCommand.cpp remains same as previous correct version)
} // namespace TyrexCAD