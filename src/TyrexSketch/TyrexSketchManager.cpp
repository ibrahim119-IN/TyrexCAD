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
#include "TyrexRendering/TyrexViewerManager.h"

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
#include <ElSLib.hxx>
#include <Graphic3d_Camera.hxx>

// Qt includes
#include <QDebug>
#include <cmath>

namespace TyrexCAD {

    TyrexSketchManager::TyrexSketchManager(
        const Handle(AIS_InteractiveContext)& context,
        TyrexViewerManager* viewerManager,
        QObject* parent)
        : QObject(parent)
        , m_context(context)
        , m_viewerManager(viewerManager)
        , m_isInSketchMode(false)
        , m_sketchPlane(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1))  // Default XY plane
        , m_currentMode(InteractionMode::None)
        , m_isDragging(false)
        , m_lastMousePos(0, 0)
        , m_draggedEntity(nullptr)
        , m_dragStartPosition(0, 0)
    {
        // Initialize empty control point for dragging
        m_draggedControlPoint.entity = nullptr;
        m_draggedControlPoint.type = ControlPointType::Endpoint;
        m_draggedControlPoint.index = -1;
        m_draggedControlPoint.position = gp_Pnt2d(0, 0);

        qDebug() << "TyrexSketchManager created";
    }

    TyrexSketchManager::~TyrexSketchManager()
    {
        // Clean up control point visuals
        hideControlPoints();

        // Clear all highlights
        for (auto highlight : m_highlightObjects) {
            if (!highlight.IsNull() && !m_context.IsNull()) {
                m_context->Remove(highlight, Standard_False);
            }
        }
        m_highlightObjects.clear();

        if (!m_context.IsNull()) {
            m_context->UpdateCurrentViewer();
        }

        qDebug() << "TyrexSketchManager destroyed";
    }

    void TyrexSketchManager::setSketchPlane(const gp_Pln& plane)
    {
        m_sketchPlane = plane;
        qDebug() << "Sketch plane updated";
    }

    const gp_Pln& TyrexSketchManager::sketchPlane() const
    {
        return m_sketchPlane;
    }

    void TyrexSketchManager::enterSketchMode()
    {
        if (m_isInSketchMode) {
            return; // Already in sketch mode
        }

        m_isInSketchMode = true;
        m_currentMode = InteractionMode::ObjectSelect;

        // Set up view for sketch mode with 2D orthographic projection
        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            Handle(V3d_View) view = m_viewerManager->view();

            // Change background color to indicate sketch mode
            view->SetBackgroundColor(Quantity_Color(0.95, 0.95, 0.98, Quantity_TOC_RGB)); // Light blue-gray

            // Set view to 2D mode using viewer manager
            m_viewerManager->set2DMode();

            qDebug() << "Sketch mode: Set 2D orthographic projection";
        }

        // Clear any existing selections
        clearSelection();

        // Update context display settings for sketch mode
        if (!m_context.IsNull()) {
            // Set display mode to wireframe for better sketch visibility
            m_context->SetDisplayMode(AIS_WireFrame, Standard_False);
            m_context->UpdateCurrentViewer();
        }

        emit sketchModeEntered();
        qDebug() << "Entered sketch mode with 2D view";
    }

    void TyrexSketchManager::exitSketchMode()
    {
        if (!m_isInSketchMode) {
            return; // Not in sketch mode
        }

        // End any active drag operations
        if (m_isDragging) {
            endDrag();
        }

        // Hide control points and clear selections
        hideControlPoints();
        clearSelection();

        // Restore normal view settings
        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            Handle(V3d_View) view = m_viewerManager->view();

            // Restore original background color
            view->SetBackgroundColor(Quantity_NOC_DARKSLATEGRAY);

            // Set view back to 3D mode using viewer manager
            m_viewerManager->set3DMode();

            qDebug() << "Sketch mode: Restored 3D perspective projection";
        }

        // Restore normal display mode
        if (!m_context.IsNull()) {
            m_context->SetDisplayMode(AIS_Shaded, Standard_False);
            m_context->UpdateCurrentViewer();
        }

        m_isInSketchMode = false;
        m_currentMode = InteractionMode::None;

        emit sketchModeExited();
        qDebug() << "Exited sketch mode and restored 3D view";
    }

    bool TyrexSketchManager::isInSketchMode() const
    {
        return m_isInSketchMode;
    }

    void TyrexSketchManager::addSketchEntity(std::shared_ptr<TyrexSketchEntity> entity)
    {
        if (!entity) {
            qWarning() << "Attempted to add null sketch entity";
            return;
        }

        // Check if entity with same ID already exists
        if (m_entityMap.find(entity->getId()) != m_entityMap.end()) {
            qWarning() << "Sketch entity with ID" << QString::fromStdString(entity->getId())
                << "already exists";
            return;
        }

        // Add to collections
        m_sketchEntities.push_back(entity);
        m_entityMap[entity->getId()] = entity;

        // Draw the entity if context is available and we're in sketch mode
        if (!m_context.IsNull() && m_isInSketchMode) {
            entity->draw(m_context, entity->isSelected());
            m_context->UpdateCurrentViewer();
        }

        qDebug() << "Added sketch entity:" << QString::fromStdString(entity->getId());
    }

    void TyrexSketchManager::removeSketchEntity(const std::string& entityId)
    {
        auto it = m_entityMap.find(entityId);
        if (it == m_entityMap.end()) {
            qWarning() << "Sketch entity with ID" << QString::fromStdString(entityId)
                << "not found";
            return;
        }

        auto entity = it->second;

        // Remove from display
        if (!m_context.IsNull()) {
            entity->undraw(m_context);
            m_context->UpdateCurrentViewer();
        }

        // Remove from collections
        m_entityMap.erase(it);
        m_sketchEntities.erase(
            std::remove(m_sketchEntities.begin(), m_sketchEntities.end(), entity),
            m_sketchEntities.end()
        );

        // Remove from selection if selected
        m_selectedEntities.erase(
            std::remove(m_selectedEntities.begin(), m_selectedEntities.end(), entity),
            m_selectedEntities.end()
        );

        qDebug() << "Removed sketch entity:" << QString::fromStdString(entityId);
    }

    std::vector<std::shared_ptr<TyrexSketchEntity>> TyrexSketchManager::getSketchEntities() const
    {
        return m_sketchEntities;
    }

    std::shared_ptr<TyrexSketchEntity> TyrexSketchManager::findSketchEntity(const std::string& entityId) const
    {
        auto it = m_entityMap.find(entityId);
        if (it != m_entityMap.end()) {
            return it->second;
        }
        return nullptr;
    }

    gp_Pnt2d TyrexSketchManager::screenToSketch(const QPoint& screenPoint) const
    {
        if (!m_viewerManager) {
            qWarning() << "Cannot convert screen to sketch - no viewer manager";
            return gp_Pnt2d(0, 0);
        }

        try {
            // Get the OpenCascade view
            Handle(V3d_View) view = m_viewerManager->view();
            if (view.IsNull()) {
                qWarning() << "Cannot convert screen to sketch - no view available";
                return gp_Pnt2d(0, 0);
            }

            // Convert screen position to view coordinates
            Standard_Real xv, yv, zv;
            view->Convert(screenPoint.x(), screenPoint.y(), xv, yv, zv);

            // In orthographic 2D mode, we can directly use the view coordinates
            // The sketch plane is the XY plane (Z=0)
            gp_Pnt sketchPoint3D(xv, yv, 0.0);

            // Project the 3D point onto our sketch plane to get 2D coordinates
            Standard_Real u, v;
            ElSLib::Parameters(m_sketchPlane, sketchPoint3D, u, v);

            return gp_Pnt2d(u, v);
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "OpenCascade error in screenToSketch:" << ex.GetMessageString();

            // Fallback to viewer manager conversion
            gp_Pnt worldPoint = m_viewerManager->screenToModel(screenPoint);
            Standard_Real u, v;
            ElSLib::Parameters(m_sketchPlane, worldPoint, u, v);
            return gp_Pnt2d(u, v);
        }
        catch (...) {
            qWarning() << "Unknown error in screenToSketch";
            return gp_Pnt2d(0, 0);
        }
    }

    gp_Pnt TyrexSketchManager::sketchToWorld(const gp_Pnt2d& sketchPoint) const
    {
        // Convert 2D sketch coordinates to 3D world coordinates
        return ElSLib::Value(sketchPoint.X(), sketchPoint.Y(), m_sketchPlane);
    }

    bool TyrexSketchManager::onMousePress(const QPoint& screenPos)
    {
        if (!m_isInSketchMode) {
            return false;
        }

        m_lastMousePos = screenPos;
        gp_Pnt2d sketchPos = screenToSketch(screenPos);

        // Check for control point selection first
        ControlPoint controlPoint = findControlPointAt(screenPos);
        if (controlPoint.entity != nullptr) {
            // Start dragging control point
            beginDrag(nullptr, controlPoint, sketchPos);
            m_currentMode = InteractionMode::DragPoint;
            return true;
        }

        // Check for entity selection
        auto entity = findEntityAt(screenPos);
        if (entity) {
            // Select entity
            clearSelection();
            m_selectedEntities.push_back(entity);
            entity->setSelected(true);

            // Update visuals
            updateSelectionVisuals();
            showControlPoints();

            // Start dragging entity
            beginDrag(entity, ControlPoint(), sketchPos);
            m_currentMode = InteractionMode::DragObject;

            emit entitySelected(entity->getId());

            if (!m_context.IsNull()) {
                m_context->UpdateCurrentViewer();
            }

            return true;
        }

        // No entity selected, clear selection
        clearSelection();
        return false;
    }

    bool TyrexSketchManager::onMouseMove(const QPoint& screenPos)
    {
        if (!m_isInSketchMode) {
            return false;
        }

        gp_Pnt2d sketchPos = screenToSketch(screenPos);

        if (m_isDragging) {
            // Handle drag operation
            if (m_currentMode == InteractionMode::DragObject && m_draggedEntity) {
                updateEntityDrag(m_draggedEntity, sketchPos);
            }
            else if (m_currentMode == InteractionMode::DragPoint && m_draggedControlPoint.entity) {
                updateControlPointDrag(m_draggedControlPoint, sketchPos);
            }

            if (!m_context.IsNull()) {
                m_context->UpdateCurrentViewer();
            }

            m_lastMousePos = screenPos;
            return true;
        }

        // Handle hover highlighting
        auto entity = findEntityAt(screenPos);
        if (entity) {
            highlightEntity(entity);
        }
        else {
            // Clear highlights
            for (auto& e : m_sketchEntities) {
                unhighlightEntity(e);
            }
        }

        m_lastMousePos = screenPos;
        return false;
    }

    bool TyrexSketchManager::onMouseRelease(const QPoint& screenPos)
    {
        if (!m_isInSketchMode) {
            return false;
        }

        if (m_isDragging) {
            // End drag operation
            endDrag();

            if (!m_context.IsNull()) {
                m_context->UpdateCurrentViewer();
            }

            return true;
        }

        return false;
    }

    bool TyrexSketchManager::selectEntityAt(const QPoint& screenPos)
    {
        auto entity = findEntityAt(screenPos);
        if (entity) {
            clearSelection();
            m_selectedEntities.push_back(entity);
            entity->setSelected(true);
            updateSelectionVisuals();
            showControlPoints();
            emit entitySelected(entity->getId());
            return true;
        }
        return false;
    }

    void TyrexSketchManager::clearSelection()
    {
        for (auto& entity : m_selectedEntities) {
            entity->setSelected(false);
        }
        m_selectedEntities.clear();
        hideControlPoints();
        updateSelectionVisuals();
        emit selectionCleared();
    }

    std::vector<std::shared_ptr<TyrexSketchEntity>> TyrexSketchManager::getSelectedEntities() const
    {
        return m_selectedEntities;
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

    TyrexSketchManager::ControlPoint TyrexSketchManager::findControlPointAt(
        const QPoint& screenPos, double tolerance) const
    {
        ControlPoint result;
        result.entity = nullptr;

        gp_Pnt2d screenSketch = screenToSketch(screenPos);

        for (auto& entity : m_selectedEntities) {
            auto controlPoints = getControlPoints(entity);

            for (const auto& cp : controlPoints) {
                double distance = cp.position.Distance(screenSketch);
                if (distance <= tolerance) {
                    return cp;
                }
            }
        }

        return result;
    }

    void TyrexSketchManager::updateEntityDrag(std::shared_ptr<TyrexSketchEntity> entity,
        const gp_Pnt2d& newPosition)
    {
        if (!entity) {
            return;
        }

        // Calculate offset from drag start
        gp_Pnt2d offset(newPosition.X() - m_dragStartPosition.X(),
            newPosition.Y() - m_dragStartPosition.Y());

        // Move entity by offset
        entity->moveBy(offset);
        entity->updateShape();

        // Update drag start position for next frame
        m_dragStartPosition = newPosition;

        // Redraw entity
        if (!m_context.IsNull()) {
            entity->draw(m_context, entity->isSelected());
        }

        // Update control points
        updateSelectionVisuals();

        emit entityModified(entity->getId());
    }

    void TyrexSketchManager::updateControlPointDrag(const ControlPoint& controlPoint,
        const gp_Pnt2d& newPosition)
    {
        if (!controlPoint.entity) {
            return;
        }

        // Set the new position for the control point
        controlPoint.entity->setControlPoint(controlPoint.index, newPosition);
        controlPoint.entity->updateShape();

        // Redraw entity
        if (!m_context.IsNull()) {
            controlPoint.entity->draw(m_context, controlPoint.entity->isSelected());
        }

        // Update control points
        updateSelectionVisuals();

        emit entityModified(controlPoint.entity->getId());
    }

    void TyrexSketchManager::redrawSketch()
    {
        if (m_context.IsNull()) {
            return;
        }

        // Redraw all entities
        for (auto& entity : m_sketchEntities) {
            entity->draw(m_context, entity->isSelected());
        }

        // Redraw control points if in sketch mode
        if (m_isInSketchMode) {
            showControlPoints();
        }

        m_context->UpdateCurrentViewer();
    }

    Handle(AIS_InteractiveContext) TyrexSketchManager::context() const
    {
        return m_context;
    }

    void TyrexSketchManager::updateSelectionVisuals()
    {
        if (m_context.IsNull()) {
            return;
        }

        // Update entity visuals
        for (auto& entity : m_sketchEntities) {
            entity->draw(m_context, entity->isSelected());
        }
    }

    void TyrexSketchManager::showControlPoints()
    {
        if (m_context.IsNull()) {
            return;
        }

        // Hide existing control points
        hideControlPoints();

        // Show control points for selected entities
        for (auto& entity : m_selectedEntities) {
            auto controlPoints = getControlPoints(entity);

            for (const auto& cp : controlPoints) {
                auto visual = createControlPointVisual(cp);
                if (!visual.IsNull()) {
                    m_controlPointObjects.push_back(visual);
                    m_context->Display(visual, Standard_False);
                }
            }
        }

        m_context->UpdateCurrentViewer();
    }

    void TyrexSketchManager::hideControlPoints()
    {
        if (m_context.IsNull()) {
            return;
        }

        // Remove all control point visuals
        for (auto& visual : m_controlPointObjects) {
            if (!visual.IsNull()) {
                m_context->Remove(visual, Standard_False);
            }
        }
        m_controlPointObjects.clear();

        m_context->UpdateCurrentViewer();
    }

    Handle(AIS_InteractiveObject) TyrexSketchManager::createControlPointVisual(const ControlPoint& point)
    {
        if (!point.entity) {
            return Handle(AIS_InteractiveObject)();
        }

        // Convert 2D point to 3D
        gp_Pnt worldPoint = sketchToWorld(point.position);

        // Create a geometric point
        Handle(Geom_CartesianPoint) geomPoint = new Geom_CartesianPoint(worldPoint);
        Handle(AIS_Point) aisPoint = new AIS_Point(geomPoint);

        // Set appearance based on control point type
        Quantity_Color pointColor = (point.type == ControlPointType::Endpoint) ?
            Quantity_NOC_YELLOW : Quantity_NOC_CYAN;

        Handle(Prs3d_PointAspect) pointAspect = new Prs3d_PointAspect(
            Aspect_TOM_STAR, pointColor, 10.0);

        aisPoint->Attributes()->SetPointAspect(pointAspect);

        return aisPoint;
    }

    void TyrexSketchManager::highlightEntity(std::shared_ptr<TyrexSketchEntity> entity)
    {
        if (!entity || entity->isHighlighted()) {
            return;
        }

        entity->setHighlighted(true);

        if (!m_context.IsNull()) {
            entity->draw(m_context, entity->isSelected());
        }
    }

    void TyrexSketchManager::unhighlightEntity(std::shared_ptr<TyrexSketchEntity> entity)
    {
        if (!entity || !entity->isHighlighted()) {
            return;
        }

        entity->setHighlighted(false);

        if (!m_context.IsNull()) {
            entity->draw(m_context, entity->isSelected());
        }
    }

    std::shared_ptr<TyrexSketchEntity> TyrexSketchManager::findEntityAt(
        const QPoint& screenPos, double tolerance) const
    {
        gp_Pnt2d sketchPos = screenToSketch(screenPos);

        for (auto& entity : m_sketchEntities) {
            if (entity->isNearPoint(sketchPos, tolerance)) {
                return entity;
            }
        }

        return nullptr;
    }

    void TyrexSketchManager::beginDrag(std::shared_ptr<TyrexSketchEntity> entity,
        const ControlPoint& controlPoint,
        const gp_Pnt2d& startPos)
    {
        m_isDragging = true;
        m_draggedEntity = entity;
        m_draggedControlPoint = controlPoint;
        m_dragStartPosition = startPos;
    }

    void TyrexSketchManager::endDrag()
    {
        if (!m_isDragging) {
            return;
        }

        m_isDragging = false;
        m_draggedEntity = nullptr;
        m_draggedControlPoint.entity = nullptr;
        m_currentMode = InteractionMode::ObjectSelect;

        // Update control points after drag
        showControlPoints();
    }

} // namespace TyrexCAD