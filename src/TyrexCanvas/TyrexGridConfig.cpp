#include "TyrexCanvas/TyrexGridConfig.h"
#include <Quantity_Color.hxx>

namespace TyrexCAD {

GridConfig::GridConfig() :
    backgroundColor(0.05, 0.05, 0.05, Quantity_TOC_RGB),
    gridColorMajor(0.3, 0.3, 0.3, Quantity_TOC_RGB),
    gridColorMinor(0.2, 0.2, 0.2, Quantity_TOC_RGB),
    axisColorX(1.0, 0.0, 0.0, Quantity_TOC_RGB),
    axisColorY(0.0, 1.0, 0.0, Quantity_TOC_RGB),
    axisColorZ(0.0, 0.0, 1.0, Quantity_TOC_RGB)
{}

GridConfig GridConfig::lightTheme() {
    GridConfig config;
    config.backgroundColor = Quantity_Color(0.95, 0.95, 0.95, Quantity_TOC_RGB);
    config.gridColorMajor = Quantity_Color(0.7, 0.7, 0.7, Quantity_TOC_RGB);
    config.gridColorMinor = Quantity_Color(0.85, 0.85, 0.85, Quantity_TOC_RGB);
    config.axisColorX = Quantity_Color(0.8, 0.0, 0.0, Quantity_TOC_RGB);
    config.axisColorY = Quantity_Color(0.0, 0.6, 0.0, Quantity_TOC_RGB);
    config.axisColorZ = Quantity_Color(0.0, 0.0, 0.8, Quantity_TOC_RGB);
    return config;
}

GridConfig GridConfig::darkTheme() {
    GridConfig config;
    config.backgroundColor = Quantity_Color(0.05, 0.05, 0.05, Quantity_TOC_RGB);
    config.gridColorMajor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
    config.gridColorMinor = Quantity_Color(0.2, 0.2, 0.2, Quantity_TOC_RGB);
    config.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
    config.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);
    config.axisColorZ = Quantity_Color(0.0, 0.0, 1.0, Quantity_TOC_RGB);
    return config;
}

GridConfig GridConfig::autocadStyle() {
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

GridConfig GridConfig::blueprintStyle() {
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

} // namespace TyrexCAD
