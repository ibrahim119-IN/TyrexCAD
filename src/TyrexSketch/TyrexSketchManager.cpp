/***************************************************************************
 * Copyright (c) 2025 TyrexCAD development team                          *
 * *
 * This file is part of the TyrexCAD CAx development system.             *
 * *
 ***************************************************************************/

#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexSketch/TyrexSketchEntity.h"
#include "TyrexSketch/TyrexSketchLineEntity.h"
#include "TyrexSketch/TyrexSketchCircleEntity.h"
#include "TyrexSketch/TyrexSketchConfig.h"
#include "TyrexSketch/TyrexSketchDisplayHelper.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h" // Defines TyrexCAD::GridConfig

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
#include <Graphic3d_AspectLine3d.hxx>
#include <Aspect_TypeOfLine.hxx>
#include <Aspect_TypeOfMarker.hxx> // Ensure this is included for Aspect_TOM_STAR

// Qt includes
#include <QDebug>
#include <QTimer>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

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
        , m_firstPointSet(false)
        , m_firstPoint(0, 0)
        , m_canvasOverlay(nullptr) // Initialize to nullptr
    {
        m_draggedControlPoint.entity = nullptr;
        m_draggedControlPoint.type = ControlPointType::Endpoint;
        m_draggedControlPoint.index = -1;
        m_draggedControlPoint.position = gp_Pnt2d(0, 0);

        if (m_viewerManager && !m_viewerManager->view().IsNull()) { // Check if view is valid
            m_canvasOverlay = std::make_unique<TyrexCanvasOverlay>(m_context,
                m_viewerManager->view(), this); // Pass valid view

            connect(m_canvasOverlay.get(), &TyrexCanvasOverlay::gridSpacingChanged,
                this, [this](double spacing) {
                    qDebug() << "Grid spacing changed to:" << spacing;
                });

            if (m_viewerManager) { // Double check, though implied by outer if
                connect(m_viewerManager, &TyrexViewerManager::viewChanged,
                    this, [this]() {
                        if (m_canvasOverlay && m_isInSketchMode) {
                            m_canvasOverlay->update();
                        }
                    });
            }
        }
        else {
            qWarning() << "TyrexSketchManager: ViewerManager or its view is null, CanvasOverlay not created.";
        }


        m_sketchConfig = TyrexSketchConfig::autocadConfig();

        qDebug() << "TyrexSketchManager created";
    }

    TyrexSketchManager::~TyrexSketchManager()
    {
        hideControlPoints();

        for (auto& highlight : m_highlightObjects) { // Use reference for Handle
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

        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            Handle(V3d_View) view = m_viewerManager->view();

            try {
                view->SetBackgroundColor(Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB));

                if (!view->Window().IsNull()) {
                    view->Window()->Map();
                }

                view->SetProj(V3d_Zpos);

                Handle(Graphic3d_Camera) camera = view->Camera();
                if (!camera.IsNull()) {
                    camera->SetProjectionType(Graphic3d_Camera::Projection_Orthographic);
                    camera->SetZFocus(Graphic3d_Camera::FocusType_Absolute, 0.0);
                    camera->SetUp(gp_Dir(0, 1, 0));
                    camera->SetDirection(gp_Dir(0, 0, -1));
                    view->SetCamera(camera);
                }

                Graphic3d_RenderingParams& params = view->ChangeRenderingParams();
                params.Method = Graphic3d_RM_RASTERIZATION;
                params.IsAntialiasingEnabled = Standard_True;
                params.NbMsaaSamples = 4;
                params.IsShadowEnabled = Standard_False;
                params.IsReflectionEnabled = Standard_False;
                params.IsTransparentShadowEnabled = Standard_False;

                TyrexSketchDisplayHelper::setupOptimal2DRendering(view);

                view->MustBeResized();
                view->FitAll(0.01, Standard_False);
                view->Update();
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error during view setup:" << ex.GetMessageString();
            }
            catch (...) {
                qWarning() << "Unknown error during view setup";
            }

            try {
                Handle(Prs3d_Drawer) selectionStyle = new Prs3d_Drawer();
                selectionStyle->SetColor(m_sketchConfig.canvas.selectionColor);
                selectionStyle->SetDisplayMode(1);

                Handle(Prs3d_LineAspect) selectionLineAspect = new Prs3d_LineAspect(
                    m_sketchConfig.canvas.selectionColor,
                    Aspect_TOL_SOLID,
                    m_sketchConfig.entityDisplay.selectedLineWidth);
                selectionStyle->SetLineAspect(selectionLineAspect);

                if (!m_context.IsNull()) m_context->SetSelectionStyle(selectionStyle);

                Handle(Prs3d_Drawer) highlightStyle = new Prs3d_Drawer();
                highlightStyle->SetColor(m_sketchConfig.canvas.highlightColor);
                highlightStyle->SetDisplayMode(1);

                Handle(Prs3d_LineAspect) highlightLineAspect = new Prs3d_LineAspect(
                    m_sketchConfig.canvas.highlightColor,
                    Aspect_TOL_SOLID,
                    m_sketchConfig.entityDisplay.selectedLineWidth);
                highlightStyle->SetLineAspect(highlightLineAspect);

                if (!m_context.IsNull()) m_context->SetHighlightStyle(Prs3d_TypeOfHighlight_Dynamic, highlightStyle);

                qDebug() << "Sketch mode: Applied AutoCAD-like configuration";
            }
            catch (const Standard_Failure& ex) {
                qWarning() << "Error during style setup:" << ex.GetMessageString();
            }
            catch (...) {
                qWarning() << "Unknown error during style setup";
            }
        }

        if (m_canvasOverlay) {
            TyrexCAD::GridConfig gridConfig; // Use fully qualified name

            gridConfig.backgroundColor = Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB);
            gridConfig.gridColorMajor = Quantity_Color(0.5, 0.5, 0.5, Quantity_TOC_RGB);
            gridConfig.gridColorMinor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
            gridConfig.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
            gridConfig.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);

            gridConfig.style = TyrexCAD::GridStyle::Lines;  // Use fully qualified name
            gridConfig.baseSpacing = 10.0;
            gridConfig.majorLineInterval = 5;
            gridConfig.lineWidthMajor = 0.5;
            gridConfig.lineWidthMinor = 0.25;
            gridConfig.adaptiveSpacing = true;
            gridConfig.minSpacingPixels = 20.0;
            gridConfig.maxSpacingPixels = 80.0;
            gridConfig.showOriginMarker = true;
            gridConfig.gridExtensionFactor = 1.2;

            m_canvasOverlay->setGridConfig(gridConfig);
            m_canvasOverlay->setGridVisible(true);
            m_canvasOverlay->setAxisVisible(true);

            QTimer::singleShot(100, this, [this]() {
                if (m_canvasOverlay) {
                    m_canvasOverlay->redraw();
                }
                });
        }

        clearSelection();

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
            return;
        }

        if (m_isDragging) {
            endDrag();
        }

        hideControlPoints();
        clearSelection();

        if (m_canvasOverlay) {
            m_canvasOverlay->setGridVisible(false);
            m_canvasOverlay->update();
        }

        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            Handle(V3d_View) view = m_viewerManager->view();
            view->SetBackgroundColor(Quantity_NOC_DARKSLATEGRAY);
            m_viewerManager->set3DMode();
            qDebug() << "Sketch mode: Restored 3D perspective projection";
        }

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

        if (m_entityMap.find(entity->getId()) != m_entityMap.end()) {
            qWarning() << "Sketch entity with ID" << QString::fromStdString(entity->getId())
                << "already exists";
            return;
        }

        m_sketchEntities.push_back(entity);
        m_entityMap[entity->getId()] = entity;

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

        if (!m_context.IsNull() && entity) { // Check if entity is not null
            entity->undraw(m_context);
            m_context->UpdateCurrentViewer();
        }

        m_entityMap.erase(it);
        m_sketchEntities.erase(
            std::remove(m_sketchEntities.begin(), m_sketchEntities.end(), entity),
            m_sketchEntities.end()
        );

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

            Standard_Real xv, yv, zv;
            view->Convert(screenPoint.x(), screenPoint.y(), xv, yv, zv);
            gp_Pnt2d result(xv, yv);

            if (m_canvasOverlay && m_canvasOverlay->isGridVisible() && m_canvasOverlay->getGridConfig().snapEnabled) { // Check m_canvasOverlay
                result = m_canvasOverlay->snapToGrid(result);
            }

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
        return ElSLib::Value(sketchPoint.X(), sketchPoint.Y(), m_sketchPlane);
    }

    bool TyrexSketchManager::onMousePress(const QPoint& screenPos)
    {
        if (!m_isInSketchMode) {
            return false;
        }

        m_lastMousePos = screenPos;
        gp_Pnt2d sketchPos = screenToSketch(screenPos);

        ControlPoint controlPoint = findControlPointAt(screenPos);
        if (controlPoint.entity != nullptr) {
            beginDrag(nullptr, controlPoint, sketchPos);
            m_currentMode = InteractionMode::DragPoint;
            return true;
        }

        auto entity = findEntityAt(screenPos);
        if (entity) {
            clearSelection();
            m_selectedEntities.push_back(entity);
            entity->setSelected(true);

            updateSelectionVisuals();
            showControlPoints();

            beginDrag(entity, ControlPoint(), sketchPos); // Pass an empty ControlPoint
            m_currentMode = InteractionMode::DragObject;

            emit entitySelected(entity->getId());

            if (!m_context.IsNull()) {
                m_context->UpdateCurrentViewer();
            }

            return true;
        }

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

        auto entity = findEntityAt(screenPos);
        if (entity) {
            highlightEntity(entity);
        }
        else {
            for (auto& e : m_sketchEntities) { // Use reference for shared_ptr
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
        for (auto& entity : m_selectedEntities) { // Use reference for shared_ptr
            if (entity) entity->setSelected(false); // Check for null
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
        result.entity = nullptr; // Explicitly nullify

        gp_Pnt2d screenSketch = screenToSketch(screenPos);

        for (auto& entity : m_selectedEntities) { // Use reference
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

        gp_Pnt2d offset(newPosition.X() - m_dragStartPosition.X(),
            newPosition.Y() - m_dragStartPosition.Y());

        entity->moveBy(offset);
        entity->updateShape();

        m_dragStartPosition = newPosition;

        if (!m_context.IsNull()) {
            drawSketchEntity(entity);
        }

        updateSelectionVisuals();

        emit entityModified(entity->getId());
    }

    void TyrexSketchManager::updateControlPointDrag(const ControlPoint& controlPoint,
        const gp_Pnt2d& newPosition)
    {
        if (!controlPoint.entity) {
            return;
        }

        controlPoint.entity->setControlPoint(controlPoint.index, newPosition);
        controlPoint.entity->updateShape();

        if (!m_context.IsNull()) {
            drawSketchEntity(controlPoint.entity);
        }

        updateSelectionVisuals();

        emit entityModified(controlPoint.entity->getId());
    }

    void TyrexSketchManager::redrawSketch()
    {
        if (m_context.IsNull()) {
            return;
        }

        if (m_canvasOverlay && m_isInSketchMode) {
            m_canvasOverlay->update();
        }

        for (auto& entity : m_sketchEntities) { // Use reference
            drawSketchEntity(entity);
        }

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

        for (auto& entity : m_sketchEntities) { // Use reference
            drawSketchEntity(entity);
        }
    }

    void TyrexSketchManager::showControlPoints()
    {
        if (m_context.IsNull()) {
            return;
        }

        hideControlPoints();

        for (auto& entity : m_selectedEntities) { // Use reference
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

        for (auto& visual : m_controlPointObjects) { // Use reference
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

        try {
            gp_Pnt worldPoint = sketchToWorld(point.position);
            Handle(Geom_CartesianPoint) geomPoint = new Geom_CartesianPoint(worldPoint);
            Handle(AIS_Point) aisPoint = new AIS_Point(geomPoint);

            Quantity_Color pointColor = (point.type == ControlPointType::Endpoint) ?
                Quantity_NOC_YELLOW : Quantity_NOC_CYAN;

            // Correctly create Prs3d_PointAspect
            // The Aspect_TOM_STAR enum value must be used directly.
            Handle(Prs3d_PointAspect) pointAspect = new Prs3d_PointAspect(Aspect_TOM_STAR, pointColor, 10.0);


            if (!aisPoint->Attributes().IsNull()) {
                aisPoint->Attributes()->SetPointAspect(pointAspect);
            }
            else {
                Handle(Prs3d_Drawer) drawer = new Prs3d_Drawer();
                drawer->SetPointAspect(pointAspect);
                aisPoint->SetAttributes(drawer);
            }

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

        for (auto& entity : m_sketchEntities) { // Use reference
            if (entity && entity->isNearPoint(sketchPos, tolerance)) { // Check for null
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
        m_draggedControlPoint.entity = nullptr; // Reset dragged control point entity
        m_currentMode = InteractionMode::ObjectSelect;

        showControlPoints();
    }

    gp_Pnt2d TyrexSketchManager::applyOrthoMode(const gp_Pnt2d& point) const
    {
        if (!m_firstPointSet) return point;

        gp_Vec2d vec(m_firstPoint, point);
        double angle = atan2(vec.Y(), vec.X()) * 180.0 / M_PI;
        double orthoAngle = round(angle / 90.0) * 90.0;
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

        try {
            if (!entity->getAISShape().IsNull()) {
                Handle(AIS_Shape) shape = entity->getAISShape();
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

                shape->SetColor(entityColor);
                Handle(Prs3d_LineAspect) lineAspect = new Prs3d_LineAspect(
                    entityColor, Aspect_TOL_SOLID, lineWidth);

                if (!shape->Attributes().IsNull()) {
                    shape->Attributes()->SetLineAspect(lineAspect);
                }
                else {
                    Handle(Prs3d_Drawer) drawer = new Prs3d_Drawer();
                    drawer->SetLineAspect(lineAspect);
                    shape->SetAttributes(drawer);
                }
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

} // namespace TyrexCAD