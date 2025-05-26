#ifndef TYREXSKETCHMANAGER_H
#define TYREXSKETCHMANAGER_H

#include <QObject>
#include <QPoint>
#include <memory>
#include <vector>
#include <unordered_map>
#include <string>

// OpenCascade includes
#include <gp_Pln.hxx>
#include <gp_Pnt2d.hxx>
#include <AIS_InteractiveContext.hxx>
#include <AIS_InteractiveObject.hxx>
#include <Standard_Handle.hxx>

#include "TyrexSketch/TyrexSketchConfig.h"

namespace TyrexCAD {

    // Forward declarations
    class TyrexSketchEntity;
    class TyrexViewerManager;
    class TyrexCanvasOverlay;

    /**
     * @brief Enumeration for sketch interaction modes
     */
    enum class InteractionMode {
        None,
        Select,
        Line,
        Circle,
        Arc,
        Rectangle,
        Polygon,
        Spline,
        Dimension,
        Constraint
    };

    /**
     * @brief Manages 2D sketching functionality in TyrexCAD
     *
     * This class provides complete sketch mode management including:
     * - Sketch entity creation and management
     * - Interactive drawing tools
     * - Selection and editing capabilities
     * - Constraint management
     * - Integration with the canvas overlay system
     */
    class TyrexSketchManager : public QObject
    {
        Q_OBJECT

    public:
        /**
         * @brief Control point structure for entity manipulation
         */
        struct ControlPoint {
            std::shared_ptr<TyrexSketchEntity> entity;
            size_t index;
            gp_Pnt2d position;

            ControlPoint() : entity(nullptr), index(0) {}
        };

        // Constructor/Destructor
        explicit TyrexSketchManager(const Handle(AIS_InteractiveContext)& context,
            TyrexViewerManager* viewerManager,
            QObject* parent = nullptr);
        ~TyrexSketchManager();

        // Sketch mode control
        void enterSketchMode();
        void exitSketchMode();
        bool isInSketchMode() const;

        // Interaction mode
        void setInteractionMode(InteractionMode mode);
        InteractionMode currentMode() const;

        // Entity management
        void addSketchEntity(std::shared_ptr<TyrexSketchEntity> entity);
        void removeSketchEntity(const std::string& entityId);
        std::shared_ptr<TyrexSketchEntity> getEntity(const std::string& entityId) const;
        std::vector<std::shared_ptr<TyrexSketchEntity>> getAllEntities() const;

        // Selection
        void selectEntity(const std::string& entityId);
        void deselectEntity(const std::string& entityId);
        void clearSelection();
        std::vector<std::shared_ptr<TyrexSketchEntity>> getSelectedEntities() const;

        // Mouse interaction
        bool onMousePress(const QPoint& screenPos);
        bool onMouseMove(const QPoint& screenPos);
        bool onMouseRelease(const QPoint& screenPos);

        // Sketch plane
        void setSketchPlane(const gp_Pln& plane);
        const gp_Pln& sketchPlane() const;

        // Configuration
        void setSketchConfig(const TyrexSketchConfig& config) { m_sketchConfig = config; }
        const TyrexSketchConfig& sketchConfig() const { return m_sketchConfig; }

        // Canvas overlay access
        TyrexCanvasOverlay* canvasOverlay() const;

        // OpenCascade context
        Handle(AIS_InteractiveContext) context() const;

        // Utility
        void redrawSketch();
        gp_Pnt2d screenToSketch(const QPoint& screenPos) const;
        gp_Pnt sketchToWorld(const gp_Pnt2d& sketchPoint) const;

    signals:
        void sketchModeEntered();
        void sketchModeExited();
        void entityCreated(const std::string& entityId);
        void entityModified(const std::string& entityId);
        void entityDeleted(const std::string& entityId);
        void entitySelected(const std::string& entityId);
        void selectionCleared();
        void sketchPlaneChanged(const gp_Pln& plane);
        void statusMessage(const QString& message);

    private:
        // Initialization
        void initializeCanvasOverlay();

        // Entity selection and manipulation
        void selectEntity(std::shared_ptr<TyrexSketchEntity> entity);
        std::shared_ptr<TyrexSketchEntity> findEntityAt(const QPoint& screenPos, double tolerance) const;
        ControlPoint findControlPointAt(const QPoint& screenPos, double tolerance) const;
        std::vector<ControlPoint> getControlPoints(std::shared_ptr<TyrexSketchEntity> entity) const;

        // Dragging support
        void beginDrag(std::shared_ptr<TyrexSketchEntity> entity,
            const ControlPoint& controlPoint,
            const gp_Pnt2d& startPos);
        void endDrag();

        // Control point visualization
        void showControlPoints();
        void hideControlPoints();
        Handle(AIS_InteractiveObject) createControlPointVisual(const ControlPoint& cp) const;

        // Drawing
        void drawSketchEntity(std::shared_ptr<TyrexSketchEntity> entity);

        // Interaction mode handlers
        bool handleSelectMode(const QPoint& screenPos, const gp_Pnt2d& sketchPoint);
        bool handleLineMode(const QPoint& screenPos, const gp_Pnt2d& sketchPoint);
        bool handleCircleMode(const QPoint& screenPos, const gp_Pnt2d& sketchPoint);

        // Preview management
        void createLinePreview(const gp_Pnt2d& startPoint);
        void updateLinePreview(const gp_Pnt2d& endPoint);
        void createCirclePreview(const gp_Pnt2d& center);
        void updateCirclePreview(const gp_Pnt2d& radiusPoint);
        void clearPreview();

        // Utility
        gp_Pnt2d applyOrthoMode(const gp_Pnt2d& point) const;

    private:
        // Core components
        Handle(AIS_InteractiveContext) m_context;
        TyrexViewerManager* m_viewerManager;
        std::unique_ptr<TyrexCanvasOverlay> m_canvasOverlay;

        // Sketch state
        bool m_isInSketchMode;
        gp_Pln m_sketchPlane;
        TyrexSketchConfig m_sketchConfig;

        // Entities
        std::vector<std::shared_ptr<TyrexSketchEntity>> m_sketchEntities;
        std::unordered_map<std::string, std::shared_ptr<TyrexSketchEntity>> m_entityMap;
        std::vector<std::shared_ptr<TyrexSketchEntity>> m_selectedEntities;

        // Interaction state
        InteractionMode m_currentMode;
        QPoint m_lastMousePos;
        bool m_isDragging;
        std::shared_ptr<TyrexSketchEntity> m_draggedEntity;
        ControlPoint m_draggedControlPoint;
        gp_Pnt2d m_dragStartPosition;

        // Drawing state
        bool m_firstPointSet;
        gp_Pnt2d m_firstPoint;
        std::shared_ptr<TyrexSketchEntity> m_previewEntity;

        // Control point visualization
        std::vector<Handle(AIS_InteractiveObject)> m_controlPointObjects;
    };

} // namespace TyrexCAD

#endif // TYREXSKETCHMANAGER_H