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
#include <BRepBuilderAPI_MakeWire.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Wire.hxx>
#include <TopoDS_Compound.hxx>
#include <BRep_Builder.hxx>
#include <Prs3d_LineAspect.hxx>
#include <Aspect_TypeOfLine.hxx>
#include <Graphic3d_ArrayOfPolylines.hxx>
#include <Prs3d_Root.hxx>
#include <Prs3d_Presentation.hxx>
#include <PrsMgr_PresentationManager3d.hxx>
#include <gp_Lin2d.hxx>

// Qt includes
#include <QDebug>
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
        , m_viewMin(0, 0)
        , m_viewMax(100, 100)
        , m_gridPointsCacheDirty(true)
    {
        qDebug() << "TyrexCanvasOverlay created";

        // Initialize with update
        update();
    }

    TyrexCanvasOverlay::~TyrexCanvasOverlay()
    {
        clearOverlay();
        qDebug() << "TyrexCanvasOverlay destroyed";
    }

    void TyrexCanvasOverlay::update()
    {
        if (m_view.IsNull() || m_context.IsNull()) {
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

        // Mark grid points cache as dirty
        m_gridPointsCacheDirty = true;

        // Update display
        if (!m_context.IsNull()) {
            m_context->UpdateCurrentViewer();
        }

        emit overlayUpdated();
    }

    void TyrexCanvasOverlay::redraw()
    {
        clearOverlay();
        update();
    }

    void TyrexCanvasOverlay::setGridVisible(bool visible)
    {
        if (m_gridVisible == visible) {
            return;
        }

        m_gridVisible = visible;

        if (!m_gridVisible && !m_gridObject.IsNull()) {
            m_context->Remove(m_gridObject, Standard_True);
            m_gridObject.Nullify();
        }
        else if (m_gridVisible) {
            updateGridGeometry();
        }

        m_context->UpdateCurrentViewer();
    }

    bool TyrexCanvasOverlay::isGridVisible() const
    {
        return m_gridVisible;
    }

    void TyrexCanvasOverlay::setAxisVisible(bool visible)
    {
        if (m_axisVisible == visible) {
            return;
        }

        m_axisVisible = visible;

        if (!m_axisVisible) {
            if (!m_xAxisObject.IsNull()) {
                m_context->Remove(m_xAxisObject, Standard_True);
                m_xAxisObject.Nullify();
            }
            if (!m_yAxisObject.IsNull()) {
                m_context->Remove(m_yAxisObject, Standard_True);
                m_yAxisObject.Nullify();
            }
        }
        else {
            updateAxesGeometry();
        }

        m_context->UpdateCurrentViewer();
    }

    bool TyrexCanvasOverlay::isAxisVisible() const
    {
        return m_axisVisible;
    }

    void TyrexCanvasOverlay::setGridConfig(const GridConfig& config)
    {
        m_gridConfig = config;
        m_gridPointsCacheDirty = true;
        update();
    }

    const GridConfig& TyrexCanvasOverlay::getGridConfig() const
    {
        return m_gridConfig;
    }

    std::vector<gp_Pnt2d> TyrexCanvasOverlay::getVisibleGridPoints() const
    {
        if (m_gridPointsCacheDirty) {
            m_cachedGridPoints.clear();

            if (m_gridVisible) {
                // Calculate grid intersection points
                double spacing = m_dynamicGridSpacing;

                // Find grid bounds
                double xMin = std::floor(m_viewMin.X() / spacing) * spacing;
                double xMax = std::ceil(m_viewMax.X() / spacing) * spacing;
                double yMin = std::floor(m_viewMin.Y() / spacing) * spacing;
                double yMax = std::ceil(m_viewMax.Y() / spacing) * spacing;

                // Generate intersection points
                for (double x = xMin; x <= xMax; x += spacing) {
                    for (double y = yMin; y <= yMax; y += spacing) {
                        m_cachedGridPoints.emplace_back(x, y);
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

    void TyrexCanvasOverlay::calculateDynamicSpacing()
    {
        if (m_view.IsNull()) {
            return;
        }

        // Get view scale
        m_currentScale = m_view->Scale();

        // Calculate pixel spacing for base grid
        double pixelSpacing = m_gridConfig.baseSpacing * m_currentScale;

        // Adjust grid spacing to maintain reasonable pixel density
        double factor = 1.0;
        m_dynamicGridSpacing = m_gridConfig.baseSpacing;

        // Scale up if too dense
        while (pixelSpacing < m_gridConfig.minSpacingPixels && factor < 1000) {
            factor *= 10;
            m_dynamicGridSpacing = m_gridConfig.baseSpacing * factor;
            pixelSpacing = m_dynamicGridSpacing * m_currentScale;
        }

        // Scale down if too sparse
        while (pixelSpacing > m_gridConfig.maxSpacingPixels && factor > 0.001) {
            factor /= 10;
            m_dynamicGridSpacing = m_gridConfig.baseSpacing * factor;
            pixelSpacing = m_dynamicGridSpacing * m_currentScale;
        }

        emit gridSpacingChanged(m_dynamicGridSpacing);

        qDebug() << "Dynamic grid spacing:" << m_dynamicGridSpacing
            << "Scale:" << m_currentScale;
    }

    void TyrexCanvasOverlay::updateViewBounds()
    {
        if (m_view.IsNull()) {
            return;
        }

        // Get view dimensions
        Standard_Real xmin, ymin, xmax, ymax;
        m_view->WindowFit(xmin, ymin, xmax, ymax);

        // Convert to world coordinates
        Standard_Real x1, y1, z1, x2, y2, z2;
        m_view->Convert(static_cast<int>(xmin), static_cast<int>(ymin), x1, y1, z1);
        m_view->Convert(static_cast<int>(xmax), static_cast<int>(ymax), x2, y2, z2);

        m_viewMin.SetCoord(std::min(x1, x2), std::min(y1, y2));
        m_viewMax.SetCoord(std::max(x1, x2), std::max(y1, y2));
    }

    void TyrexCanvasOverlay::updateGridGeometry()
    {
        if (!m_gridVisible || m_context.IsNull()) {
            return;
        }

        try {
            // Calculate grid lines
            std::vector<gp_Pnt> lines;
            std::vector<bool> majorLines;
            calculateGridLines(lines, majorLines);

            if (lines.empty()) {
                return;
            }

            // Create compound for all grid lines
            BRep_Builder builder;
            TopoDS_Compound compound;
            builder.MakeCompound(compound);

            // Build edges from line pairs
            for (size_t i = 0; i < lines.size(); i += 2) {
                if (i + 1 < lines.size()) {
                    TopoDS_Edge edge = BRepBuilderAPI_MakeEdge(lines[i], lines[i + 1]);
                    builder.Add(compound, edge);
                }
            }

            // Remove old grid object
            if (!m_gridObject.IsNull()) {
                m_context->Remove(m_gridObject, Standard_False);
            }

            // Create new grid object
            m_gridObject = new AIS_Shape(compound);

            // Set grid appearance
            m_gridObject->SetColor(m_gridConfig.gridColorMajor);
            m_gridObject->SetWidth(m_gridConfig.lineWidthMinor);

            // Make grid non-selectable
            m_gridObject->SetSelectionMode(-1);

            // Display grid
            m_context->Display(m_gridObject, Standard_False);

            // Set display priority lower than normal objects
            m_context->SetDisplayPriority(m_gridObject, -1);
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating grid geometry:" << ex.GetMessageString();
        }
    }

    void TyrexCanvasOverlay::updateAxesGeometry()
    {
        if (!m_axisVisible || m_context.IsNull()) {
            return;
        }

        try {
            // Calculate axis extents
            double margin = m_dynamicGridSpacing * 2;
            double xMin = m_viewMin.X() - margin;
            double xMax = m_viewMax.X() + margin;
            double yMin = m_viewMin.Y() - margin;
            double yMax = m_viewMax.Y() + margin;

            // X-axis (red)
            {
                TopoDS_Edge xAxis = BRepBuilderAPI_MakeEdge(
                    gp_Pnt(xMin, 0, 0),
                    gp_Pnt(xMax, 0, 0)
                );

                if (!m_xAxisObject.IsNull()) {
                    m_context->Remove(m_xAxisObject, Standard_False);
                }

                m_xAxisObject = new AIS_Shape(xAxis);
                m_xAxisObject->SetColor(Quantity_NOC_RED);
                m_xAxisObject->SetWidth(2.0);
                m_xAxisObject->SetSelectionMode(-1);

                m_context->Display(m_xAxisObject, Standard_False);
                m_context->SetDisplayPriority(m_xAxisObject, 0);
            }

            // Y-axis (green)
            {
                TopoDS_Edge yAxis = BRepBuilderAPI_MakeEdge(
                    gp_Pnt(0, yMin, 0),
                    gp_Pnt(0, yMax, 0)
                );

                if (!m_yAxisObject.IsNull()) {
                    m_context->Remove(m_yAxisObject, Standard_False);
                }

                m_yAxisObject = new AIS_Shape(yAxis);
                m_yAxisObject->SetColor(Quantity_NOC_GREEN);
                m_yAxisObject->SetWidth(2.0);
                m_yAxisObject->SetSelectionMode(-1);

                m_context->Display(m_yAxisObject, Standard_False);
                m_context->SetDisplayPriority(m_yAxisObject, 0);
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating axes geometry:" << ex.GetMessageString();
        }
    }

    void TyrexCanvasOverlay::clearOverlay()
    {
        if (m_context.IsNull()) {
            return;
        }

        if (!m_gridObject.IsNull()) {
            m_context->Remove(m_gridObject, Standard_False);
            m_gridObject.Nullify();
        }

        if (!m_xAxisObject.IsNull()) {
            m_context->Remove(m_xAxisObject, Standard_False);
            m_xAxisObject.Nullify();
        }

        if (!m_yAxisObject.IsNull()) {
            m_context->Remove(m_yAxisObject, Standard_False);
            m_yAxisObject.Nullify();
        }
    }

    void TyrexCanvasOverlay::calculateGridLines(std::vector<gp_Pnt>& lines,
        std::vector<bool>& majorLines) const
    {
        lines.clear();
        majorLines.clear();

        if (m_dynamicGridSpacing <= 0) {
            return;
        }

        double spacing = m_dynamicGridSpacing;
        double minorSpacing = spacing / m_gridConfig.subdivisions;

        // Calculate grid bounds
        double xMin = std::floor(m_viewMin.X() / spacing) * spacing;
        double xMax = std::ceil(m_viewMax.X() / spacing) * spacing;
        double yMin = std::floor(m_viewMin.Y() / spacing) * spacing;
        double yMax = std::ceil(m_viewMax.Y() / spacing) * spacing;

        // Limit number of lines
        int xLines = static_cast<int>((xMax - xMin) / spacing) + 1;
        int yLines = static_cast<int>((yMax - yMin) / spacing) + 1;

        if (xLines > m_gridConfig.maxLinesPerAxis ||
            yLines > m_gridConfig.maxLinesPerAxis) {
            qDebug() << "Too many grid lines, skipping minor divisions";
            minorSpacing = spacing; // Skip subdivisions
        }

        // Generate vertical lines
        for (double x = xMin; x <= xMax; x += minorSpacing) {
            lines.emplace_back(x, yMin, 0);
            lines.emplace_back(x, yMax, 0);

            // Check if major line
            bool isMajor = std::fmod(std::abs(x), spacing) < 1e-6;
            majorLines.push_back(isMajor);
            majorLines.push_back(isMajor);
        }

        // Generate horizontal lines
        for (double y = yMin; y <= yMax; y += minorSpacing) {
            lines.emplace_back(xMin, y, 0);
            lines.emplace_back(xMax, y, 0);

            // Check if major line
            bool isMajor = std::fmod(std::abs(y), spacing) < 1e-6;
            majorLines.push_back(isMajor);
            majorLines.push_back(isMajor);
        }
    }

} // namespace TyrexCAD