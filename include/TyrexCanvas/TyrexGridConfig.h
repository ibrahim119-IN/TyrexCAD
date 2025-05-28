#ifndef TYREXGRIDCONFIG_H
#define TYREXGRIDCONFIG_H

#include <Quantity_Color.hxx>
#include <QColor>
#include <QPoint>

namespace TyrexCAD {

    enum class GridStyle {
        Lines = 0,
        Dots,
        Crosses
    };

    struct GridConfig {
        // Colors
        Quantity_Color backgroundColor;
        Quantity_Color gridColorMajor;
        Quantity_Color gridColorMinor;
        Quantity_Color axisColorX;
        Quantity_Color axisColorY;
        Quantity_Color axisColorZ;

        // Style and spacing
        GridStyle style = GridStyle::Lines;
        double baseSpacing = 10.0;
        int majorGridInterval = 5;
        bool adaptiveSpacing = true;
        double minPixelSpacing = 15.0;
        double maxPixelSpacing = 100.0;

        // Display options
        bool showAxes = true;
        bool showOriginMarker = true;
        bool showRulers = false;
        bool showCoordinates = true;

        // Snap settings
        bool snapEnabled = false;
        double snapTolerance = 0.5;

        // Line widths
        float lineWidthMajor = 1.0f;
        float lineWidthMinor = 0.5f;
        float axisLineWidth = 2.0f;
        float gridOpacity = 0.5f;

        // Grid limits
        int maxGridLinesH = 200;
        int maxGridLinesV = 200;
        int maxDots = 5000;
        double majorFactor = 5.0;
        int majorLineInterval = 5;

        // Visual settings
        float dotSize = 3.0f;
        float crossSize = 6.0f;
        float originMarkerSize = 8.0f;
        double gridExtensionFactor = 1.2;

        // Coordinate display
        QColor coordinateColor = QColor(255, 255, 255);
        QPoint coordinateOffset = QPoint(10, -10);

        // Layer management
        int gridZLayerId = -1;  // Z-layer ID for grid objects
        bool useCustomLayer = true;  // Use custom Z-layer for grid

        // Update settings
        bool immediateUpdate = true;  // Force immediate updates
        bool doubleBuffering = true;  // Use double buffering

        // Constructors
        GridConfig();
        static GridConfig lightTheme();
        static GridConfig darkTheme();
        static GridConfig autocadStyle();
        static GridConfig blueprintStyle();
    };

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