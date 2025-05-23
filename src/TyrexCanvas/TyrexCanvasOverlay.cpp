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
        , m_viewMin(-100, -100)  // Default bounds
        , m_viewMax(100, 100)    // Default bounds
        , m_gridPointsCacheDirty(true)
    {
        qDebug() << "TyrexCanvasOverlay created";

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
        // Prevent recursive updates
        static bool updating = false;
        if (updating) {
            return;
        }
        updating = true;

        try {
            if (m_view.IsNull() || m_context.IsNull()) {
                updating = false;
                return;
            }

            // Check if view has a valid window
            if (m_view->Window().IsNull()) {
                qDebug() << "TyrexCanvasOverlay::update() - View window not ready yet";
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

            // Mark grid points cache as dirty
            m_gridPointsCacheDirty = true;

            // Safely update display without immediate viewer update
            if (!m_context.IsNull()) {
                // Schedule viewer update for next event loop iteration
                QTimer::singleShot(0, this, [this]() {
                    if (!m_context.IsNull()) {
                        try {
                            m_context->UpdateCurrentViewer();
                        }
                        catch (const Standard_Failure& ex) {
                            qWarning() << "Error updating viewer:" << ex.GetMessageString();
                        }
                        catch (...) {
                            qWarning() << "Unknown error updating viewer";
                        }
                    }
                    });
            }

            emit overlayUpdated();
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in TyrexCanvasOverlay::update():" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error in TyrexCanvasOverlay::update()";
        }

        updating = false;
    }

    void TyrexCanvasOverlay::redraw()
    {
        try {
            clearOverlay();
            update();
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in redraw:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error in redraw";
        }
    }

    void TyrexCanvasOverlay::setGridVisible(bool visible)
    {
        if (m_gridVisible == visible) {
            return;
        }

        m_gridVisible = visible;

        try {
            if (!m_gridVisible && !m_gridObject.IsNull() && !m_context.IsNull()) {
                m_context->Remove(m_gridObject, Standard_False);
                m_gridObject.Nullify();

                // Deferred update
                QTimer::singleShot(0, this, [this]() {
                    if (!m_context.IsNull()) {
                        try {
                            m_context->UpdateCurrentViewer();
                        }
                        catch (...) {}
                    }
                    });
            }
            else if (m_gridVisible) {
                updateGridGeometry();
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in setGridVisible:" << ex.GetMessageString();
        }
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

        try {
            if (!m_axisVisible && !m_context.IsNull()) {
                if (!m_xAxisObject.IsNull()) {
                    m_context->Remove(m_xAxisObject, Standard_False);
                    m_xAxisObject.Nullify();
                }
                if (!m_yAxisObject.IsNull()) {
                    m_context->Remove(m_yAxisObject, Standard_False);
                    m_yAxisObject.Nullify();
                }

                // Deferred update
                QTimer::singleShot(0, this, [this]() {
                    if (!m_context.IsNull()) {
                        try {
                            m_context->UpdateCurrentViewer();
                        }
                        catch (...) {}
                    }
                    });
            }
            else {
                updateAxesGeometry();
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error in setAxisVisible:" << ex.GetMessageString();
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

            if (m_gridVisible && m_dynamicGridSpacing > 0) {
                // Calculate grid intersection points
                double spacing = m_dynamicGridSpacing;

                // Find grid bounds
                double xMin = std::floor(m_viewMin.X() / spacing) * spacing;
                double xMax = std::ceil(m_viewMax.X() / spacing) * spacing;
                double yMin = std::floor(m_viewMin.Y() / spacing) * spacing;
                double yMax = std::ceil(m_viewMax.Y() / spacing) * spacing;

                // Generate intersection points (with reasonable limits)
                int maxPoints = 10000; // Prevent memory issues
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

    void TyrexCanvasOverlay::calculateDynamicSpacing()
    {
        if (m_view.IsNull()) {
            return;
        }

        try {
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
        catch (const Standard_Failure& ex) {
            qWarning() << "Error calculating dynamic spacing:" << ex.GetMessageString();
        }
    }

    void TyrexCanvasOverlay::updateViewBounds()
    {
        if (m_view.IsNull()) {
            return;
        }

        try {
            // Initialize variables with safe defaults
            Standard_Real xmin = -100.0, ymin = -100.0, xmax = 100.0, ymax = 100.0;

            // Check if view has a window
            if (!m_view->Window().IsNull() && m_view->Window()->IsMapped()) {
                try {
                    // Get view dimensions
                    m_view->WindowFit(xmin, ymin, xmax, ymax);

                    // Validate the values
                    if (std::isnan(xmin) || std::isnan(ymin) || std::isnan(xmax) || std::isnan(ymax) ||
                        std::isinf(xmin) || std::isinf(ymin) || std::isinf(xmax) || std::isinf(ymax)) {
                        // Use defaults if values are invalid
                        xmin = -100.0;
                        ymin = -100.0;
                        xmax = 100.0;
                        ymax = 100.0;
                    }
                }
                catch (...) {
                    // Keep default values
                }
            }

            // Convert to world coordinates
            Standard_Real x1 = 0.0, y1 = 0.0, z1 = 0.0;
            Standard_Real x2 = 0.0, y2 = 0.0, z2 = 0.0;

            try {
                m_view->Convert(static_cast<int>(xmin), static_cast<int>(ymin), x1, y1, z1);
                m_view->Convert(static_cast<int>(xmax), static_cast<int>(ymax), x2, y2, z2);

                // Validate converted values
                if (!std::isnan(x1) && !std::isnan(y1) && !std::isnan(x2) && !std::isnan(y2) &&
                    !std::isinf(x1) && !std::isinf(y1) && !std::isinf(x2) && !std::isinf(y2)) {
                    m_viewMin.SetCoord(std::min(x1, x2), std::min(y1, y2));
                    m_viewMax.SetCoord(std::max(x1, x2), std::max(y1, y2));
                }
            }
            catch (...) {
                // Keep existing bounds if conversion fails
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating view bounds:" << ex.GetMessageString();
        }
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
                    try {
                        TopoDS_Edge edge = BRepBuilderAPI_MakeEdge(lines[i], lines[i + 1]);
                        if (!edge.IsNull()) {
                            builder.Add(compound, edge);
                        }
                    }
                    catch (...) {
                        // Skip invalid edges
                    }
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

            // Display grid without selection
            m_context->Display(m_gridObject, Standard_False);

            // Make sure no selection mode is activated for the grid
            m_context->Deactivate(m_gridObject);

            // Don't set display priority - it causes errors in some OpenCascade versions
            // m_context->SetDisplayPriority(m_gridObject, -1);
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating grid geometry:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error updating grid geometry";
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
            try {
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

                // Display without selection
                m_context->Display(m_xAxisObject, Standard_False);
                m_context->Deactivate(m_xAxisObject);

                // Don't set display priority - it causes errors
                // m_context->SetDisplayPriority(m_xAxisObject, 0);
            }
            catch (...) {
                qWarning() << "Error creating X-axis";
            }

            // Y-axis (green)
            try {
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

                // Display without selection
                m_context->Display(m_yAxisObject, Standard_False);
                m_context->Deactivate(m_yAxisObject);

                // Don't set display priority - it causes errors
                // m_context->SetDisplayPriority(m_yAxisObject, 0);
            }
            catch (...) {
                qWarning() << "Error creating Y-axis";
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating axes geometry:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error updating axes geometry";
        }
    }

    void TyrexCanvasOverlay::clearOverlay()
    {
        if (m_context.IsNull()) {
            return;
        }

        try {
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
        catch (const Standard_Failure& ex) {
            qWarning() << "Error clearing overlay:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error clearing overlay";
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

        try {
            double spacing = m_dynamicGridSpacing;
            double minorSpacing = spacing / m_gridConfig.subdivisions;

            // Calculate grid bounds with safety checks
            double xMin = std::max(-10000.0, std::floor(m_viewMin.X() / spacing) * spacing);
            double xMax = std::min(10000.0, std::ceil(m_viewMax.X() / spacing) * spacing);
            double yMin = std::max(-10000.0, std::floor(m_viewMin.Y() / spacing) * spacing);
            double yMax = std::min(10000.0, std::ceil(m_viewMax.Y() / spacing) * spacing);

            // Limit number of lines
            int xLines = static_cast<int>((xMax - xMin) / spacing) + 1;
            int yLines = static_cast<int>((yMax - yMin) / spacing) + 1;

            if (xLines > m_gridConfig.maxLinesPerAxis ||
                yLines > m_gridConfig.maxLinesPerAxis) {
                qDebug() << "Too many grid lines, skipping minor divisions";
                minorSpacing = spacing; // Skip subdivisions
            }

            // Generate vertical lines
            int lineCount = 0;
            const int maxLineCount = 1000; // Safety limit

            for (double x = xMin; x <= xMax && lineCount < maxLineCount; x += minorSpacing) {
                lines.emplace_back(x, yMin, 0);
                lines.emplace_back(x, yMax, 0);

                // Check if major line
                bool isMajor = std::fmod(std::abs(x), spacing) < 1e-6;
                majorLines.push_back(isMajor);
                majorLines.push_back(isMajor);

                lineCount++;
            }

            // Generate horizontal lines
            for (double y = yMin; y <= yMax && lineCount < maxLineCount; y += minorSpacing) {
                lines.emplace_back(xMin, y, 0);
                lines.emplace_back(xMax, y, 0);

                // Check if major line
                bool isMajor = std::fmod(std::abs(y), spacing) < 1e-6;
                majorLines.push_back(isMajor);
                majorLines.push_back(isMajor);

                lineCount++;
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error calculating grid lines:" << ex.GetMessageString();
            lines.clear();
            majorLines.clear();
        }
        catch (...) {
            qWarning() << "Unknown error calculating grid lines";
            lines.clear();
            majorLines.clear();
        }
    }

} // namespace TyrexCAD