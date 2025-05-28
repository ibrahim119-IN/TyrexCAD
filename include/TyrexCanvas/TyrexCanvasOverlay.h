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

 // Include GridConfig definitions
#include "TyrexCanvas/TyrexGridConfig.h"

// OpenCascade includes
#include <Standard_Handle.hxx>
#include <AIS_InteractiveObject.hxx>
#include <Quantity_Color.hxx>
#include <gp_Pnt2d.hxx>
#include <gp_Vec2d.hxx>


// Forward declarations
class AIS_InteractiveContext;
class V3d_View;
class Geom_TrimmedCurve;

namespace TyrexCAD {

    // NEW: هيكل لتخزين معلومات مستوى الشبكة
    struct GridLevel {
        double spacing;
        float opacity;
        float lineWidth;
        Quantity_Color color;
        bool visible;
        int priority; // للترتيب: 0 = فرعي، 1 = أساسي، 2 = رئيسي
    };

    /**
     * @brief Canvas overlay system for grid, axes, and other 2D elements
     */
    class TyrexCanvasOverlay : public QObject
    {
        Q_OBJECT
    public:
        /**
         * @brief Constructor
         * @param context AIS interactive context
         * @param view 3D view for coordinate conversion
         * @param parent Parent QObject
         */
        TyrexCanvasOverlay(const Handle(AIS_InteractiveContext)& context,
            const Handle(V3d_View)& view,
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
         * @brief Set axes visibility
         * @param visible True to show axes
         */
        void setAxisVisible(bool visible);

        /**
         * @brief Check if axes are visible
         * @return True if axes are shown
         */
        bool isAxisVisible() const;

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
         * @brief Update overlay display
         */
        void update();

        /**
         * @brief Force redraw of overlay
         */
        void redraw();

        /**
         * @brief Force complete update of overlay
         * This method forces a complete recreation of the grid and axes
         * with proper viewer invalidation
         */
        void forceUpdate();

        /**
         * @brief Debug grid state
         */
        void debugGridState() const;

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

    private:
        void updateGrid();
        void updateAxes();
        void clearOverlay();
        void calculateAdaptiveSpacing();
        gp_Vec2d getViewExtents() const;
        void setupProperZLayer();

        // NEW: دوال محسّنة للشبكة اللانهائية
        void updateInfiniteGrid();
        void calculateViewBounds(double& minX, double& maxX, double& minY, double& maxY) const;
        bool isLineInViewFrustum(double x1, double y1, double x2, double y2) const;

        // NEW: دوال لنظام المستويات المتعددة
        void calculateMultiLevelSpacing();
        std::vector<GridLevel> generateGridLevels(double viewScale) const;
        double calculateOptimalSpacing(double viewScale) const;
        float calculateLevelOpacity(double pixelSpacing, double minSpacing, double maxSpacing) const;
        void drawGridLevel(const GridLevel& level);

        // NEW: دوال مساعدة للأداء
        void batchCreateGridLines(const std::vector<std::pair<gp_Pnt, gp_Pnt>>& lines,
            const GridLevel& level);
        static float smoothstep(float edge0, float edge1, float x);

    private:
        Handle(AIS_InteractiveContext) m_context;
        Handle(V3d_View) m_view;

        // Configuration
        GridConfig m_config;
        bool m_gridVisible;
        bool m_axisVisible;
        double m_currentSpacing;

        // NEW: متغيرات للنظام المحسّن
        std::vector<GridLevel> m_gridLevels;
        double m_viewScale;
        mutable gp_Vec2d m_viewCenter;

        // Cache for performance
        gp_Vec2d m_lastExtents;
        double m_lastSpacing;
        GridStyle m_lastStyle;
        double m_lastViewScale;
        bool m_gridNeedsUpdate;

        // Visual objects
        std::vector<Handle(AIS_InteractiveObject)> m_gridObjects;
        std::vector<Handle(AIS_InteractiveObject)> m_axisObjects;

        // NEW: ثوابت لتحسين الأداء
        static constexpr double GRID_EXTENSION_FACTOR = 2.0; // توسيع الشبكة خارج الرؤية
        static constexpr int MAX_GRID_LINES = 1000; // حد أقصى للخطوط لمنع تدهور الأداء
        static constexpr double VIEW_SCALE_EPSILON = 0.01; // حساسية تغيير المقياس
    };

} // namespace TyrexCAD

#endif // TYREX_CANVAS_OVERLAY_H