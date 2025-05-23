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
#include "TyrexSketch/TyrexSketchConfig.h"           // NEW INCLUDE
#include "TyrexSketch/TyrexSketchDisplayHelper.h"     // NEW INCLUDE
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
#include <Prs3d_Drawer.hxx>
#include <ElSLib.hxx>
#include <Graphic3d_Camera.hxx>

// Qt includes
#include <QDebug>
#include <QTimer>
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

        // Initialize canvas overlay
        m_canvasOverlay = std::make_unique<TyrexCanvasOverlay>(m_context,
            m_viewerManager ? m_viewerManager->view() : nullptr, this);

        // Connect overlay signals
        connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridSpacingChanged,
            this, [this](double spacing) {
                qDebug() << "Grid spacing changed to:" << spacing;
            });

        // Connect to viewer manager signals if available
        if (m_viewerManager) {
            connect(m_viewerManager, &TyrexViewerManager::viewChanged,
                this, [this]() {
                    if (m_canvasOverlay && m_isInSketchMode) {
                        m_canvasOverlay->update();
                    }
                });
        }

        // Initialize sketch configuration
        m_sketchConfig = TyrexSketchConfig::autocadConfig();

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
            return;
        }

        m_isInSketchMode = true;
        m_currentMode = InteractionMode::ObjectSelect;

        // CRITICAL FIX 1: Set view BEFORE configuring overlay
        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            Handle(V3d_View) view = m_viewerManager->view();

            // Set black background first
            view->SetBackgroundColor(Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB));

            // CRITICAL FIX 2: Ensure window is mapped before operations
            if (!view->Window().IsNull()) {
                view->Window()->Map();
            }

            // Set to exact top view with proper camera setup
            view->SetProj(V3d_Zpos);

            // CRITICAL FIX 3: Set camera to orthographic mode properly
            Handle(Graphic3d_Camera) camera = view->Camera();
            if (!camera.IsNull()) {
                // Save current view bounds
                Standard_Real xmin, ymin, xmax, ymax;
                view->WindowFit(xmin, ymin, xmax, ymax);

                // Set orthographic with proper aspect ratio
                camera->SetProjectionType(Graphic3d_Camera::Projection_Orthographic);
                camera->SetZFocus(Graphic3d_Camera::FocusType_Absolute, 0.0);

                // Reset camera orientation for true 2D
                camera->SetUp(gp_Dir(0, 1, 0));
                camera->SetDirection(gp_Dir(0, 0, -1));

                // Apply the camera changes
                view->SetCamera(camera);
            }

            // CRITICAL FIX 4: Configure rendering for 2D
            Graphic3d_RenderingParams& params = view->ChangeRenderingParams();
            params.Method = Graphic3d_RM_RASTERIZATION;
            params.IsAntialiasingEnabled = Standard_True;
            params.NbMsaaSamples = 4;
            params.IsShadowEnabled = Standard_False;
            params.IsReflectionEnabled = Standard_False;
            params.IsTransparentShadowEnabled = Standard_False;

            // Apply optimal 2D rendering settings
            TyrexSketchDisplayHelper::setupOptimal2DRendering(view);

            // CRITICAL FIX 5: Update view before creating overlay
            view->MustBeResized();
            view->FitAll(0.01, Standard_False);
            view->Update();

            // Configure selection and highlight styles
            Handle(Prs3d_Drawer) selectionStyle = new Prs3d_Drawer();
            selectionStyle->SetColor(m_sketchConfig.canvas.selectionColor);
            selectionStyle->SetDisplayMode(1);
            selectionStyle->LineAspect()->SetWidth(m_sketchConfig.entityDisplay.selectedLineWidth);
            m_context->SetSelectionStyle(selectionStyle);

            Handle(Prs3d_Drawer) highlightStyle = new Prs3d_Drawer();
            highlightStyle->SetColor(m_sketchConfig.canvas.highlightColor);
            highlightStyle->SetDisplayMode(1);
            highlightStyle->LineAspect()->SetWidth(m_sketchConfig.entityDisplay.selectedLineWidth);
            m_context->SetHighlightStyle(Prs3d_TypeOfHighlight_Dynamic, highlightStyle);

            qDebug() << "Sketch mode: Applied AutoCAD-like configuration";
        }

        // CRITICAL FIX 6: Initialize overlay with proper config
        if (m_canvasOverlay) {
            GridConfig gridConfig;

            // AutoCAD-like dark theme
            gridConfig.backgroundColor = Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB);
            gridConfig.gridColorMajor = Quantity_Color(0.5, 0.5, 0.5, Quantity_TOC_RGB);
            gridConfig.gridColorMinor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
            gridConfig.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
            gridConfig.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);

            // Grid settings
            gridConfig.style = GridStyle::Lines;  // Start with lines
            gridConfig.baseSpacing = 10.0;
            gridConfig.majorLineInterval = 5;
            gridConfig.lineWidthMajor = 0.5;
            gridConfig.lineWidthMinor = 0.25;
            gridConfig.adaptiveSpacing = true;
            gridConfig.minSpacingPixels = 20.0;
            gridConfig.maxSpacingPixels = 80.0;
            gridConfig.showOriginMarker = true;
            gridConfig.gridExtensionFactor = 1.2;

            // Apply configuration
            m_canvasOverlay->setGridConfig(gridConfig);
            m_canvasOverlay->setGridVisible(true);
            m_canvasOverlay->setAxisVisible(true);

            // CRITICAL FIX 7: Force overlay update after view is ready
            QTimer::singleShot(100, this, [this]() {
                if (m_canvasOverlay) {
                    m_canvasOverlay->redraw();
                }
                });
        }

        // Clear selections
        clearSelection();

        // Update context
        if (!m_context.IsNull()) {
            m_context->SetDisplayMode(AIS_WireFrame, Standard_False);
            m_context->UpdateCurrentViewer();
        }

        emit sketchModeEntered();
        qDebug() << "Entered sketch mode with fixed initialization sequence";
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

        // Optionally hide grid when exiting sketch mode
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridVisible(false);
            m_canvasOverlay->update();
        }

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

    TyrexCanvasOverlay* TyrexSketchManager::canvasOverlay() const
    {
        return m_canvasOverlay.get();
    }

    void TyrexSketchManager::setGridVisible(bool visible)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setGridVisible(visible);
        }
    }

    void TyrexSketchManager::setAxesVisible(bool visible)
    {
        if (m_canvasOverlay) {
            m_canvasOverlay->setAxisVisible(visible);
        }
    }

    gp_Pnt2d TyrexSketchManager::snapToGrid(const gp_Pnt2d& point) const
    {
        if (m_canvasOverlay && m_canvasOverlay->isGridVisible()) {
            return m_canvasOverlay->snapToGrid(point);
        }
        return point;
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
            drawSketchEntity(entity);
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
            Handle(V3d_View) view = m_viewerManager->view();
            if (view.IsNull()) {
                qWarning() << "Cannot convert screen to sketch - no view available";
                return gp_Pnt2d(0, 0);
            }

            // Use improved 2D conversion
            Standard_Real xv, yv, zv;
            view->Convert(screenPoint.x(), screenPoint.y(), xv, yv, zv);

            // For true 2D mode, we work in the XY plane
            gp_Pnt2d result(xv, yv);

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
            drawSketchEntity(entity);
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
            drawSketchEntity(controlPoint.entity);
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

        // Update canvas overlay if needed
        if (m_canvasOverlay && m_isInSketchMode) {
            m_canvasOverlay->update();
        }

        // Redraw all entities
        for (auto& entity : m_sketchEntities) {
            drawSketchEntity(entity);
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
            drawSketchEntity(entity);
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
            drawSketchEntity(entity);
        }
    }

    void TyrexSketchManager::unhighlightEntity(std::shared_ptr<TyrexSketchEntity> entity)
    {
        if (!entity || !entity->isHighlighted()) {
            return;
        }

        entity->setHighlighted(false);

        if (!m_context.IsNull()) {
            drawSketchEntity(entity);
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

    // NEW HELPER METHODS
    gp_Pnt2d TyrexSketchManager::applyOrthoMode(const gp_Pnt2d& point) const
    {
        if (!m_firstPointSet) return point;

        // Calculate angle from first point to current point
        gp_Vec2d vec(m_firstPoint, point);
        double angle = atan2(vec.Y(), vec.X()) * 180.0 / M_PI;

        // Round to nearest ortho angle (0, 90, 180, 270)
        double orthoAngle = round(angle / 90.0) * 90.0;

        // Apply ortho constraint
        double distance = m_firstPoint.Distance(point);
        double radians = orthoAngle * M_PI / 180.0;

        return gp_Pnt2d(
            m_firstPoint.X() + distance * cos(radians),
            m_firstPoint.Y() + distance * sin(radians)
        );
    }

    void TyrexSketchManager::drawSketchEntity(std::shared_ptr<TyrexSketchEntity> entity)
    {
        if (!entity || m_context.IsNull()) return;

        // Apply entity styling based on configuration
        if (!entity->getAISShape().IsNull()) {
            Handle(AIS_Shape) shape = entity->getAISShape();

            // Set color based on entity state
            if (entity->isSelected()) {
                shape->SetColor(m_sketchConfig.canvas.selectionColor);
                shape->SetWidth(m_sketchConfig.entityDisplay.selectedLineWidth);
            }
            else if (entity->isHighlighted()) {
                shape->SetColor(m_sketchConfig.canvas.highlightColor);
                shape->SetWidth(m_sketchConfig.entityDisplay.selectedLineWidth);
            }
            else {
                shape->SetColor(m_sketchConfig.entityDisplay.defaultLineColor);
                shape->SetWidth(m_sketchConfig.entityDisplay.defaultLineWidth);
            }

            // Apply line style
            Handle(Prs3d_LineAspect) lineAspect = new Prs3d_LineAspect(
                shape->Color(),
                Aspect_TOL_SOLID,
                shape->Width()
            );
            shape->Attributes()->SetLineAspect(lineAspect);
        }

        entity->draw(m_context, entity->isSelected());
    }

} // namespace TyrexCAD