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

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <AIS_InteractiveObject.hxx>
#include <V3d_View.hxx>
#include <AIS_InteractiveContext.hxx>
#include <gp_Pnt2d.hxx>
#include <Quantity_Color.hxx>

namespace TyrexCAD {

    /**
     * @brief Grid configuration structure
     */
    struct GridConfig {
        double baseSpacing = 10.0;              ///< Base grid spacing in world units
        int subdivisions = 5;                   ///< Number of subdivisions between major lines
        Quantity_Color gridColorMajor;          ///< Color for major grid lines
        Quantity_Color gridColorMinor;          ///< Color for minor grid lines
        double lineWidthMajor = 1.0;            ///< Width for major grid lines
        double lineWidthMinor = 0.5;            ///< Width for minor grid lines
        double minSpacingPixels = 15.0;         ///< Minimum spacing in pixels
        double maxSpacingPixels = 100.0;        ///< Maximum spacing in pixels
        int maxLinesPerAxis = 100;              ///< Maximum lines to draw per axis

        GridConfig()
            : gridColorMajor(0.3, 0.3, 0.3, Quantity_TOC_RGB)
            , gridColorMinor(0.2, 0.2, 0.2, Quantity_TOC_RGB)
        {
        }
    };

    /**
     * @brief Canvas overlay system for grid and UCS axes display
     *
     * This class manages the rendering of:
     * - Dynamic grid that adapts to zoom level
     * - UCS axes (X=red, Y=green)
     * - Grid intersection points for future snapping
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

    private:
        // Core components
        Handle(AIS_InteractiveContext) m_context;
        Handle(V3d_View) m_view;

        // Configuration
        GridConfig m_gridConfig;
        bool m_gridVisible;
        bool m_axisVisible;

        // Cached view state
        double m_currentScale;
        double m_dynamicGridSpacing;
        gp_Pnt2d m_viewMin;
        gp_Pnt2d m_viewMax;

        // Visual objects
        Handle(AIS_InteractiveObject) m_gridObject;
        Handle(AIS_InteractiveObject) m_xAxisObject;
        Handle(AIS_InteractiveObject) m_yAxisObject;

        // Grid points cache
        mutable std::vector<gp_Pnt2d> m_cachedGridPoints;
        mutable bool m_gridPointsCacheDirty;

        /**
         * @brief Calculate dynamic grid spacing based on zoom
         */
        void calculateDynamicSpacing();

        /**
         * @brief Update view bounds
         */
        void updateViewBounds();

        /**
         * @brief Create or update grid geometry
         */
        void updateGridGeometry();

        /**
         * @brief Create or update axes geometry
         */
        void updateAxesGeometry();

        /**
         * @brief Clear all overlay objects
         */
        void clearOverlay();

        /**
         * @brief Calculate grid lines to draw
         * @param lines Output vector of line endpoints
         * @param majorLines Output vector indicating if line is major
         */
        void calculateGridLines(std::vector<gp_Pnt>& lines,
            std::vector<bool>& majorLines) const;
    };

} // namespace TyrexCAD

#endif // TYREX_CANVAS_OVERLAY_H