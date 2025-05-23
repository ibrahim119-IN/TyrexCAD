#pragma once
/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_CANVAS_OVERLAY_H
#define TYREX_CANVAS_OVERLAY_H

#include <memory>
#include <vector>
#include <QObject>
#include <QPainter>
#include <QImage>

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <AIS_InteractiveObject.hxx>
#include <V3d_View.hxx>
#include <AIS_InteractiveContext.hxx>
#include <gp_Pnt2d.hxx>
#include <Quantity_Color.hxx>
#include <Graphic3d_ArrayOfPoints.hxx>
#include <Graphic3d_ArrayOfPolylines.hxx>

namespace TyrexCAD {

    /**
     * @brief Grid display style
     */
    enum class GridStyle {
        Lines,      ///< Line grid (AutoCAD style)
        Dots,       ///< Dot grid 
        Crosses     ///< Cross marks at intersections
    };

    /**
     * @brief Grid configuration structure
     */
    struct GridConfig {
        // Basic settings
        double baseSpacing = 10.0;              ///< Base grid spacing in world units
        int majorLineInterval = 5;              ///< Major line every N lines
        GridStyle style = GridStyle::Lines;     ///< Grid display style

        // Colors
        Quantity_Color backgroundColor;         ///< Canvas background color
        Quantity_Color gridColorMajor;          ///< Color for major grid lines
        Quantity_Color gridColorMinor;          ///< Color for minor grid lines
        Quantity_Color axisColorX;              ///< X-axis color
        Quantity_Color axisColorY;              ///< Y-axis color

        // Line properties
        double lineWidthMajor = 1.0;            ///< Width for major grid lines
        double lineWidthMinor = 0.5;            ///< Width for minor grid lines
        double axisLineWidth = 2.0;             ///< Width for axes

        // Dot properties (for dot grid)
        double dotSize = 2.0;                   ///< Size of grid dots

        // Dynamic display
        double minSpacingPixels = 15.0;         ///< Minimum spacing in pixels
        double maxSpacingPixels = 100.0;        ///< Maximum spacing in pixels
        bool adaptiveSpacing = true;            ///< Enable adaptive spacing

        // Display options
        bool showOriginMarker = true;           ///< Show special marker at origin
        bool infiniteGrid = false;              ///< Show grid beyond view bounds
        double gridExtensionFactor = 1.2;       ///< How much to extend grid beyond view

        GridConfig()
            : backgroundColor(0.1, 0.1, 0.1, Quantity_TOC_RGB)      // Dark gray
            , gridColorMajor(0.25, 0.25, 0.25, Quantity_TOC_RGB)   // Medium gray
            , gridColorMinor(0.15, 0.15, 0.15, Quantity_TOC_RGB)   // Light gray
            , axisColorX(0.7, 0.0, 0.0, Quantity_TOC_RGB)          // Dark red
            , axisColorY(0.0, 0.5, 0.0, Quantity_TOC_RGB)          // Dark green
        {
        }
    };

    /**
     * @brief Canvas overlay system for grid and UCS axes display
     *
     * Provides AutoCAD-style grid and axes rendering with proper 2D overlay
     */
    class TyrexCanvasOverlay : public QObject {
        Q_OBJECT

    public:
        /**
         * @brief Constructor
         * @param context OpenCascade interactive context
         * @param view OpenCascade 3D view
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
         * @brief Update the overlay (called on zoom/pan/resize)
         */
        void update();

        /**
         * @brief Force a complete redraw of the overlay
         */
        void redraw();

        /**
         * @brief Set grid visibility
         * @param visible True to show grid
         */
        void setGridVisible(bool visible);

        /**
         * @brief Check if grid is visible
         * @return True if grid is visible
         */
        bool isGridVisible() const;

        /**
         * @brief Set axes visibility
         * @param visible True to show axes
         */
        void setAxisVisible(bool visible);

        /**
         * @brief Check if axes are visible
         * @return True if axes are visible
         */
        bool isAxisVisible() const;

        /**
         * @brief Set grid configuration
         * @param config New grid configuration
         */
        void setGridConfig(const GridConfig& config);

        /**
         * @brief Get current grid configuration
         * @return Current grid configuration
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
         * @brief Get visible grid intersection points
         * @return Vector of grid intersection points in world coordinates
         */
        std::vector<gp_Pnt2d> getVisibleGridPoints() const;

        /**
         * @brief Get the current dynamic grid spacing
         * @return Current grid spacing in world units
         */
        double getCurrentGridSpacing() const;

        /**
         * @brief Snap a point to the nearest grid intersection
         * @param point Input point
         * @return Snapped point
         */
        gp_Pnt2d snapToGrid(const gp_Pnt2d& point) const;

        /**
         * @brief Get grid line at mouse position
         * @param screenPos Screen position
         * @param tolerance Pixel tolerance
         * @return True if on grid line
         */
        bool isOnGridLine(const QPoint& screenPos, double tolerance = 3.0) const;

        /**
         * @brief Convert screen to world coordinates
         * @param screenPos Screen position
         * @return World coordinates
         */
        gp_Pnt2d screenToWorld(const QPoint& screenPos) const;

        /**
         * @brief Convert world to screen coordinates
         * @param worldPos World position
         * @return Screen coordinates
         */
        QPoint worldToScreen(const gp_Pnt2d& worldPos) const;

    signals:
        /**
         * @brief Emitted when grid spacing changes
         * @param spacing New grid spacing
         */
        void gridSpacingChanged(double spacing);

        /**
         * @brief Emitted when overlay is updated
         */
        void overlayUpdated();

        /**
         * @brief Emitted when grid style changes
         * @param style New grid style
         */
        void gridStyleChanged(GridStyle style);

    private:
        // Core components
        Handle(AIS_InteractiveContext) m_context;
        Handle(V3d_View) m_view;

        // Configuration
        GridConfig m_gridConfig;
        bool m_gridVisible;
        bool m_axisVisible;

        // View state
        double m_currentScale;
        double m_dynamicGridSpacing;
        gp_Pnt2d m_viewCenter;
        gp_Pnt2d m_viewMin;
        gp_Pnt2d m_viewMax;
        int m_viewWidth;
        int m_viewHeight;

        // Visual objects
        Handle(AIS_InteractiveObject) m_gridLinesObject;
        Handle(AIS_InteractiveObject) m_gridDotsObject;
        Handle(AIS_InteractiveObject) m_xAxisObject;
        Handle(AIS_InteractiveObject) m_yAxisObject;
        Handle(AIS_InteractiveObject) m_originMarker;

        // Grid points cache
        mutable std::vector<gp_Pnt2d> m_cachedGridPoints;
        mutable bool m_gridPointsCacheDirty;

        // Internal methods
        void calculateDynamicSpacing();
        void updateViewBounds();
        void updateGridGeometry();
        void updateAxesGeometry();
        void clearOverlay();

        // Grid creation methods
        void createLineGrid();
        void createDotGrid();
        void createCrossGrid();

        // Helper methods
        Handle(Graphic3d_ArrayOfPolylines) createGridLines() const;
        Handle(Graphic3d_ArrayOfPoints) createGridDots() const;
        void createOriginMarker();

        // Optimization
        bool shouldDrawLine(double coord, double min, double max) const;
        int calculateGridDensity() const;
    };

} // namespace TyrexCAD

#endif // TYREX_CANVAS_OVERLAY_H