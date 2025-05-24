/***************************************************************************
 * Copyright (c) 2025 TyrexCAD development team                          *
 * *
 * This file is part of the TyrexCAD CAx development system.             *
 * *
 ***************************************************************************/

#ifndef TYREX_CANVAS_OVERLAY_H
#define TYREX_CANVAS_OVERLAY_H

#include <QObject>
#include <memory>
#include <vector>

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <AIS_InteractiveObject.hxx>
#include <Quantity_Color.hxx>
#include <gp_Pnt2d.hxx>
#include <gp_Vec2d.hxx>

// Qt includes
#include <QColor> 
#include <QFont>  
#include <QPointF> 

// Forward declarations
class AIS_InteractiveContext;
class V3d_View;
class Geom_TrimmedCurve;

namespace TyrexCAD {

    enum class GridStyle {
        Lines,
        Dots,
        Crosses
    };

    struct GridConfig {
        Quantity_Color backgroundColor{ 0.0, 0.0, 0.0, Quantity_TOC_RGB };
        Quantity_Color gridColorMajor{ 0.5, 0.5, 0.5, Quantity_TOC_RGB };
        Quantity_Color gridColorMinor{ 0.3, 0.3, 0.3, Quantity_TOC_RGB };
        Quantity_Color axisColorX{ 1.0, 0.0, 0.0, Quantity_TOC_RGB };
        Quantity_Color axisColorY{ 0.0, 1.0, 0.0, Quantity_TOC_RGB };
        Quantity_Color coordinateColor{ 1.0, 1.0, 1.0, Quantity_TOC_RGB };

        double baseSpacing = 10.0;
        int majorLineInterval = 5;
        double lineWidthMajor = 1.0;
        double lineWidthMinor = 0.5;
        double axisLineWidth = 1.5;
        GridStyle style = GridStyle::Lines;

        bool adaptiveSpacing = true;
        double minSpacingPixels = 15.0;
        double maxSpacingPixels = 100.0;

        bool showAxes = true;
        bool showOriginMarker = true;
        float originMarkerSize = 5.0f;
        double gridExtensionFactor = 1.2;
        bool snapEnabled = true;
        double snapTolerance = 5.0;

        float dotSize = 2.0f;
        float crossSize = 5.0f;
        int maxDots = 5000;

        bool showCoordinates = false;
        QPointF coordinateOffset = QPointF(10, -10);
        QFont coordinateFont = QFont("Arial", 10);

        int maxGridLinesH = 500;
        int maxGridLinesV = 500;
    };

    class TyrexCanvasOverlay : public QObject
    {
        Q_OBJECT
    public:
        TyrexCanvasOverlay(const Handle(AIS_InteractiveContext)& context,
            const Handle(V3d_View)& view,
            QObject* parent = nullptr);
        ~TyrexCanvasOverlay();

        void setGridVisible(bool visible);
        bool isGridVisible() const;
        void setAxisVisible(bool visible);
        bool isAxisVisible() const;
        void setGridConfig(const GridConfig& config);
        const GridConfig& getGridConfig() const;
        void setGridStyle(GridStyle style);
        GridStyle getGridStyle() const;
        double getCurrentGridSpacing() const;
        gp_Pnt2d snapToGrid(const gp_Pnt2d& point) const;
        void update();
        void redraw();

    signals:
        void gridSpacingChanged(double spacing);
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
        GridConfig m_config;
        bool m_gridVisible;
        bool m_axisVisible;
        double m_currentSpacing;
        std::vector<Handle(AIS_InteractiveObject)> m_gridObjects;
        std::vector<Handle(AIS_InteractiveObject)> m_axisObjects;
    };

} // namespace TyrexCAD

#endif // TYREX_CANVAS_OVERLAY_H