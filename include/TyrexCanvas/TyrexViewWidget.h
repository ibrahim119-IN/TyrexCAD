/***************************************************************************
 * TyrexViewWidget Integration with Enhanced Grid Overlay System
 *
 * This shows how to integrate TyrexGridOverlayRenderer with the existing
 * TyrexViewWidget to achieve AutoCAD-style grid rendering with multiple styles.
 ***************************************************************************/

#ifndef TYREX_VIEW_WIDGET_H
#define TYREX_VIEW_WIDGET_H

#include <QOpenGLWidget>
#include <QOpenGLFunctions>
#include <memory>
#include "TyrexRendering/TyrexGridOverlayRenderer.h" 

 // Forward declarations
class V3d_View;
class QEnterEvent; // Forward declare QEnterEvent for enterEvent

namespace TyrexCAD {

    // TyrexCAD::GridStyle and TyrexCAD::GridConfig are defined via TyrexGridOverlayRenderer.h -> TyrexCanvasOverlay.h

    class TyrexViewerManager;
    class TyrexInteractionManager;
    class TyrexCanvasOverlay;

    class TyrexViewWidget : public QOpenGLWidget, protected QOpenGLFunctions
    {
        Q_OBJECT

    public:
        explicit TyrexViewWidget(QWidget* parent = nullptr);
        ~TyrexViewWidget();

        std::shared_ptr<TyrexViewerManager> viewerManager() const;
        TyrexInteractionManager* interactionManager() const;

        // === Grid control methods ===
        void setGridEnabled(bool enabled);
        bool isGridEnabled() const;
        void setGridConfig(const GridConfig& config);
        const GridConfig& getGridConfig() const;
        void setGridStyle(TyrexCAD::GridStyle style);
        TyrexCAD::GridStyle getGridStyle() const;

        bool snapToGrid(double worldX, double worldY,
            double& snappedX, double& snappedY) const;
        void screenToWorld(const QPoint& screenPos,
            double& worldX, double& worldY) const;
        double getCurrentGridSpacing() const;
        void setCoordinateDisplayEnabled(bool enabled);
        bool isCoordinateDisplayEnabled() const;
        void setSketchModeGrid(bool enabled);

    signals:
        void viewerInitialized();
        void gridConfigChanged();
        void gridSpacingChanged(double spacing);
        void cursorWorldPosition(double x, double y);

    protected:
        void initializeGL() override;
        void paintGL() override;
        void resizeGL(int w, int h) override;
        void mousePressEvent(QMouseEvent* e) override;
        void mouseMoveEvent(QMouseEvent* e) override;
        void mouseReleaseEvent(QMouseEvent* e) override;
        void wheelEvent(QWheelEvent* e) override;
        void leaveEvent(QEvent* event) override;

    private:
        void initializeManagers();
        void setupGridRenderer();
        void initializeOverlay();
        void updateCursorPosition(const QPoint& pos);

    private:
        std::shared_ptr<TyrexViewerManager> m_viewerManager;
        std::shared_ptr<TyrexCanvasOverlay> m_canvasOverlay;
        std::unique_ptr<TyrexGridOverlayRenderer> m_gridRenderer;
        bool m_gridInitialized;
        QPoint m_currentCursorPos;
        bool m_cursorInWidget;
    };

} // namespace TyrexCAD

#endif // TYREX_VIEW_WIDGET_H