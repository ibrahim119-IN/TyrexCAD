/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_CANVAS_OVERLAY_H
#define TYREX_CANVAS_OVERLAY_H

#include <QObject>
#include <memory>
#include <vector>
#include <QColor>
#include <QPoint>

#include "TyrexCanvas/TyrexGridConfig.h"

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Quantity_Color.hxx>
#include <gp_Pnt2d.hxx>
#include <gp_Vec2d.hxx>
#include <gp_Pnt.hxx>

// Forward declarations
class V3d_View;

namespace TyrexCAD {

    /**
     * @brief Grid level information for multi-level adaptive grid
     */
    struct GridLevel {
        double spacing;
        float opacity;
        float lineWidth;
        Quantity_Color color;
        bool visible;
        int priority; // 0 = sub, 1 = primary, 2 = major
    };

    /**
     * @brief Grid line data for rendering
     */
    struct GridLineData {
        gp_Pnt startPoint;
        gp_Pnt endPoint;
        Quantity_Color color;
        float lineWidth;
        float opacity;
    };

    /**
     * @brief Grid point data for dots/crosses rendering
     */
    struct GridPointData {
        gp_Pnt position;
        Quantity_Color color;
        float size;
        float opacity;
    };

    /**
     * @brief Canvas overlay - pure grid geometry computation engine
     *
     * This class is responsible ONLY for computing grid geometry based on
     * view parameters and configuration. It does NOT create any AIS objects
     * or perform rendering. All output is raw geometric data.
     */
    class TyrexCanvasOverlay : public QObject
    {
        Q_OBJECT
    public:
        /**
         * @brief Constructor
         * @param view 3D view for coordinate conversion
         * @param parent Parent QObject
         */
        TyrexCanvasOverlay(const Handle(V3d_View)& view,
            QObject* parent = nullptr);

        /**
         * @brief Destructor
         */
        ~TyrexCanvasOverlay();

        /**
         * @brief Set grid visibility
         * @param visible True to show grid
         */
        void setGridVisible(bool visible);

        /**
         * @brief Check if grid is visible
         * @return True if grid is shown
         */
        bool isGridVisible() const;

        /**
         * @brief Set grid configuration
         * @param config New grid settings
         */
        void setGridConfig(const GridConfig& config);

        /**
         * @brief Get current grid configuration
         * @return Current grid settings
         */
        const GridConfig& getGridConfig() const;

        /**
         * @brief Set grid style
         * @param style New grid style
         */
        void setGridStyle(GridStyle style);

        /**
         * @brief Get current grid style
         * @return Current grid style
         */
        GridStyle getGridStyle() const;

        /**
         * @brief Set grid spacing
         * @param spacing New grid spacing
         */
        void setGridSpacing(double spacing);

        /**
         * @brief Get current grid spacing
         * @return Current effective grid spacing
         */
        double getCurrentGridSpacing() const;

        /**
         * @brief Set snap enabled state
         * @param enabled True to enable snap
         */
        void setSnapEnabled(bool enabled);

        /**
         * @brief Convert screen coordinates to world coordinates
         * @param screenPos Screen position
         * @return World coordinates as 2D point
         */
        gp_Pnt2d screenToWorld(const QPoint& screenPos) const;

        /**
         * @brief Snap point to grid
         * @param point Input point
         * @return Snapped point
         */
        gp_Pnt2d snapToGrid(const gp_Pnt2d& point) const;

        /**
         * @brief Compute grid lines
         * @return Grid lines for current view state
         */
        std::vector<GridLineData> computeGridLines();

        /**
         * @brief Compute grid points (for dots/crosses style)
         * @return Grid points for current view state
         */
        std::vector<GridPointData> computeGridPoints();

        /**
         * @brief Compute axis lines
         * @return Axis line data
         */
        std::vector<GridLineData> computeAxisLines();

        /**
         * @brief Update view parameters
         * Must be called when view changes
         */
        void updateViewParameters();

        /**
         * @brief Get current grid levels
         * @return Vector of grid levels
         */
        const std::vector<GridLevel>& getGridLevels() const { return m_gridLevels; }

        /**
         * @brief Force update of grid computation
         */
        void forceUpdate();

        /**
         * @brief Set axis visibility (compatibility method)
         * @param visible True to show axes
         */
        void setAxisVisible(bool visible);

        /**
         * @brief Update grid (compatibility method)
         */
        void update();

    signals:
        /**
         * @brief Emitted when grid spacing changes
         * @param spacing New grid spacing
         */
        void gridSpacingChanged(double spacing);

        /**
         * @brief Emitted when grid configuration changes
         */
        void gridConfigChanged();

        /**
         * @brief Emitted when grid data needs to be re-rendered
         */
        void gridDataChanged();

    private:
        // View parameter calculation
        void calculateViewBounds(double& minX, double& maxX, double& minY, double& maxY) const;
        gp_Vec2d getViewExtents() const;
        double getViewScale() const;

        // Multi-level grid system
        void calculateMultiLevelSpacing();
        std::vector<GridLevel> generateGridLevels(double viewScale) const;
        double calculateOptimalSpacing(double viewScale) const;
        float calculateLevelOpacity(double pixelSpacing, double minSpacing, double maxSpacing) const;

        // Grid line computation
        std::vector<GridLineData> computeGridLinesForLevel(const GridLevel& level) const;
        std::vector<GridPointData> computeGridPointsForLevel(const GridLevel& level) const;

        // Utility functions
        static float smoothstep(float edge0, float edge1, float x);
        bool isLineInViewFrustum(double x1, double y1, double x2, double y2) const;
        bool isPointInView(double x, double y) const;
        int clampGridLineCount(int count) const;

    private:
        Handle(V3d_View) m_view;

        // Configuration
        GridConfig m_config;
        bool m_gridVisible;
        double m_currentSpacing;

        // Multi-level grid state
        std::vector<GridLevel> m_gridLevels;
        double m_viewScale;
        gp_Vec2d m_viewCenter;
        gp_Vec2d m_viewExtents;

        // View bounds cache
        double m_viewMinX, m_viewMaxX;
        double m_viewMinY, m_viewMaxY;

        // State tracking
        double m_lastViewScale;
        gp_Vec2d m_lastViewCenter;
        bool m_needsUpdate;

        // Constants
        static constexpr double GRID_EXTENSION_FACTOR = 1.5;
        static constexpr int MAX_GRID_LINES = 500;
        static constexpr int MAX_GRID_POINTS = 2000;
        static constexpr double VIEW_SCALE_EPSILON = 0.01;
        static constexpr double MIN_SPACING = 0.001;
        static constexpr double MAX_SPACING = 10000.0;
    };

} // namespace TyrexCAD

#endif // TYREX_CANVAS_OVERLAY_H