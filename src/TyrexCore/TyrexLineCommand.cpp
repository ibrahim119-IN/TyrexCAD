/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCore/TyrexLineCommand.h"
#include "TyrexCanvas/TyrexModelSpace.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexEntities/TyrexLineEntity.h"
#include "TyrexCore/CoordinateConverter.h"

 // OpenCascade includes
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Edge.hxx>
#include <AIS_Shape.hxx>
#include <AIS_InteractiveContext.hxx>
#include <Quantity_Color.hxx>
#include <V3d_View.hxx>
#include <Standard_Handle.hxx>
#include <QDebug>

namespace TyrexCAD {

    TyrexLineCommand::TyrexLineCommand(TyrexModelSpace* modelSpace, TyrexViewerManager* viewerManager)
        : TyrexCommand("Line", nullptr)
        , m_modelSpace(modelSpace)
        , m_viewerManager(viewerManager)
        , m_firstPointSet(false)
    {
        qDebug() << "TyrexLineCommand created";
    }

    TyrexLineCommand::~TyrexLineCommand()
    {
        cleanupPreview();
    }

    void TyrexLineCommand::start()
    {
        TyrexCommand::start();
        m_firstPointSet = false;
        cleanupPreview();
    }

    void TyrexLineCommand::cancel()
    {
        cleanupPreview();
        TyrexCommand::cancel();
    }

    bool TyrexLineCommand::isFinished() const
    {
        return TyrexCommand::isFinished();
    }

    void TyrexLineCommand::onMousePress(const QPoint& point)
    {
        if (!m_viewerManager || !m_viewerManager->view()) {
            qWarning() << "No view available";
            return;
        }

        Handle(V3d_View) view = m_viewerManager->view();
        gp_Pnt2d worldPoint = CoordinateConverter::screenToWorld2D(point, view);
        gp_Pnt worldPoint3D = CoordinateConverter::screenToWorld3D(point, view);

        if (!m_firstPointSet) {
            m_firstPoint = worldPoint3D;
            m_firstPointSet = true;
            updatePreview(m_firstPoint);
            emit statusMessage("Line: Specify second point");
        }
        else {
            m_secondPoint = worldPoint3D;

            if (createLine()) {
                transitionTo(FINISHED);
                m_isFinished = true;
            }
            else {
                cancel();
            }
        }
    }

    void TyrexLineCommand::onMouseMove(const QPoint& point)
    {
        if (!m_firstPointSet || !m_viewerManager || !m_viewerManager->view()) {
            return;
        }

        Handle(V3d_View) view = m_viewerManager->view();
        gp_Pnt currentPoint3D = CoordinateConverter::screenToWorld3D(point, view);
        updatePreview(currentPoint3D);
    }

    void TyrexLineCommand::onMouseRelease(const QPoint& point)
    {
        // No action needed on mouse release
        Q_UNUSED(point);
    }

    bool TyrexLineCommand::createLine()
    {
        if (!m_modelSpace) {
            qWarning() << "No model space available";
            return false;
        }

        try {
            // Generate unique ID for the line
            static int lineCounter = 0;
            std::string lineId = "Line_" + std::to_string(++lineCounter);

            // Create line entity
            auto lineEntity = std::make_shared<TyrexLineEntity>(
                lineId,
                "0",  // Default layer
                Quantity_Color(1.0, 1.0, 1.0, Quantity_TOC_RGB),  // White color
                m_firstPoint,
                m_secondPoint
            );

            // Display the line
            if (m_viewerManager && m_viewerManager->context()) {
                Handle(AIS_InteractiveContext) context = m_viewerManager->context();
                lineEntity->draw(context, false);
            }

            // Add to model space
            m_modelSpace->addEntity(lineEntity);

            // Clean up preview
            cleanupPreview();

            qDebug() << "Line created successfully with ID:" << QString::fromStdString(lineId);
            return true;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Failed to create line:" << ex.GetMessageString();
            return false;
        }
        catch (...) {
            qWarning() << "Unknown error creating line";
            return false;
        }
    }

    void TyrexLineCommand::updatePreview(const gp_Pnt& currentPoint)
    {
        if (!m_viewerManager || !m_viewerManager->context()) {
            return;
        }

        cleanupPreview();

        try {
            // Create preview edge
            BRepBuilderAPI_MakeEdge edgeMaker(m_firstPoint, currentPoint);
            if (edgeMaker.IsDone()) {
                TopoDS_Edge edge = edgeMaker.Edge();
                m_previewShape = new AIS_Shape(edge);

                // Set preview appearance
                m_previewShape->SetColor(Quantity_Color(0.0, 0.8, 0.8, Quantity_TOC_RGB));
                m_previewShape->SetWidth(2.0);
                m_previewShape->SetTransparency(0.3);

                // Display preview
                Handle(AIS_InteractiveContext) context = m_viewerManager->context();
                context->Display(m_previewShape, Standard_False);
                context->UpdateCurrentViewer();
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating preview:" << ex.GetMessageString();
        }
    }

    void TyrexLineCommand::cleanupPreview()
    {
        if (!m_previewShape.IsNull() && m_viewerManager && m_viewerManager->context()) {
            Handle(AIS_InteractiveContext) context = m_viewerManager->context();
            context->Remove(m_previewShape, Standard_False);
            context->UpdateCurrentViewer();
            m_previewShape.Nullify();
        }
    }

} // namespace TyrexCAD