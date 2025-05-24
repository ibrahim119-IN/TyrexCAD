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
#include "TyrexRendering/TyrexGridOverlayRenderer.h" // Updated include

 // Forward declarations
class V3d_View;

namespace TyrexCAD {
    class TyrexViewerManager;
    class TyrexInteractionManager;

    class TyrexViewWidget : public QOpenGLWidget, protected QOpenGLFunctions
    {
        Q_OBJECT

    public:
        explicit TyrexViewWidget(QWidget* parent = nullptr);
        ~TyrexViewWidget();

        std::shared_ptr<TyrexViewerManager> viewerManager() const;
        TyrexInteractionManager* interactionManager() const;

        // === Grid control methods ===
        /**
         * @brief Enable/disable grid rendering
         * @param enabled True to show grid
         */
        void setGridEnabled(bool enabled);

        /**
         * @brief Check if grid is enabled
         * @return True if grid is visible
         */
        bool isGridEnabled() const;

        /**
         * @brief Set grid configuration
         * @param config Grid settings
         */
        void setGridConfig(const GridConfig& config);

        /**
         * @brief Get current grid configuration
         * @return Grid settings
         */
        const GridConfig& getGridConfig() const;

        /**
         * @brief Set grid style
         * @param style Grid rendering style
         */
        void setGridStyle(GridStyle style);

        /**
         * @brief Get current grid style
         * @return Current grid style
         */
        GridStyle getGridStyle() const;

        /**
         * @brief Snap point to grid
         * @param worldX Input world X coordinate
         * @param worldY Input world Y coordinate
         * @param snappedX Output snapped X
         * @param snappedY Output snapped Y
         * @return True if snapping was applied
         */
        bool snapToGrid(double worldX, double worldY,
            double& snappedX, double& snappedY) const;

        /**
         * @brief Convert screen point to world coordinates
         * @param screenPos Screen position
         * @param worldX Output world X
         * @param worldY Output world Y
         */
        void screenToWorld(const QPoint& screenPos,
            double& worldX, double& worldY) const;

        /**
         * @brief Get current grid spacing
         * @return Current effective grid spacing
         */
        double getCurrentGridSpacing() const;

        /**
         * @brief Enable/disable coordinate display
         * @param enabled True to show coordinates
         */
        void setCoordinateDisplayEnabled(bool enabled);

        /**
         * @brief Check if coordinate display is enabled
         * @return True if coordinates are shown
         */
        bool isCoordinateDisplayEnabled() const;

        /**
         * @brief Set sketch mode grid configuration
         * @param enabled True to use sketch-specific settings
         */
        void setSketchModeGrid(bool enabled);

    signals:
        void viewerInitialized();
        void gridConfigChanged();
        void cursorWorldPosition(double x, double y); // New signal

    protected:
        // OpenGL rendering
        void initializeGL() override;
        void paintGL() override;
        void resizeGL(int w, int h) override;

        // Event handling
        void mousePressEvent(QMouseEvent* e) override;
        void mouseMoveEvent(QMouseEvent* e) override;
        void mouseReleaseEvent(QMouseEvent* e) override;
        void wheelEvent(QWheelEvent* e) override;

    private:
        void initializeManagers();
        void setupGridRenderer();
        void updateCursorPosition(const QPoint& pos);

    private:
        std::shared_ptr<TyrexViewerManager> m_viewerManager;
        std::unique_ptr<TyrexInteractionManager> m_interactionManager;

        // === Grid overlay renderer ===
        std::unique_ptr<TyrexGridOverlayRenderer> m_gridRenderer;
        bool m_gridInitialized;

        // Current cursor position for coordinate display
        QPoint m_currentCursorPos;
        bool m_cursorInWidget;
    };

} // namespace TyrexCAD

#endif // TYREX_VIEW_WIDGET_H