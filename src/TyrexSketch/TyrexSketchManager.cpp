/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexSketch/TyrexSketchEntity.h"
#include "TyrexSketch/TyrexSketchLineEntity.h"
#include "TyrexSketch/TyrexSketchCircleEntity.h"
#include "TyrexSketch/TyrexSketchConfig.h"
#include "TyrexSketch/TyrexSketchDisplayHelper.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"

// OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <AIS_InteractiveContext.hxx>
#include <V3d_View.hxx>
#include <gp_Pln.hxx>
#include <gp_Ax3.hxx>
#include <gp_Dir.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <AIS_Point.hxx>
#include <Geom_CartesianPoint.hxx>
#include <Quantity_Color.hxx>
#include <Quantity_NameOfColor.hxx>
#include <Prs3d_PointAspect.hxx>
#include <Prs3d_LineAspect.hxx>
#include <Prs3d_Drawer.hxx>
#include <ElSLib.hxx>
#include <Graphic3d_Camera.hxx>
#include <AIS_Shape.hxx>
#include <Aspect_TypeOfLine.hxx>
#include <Aspect_TypeOfMarker.hxx>

// Qt includes
#include <QDebug>
#include <QTimer>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace TyrexCAD {

    TyrexSketchManager::TyrexSketchManager(const Handle(AIS_InteractiveContext)& context, TyrexViewerManager* viewerManager, QObject* parent)
        : QObject(parent), m_viewerManager(viewerManager) {}

    TyrexSketchManager::~TyrexSketchManager() = default;

    gp_Pnt2d TyrexSketchManager::screenToSketch(const QPoint& screenPoint) const
    {
        if (!m_viewerManager) {
            qWarning() << "Cannot convert screen to sketch - no viewer manager";
            return gp_Pnt2d(0, 0);
        }

        try {
            Handle(V3d_View) view = m_viewerManager->view();
            if (view.IsNull()) {
                qWarning() << "Cannot convert screen to sketch - no view available";
                return gp_Pnt2d(0, 0);
            }

            // Use improved 2D conversion
            Standard_Real xv, yv, zv;
            view->Convert(screenPoint.x(), screenPoint.y(), xv, yv, zv);
            gp_Pnt converted3DPoint(xv, yv, zv);

            // Convert from 3D to 2D sketch coordinates
            Standard_Real u, v;
            ElSLib::Parameters(m_sketchPlane, converted3DPoint, u, v);
            gp_Pnt2d result(u, v);

            // Apply grid snapping if enabled
            if (m_canvasOverlay && m_canvasOverlay->isGridVisible() && m_sketchConfig.grid.snapEnabled) {
                result = m_canvasOverlay->snapToGrid(result);
            }

            // Apply ortho mode if enabled
            if (m_sketchConfig.interaction.orthoMode && m_firstPointSet) {
                result = applyOrthoMode(result);
            }

            return result;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "OpenCascade error in screenToSketch:" << ex.GetMessageString();
            return gp_Pnt2d(0, 0);
        }
    }

    gp_Pnt TyrexSketchManager::sketchToWorld(const gp_Pnt2d& sketchPoint) const
    {
        // Convert 2D sketch coordinates to 3D world coordinates
        return ElSLib::Value(sketchPoint.X(), sketchPoint.Y(), m_sketchPlane);
    }

    std::vector<TyrexSketchManager::ControlPoint> TyrexSketchManager::getControlPoints(
        std::shared_ptr<TyrexSketchEntity> entity) const
    {
        std::vector<ControlPoint> controlPoints;

        if (!entity) {
            return controlPoints;
        }

        auto points = entity->getControlPoints();

        for (int i = 0; i < static_cast<int>(points.size()); ++i) {
            ControlPoint cp;
            cp.entity = entity;
            cp.index = i;
            cp.position = points[i];

            // Determine control point type based on entity type and index
            if (entity->getType() == SketchEntityType::Line) {
                cp.type = ControlPointType::Endpoint;
            }
            else if (entity->getType() == SketchEntityType::Circle) {
                cp.type = (i == 0) ? ControlPointType::Endpoint : ControlPointType::RadiusPoint;
            }

            controlPoints.push_back(cp);
        }

        return controlPoints;
    }

    Handle(AIS_InteractiveObject) TyrexSketchManager::createControlPointVisual(const ControlPoint& pointData)
    {
        if (!pointData.entity) {
            return Handle(AIS_InteractiveObject)();
        }

        try {
            // Convert 2D point to 3D
            gp_Pnt worldPoint = sketchToWorld(pointData.position);

            // Create a geometric point
            Handle(Geom_CartesianPoint) geomPoint = new Geom_CartesianPoint(worldPoint);
            Handle(AIS_Point) aisPoint = new AIS_Point(geomPoint);

            // Set appearance based on control point type
            Quantity_Color pointColor = Quantity_NOC_YELLOW;
            Aspect_TypeOfMarker markerType = Aspect_TOM_O_STAR;

            switch (pointData.type) {
            case ControlPointType::Endpoint:
                pointColor = Quantity_NOC_RED;
                markerType = Aspect_TOM_O_POINT;
                break;
            case ControlPointType::Midpoint:
                pointColor = Quantity_NOC_GREEN;
                markerType = Aspect_TOM_O_PLUS;
                break;
            case ControlPointType::RadiusPoint:
                pointColor = Quantity_NOC_CYAN1;
                markerType = Aspect_TOM_O_STAR;
                break;
            }

            // Create PointAspect properly
            Handle(Prs3d_PointAspect) pointAspect = new Prs3d_PointAspect(
                markerType,
                pointColor,
                10.0  // Point size
            );

            // Apply properties
            Handle(Prs3d_Drawer) drawer = aisPoint->Attributes();
            if (drawer.IsNull()) {
                drawer = new Prs3d_Drawer();
                aisPoint->SetAttributes(drawer);
            }
            drawer->SetPointAspect(pointAspect);
            aisPoint->SetToUpdate();

            return aisPoint;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error creating control point visual:" << ex.GetMessageString();
            return Handle(AIS_InteractiveObject)();
        }
        catch (...) {
            qWarning() << "Unknown error creating control point visual";
            return Handle(AIS_InteractiveObject)();
        }
    }

    void TyrexSketchManager::drawSketchEntity(std::shared_ptr<TyrexSketchEntity> entity)
    {
        if (!entity || m_context.IsNull()) return;

        try {
            // Apply entity styling based on configuration
            Handle(AIS_Shape) shape = entity->getAISShape();
            if (!shape.IsNull()) {
                // Determine color and width based on entity state
                Quantity_Color entityColor;
                Standard_Real lineWidth;

                if (entity->isSelected()) {
                    entityColor = m_sketchConfig.canvas.selectionColor;
                    lineWidth = m_sketchConfig.entityDisplay.selectedLineWidth;
                }
                else if (entity->isHighlighted()) {
                    entityColor = m_sketchConfig.canvas.highlightColor;
                    lineWidth = m_sketchConfig.entityDisplay.selectedLineWidth;
                }
                else {
                    entityColor = m_sketchConfig.entityDisplay.defaultLineColor;
                    lineWidth = m_sketchConfig.entityDisplay.defaultLineWidth;
                }

                // Apply color to shape
                shape->SetColor(entityColor);

                // Create LineAspect properly
                Handle(Prs3d_LineAspect) lineAspect = new Prs3d_LineAspect(
                    entityColor, Aspect_TOL_SOLID, lineWidth);

                // Apply properties to shape
                Handle(Prs3d_Drawer) drawer = shape->Attributes();
                if (drawer.IsNull()) {
                    drawer = new Prs3d_Drawer();
                    shape->SetAttributes(drawer);
                }
                drawer->SetLineAspect(lineAspect);
                shape->SetToUpdate();
            }

            entity->draw(m_context, entity->isSelected());
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error drawing sketch entity:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error drawing sketch entity";
        }
    }

    bool TyrexSketchManager::onMousePress(const QPoint& screenPos) {
        // TODO: implement logic
        return false;
    }

    void TyrexSketchManager::removeSketchEntity(const std::string&) {}

    bool TyrexSketchManager::onMouseMove(const QPoint&) { return false; }

    bool TyrexSketchManager::onMouseRelease(const QPoint&) { return false; }

    void TyrexSketchManager::clearSelection() {}

    std::vector<std::shared_ptr<TyrexSketchEntity>> TyrexSketchManager::getSelectedEntities() const { return {}; }

    const gp_Pln& TyrexSketchManager::sketchPlane() const { static gp_Pln dummy; return dummy; }

    Handle(AIS_InteractiveContext) TyrexSketchManager::context() const { return Handle(AIS_InteractiveContext)(); }

    gp_Pnt2d TyrexSketchManager::applyOrthoMode(const gp_Pnt2d& p) const { return p; }

    void TyrexSketchManager::enterSketchMode() {}

    void TyrexSketchManager::exitSketchMode() {}

    bool TyrexSketchManager::isInSketchMode() const { return false; }

} // namespace TyrexCAD