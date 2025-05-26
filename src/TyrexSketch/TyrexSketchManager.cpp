#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexSketch/TyrexSketchEntity.h"
#include "TyrexSketch/TyrexSketchLineEntity.h"
#include "TyrexSketch/TyrexSketchCircleEntity.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"

#include <AIS_InteractiveContext.hxx>
#include <V3d_View.hxx>
#include <ElSLib.hxx>
#include <AIS_Shape.hxx>
#include <BRepBuilderAPI_MakeVertex.hxx>
#include <Prs3d_PointAspect.hxx>
#include <QDebug>
#include <cmath>

namespace TyrexCAD {

    TyrexSketchManager::TyrexSketchManager(
        const Handle(AIS_InteractiveContext)& context,
        TyrexViewerManager* viewerManager,
        QObject* parent)
        : QObject(parent),
        m_context(context),
        m_viewerManager(viewerManager),
        m_isInSketchMode(false),
        m_sketchPlane(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)), // Default XY plane
        m_currentMode(InteractionMode::None),
        m_isDragging(false),
        m_firstPointSet(false)
    {
        qDebug() << "TyrexSketchManager created";
    }

    TyrexSketchManager::~TyrexSketchManager()
    {
        exitSketchMode();
    }

    void TyrexSketchManager::enterSketchMode()
    {
        if (m_isInSketchMode) {
            return;
        }

        qDebug() << "=== Entering Sketch Mode ===";

        m_isInSketchMode = true;

        // Switch viewer to 2D mode
        if (m_viewerManager) {
            m_viewerManager->set2DMode();

            // Setup canvas overlay for sketch mode
            if (m_viewerManager->view() && !m_viewerManager->view().IsNull()) {
                initializeCanvasOverlay();

                // CRITICAL FIX: Force grid to be visible and configured for sketch mode
                if (m_canvasOverlay) {
                    GridConfig config;
                    config.backgroundColor = Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB);
                    config.gridColorMajor = Quantity_Color(0.4, 0.4, 0.4, Quantity_TOC_RGB);
                    config.gridColorMinor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
                    config.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
                    config.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);
                    config.style = GridStyle::Lines;
                    config.showAxes = true;
                    config.showOriginMarker = true;
                    config.snapEnabled = true;
                    config.baseSpacing = 10.0;
                    config.adaptiveSpacing = true;
                    config.minPixelSpacing = 15.0;
                    config.maxPixelSpacing = 100.0;

                    m_canvasOverlay->setGridConfig(config);
                    m_canvasOverlay->setGridVisible(true);
                    m_canvasOverlay->setAxisVisible(true);
                    m_canvasOverlay->update();

                    qDebug() << "Grid configured for sketch mode";
                }
            }
        }

        // Clear any existing selection
        clearSelection();

        // Setup sketch configuration
        m_sketchConfig = TyrexSketchConfig::autocadConfig();

        emit sketchModeEntered();
        qDebug() << "Sketch mode activated";
    }

    void TyrexSketchManager::exitSketchMode()
    {
        if (!m_isInSketchMode) {
            return;
        }

        qDebug() << "=== Exiting Sketch Mode ===";

        m_isInSketchMode = false;

        // Hide control points
        hideControlPoints();

        // Clear selection
        clearSelection();

        // Switch viewer back to 3D mode
        if (m_viewerManager) {
            m_viewerManager->set3DMode();
        }

        // Reset canvas overlay
        if (m_canvasOverlay) {
            GridConfig config;
            config.backgroundColor = Quantity_Color(0.05, 0.05, 0.05, Quantity_TOC_RGB);
            config.gridColorMajor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
            config.gridColorMinor = Quantity_Color(0.2, 0.2, 0.2, Quantity_TOC_RGB);
            config.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
            config.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);
            config.style = GridStyle::Lines;
            config.showAxes = true;
            config.showOriginMarker = true;
            config.snapEnabled = false;
            config.baseSpacing = 10.0;

            m_canvasOverlay->setGridConfig(config);
            m_canvasOverlay->update();
        }

        emit sketchModeExited();
        qDebug() << "Sketch mode deactivated";
    }

    bool TyrexSketchManager::isInSketchMode() const
    {
        return m_isInSketchMode;
    }

    void TyrexSketchManager::setInteractionMode(InteractionMode mode)
    {
        m_currentMode = mode;
        m_firstPointSet = false;
        clearPreview();

        qDebug() << "Interaction mode changed to:" << static_cast<int>(mode);
    }

    InteractionMode TyrexSketchManager::currentMode() const
    {
        return m_currentMode;
    }

    void TyrexSketchManager::addSketchEntity(std::shared_ptr<TyrexSketchEntity> entity)
    {
        if (!entity) {
            return;
        }

        m_sketchEntities.push_back(entity);
        m_entityMap[entity->getId()] = entity;

        // Draw the entity
        drawSketchEntity(entity);

        qDebug() << "Added sketch entity:" << QString::fromStdString(entity->getId());
        emit entityCreated(entity->getId());
    }

    void TyrexSketchManager::removeSketchEntity(const std::string& entityId)
    {
        auto it = m_entityMap.find(entityId);
        if (it == m_entityMap.end()) {
            return;
        }

        auto entity = it->second;

        // Remove from display
        if (!m_context.IsNull()) {
            entity->undraw(m_context);
        }

        // Remove from collections
        m_entityMap.erase(it);
        m_sketchEntities.erase(
            std::remove_if(m_sketchEntities.begin(), m_sketchEntities.end(),
                [&entityId](const auto& e) { return e->getId() == entityId; }),
            m_sketchEntities.end()
        );

        qDebug() << "Removed sketch entity:" << QString::fromStdString(entityId);
        emit entityDeleted(entityId);
    }

    std::shared_ptr<TyrexSketchEntity> TyrexSketchManager::getEntity(const std::string& entityId) const
    {
        auto it = m_entityMap.find(entityId);
        return (it != m_entityMap.end()) ? it->second : nullptr;
    }

    std::vector<std::shared_ptr<TyrexSketchEntity>> TyrexSketchManager::getAllEntities() const
    {
        return m_sketchEntities;
    }

    void TyrexSketchManager::selectEntity(const std::string& entityId)
    {
        auto entity = getEntity(entityId);
        if (entity) {
            selectEntity(entity);
        }
    }

    void TyrexSketchManager::deselectEntity(const std::string& entityId)
    {
        auto entity = getEntity(entityId);
        if (entity) {
            entity->setSelected(false);
            m_selectedEntities.erase(
                std::remove(m_selectedEntities.begin(), m_selectedEntities.end(), entity),
                m_selectedEntities.end()
            );
            drawSketchEntity(entity);
        }
    }

    bool TyrexSketchManager::onMousePress(const QPoint& screenPos)
    {
        if (!m_isInSketchMode || m_context.IsNull()) {
            return false;
        }

        m_lastMousePos = screenPos;

        // Convert to sketch coordinates
        gp_Pnt2d sketchPoint = screenToSketch(screenPos);

        // Handle based on current mode
        switch (m_currentMode) {
        case InteractionMode::Select:
            return handleSelectMode(screenPos, sketchPoint);

        case InteractionMode::Line:
            return handleLineMode(screenPos, sketchPoint);

        case InteractionMode::Circle:
            return handleCircleMode(screenPos, sketchPoint);

        default:
            return false;
        }
    }

    bool TyrexSketchManager::onMouseMove(const QPoint& screenPos)
    {
        if (!m_isInSketchMode) {
            return false;
        }

        gp_Pnt2d sketchPoint = screenToSketch(screenPos);

        if (m_isDragging) {
            // Handle dragging
            if (m_draggedEntity) {
                // Drag entire entity
                gp_Vec2d offset(m_dragStartPosition, sketchPoint);
                m_draggedEntity->moveBy(gp_Pnt2d(offset.X(), offset.Y()));
                m_draggedEntity->updateShape();
                redrawSketch();
            }
            else if (m_draggedControlPoint.entity) {
                // Drag control point
                m_draggedControlPoint.entity->setControlPoint(
                    m_draggedControlPoint.index, sketchPoint);
                m_draggedControlPoint.entity->updateShape();
                redrawSketch();
            }

            emit entityModified(m_draggedEntity ? m_draggedEntity->getId() :
                m_draggedControlPoint.entity->getId());
            return true;
        }

        // Handle preview for drawing modes
        if (m_firstPointSet) {
            switch (m_currentMode) {
            case InteractionMode::Line:
                // Update line preview
                updateLinePreview(sketchPoint);
                break;

            case InteractionMode::Circle:
                // Update circle preview
                updateCirclePreview(sketchPoint);
                break;

            default:
                break;
            }
        }

        // Highlight entity under cursor in select mode
        if (m_currentMode == InteractionMode::Select) {
            auto entity = findEntityAt(screenPos, 10.0);
            if (entity && !entity->isHighlighted()) {
                // Clear previous highlights
                for (auto& e : m_sketchEntities) {
                    if (e->isHighlighted()) {
                        e->setHighlighted(false);
                        drawSketchEntity(e);
                    }
                }

                // Highlight new entity
                entity->setHighlighted(true);
                drawSketchEntity(entity);
            }
            else if (!entity) {
                // Clear all highlights
                for (auto& e : m_sketchEntities) {
                    if (e->isHighlighted()) {
                        e->setHighlighted(false);
                        drawSketchEntity(e);
                    }
                }
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
            return true;
        }

        return false;
    }

    void TyrexSketchManager::clearSelection()
    {
        m_selectedEntities.clear();
        hideControlPoints();

        // Update visual state of all entities
        for (auto& entity : m_sketchEntities) {
            entity->setSelected(false);
            drawSketchEntity(entity);
        }

        emit selectionCleared();
    }

    std::vector<std::shared_ptr<TyrexSketchEntity>> TyrexSketchManager::getSelectedEntities() const
    {
        return m_selectedEntities;
    }

    void TyrexSketchManager::setSketchPlane(const gp_Pln& plane)
    {
        m_sketchPlane = plane;
        emit sketchPlaneChanged(plane);
    }

    const gp_Pln& TyrexSketchManager::sketchPlane() const
    {
        return m_sketchPlane;
    }

    Handle(AIS_InteractiveContext) TyrexSketchManager::context() const
    {
        return m_context;
    }

    TyrexCanvasOverlay* TyrexSketchManager::canvasOverlay() const
    {
        return m_canvasOverlay.get();
    }

    void TyrexSketchManager::redrawSketch()
    {
        if (m_context.IsNull()) {
            return;
        }

        // Redraw all entities
        for (auto& entity : m_sketchEntities) {
            drawSketchEntity(entity);
        }

        // Update control points
        if (!m_selectedEntities.empty()) {
            showControlPoints();
        }

        // Update canvas overlay
        if (m_canvasOverlay) {
            m_canvasOverlay->update();
        }

        m_context->UpdateCurrentViewer();
    }

    // Private helper methods

    void TyrexSketchManager::initializeCanvasOverlay()
    {
        if (!m_viewerManager || m_viewerManager->view().IsNull()) {
            qWarning() << "Cannot initialize canvas overlay - no view available";
            return;
        }

        // Use existing canvas overlay if available
        m_canvasOverlay = std::make_unique<TyrexCanvasOverlay>(
            m_context, m_viewerManager->view(), nullptr);

        qDebug() << "Canvas overlay initialized for sketch mode";
    }

    bool TyrexSketchManager::handleSelectMode(const QPoint& screenPos, const gp_Pnt2d& sketchPoint)
    {
        // First check for control point selection
        ControlPoint controlPoint = findControlPointAt(screenPos, 10.0);
        if (controlPoint.entity) {
            // Start dragging control point
            beginDrag(nullptr, controlPoint, sketchPoint);
            return true;
        }

        // Check for entity selection
        auto entity = findEntityAt(screenPos, 10.0);
        if (entity) {
            // Select the entity
            selectEntity(entity);

            // Start dragging the entire entity
            beginDrag(entity, ControlPoint(), sketchPoint);
            return true;
        }

        // If nothing selected, clear selection
        clearSelection();
        return false;
    }

    bool TyrexSketchManager::handleLineMode(const QPoint& screenPos, const gp_Pnt2d& sketchPoint)
    {
        if (!m_firstPointSet) {
            // Set first point
            m_firstPoint = sketchPoint;
            m_firstPointSet = true;

            // Create preview line
            createLinePreview(m_firstPoint);

            emit statusMessage("Click to set end point");
            return true;
        }
        else {
            // Set second point and create line
            gp_Pnt2d endPoint = applyOrthoMode(sketchPoint);

            // Create the line entity
            auto line = std::make_shared<TyrexSketchLineEntity>(
                "line_" + std::to_string(m_sketchEntities.size()),
                m_firstPoint,
                endPoint
            );

            addSketchEntity(line);

            // Clear preview
            clearPreview();

            // Reset for next line
            m_firstPointSet = false;

            emit statusMessage("Line created");
            return true;
        }
    }

    bool TyrexSketchManager::handleCircleMode(const QPoint& screenPos, const gp_Pnt2d& sketchPoint)
    {
        if (!m_firstPointSet) {
            // Set center point
            m_firstPoint = sketchPoint;
            m_firstPointSet = true;

            // Create preview circle
            createCirclePreview(m_firstPoint);

            emit statusMessage("Click to set radius");
            return true;
        }
        else {
            // Calculate radius
            double radius = m_firstPoint.Distance(sketchPoint);

            // Create the circle entity
            auto circle = std::make_shared<TyrexSketchCircleEntity>(
                "circle_" + std::to_string(m_sketchEntities.size()),
                m_firstPoint,
                radius
            );

            addSketchEntity(circle);

            // Clear preview
            clearPreview();

            // Reset for next circle
            m_firstPointSet = false;

            emit statusMessage("Circle created");
            return true;
        }
    }

    void TyrexSketchManager::selectEntity(std::shared_ptr<TyrexSketchEntity> entity)
    {
        if (!entity) {
            return;
        }

        // Clear previous selection
        clearSelection();

        // Select new entity
        entity->setSelected(true);
        m_selectedEntities.push_back(entity);

        // Show control points
        showControlPoints();

        // Redraw
        drawSketchEntity(entity);

        emit entitySelected(entity->getId());
    }

    std::shared_ptr<TyrexSketchEntity> TyrexSketchManager::findEntityAt(
        const QPoint& screenPos, double tolerance) const
    {
        gp_Pnt2d testPoint = screenToSketch(screenPos);

        for (auto& entity : m_sketchEntities) {
            if (entity->isNearPoint(testPoint, tolerance)) {
                return entity;
            }
        }

        return nullptr;
    }

    TyrexSketchManager::ControlPoint TyrexSketchManager::findControlPointAt(
        const QPoint& screenPos, double tolerance) const
    {
        gp_Pnt2d testPoint = screenToSketch(screenPos);

        for (auto& entity : m_selectedEntities) {
            auto controlPoints = getControlPoints(entity);

            for (const auto& cp : controlPoints) {
                if (cp.position.Distance(testPoint) <= tolerance) {
                    return cp;
                }
            }
        }

        return ControlPoint(); // Empty control point
    }

    std::vector<TyrexSketchManager::ControlPoint> TyrexSketchManager::getControlPoints(
        std::shared_ptr<TyrexSketchEntity> entity) const
    {
        std::vector<ControlPoint> points;

        if (!entity) {
            return points;
        }

        auto entityPoints = entity->getControlPoints();
        for (size_t i = 0; i < entityPoints.size(); ++i) {
            ControlPoint cp;
            cp.entity = entity;
            cp.index = i;
            cp.position = entityPoints[i];
            points.push_back(cp);
        }

        return points;
    }

    void TyrexSketchManager::beginDrag(
        std::shared_ptr<TyrexSketchEntity> entity,
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
        m_isDragging = false;
        m_draggedEntity = nullptr;
        m_draggedControlPoint = ControlPoint();
    }

    void TyrexSketchManager::showControlPoints()
    {
        hideControlPoints(); // Clear existing

        if (m_context.IsNull()) {
            return;
        }

        for (auto& entity : m_selectedEntities) {
            auto controlPoints = getControlPoints(entity);

            for (const auto& cp : controlPoints) {
                Handle(AIS_InteractiveObject) cpVisual = createControlPointVisual(cp);
                if (!cpVisual.IsNull()) {
                    m_context->Display(cpVisual, Standard_False);
                    m_controlPointObjects.push_back(cpVisual);
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

        for (auto& cpObj : m_controlPointObjects) {
            if (!cpObj.IsNull()) {
                m_context->Remove(cpObj, Standard_False);
            }
        }

        m_controlPointObjects.clear();
        m_context->UpdateCurrentViewer();
    }

    Handle(AIS_InteractiveObject) TyrexSketchManager::createControlPointVisual(
        const ControlPoint& cp) const
    {
        if (!cp.entity) {
            return nullptr;
        }

        // Convert 2D point to 3D
        gp_Pnt pt3d = ElSLib::Value(cp.position.X(), cp.position.Y(), m_sketchPlane);

        // Create a vertex shape
        TopoDS_Vertex vertex = BRepBuilderAPI_MakeVertex(pt3d);

        // Create AIS object
        Handle(AIS_Shape) aisPoint = new AIS_Shape(vertex);

        // Set appearance
        Handle(Prs3d_PointAspect) pointAspect = new Prs3d_PointAspect(
            Aspect_TOM_PLUS,
            Quantity_NOC_YELLOW,
            5.0
        );

        aisPoint->Attributes()->SetPointAspect(pointAspect);

        return aisPoint;
    }

    void TyrexSketchManager::drawSketchEntity(std::shared_ptr<TyrexSketchEntity> entity)
    {
        if (!entity || m_context.IsNull()) {
            return;
        }

        entity->draw(m_context);
    }

    gp_Pnt2d TyrexSketchManager::screenToSketch(const QPoint& screenPos) const
    {
        if (m_viewerManager && !m_viewerManager->view().IsNull()) {
            // Convert screen coordinates to world coordinates
            double xv, yv, zv;
            m_viewerManager->view()->Convert(screenPos.x(), screenPos.y(), xv, yv, zv);

            // Project onto sketch plane
            gp_Pnt worldPoint(xv, yv, zv);
            gp_Pnt2d sketchPoint;
            ElSLib::Parameters(m_sketchPlane, worldPoint, sketchPoint.ChangeCoord().ChangeX(),
                sketchPoint.ChangeCoord().ChangeY());

            // Apply grid snap if enabled
            if (m_canvasOverlay && m_canvasOverlay->getGridConfig().snapEnabled) {
                return m_canvasOverlay->snapToGrid(sketchPoint);
            }

            return sketchPoint;
        }

        return gp_Pnt2d(screenPos.x(), screenPos.y());
    }

    gp_Pnt TyrexSketchManager::sketchToWorld(const gp_Pnt2d& sketchPoint) const
    {
        // Convert 2D sketch coordinates to 3D world coordinates using sketch plane
        return ElSLib::Value(sketchPoint.X(), sketchPoint.Y(), m_sketchPlane);
    }

    gp_Pnt2d TyrexSketchManager::applyOrthoMode(const gp_Pnt2d& point) const
    {
        if (!m_sketchConfig.interaction.orthoMode || !m_firstPointSet) {
            return point;
        }

        // Calculate angle from first point to current point
        gp_Vec2d vec(m_firstPoint, point);
        double angle = std::atan2(vec.Y(), vec.X());
        double distance = m_firstPoint.Distance(point);

        // Snap to nearest 90 degree increment
        double snapAngle = std::round(angle / (M_PI / 2)) * (M_PI / 2);

        // Calculate snapped point
        return gp_Pnt2d(
            m_firstPoint.X() + distance * std::cos(snapAngle),
            m_firstPoint.Y() + distance * std::sin(snapAngle)
        );
    }

    void TyrexSketchManager::createLinePreview(const gp_Pnt2d& startPoint)
    {
        clearPreview();

        // Create a temporary line for preview
        m_previewEntity = std::make_shared<TyrexSketchLineEntity>(
            "preview_line",
            startPoint,
            startPoint  // Initially same as start
        );

        // Set preview style
        m_previewEntity->setLineStyle(Aspect_TOL_DASH);
        m_previewEntity->setColor(Quantity_Color(0.7, 0.7, 0.7, Quantity_TOC_RGB));

        // Draw preview
        drawSketchEntity(m_previewEntity);
    }

    void TyrexSketchManager::updateLinePreview(const gp_Pnt2d& endPoint)
    {
        if (!m_previewEntity) {
            return;
        }

        // Update end point
        gp_Pnt2d snappedEnd = applyOrthoMode(endPoint);
        m_previewEntity->setControlPoint(1, snappedEnd);
        m_previewEntity->updateShape();

        // Redraw
        drawSketchEntity(m_previewEntity);
    }

    void TyrexSketchManager::createCirclePreview(const gp_Pnt2d& center)
    {
        clearPreview();

        // Create a temporary circle for preview
        m_previewEntity = std::make_shared<TyrexSketchCircleEntity>(
            "preview_circle",
            center,
            0.1  // Small initial radius
        );

        // Set preview style
        m_previewEntity->setLineStyle(Aspect_TOL_DASH);
        m_previewEntity->setColor(Quantity_Color(0.7, 0.7, 0.7, Quantity_TOC_RGB));

        // Draw preview
        drawSketchEntity(m_previewEntity);
    }

    void TyrexSketchManager::updateCirclePreview(const gp_Pnt2d& radiusPoint)
    {
        if (!m_previewEntity) {
            return;
        }

        // Calculate radius
        double radius = m_firstPoint.Distance(radiusPoint);

        // Update radius
        auto circleEntity = std::static_pointer_cast<TyrexSketchCircleEntity>(m_previewEntity);
        circleEntity->setRadius(radius);
        circleEntity->updateShape();

        // Redraw
        drawSketchEntity(m_previewEntity);
    }

    void TyrexSketchManager::clearPreview()
    {
        if (m_previewEntity && !m_context.IsNull()) {
            m_previewEntity->undraw(m_context);
            m_previewEntity.reset();
        }
    }

} // namespace TyrexCAD