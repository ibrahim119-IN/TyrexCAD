#ifndef TYREXGRIDCONFIG_H
#define TYREXGRIDCONFIG_H

#include <Quantity_Color.hxx>

namespace TyrexCAD {

    enum class GridStyle {
        Lines = 0,
        Dots,
        Crosses
    };

    struct GridConfig {
        Quantity_Color backgroundColor;
        Quantity_Color gridColorMajor;
        Quantity_Color gridColorMinor;
        Quantity_Color axisColorX;
        Quantity_Color axisColorY;
        Quantity_Color axisColorZ;
        GridStyle style = GridStyle::Lines;
        double baseSpacing = 10.0;
        int majorGridInterval = 5;
        bool adaptiveSpacing = true;
        double minPixelSpacing = 15.0;
        double maxPixelSpacing = 100.0;
        bool showAxes = true;
        bool showOriginMarker = true;
        bool showRulers = false;
        bool showCoordinates = true;
        bool snapEnabled = false;
        double snapTolerance = 0.5;
        float lineWidthMajor = 1.0f;
        float lineWidthMinor = 0.5f;
        float axisLineWidth = 2.0f;
        float gridOpacity = 0.5f;
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