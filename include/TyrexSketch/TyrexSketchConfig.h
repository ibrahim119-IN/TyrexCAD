#pragma once
/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_SKETCH_CONFIG_H
#define TYREX_SKETCH_CONFIG_H

#include <Quantity_Color.hxx>
#include <string>

namespace TyrexCAD {

    /**
     * @brief Configuration for sketch mode appearance and behavior
     */
    struct TyrexSketchConfig {
        // === Canvas Settings ===
        struct Canvas {
            Quantity_Color backgroundColor{ 0.0, 0.0, 0.0, Quantity_TOC_RGB };     // Black like AutoCAD
            Quantity_Color selectionColor{ 1.0, 1.0, 0.0, Quantity_TOC_RGB };      // Yellow
            Quantity_Color highlightColor{ 0.0, 1.0, 1.0, Quantity_TOC_RGB };      // Cyan
            Quantity_Color constraintColor{ 1.0, 0.0, 1.0, Quantity_TOC_RGB };     // Magenta
            double backgroundGradient = 0.0;  // 0 = solid, 1 = full gradient
        } canvas;

        // === Grid Settings ===
        struct Grid {
            bool visible = true;
            bool snapEnabled = true;
            double baseSpacing = 10.0;
            int majorLineInterval = 5;
            GridStyle style = GridStyle::Lines;

            // Colors
            Quantity_Color majorColor{ 0.3, 0.3, 0.3, Quantity_TOC_RGB };
            Quantity_Color minorColor{ 0.2, 0.2, 0.2, Quantity_TOC_RGB };

            // Adaptive settings
            bool adaptive = true;
            double minPixelSpacing = 15.0;
            double maxPixelSpacing = 100.0;
        } grid;

        // === Axes Settings ===
        struct Axes {
            bool visible = true;
            double lineWidth = 2.0;
            bool showOrigin = true;
            double originSize = 5.0;

            // Colors
            Quantity_Color xAxisColor{ 1.0, 0.0, 0.0, Quantity_TOC_RGB };  // Red
            Quantity_Color yAxisColor{ 0.0, 1.0, 0.0, Quantity_TOC_RGB };  // Green
            Quantity_Color originColor{ 1.0, 1.0, 1.0, Quantity_TOC_RGB }; // White
        } axes;

        // === Entity Display ===
        struct EntityDisplay {
            // Line entities
            double defaultLineWidth = 2.0;
            double selectedLineWidth = 3.0;
            double constructionLineWidth = 1.0;
            Quantity_Color defaultLineColor{ 1.0, 1.0, 1.0, Quantity_TOC_RGB };     // White
            Quantity_Color constructionLineColor{ 0.5, 0.5, 0.5, Quantity_TOC_RGB }; // Gray

            // Control points
            double controlPointSize = 8.0;
            double selectedControlPointSize = 10.0;
            Quantity_Color controlPointColor{ 1.0, 1.0, 0.0, Quantity_TOC_RGB };     // Yellow
            Quantity_Color selectedControlPointColor{ 1.0, 0.0, 0.0, Quantity_TOC_RGB }; // Red
        } entityDisplay;

        // === Interaction Settings ===
        struct Interaction {
            double pickTolerance = 10.0;         // Pixels
            double snapTolerance = 5.0;          // Pixels
            bool autoConstraints = true;         // Auto-detect constraints
            bool showDimensions = true;          // Show dynamic dimensions
            bool orthoMode = false;              // Force horizontal/vertical
            double orthoAngle = 0.0;             // Ortho angle in degrees
        } interaction;

        // === Performance Settings ===
        struct Performance {
            int maxGridLines = 200;              // Maximum grid lines to display
            int maxEntities = 10000;             // Maximum entities in sketch
            bool useDisplayLists = true;         // Use OpenGL display lists
            bool antialiasing = true;            // Enable antialiasing
            int msaaSamples = 4;                 // MSAA samples
        } performance;

        // === Default Configurations ===
        static TyrexSketchConfig defaultConfig() {
            return TyrexSketchConfig();
        }

        static TyrexSketchConfig autocadConfig() {
            TyrexSketchConfig config;
            // AutoCAD-like settings
            config.canvas.backgroundColor = Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB);
            config.grid.style = GridStyle::Dots;
            config.grid.majorColor = Quantity_Color(0.4, 0.4, 0.4, Quantity_TOC_RGB);
            config.grid.minorColor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
            return config;
        }

        static TyrexSketchConfig lightThemeConfig() {
            TyrexSketchConfig config;
            // Light theme settings
            config.canvas.backgroundColor = Quantity_Color(0.95, 0.95, 0.95, Quantity_TOC_RGB);
            config.grid.majorColor = Quantity_Color(0.7, 0.7, 0.7, Quantity_TOC_RGB);
            config.grid.minorColor = Quantity_Color(0.85, 0.85, 0.85, Quantity_TOC_RGB);
            config.entityDisplay.defaultLineColor = Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB);
            return config;
        }

        // === Save/Load Configuration ===
        bool saveToFile(const std::string& filename) const;
        bool loadFromFile(const std::string& filename);
    };

} // namespace TyrexCAD

#endif // TYREX_SKETCH_CONFIG_H