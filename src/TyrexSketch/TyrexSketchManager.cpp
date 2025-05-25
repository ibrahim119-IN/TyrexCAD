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
        : QObject(parent), 
          m_viewerManager(viewerManager),
          m_isInSketchMode(false),
          m_sketchPlane(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)),
          m_currentMode(InteractionMode::ObjectSelect),
          m_isDraggingEntity(false),
          m_firstPointSet(false)
    {
        // Store context for interaction
        m_context = context;
        
        // Configure canvas overlay for grid
        if (m_viewerManager) {
            m_canvasOverlay = m_viewerManager->view().IsNull() ? nullptr : 
                std::make_unique<TyrexCanvasOverlay>(context, m_viewerManager->view(), this);
        }
    }

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
        if (!m_isInSketchMode || !m_viewerManager) {
            return false;
        }

        try {
            // Convert screen position to sketch coordinates
            gp_Pnt2d sketchPoint = screenToSketch(screenPos);
            
            // If we have an active command, forward the event to it
            if (m_activeCommand) {
                m_activeCommand->onMousePress(sketchPoint);
                return true;
            }
            
            // Otherwise check for entity selection
            // Find entity under cursor
            Handle(AIS_InteractiveContext) ctx = context();
            if (!ctx.IsNull()) {
                ctx->MoveTo(screenPos.x(), screenPos.y(), m_viewerManager->view(), Standard_True);
                
                // Try to select entity
                ctx->Select(Standard_True);
                
                // See if anything was selected
                if (ctx->NbSelected() > 0) {
                    AIS_ListOfInteractive selected;
                    ctx->SelectedObjects(selected);
                    
                    // Process selected entities
                    for (const Handle(AIS_InteractiveObject)& obj : selected) {
                        // Check if this is one of our sketch entities
                        for (auto& entity : m_sketchEntities) {
                            if (entity->getAISShape() == obj) {
                                // Found a sketch entity to select
                                selectEntity(entity);
                                m_entityUnderCursor = entity;
                                m_lastCursorPos = screenPos;
                                return true;
                            }
                        }
                    }
                }
            }
            
            // If we reach here, nothing was found to select
            clearSelection();
            m_entityUnderCursor.reset();
            m_lastCursorPos = screenPos;
            return true;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in sketch mouse press:" << ex.GetMessageString();
            return false;
        }
        catch (...) {
            qWarning() << "Unknown error in sketch mouse press";
            return false;
        }
    }

    void TyrexSketchManager::removeSketchEntity(const std::string& entityId) {
        // Find the entity by ID
        auto it = std::find_if(m_sketchEntities.begin(), m_sketchEntities.end(),
            [&entityId](const std::shared_ptr<TyrexSketchEntity>& entity) {
                return entity && entity->getId() == entityId;
            });

        if (it != m_sketchEntities.end()) {
            // If entity is selected, clear selection first
            if ((*it)->isSelected()) {
                clearSelection();
            }
            
            // Remove entity from AIS context
            Handle(AIS_InteractiveContext) ctx = context();
            if (!ctx.IsNull()) {
                Handle(AIS_Shape) shape = (*it)->getAISShape();
                if (!shape.IsNull()) {
                    ctx->Remove(shape, Standard_True);
                }
            }
            
            // Remove from entity list
            m_sketchEntities.erase(it);
            
            // Notify that the entity was removed
            emit entityRemoved(entityId);
        }
    }
    
    void TyrexSketchManager::selectEntity(std::shared_ptr<TyrexSketchEntity> entity) {
        if (!entity) return;
        
        // Clear previous selection
        clearSelection();
        
        // Set the entity as selected
        entity->setSelected(true);
        
        // Add to selected entities list
        m_selectedEntities.push_back(entity);
        
        // Redraw with selected state
        drawSketchEntity(entity);
        
        // Show control points
        showControlPoints(entity);
        
        // Notify about selection
        emit entitySelected(entity->getId());
    }
    
    void TyrexSketchManager::drawAllEntities() {
        for (auto& entity : m_sketchEntities) {
            if (entity) {
                drawSketchEntity(entity);
            }
        }
    }
    
    void TyrexSketchManager::hideAllEntities() {
        Handle(AIS_InteractiveContext) ctx = context();
        if (ctx.IsNull()) return;
        
        for (auto& entity : m_sketchEntities) {
            if (entity) {
                Handle(AIS_Shape) shape = entity->getAISShape();
                if (!shape.IsNull()) {
                    ctx->Erase(shape, Standard_False);
                }
            }
        }
        
        // Update display
        ctx->UpdateCurrentViewer();
    }
    
    void TyrexSketchManager::showControlPoints(std::shared_ptr<TyrexSketchEntity> entity) {
        if (!entity) return;
        
        // Hide any existing control points
        hideControlPoints();
        
        // Get control points for the entity
        std::vector<ControlPoint> controlPoints = getControlPoints(entity);
        
        // Create visuals for each control point
        Handle(AIS_InteractiveContext) ctx = context();
        if (!ctx.IsNull()) {
            for (const auto& cp : controlPoints) {
                Handle(AIS_InteractiveObject) visual = createControlPointVisual(cp);
                if (!visual.IsNull()) {
                    ctx->Display(visual, Standard_False);
                    m_controlPointVisuals.push_back(visual);
                }
            }
            
            // Update display
            ctx->UpdateCurrentViewer();
        }
    }
    
    void TyrexSketchManager::hideControlPoints() {
        Handle(AIS_InteractiveContext) ctx = context();
        if (ctx.IsNull()) return;
        
        for (auto& visual : m_controlPointVisuals) {
            if (!visual.IsNull()) {
                ctx->Erase(visual, Standard_False);
            }
        }
        
        m_controlPointVisuals.clear();
        ctx->UpdateCurrentViewer();
    }

    bool TyrexSketchManager::onMouseMove(const QPoint& screenPos) {
        if (!m_isInSketchMode || !m_viewerManager) {
            return false;
        }

        try {
            // Convert screen position to sketch coordinates
            gp_Pnt2d sketchPoint = screenToSketch(screenPos);
            
            // If we have an active command, forward the event to it
            if (m_activeCommand) {
                m_activeCommand->onMouseMove(sketchPoint);
                return true;
            }
            
            // Handle entity highlighting
            Handle(AIS_InteractiveContext) ctx = context();
            if (!ctx.IsNull()) {
                ctx->MoveTo(screenPos.x(), screenPos.y(), m_viewerManager->view(), Standard_True);
                
                // Update cursor position
                m_lastCursorPos = screenPos;
                
                // Emit cursor position for status display
                emit cursorPositionChanged(sketchPoint.X(), sketchPoint.Y());
                
                return true;
            }
            
            return false;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in sketch mouse move:" << ex.GetMessageString();
            return false;
        }
        catch (...) {
            qWarning() << "Unknown error in sketch mouse move";
            return false;
        }
    }

    bool TyrexSketchManager::onMouseRelease(const QPoint& screenPos) {
        if (!m_isInSketchMode || !m_viewerManager) {
            return false;
        }

        try {
            // Convert screen position to sketch coordinates
            gp_Pnt2d sketchPoint = screenToSketch(screenPos);
            
            // If we have an active command, forward the event to it
            if (m_activeCommand) {
                m_activeCommand->onMouseRelease(sketchPoint);
                return true;
            }
            
            // If we had an entity selected and were dragging it, finalize the move
            if (m_entityUnderCursor && m_isDraggingEntity) {
                // Finalize entity movement
                m_isDraggingEntity = false;
                
                // Notify about modification
                emit entityModified(m_entityUnderCursor->getId());
                
                // Update display
                drawSketchEntity(m_entityUnderCursor);
                
                // Return true to indicate we handled the event
                return true;
            }
            
            return false;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in sketch mouse release:" << ex.GetMessageString();
            return false;
        }
        catch (...) {
            qWarning() << "Unknown error in sketch mouse release";
            return false;
        }
    }

    void TyrexSketchManager::clearSelection() {
        // Clear control points
        hideControlPoints();
        
        // Clear selected state for all entities
        for (auto& entity : m_selectedEntities) {
            if (entity) {
                entity->setSelected(false);
                drawSketchEntity(entity);
            }
        }
        
        // Clear selection list
        m_selectedEntities.clear();
        
        // Notify about clear
        emit selectionCleared();
    }

    std::vector<std::shared_ptr<TyrexSketchEntity>> TyrexSketchManager::getSelectedEntities() const { 
        return m_selectedEntities; 
    }

    const gp_Pln& TyrexSketchManager::sketchPlane() const { 
        return m_sketchPlane; 
    }

    Handle(AIS_InteractiveContext) TyrexSketchManager::context() const {
        if (m_viewerManager) {
            return m_viewerManager->context();
        }
        return Handle(AIS_InteractiveContext)();
    }

    gp_Pnt2d TyrexSketchManager::applyOrthoMode(const gp_Pnt2d& p) const {
        // If not in ortho mode or no first point set, just return the input point
        if (!m_sketchConfig.interaction.orthoMode || !m_firstPointSet) {
            return p;
        }
        
        // Calculate distance in X and Y direction from first point
        double dx = p.X() - m_firstPoint.X();
        double dy = p.Y() - m_firstPoint.Y();
        
        // If movement is primarily horizontal
        if (std::abs(dx) >= std::abs(dy)) {
            // Lock Y coordinate to first point
            return gp_Pnt2d(p.X(), m_firstPoint.Y());
        }
        else {
            // Lock X coordinate to first point
            return gp_Pnt2d(m_firstPoint.X(), p.Y());
        }
    }

    void TyrexSketchManager::enterSketchMode() {
        if (m_isInSketchMode) {
            return; // Already in sketch mode
        }
        
        try {
            // Switch to 2D mode via viewer manager
            if (m_viewerManager) {
                m_viewerManager->set2DMode();
            }
            
            // Setup sketch plane (XY plane by default)
            m_sketchPlane = gp_Pln(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1));
            
            // Initialize sketch state
            m_isInSketchMode = true;
            m_activeCommand = nullptr;
            m_isDraggingEntity = false;
            m_entityUnderCursor.reset();
            
            // Show all sketch entities
            drawAllEntities();
            
            // Configure canvas overlay for sketch mode if available
            if (m_canvasOverlay) {
                GridConfig config = m_canvasOverlay->getGridConfig();
                config.showAxes = true;
                config.showOriginMarker = true;
                config.snapEnabled = true;
                config.showCoordinates = true;
                m_canvasOverlay->setGridConfig(config);
                m_canvasOverlay->setGridVisible(true);
            }
            
            // Notify listeners
            emit sketchModeEntered();
            
            qDebug() << "Entered sketch mode";
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error entering sketch mode:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error entering sketch mode";
        }
    }

    void TyrexSketchManager::exitSketchMode() {
        if (!m_isInSketchMode) {
            return; // Not in sketch mode
        }
        
        try {
            // Cancel any active command
            if (m_activeCommand) {
                m_activeCommand->cancel();
                m_activeCommand = nullptr;
            }
            
            // Clear selection
            clearSelection();
            
            // Hide all sketch entities
            hideAllEntities();
            
            // Reset sketch state
            m_isInSketchMode = false;
            m_entityUnderCursor.reset();
            m_isDraggingEntity = false;
            
            // Switch back to 3D mode via viewer manager
            if (m_viewerManager) {
                m_viewerManager->set3DMode();
            }
            
            // Restore canvas overlay for 3D mode if available
            if (m_canvasOverlay) {
                GridConfig config = m_canvasOverlay->getGridConfig();
                config.showAxes = true;
                config.showOriginMarker = true;
                config.snapEnabled = false;
                m_canvasOverlay->setGridConfig(config);
            }
            
            // Notify listeners
            emit sketchModeExited();
            
            qDebug() << "Exited sketch mode";
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error exiting sketch mode:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error exiting sketch mode";
        }
    }

    bool TyrexSketchManager::isInSketchMode() const { 
        return m_isInSketchMode; 
    }

} // namespace TyrexCAD