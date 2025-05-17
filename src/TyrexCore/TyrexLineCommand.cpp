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

#include <BRepBuilderAPI_MakeEdge.hxx>
#include <TopoDS_Edge.hxx>
#include <Quantity_Color.hxx>
#include <QDebug>

namespace TyrexCAD {

    TyrexLineCommand::TyrexLineCommand(TyrexModelSpace* modelSpace, TyrexViewerManager* viewerManager)
        : TyrexCommand("Line")
        , m_modelSpace(modelSpace)
        , m_viewerManager(viewerManager)
        , m_firstPointSet(false)
    {
    }

    TyrexLineCommand::~TyrexLineCommand()
    {
        // Clean up preview if needed
        if (!m_previewShape.IsNull() && m_viewerManager) {
            m_viewerManager->context()->Remove(m_previewShape, true);
        }
    }

    void TyrexLineCommand::start()
    {
        TyrexCommand::start();

        // Reset state
        m_firstPointSet = false;
        m_previewShape.Nullify();

        qDebug() << "Line command started - click to place first point";
    }

    void TyrexLineCommand::cancel()
    {
        // Clean up preview
        if (!m_previewShape.IsNull() && m_viewerManager) {
            m_viewerManager->context()->Remove(m_previewShape, true);
        }

        TyrexCommand::cancel();
    }

    bool TyrexLineCommand::isFinished() const
    {
        return m_isFinished;
    }

    void TyrexLineCommand::onMousePress(const QPoint& point)
    {
        if (!m_viewerManager) {
            qWarning() << "No viewer manager in line command";
            m_isFinished = true;
            return;
        }

        // Convert screen position to model coordinates
        gp_Pnt modelPoint = m_viewerManager->screenToModel(point);

        if (!m_firstPointSet) {
            // Set first point
            m_firstPoint = modelPoint;
            m_firstPointSet = true;

            qDebug() << "First point set at" << m_firstPoint.X() << "," << m_firstPoint.Y() << "," << m_firstPoint.Z();
            qDebug() << "Click to place second point or press ESC to cancel";
        }
        else {
            // Set second point
            m_secondPoint = modelPoint;

            qDebug() << "Second point set at" << m_secondPoint.X() << "," << m_secondPoint.Y() << "," << m_secondPoint.Z();

            // Create the actual line
            createLine();

            // Command is complete
            m_isFinished = true;
        }
    }

    void TyrexLineCommand::onMouseMove(const QPoint& point)
    {
        if (!m_firstPointSet || !m_viewerManager) {
            return;
        }

        // Convert screen position to model coordinates
        gp_Pnt currentPoint = m_viewerManager->screenToModel(point);

        // Create or update the preview
        if (m_previewShape.IsNull()) {
            // Create a new preview edge
            TopoDS_Edge edge = BRepBuilderAPI_MakeEdge(m_firstPoint, currentPoint);
            m_previewShape = new AIS_Shape(edge);

            // Set preview appearance (dashed red line)
            m_previewShape->SetColor(Quantity_NOC_RED);
            m_previewShape->SetWidth(2.0);

            // Display the preview
            m_viewerManager->context()->Display(m_previewShape, true);
        }
        else {
            // Update the preview edge
            TopoDS_Edge edge = BRepBuilderAPI_MakeEdge(m_firstPoint, currentPoint);
            m_previewShape->Set(edge);

            // Update display
            m_viewerManager->context()->Redisplay(m_previewShape, true);
        }
    }

    void TyrexLineCommand::onMouseRelease(const QPoint& /*point*/)
    {
        // No specific action needed on release
    }

    void TyrexLineCommand::createLine()
    {
        if (!m_modelSpace) {
            qWarning() << "Cannot create line - model space is null";
            return;
        }

        // Remove preview
        if (!m_previewShape.IsNull() && m_viewerManager) {
            m_viewerManager->context()->Remove(m_previewShape, true);
        }

        // Create a unique ID for the line
        static int lineCount = 0;
        std::string lineId = "line_" + std::to_string(++lineCount);

        // Create line entity
        auto lineEntity = std::make_shared<TyrexLineEntity>(
            lineId,
            "default",
            Quantity_Color(0.0, 0.0, 1.0, Quantity_TOC_RGB), // Blue color
            m_firstPoint,
            m_secondPoint
        );

        // Add to model space
        m_modelSpace->addEntity(lineEntity);

        qDebug() << "Created line entity with ID:" << QString::fromStdString(lineId);
    }

} // namespace TyrexCAD