#ifndef TYREXGRIDCONFIG_H
#define TYREXGRIDCONFIG_H

#include <Quantity_Color.hxx>

namespace TyrexCAD {

    /**
     * @brief Grid display style enumeration
     */
    enum class GridStyle {
        Lines = 0,      // Traditional line grid
        Dots,           // Dot grid (like graph paper)
        Crosses         // Cross marks at intersections
    };

    /**
     * @brief Grid configuration structure
     *
     * Contains all settings for grid appearance and behavior
     */
    struct GridConfig {
        // Visual properties
        Quantity_Color backgroundColor;
        Quantity_Color gridColorMajor;
        Quantity_Color gridColorMinor;
        Quantity_Color axisColorX;
        Quantity_Color axisColorY;
        Quantity_Color axisColorZ;

        // Grid style
        GridStyle style = GridStyle::Lines;

        // Grid spacing
        double baseSpacing = 10.0;          // Base grid spacing in world units
        int majorGridInterval = 5;          // Every Nth line is major
        bool adaptiveSpacing = true;        // Auto-adjust spacing based on zoom
        double minPixelSpacing = 15.0;      // Minimum spacing in pixels
        double maxPixelSpacing = 100.0;     // Maximum spacing in pixels

        // Display options
        bool showAxes = true;
        bool showOriginMarker = true;
        bool showRulers = false;
        bool showCoordinates = true;

        // Behavior
        bool snapEnabled = false;
        double snapTolerance = 0.5;         // Snap distance as fraction of spacing

        // Line properties
        float lineWidthMajor = 1.0f;
        float lineWidthMinor = 0.5f;
        float axisLineWidth = 2.0f;

        // Transparency
        float gridOpacity = 0.5f;           // 0.0 = transparent, 1.0 = opaque

        /**
         * @brief Default constructor with sensible defaults
         */
        GridConfig() :
            backgroundColor(0.05, 0.05, 0.05, Quantity_TOC_RGB),
            gridColorMajor(0.3, 0.3, 0.3, Quantity_TOC_RGB),
            gridColorMinor(0.2, 0.2, 0.2, Quantity_TOC_RGB),
            axisColorX(1.0, 0.0, 0.0, Quantity_TOC_RGB),
            axisColorY(0.0, 1.0, 0.0, Quantity_TOC_RGB),
            axisColorZ(0.0, 0.0, 1.0, Quantity_TOC_RGB)
        {
        }

        /**
         * @brief Create a light theme configuration
         */
        static GridConfig lightTheme() {
            GridConfig config;
            config.backgroundColor = Quantity_Color(0.95, 0.95, 0.95, Quantity_TOC_RGB);
            config.gridColorMajor = Quantity_Color(0.7, 0.7, 0.7, Quantity_TOC_RGB);
            config.gridColorMinor = Quantity_Color(0.85, 0.85, 0.85, Quantity_TOC_RGB);
            config.axisColorX = Quantity_Color(0.8, 0.0, 0.0, Quantity_TOC_RGB);
            config.axisColorY = Quantity_Color(0.0, 0.6, 0.0, Quantity_TOC_RGB);
            config.axisColorZ = Quantity_Color(0.0, 0.0, 0.8, Quantity_TOC_RGB);
            return config;
        }

        /**
         * @brief Create a dark theme configuration
         */
        static GridConfig darkTheme() {
            GridConfig config;
            config.backgroundColor = Quantity_Color(0.05, 0.05, 0.05, Quantity_TOC_RGB);
            config.gridColorMajor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
            config.gridColorMinor = Quantity_Color(0.2, 0.2, 0.2, Quantity_TOC_RGB);
            config.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
            config.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);
            config.axisColorZ = Quantity_Color(0.0, 0.0, 1.0, Quantity_TOC_RGB);
            return config;
        }

        /**
         * @brief Create an AutoCAD-style configuration
         */
        static GridConfig autocadStyle() {
            GridConfig config;
            config.backgroundColor = Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB);
            config.gridColorMajor = Quantity_Color(0.25, 0.25, 0.25, Quantity_TOC_RGB);
            config.gridColorMinor = Quantity_Color(0.15, 0.15, 0.15, Quantity_TOC_RGB);
            config.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
            config.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);
            config.axisColorZ = Quantity_Color(0.0, 0.0, 1.0, Quantity_TOC_RGB);
            config.style = GridStyle::Dots;
            config.showOriginMarker = true;
            config.snapEnabled = true;
            return config;
        }

        /**
         * @brief Create a blueprint-style configuration
         */
        static GridConfig blueprintStyle() {
            GridConfig config;
            config.backgroundColor = Quantity_Color(0.0, 0.1, 0.3, Quantity_TOC_RGB);
            config.gridColorMajor = Quantity_Color(0.8, 0.8, 1.0, Quantity_TOC_RGB);
            config.gridColorMinor = Quantity_Color(0.4, 0.4, 0.6, Quantity_TOC_RGB);
            config.axisColorX = Quantity_Color(1.0, 0.5, 0.5, Quantity_TOC_RGB);
            config.axisColorY = Quantity_Color(0.5, 1.0, 0.5, Quantity_TOC_RGB);
            config.axisColorZ = Quantity_Color(0.5, 0.5, 1.0, Quantity_TOC_RGB);
            config.gridOpacity = 0.7f;
            return config;
        }
    };

    /**
     * @brief Grid snap result structure
     */
    struct GridSnapResult {
        bool snapped = false;
        double snappedX = 0.0;
        double snappedY = 0.0;
        double originalX = 0.0;
        double originalY = 0.0;

        GridSnapResult() = default;
        GridSnapResult(double x, double y) : originalX(x), originalY(y) {}
    };

} // namespace TyrexCAD

#endif // TYREXGRIDCONFIG_H