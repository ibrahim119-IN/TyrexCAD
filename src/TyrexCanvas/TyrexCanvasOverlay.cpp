/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCanvas/TyrexCanvasOverlay.h"

 // OpenCascade includes
#include <AIS_Shape.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeVertex.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Wire.hxx>
#include <TopoDS_Compound.hxx>
#include <BRep_Builder.hxx>
#include <Prs3d_LineAspect.hxx>
#include <Prs3d_PointAspect.hxx>
#include <Aspect_TypeOfLine.hxx>
#include <Graphic3d_ArrayOfPoints.hxx>
#include <Graphic3d_ArrayOfPolylines.hxx>
#include <Graphic3d_ArrayOfSegments.hxx>
#include <AIS_PointCloud.hxx>
#include <AIS_Line.hxx>
#include <Geom_CartesianPoint.hxx>
#include <Geom_Line.hxx>
#include <gp_Lin.hxx>

// Qt includes
#include <QDebug>
#include <QTimer>
#include <cmath>
#include <algorithm>

namespace TyrexCAD {

    TyrexCanvasOverlay::TyrexCanvasOverlay(const Handle(AIS_InteractiveContext)& context,
        const Handle(V3d_View)& view,
        QObject* parent)
        : QObject(parent)
        , m_context(context)
        , m_view(view)
        , m_gridVisible(true)
        , m_axisVisible(true)
        , m_currentScale(1.0)
        , m_dynamicGridSpacing(10.0)
        , m_viewCenter(0, 0)
        , m_viewMin(-100, -100)
        , m_viewMax(100, 100)
        , m_viewWidth(800)
        , m_viewHeight(600)
        , m_gridPointsCacheDirty(true)
    {
        qDebug() << "TyrexCanvasOverlay created";

        // Set default AutoCAD-like colors
        m_gridConfig.backgroundColor = Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB);      // Black
        m_gridConfig.gridColorMajor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);      // Dark gray
        m_gridConfig.gridColorMinor = Quantity_Color(0.2, 0.2, 0.2, Quantity_TOC_RGB);      // Darker gray
        m_gridConfig.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);          // Red
        m_gridConfig.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);          // Green

        // Schedule initial update after construction
        QTimer::singleShot(100, this, [this]() {
            if (!m_view.IsNull() && !m_context.IsNull()) {
                update();
            }
            });
    }

    TyrexCanvasOverlay::~TyrexCanvasOverlay()
    {
        try {
            clearOverlay();
        }
        catch (...) {
            // Ignore exceptions in destructor
        }
        qDebug() << "TyrexCanvasOverlay destroyed";
    }

    void TyrexCanvasOverlay::update()
    {
        static bool updating = false;
        if (updating) return;
        updating = true;

        try {
            if (m_view.IsNull() || m_context.IsNull()) {
                updating = false;
                return;
            }

            // Update view state
            updateViewBounds();
            calculateDynamicSpacing();

            // Update geometries
            if (m_gridVisible) {
                updateGridGeometry();
            }

            if (m_axisVisible) {
                updateAxesGeometry();
            }

            m_gridPointsCacheDirty = true;

            // Update display
            if (!m_context.IsNull()) {
                QTimer::singleShot(0, this, [this]() {
                    if (!m_context.IsNull()) {
                        try {
                            m_context->UpdateCurrentViewer();
                        }
                        catch (...) {}
                    }
                    });
            }

            emit overlayUpdated();
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in update():" << ex.GetMessageString();
        }

        updating = false;
    }

    void TyrexCanvasOverlay::redraw()
    {
        clearOverlay();
        update();
    }

    void TyrexCanvasOverlay::setGridVisible(bool visible)
    {
        if (m_gridVisible == visible) return;

        m_gridVisible = visible;

        if (!m_gridVisible) {
            // Remove grid objects
            if (!m_gridLinesObject.IsNull() && !m_context.IsNull()) {
                m_context->Remove(m_gridLinesObject, Standard_False);
                m_gridLinesObject.Nullify();
            }
            if (!m_gridDotsObject.IsNull() && !m_context.IsNull()) {
                m_context->Remove(m_gridDotsObject, Standard_False);
                m_gridDotsObject.Nullify();
            }
        }
        else {
            updateGridGeometry();
        }
    }

    bool TyrexCanvasOverlay::isGridVisible() const
    {
        return m_gridVisible;
    }

    void TyrexCanvasOverlay::setAxisVisible(bool visible)
    {
        if (m_axisVisible == visible) return;

        m_axisVisible = visible;

        if (!m_axisVisible) {
            if (!m_context.IsNull()) {
                if (!m_xAxisObject.IsNull()) {
                    m_context->Remove(m_xAxisObject, Standard_False);
                    m_xAxisObject.Nullify();
                }
                if (!m_yAxisObject.IsNull()) {
                    m_context->Remove(m_yAxisObject, Standard_False);
                    m_yAxisObject.Nullify();
                }
                if (!m_originMarker.IsNull()) {
                    m_context->Remove(m_originMarker, Standard_False);
                    m_originMarker.Nullify();
                }
            }
        }
        else {
            updateAxesGeometry();
        }
    }

    bool TyrexCanvasOverlay::isAxisVisible() const
    {
        return m_axisVisible;
    }

    void TyrexCanvasOverlay::setGridConfig(const GridConfig& config)
    {
        m_gridConfig = config;
        m_gridPointsCacheDirty = true;

        // Update background color
        if (!m_view.IsNull()) {
            m_view->SetBackgroundColor(m_gridConfig.backgroundColor);
        }

        update();
    }

    const GridConfig& TyrexCanvasOverlay::getGridConfig() const
    {
        return m_gridConfig;
    }

    void TyrexCanvasOverlay::setGridStyle(GridStyle style)
    {
        if (m_gridConfig.style != style) {
            m_gridConfig.style = style;
            updateGridGeometry();
            emit gridStyleChanged(style);
        }
    }

    GridStyle TyrexCanvasOverlay::getGridStyle() const
    {
        return m_gridConfig.style;
    }

    std::vector<gp_Pnt2d> TyrexCanvasOverlay::getVisibleGridPoints() const
    {
        if (m_gridPointsCacheDirty) {
            m_cachedGridPoints.clear();

            if (m_gridVisible && m_dynamicGridSpacing > 0) {
                double spacing = m_dynamicGridSpacing;

                double xMin = std::floor(m_viewMin.X() / spacing) * spacing;
                double xMax = std::ceil(m_viewMax.X() / spacing) * spacing;
                double yMin = std::floor(m_viewMin.Y() / spacing) * spacing;
                double yMax = std::ceil(m_viewMax.Y() / spacing) * spacing;

                int maxPoints = 10000;
                int pointCount = 0;

                for (double x = xMin; x <= xMax && pointCount < maxPoints; x += spacing) {
                    for (double y = yMin; y <= yMax && pointCount < maxPoints; y += spacing) {
                        m_cachedGridPoints.emplace_back(x, y);
                        pointCount++;
                    }
                }
            }

            m_gridPointsCacheDirty = false;
        }

        return m_cachedGridPoints;
    }

    double TyrexCanvasOverlay::getCurrentGridSpacing() const
    {
        return m_dynamicGridSpacing;
    }

    gp_Pnt2d TyrexCanvasOverlay::snapToGrid(const gp_Pnt2d& point) const
    {
        if (!m_gridVisible || m_dynamicGridSpacing <= 0) {
            return point;
        }

        double spacing = m_dynamicGridSpacing;
        double x = std::round(point.X() / spacing) * spacing;
        double y = std::round(point.Y() / spacing) * spacing;

        return gp_Pnt2d(x, y);
    }

    bool TyrexCanvasOverlay::isOnGridLine(const QPoint& screenPos, double tolerance) const
    {
        if (!m_gridVisible) return false;

        gp_Pnt2d worldPos = screenToWorld(screenPos);
        double spacing = m_dynamicGridSpacing;

        double xRemainder = std::fmod(std::abs(worldPos.X()), spacing);
        double yRemainder = std::fmod(std::abs(worldPos.Y()), spacing);

        double minRemainder = std::min(xRemainder, spacing - xRemainder);
        double minRemainderY = std::min(yRemainder, spacing - yRemainder);

        return (minRemainder <= tolerance || minRemainderY <= tolerance);
    }

    gp_Pnt2d TyrexCanvasOverlay::screenToWorld(const QPoint& screenPos) const
    {
        if (m_view.IsNull()) return gp_Pnt2d(0, 0);

        Standard_Real x, y, z;
        m_view->Convert(screenPos.x(), screenPos.y(), x, y, z);
        return gp_Pnt2d(x, y);
    }

    QPoint TyrexCanvasOverlay::worldToScreen(const gp_Pnt2d& worldPos) const
    {
        if (m_view.IsNull()) return QPoint(0, 0);

        Standard_Integer x, y;
        m_view->Convert(worldPos.X(), worldPos.Y(), 0.0, x, y);
        return QPoint(x, y);
    }

    void TyrexCanvasOverlay::calculateDynamicSpacing()
    {
        if (m_view.IsNull()) return;

        try {
            m_currentScale = m_view->Scale();

            // Calculate grid spacing like AutoCAD
            double baseSpacing = m_gridConfig.baseSpacing;
            double pixelSpacing = baseSpacing * m_currentScale;

            // Adjust spacing to maintain reasonable density
            m_dynamicGridSpacing = baseSpacing;

            if (m_gridConfig.adaptiveSpacing) {
                // Scale up if too dense
                while (pixelSpacing < m_gridConfig.minSpacingPixels) {
                    m_dynamicGridSpacing *= 10.0;
                    pixelSpacing = m_dynamicGridSpacing * m_currentScale;
                }

                // Scale down if too sparse
                while (pixelSpacing > m_gridConfig.maxSpacingPixels && m_dynamicGridSpacing > 0.1) {
                    m_dynamicGridSpacing /= 10.0;
                    pixelSpacing = m_dynamicGridSpacing * m_currentScale;
                }
            }

            emit gridSpacingChanged(m_dynamicGridSpacing);

            qDebug() << "Grid spacing:" << m_dynamicGridSpacing << "Scale:" << m_currentScale;
        }
        catch (...) {
            qWarning() << "Error calculating dynamic spacing";
        }
    }

    void TyrexCanvasOverlay::updateViewBounds()
    {
        if (m_view.IsNull()) return;

        try {
            // Get view window dimensions
            Standard_Integer width, height;
            m_view->Window()->Size(width, height);
            m_viewWidth = width;
            m_viewHeight = height;

            // Convert corner points to world coordinates
            Standard_Real x1, y1, z1, x2, y2, z2;
            m_view->Convert(0, 0, x1, y1, z1);
            m_view->Convert(width, height, x2, y2, z2);

            m_viewMin.SetCoord(std::min(x1, x2), std::min(y1, y2));
            m_viewMax.SetCoord(std::max(x1, x2), std::max(y1, y2));

            m_viewCenter.SetCoord((m_viewMin.X() + m_viewMax.X()) / 2.0,
                (m_viewMin.Y() + m_viewMax.Y()) / 2.0);

            // Extend bounds if requested
            if (m_gridConfig.gridExtensionFactor > 1.0) {
                double width = m_viewMax.X() - m_viewMin.X();
                double height = m_viewMax.Y() - m_viewMin.Y();
                double extension = (m_gridConfig.gridExtensionFactor - 1.0) / 2.0;

                m_viewMin.SetX(m_viewMin.X() - width * extension);
                m_viewMin.SetY(m_viewMin.Y() - height * extension);
                m_viewMax.SetX(m_viewMax.X() + width * extension);
                m_viewMax.SetY(m_viewMax.Y() + height * extension);
            }
        }
        catch (...) {
            qWarning() << "Error updating view bounds";
        }
    }

    void TyrexCanvasOverlay::updateGridGeometry()
    {
        if (!m_gridVisible || m_context.IsNull()) return;

        try {
            // Remove old grid objects
            if (!m_gridLinesObject.IsNull()) {
                m_context->Remove(m_gridLinesObject, Standard_False);
                m_gridLinesObject.Nullify();
            }
            if (!m_gridDotsObject.IsNull()) {
                m_context->Remove(m_gridDotsObject, Standard_False);
                m_gridDotsObject.Nullify();
            }

            // Create new grid based on style
            switch (m_gridConfig.style) {
            case GridStyle::Lines:
                createLineGrid();
                break;
            case GridStyle::Dots:
                createDotGrid();
                break;
            case GridStyle::Crosses:
                createCrossGrid();
                break;
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating grid geometry:" << ex.GetMessageString();
        }
    }

    void TyrexCanvasOverlay::updateAxesGeometry()
    {
        if (!m_axisVisible || m_context.IsNull()) return;

        try {
            // Remove old axes
            if (!m_xAxisObject.IsNull()) {
                m_context->Remove(m_xAxisObject, Standard_False);
            }
            if (!m_yAxisObject.IsNull()) {
                m_context->Remove(m_yAxisObject, Standard_False);
            }
            if (!m_originMarker.IsNull()) {
                m_context->Remove(m_originMarker, Standard_False);
            }

            // X-axis
            TopoDS_Edge xAxis = BRepBuilderAPI_MakeEdge(
                gp_Pnt(m_viewMin.X(), 0, 0),
                gp_Pnt(m_viewMax.X(), 0, 0)
            );
            m_xAxisObject = new AIS_Shape(xAxis);
            m_xAxisObject->SetColor(m_gridConfig.axisColorX);
            m_xAxisObject->SetWidth(m_gridConfig.axisLineWidth);
            m_context->Display(m_xAxisObject, Standard_False);
            m_context->Deactivate(m_xAxisObject);

            // Y-axis
            TopoDS_Edge yAxis = BRepBuilderAPI_MakeEdge(
                gp_Pnt(0, m_viewMin.Y(), 0),
                gp_Pnt(0, m_viewMax.Y(), 0)
            );
            m_yAxisObject = new AIS_Shape(yAxis);
            m_yAxisObject->SetColor(m_gridConfig.axisColorY);
            m_yAxisObject->SetWidth(m_gridConfig.axisLineWidth);
            m_context->Display(m_yAxisObject, Standard_False);
            m_context->Deactivate(m_yAxisObject);

            // Origin marker
            if (m_gridConfig.showOriginMarker) {
                createOriginMarker();
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating axes:" << ex.GetMessageString();
        }
    }

    void TyrexCanvasOverlay::clearOverlay()
    {
        if (m_context.IsNull()) return;

        try {
            if (!m_gridLinesObject.IsNull()) {
                m_context->Remove(m_gridLinesObject, Standard_False);
                m_gridLinesObject.Nullify();
            }
            if (!m_gridDotsObject.IsNull()) {
                m_context->Remove(m_gridDotsObject, Standard_False);
                m_gridDotsObject.Nullify();
            }
            if (!m_xAxisObject.IsNull()) {
                m_context->Remove(m_xAxisObject, Standard_False);
                m_xAxisObject.Nullify();
            }
            if (!m_yAxisObject.IsNull()) {
                m_context->Remove(m_yAxisObject, Standard_False);
                m_yAxisObject.Nullify();
            }
            if (!m_originMarker.IsNull()) {
                m_context->Remove(m_originMarker, Standard_False);
                m_originMarker.Nullify();
            }
        }
        catch (...) {
            qWarning() << "Error clearing overlay";
        }
    }

    void TyrexCanvasOverlay::createLineGrid()
    {
        Handle(Graphic3d_ArrayOfPolylines) gridLines = createGridLines();
        if (gridLines.IsNull() || gridLines->VertexNumber() == 0) return;

        // Create compound for all grid lines
        BRep_Builder builder;
        TopoDS_Compound compound;
        builder.MakeCompound(compound);

        // Build edges from line array
        for (Standard_Integer i = 1; i <= gridLines->EdgeNumber(); i++) {
            Standard_Integer v1, v2;
            gridLines->Edge(i, v1, v2);

            gp_Pnt p1(gridLines->Vertice(v1));
            gp_Pnt p2(gridLines->Vertice(v2));

            TopoDS_Edge edge = BRepBuilderAPI_MakeEdge(p1, p2);
            if (!edge.IsNull()) {
                builder.Add(compound, edge);
            }
        }

        m_gridLinesObject = new AIS_Shape(compound);
        m_gridLinesObject->SetColor(m_gridConfig.gridColorMinor);
        m_gridLinesObject->SetWidth(m_gridConfig.lineWidthMinor);

        m_context->Display(m_gridLinesObject, Standard_False);
        m_context->Deactivate(m_gridLinesObject);
    }

    void TyrexCanvasOverlay::createDotGrid()
    {
        Handle(Graphic3d_ArrayOfPoints) gridDots = createGridDots();
        if (gridDots.IsNull() || gridDots->VertexNumber() == 0) return;

        // Create compound of vertices
        BRep_Builder builder;
        TopoDS_Compound compound;
        builder.MakeCompound(compound);

        for (Standard_Integer i = 1; i <= gridDots->VertexNumber(); i++) {
            gp_Pnt p = gridDots->Vertice(i);
            TopoDS_Vertex vertex = BRepBuilderAPI_MakeVertex(p);
            builder.Add(compound, vertex);
        }

        m_gridDotsObject = new AIS_Shape(compound);
        m_gridDotsObject->SetColor(m_gridConfig.gridColorMinor);

        m_context->Display(m_gridDotsObject, Standard_False);
        m_context->Deactivate(m_gridDotsObject);
    }

    void TyrexCanvasOverlay::createCrossGrid()
    {
        // Create crosses at grid intersections
        BRep_Builder builder;
        TopoDS_Compound compound;
        builder.MakeCompound(compound);

        double spacing = m_dynamicGridSpacing;
        double crossSize = spacing * 0.1; // 10% of grid spacing

        double xMin = std::floor(m_viewMin.X() / spacing) * spacing;
        double xMax = std::ceil(m_viewMax.X() / spacing) * spacing;
        double yMin = std::floor(m_viewMin.Y() / spacing) * spacing;
        double yMax = std::ceil(m_viewMax.Y() / spacing) * spacing;

        for (double x = xMin; x <= xMax; x += spacing) {
            for (double y = yMin; y <= yMax; y += spacing) {
                // Horizontal line of cross
                TopoDS_Edge hLine = BRepBuilderAPI_MakeEdge(
                    gp_Pnt(x - crossSize, y, 0),
                    gp_Pnt(x + crossSize, y, 0)
                );
                builder.Add(compound, hLine);

                // Vertical line of cross
                TopoDS_Edge vLine = BRepBuilderAPI_MakeEdge(
                    gp_Pnt(x, y - crossSize, 0),
                    gp_Pnt(x, y + crossSize, 0)
                );
                builder.Add(compound, vLine);
            }
        }

        m_gridLinesObject = new AIS_Shape(compound);
        m_gridLinesObject->SetColor(m_gridConfig.gridColorMinor);
        m_gridLinesObject->SetWidth(m_gridConfig.lineWidthMinor);

        m_context->Display(m_gridLinesObject, Standard_False);
        m_context->Deactivate(m_gridLinesObject);
    }

    Handle(Graphic3d_ArrayOfPolylines) TyrexCanvasOverlay::createGridLines() const
    {
        double spacing = m_dynamicGridSpacing;
        int majorInterval = m_gridConfig.majorLineInterval;

        double xMin = std::floor(m_viewMin.X() / spacing) * spacing;
        double xMax = std::ceil(m_viewMax.X() / spacing) * spacing;
        double yMin = std::floor(m_viewMin.Y() / spacing) * spacing;
        double yMax = std::ceil(m_viewMax.Y() / spacing) * spacing;

        // Count lines
        int xLines = static_cast<int>((xMax - xMin) / spacing) + 1;
        int yLines = static_cast<int>((yMax - yMin) / spacing) + 1;
        int totalVertices = (xLines + yLines) * 2;

        Handle(Graphic3d_ArrayOfPolylines) gridLines =
            new Graphic3d_ArrayOfPolylines(totalVertices, xLines + yLines);

        // Vertical lines
        int lineIndex = 0;
        for (double x = xMin; x <= xMax; x += spacing) {
            gridLines->AddVertex(x, yMin, 0);
            gridLines->AddVertex(x, yMax, 0);
            gridLines->AddBound(2);

            // Set color based on major/minor
            lineIndex = static_cast<int>(std::round(x / spacing));
            if (lineIndex % majorInterval == 0) {
                gridLines->SetBoundColor(gridLines->BoundNumber(), m_gridConfig.gridColorMajor);
            }
            else {
                gridLines->SetBoundColor(gridLines->BoundNumber(), m_gridConfig.gridColorMinor);
            }
        }

        // Horizontal lines
        for (double y = yMin; y <= yMax; y += spacing) {
            gridLines->AddVertex(xMin, y, 0);
            gridLines->AddVertex(xMax, y, 0);
            gridLines->AddBound(2);

            // Set color based on major/minor
            lineIndex = static_cast<int>(std::round(y / spacing));
            if (lineIndex % majorInterval == 0) {
                gridLines->SetBoundColor(gridLines->BoundNumber(), m_gridConfig.gridColorMajor);
            }
            else {
                gridLines->SetBoundColor(gridLines->BoundNumber(), m_gridConfig.gridColorMinor);
            }
        }

        return gridLines;
    }
    Handle(Graphic3d_ArrayOfPoints) TyrexCanvasOverlay::createGridDots() const
    {
        double spacing = m_dynamicGridSpacing;

        double xMin = std::floor(m_viewMin.X() / spacing) * spacing;
        double xMax = std::ceil(m_viewMax.X() / spacing) * spacing;
        double yMin = std::floor(m_viewMin.Y() / spacing) * spacing;
        double yMax = std::ceil(m_viewMax.Y() / spacing) * spacing;

        // Count points
        int xPoints = static_cast<int>((xMax - xMin) / spacing) + 1;
        int yPoints = static_cast<int>((yMax - yMin) / spacing) + 1;
        int totalPoints = xPoints * yPoints;

        Handle(Graphic3d_ArrayOfPoints) gridDots = new Graphic3d_ArrayOfPoints(totalPoints);

        int majorInterval = m_gridConfig.majorLineInterval;

        for (double x = xMin; x <= xMax; x += spacing) {
            for (double y = yMin; y <= yMax; y += spacing) {
                gridDots->AddVertex(x, y, 0);

                // Set color based on major/minor
                int xIndex = static_cast<int>(std::round(x / spacing));
                int yIndex = static_cast<int>(std::round(y / spacing));

                if ((xIndex % majorInterval == 0) || (yIndex % majorInterval == 0)) {
                    gridDots->SetVertexColor(gridDots->VertexNumber(), m_gridConfig.gridColorMajor);
                }
                else {
                    gridDots->SetVertexColor(gridDots->VertexNumber(), m_gridConfig.gridColorMinor);
                }
            }
        }

        return gridDots;
    }

    void TyrexCanvasOverlay::createOriginMarker()
    {
        // Create a small circle at origin
        BRep_Builder builder;
        TopoDS_Compound compound;
        builder.MakeCompound(compound);

        double markerSize = m_dynamicGridSpacing * 0.2;

        // Create circle edges
        for (int i = 0; i < 360; i += 30) {
            double angle1 = i * M_PI / 180.0;
            double angle2 = (i + 30) * M_PI / 180.0;

            gp_Pnt p1(markerSize * cos(angle1), markerSize * sin(angle1), 0);
            gp_Pnt p2(markerSize * cos(angle2), markerSize * sin(angle2), 0);

            TopoDS_Edge edge = BRepBuilderAPI_MakeEdge(p1, p2);
            builder.Add(compound, edge);
        }

        m_originMarker = new AIS_Shape(compound);
        m_originMarker->SetColor(Quantity_NOC_WHITE);
        m_originMarker->SetWidth(2.0);

        m_context->Display(m_originMarker, Standard_False);
        m_context->Deactivate(m_originMarker);
    }

    bool TyrexCanvasOverlay::shouldDrawLine(double coord, double min, double max) const
    {
        return coord >= min && coord <= max;
    }

    int TyrexCanvasOverlay::calculateGridDensity() const
    {
        double viewWidth = m_viewMax.X() - m_viewMin.X();
        double viewHeight = m_viewMax.Y() - m_viewMin.Y();
        double viewArea = viewWidth * viewHeight;
        double gridCellArea = m_dynamicGridSpacing * m_dynamicGridSpacing;

        return static_cast<int>(viewArea / gridCellArea);
    }

} // namespace TyrexCAD