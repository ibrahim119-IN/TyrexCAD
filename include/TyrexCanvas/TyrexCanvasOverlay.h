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

    /**
     * @brief Grid rendering style
     */
    enum class GridStyle {
        Lines,      ///< Traditional line grid
        Dots,       ///< Dot grid at intersections
        Crosses     ///< Small crosses at intersections
    };

    /**
     * @brief Grid configuration settings
     */
    struct GridConfig {
        // Visual appearance
        Quantity_Color backgroundColor{ 0.0, 0.0, 0.0, Quantity_TOC_RGB };
        Quantity_Color gridColorMajor{ 0.5, 0.5, 0.5, Quantity_TOC_RGB };
        Quantity_Color gridColorMinor{ 0.3, 0.3, 0.3, Quantity_TOC_RGB };
        Quantity_Color axisColorX{ 1.0, 0.0, 0.0, Quantity_TOC_RGB };
        Quantity_Color axisColorY{ 0.0, 1.0, 0.0, Quantity_TOC_RGB };

        // Grid settings
        double baseSpacing = 10.0;
        int majorLineInterval = 5;
        int majorFactor = 5;
        double lineWidthMajor = 0.5;
        double lineWidthMinor = 0.25;
        double minorLineWidth = 1.0;
        double axisLineWidth = 2.0;
        GridStyle style = GridStyle::Lines;

        // Grid style specific
        double dotSize = 3.0;
        double crossSize = 5.0;
        double originMarkerSize = 5.0;
        int maxDots = 1000;

        // Performance limits
        int maxGridLinesH = 200;
        int maxGridLinesV = 200;

        // Coordinate display
        QPoint coordinateOffset{ 20, 20 };
        QColor coordinateColor{ 255, 255, 255 };
        bool showCoordinates = false;

        // Snap settings
        double snapTolerance = 0.5;

        // Adaptive behavior
        bool adaptiveSpacing = true;
        double minSpacingPixels = 15.0;
        double maxSpacingPixels = 100.0;
        double minPixelSpacing = 15.0;
        double maxPixelSpacing = 100.0;

        // Display options
        bool showOriginMarker = true;
        bool showAxes = true;
        double gridExtensionFactor = 1.2;
        bool snapEnabled = true;
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

    private:
        Handle(AIS_InteractiveContext) m_context;
        Handle(V3d_View) m_view;

        // Configuration
        GridConfig m_config;
        bool m_gridVisible;
        bool m_axisVisible;
        double m_currentSpacing;

        // Visual objects
        std::vector<Handle(AIS_InteractiveObject)> m_gridObjects;
        std::vector<Handle(AIS_InteractiveObject)> m_axisObjects;
    };

} // namespace TyrexCAD

#endif // TYREX_CANVAS_OVERLAY_H