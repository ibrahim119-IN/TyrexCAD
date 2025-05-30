/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCanvas/TyrexCanvasOverlay.h"

#include <V3d_View.hxx>
#include <Graphic3d_Camera.hxx>
#include <gp_Pnt.hxx>
#include <Standard_Failure.hxx>

#include <QDebug>
#include <cmath>
#include <algorithm>

namespace TyrexCAD {

    TyrexCanvasOverlay::TyrexCanvasOverlay(const Handle(V3d_View)& view, QObject* parent)
        : QObject(parent)
        , m_view(view)
        , m_gridVisible(true)
        , m_currentSpacing(10.0)
        , m_viewScale(1.0)
        , m_lastViewScale(-1)
        , m_needsUpdate(true)
        , m_viewMinX(-500), m_viewMaxX(500)
        , m_viewMinY(-500), m_viewMaxY(500)
    {
        // Initialize with default configuration
        m_config = GridConfig::darkTheme();
        m_config.adaptiveSpacing = true;
        m_config.snapEnabled = false;

        updateViewParameters();
    }

    TyrexCanvasOverlay::~TyrexCanvasOverlay() = default;

    void TyrexCanvasOverlay::setGridVisible(bool visible)
    {
        if (m_gridVisible != visible) {
            m_gridVisible = visible;
            emit gridDataChanged();
        }
    }

    bool TyrexCanvasOverlay::isGridVisible() const
    {
        return m_gridVisible;
    }

    void TyrexCanvasOverlay::setGridConfig(const GridConfig& config)
    {
        m_config = config;
        m_needsUpdate = true;
        emit gridConfigChanged();
        emit gridDataChanged();
    }

    const GridConfig& TyrexCanvasOverlay::getGridConfig() const
    {
        return m_config;
    }

    void TyrexCanvasOverlay::setGridStyle(GridStyle style)
    {
        if (m_config.style != style) {
            m_config.style = style;
            emit gridConfigChanged();
            emit gridDataChanged();
        }
    }

    GridStyle TyrexCanvasOverlay::getGridStyle() const
    {
        return m_config.style;
    }

    void TyrexCanvasOverlay::setGridSpacing(double spacing)
    {
        if (m_config.baseSpacing != spacing && spacing > 0) {
            m_config.baseSpacing = spacing;
            m_needsUpdate = true;
            updateViewParameters();
            emit gridSpacingChanged(m_currentSpacing);
            emit gridDataChanged();
        }
    }

    double TyrexCanvasOverlay::getCurrentGridSpacing() const
    {
        return m_currentSpacing;
    }

    void TyrexCanvasOverlay::setSnapEnabled(bool enabled)
    {
        m_config.snapEnabled = enabled;
    }

    gp_Pnt2d TyrexCanvasOverlay::screenToWorld(const QPoint& screenPos) const
    {
        if (m_view.IsNull()) {
            return gp_Pnt2d(screenPos.x(), screenPos.y());
        }

        try {
            double xv, yv, zv;
            m_view->Convert(screenPos.x(), screenPos.y(), xv, yv, zv);
            return gp_Pnt2d(xv, yv);
        }
        catch (...) {
            return gp_Pnt2d(screenPos.x(), screenPos.y());
        }
    }

    gp_Pnt2d TyrexCanvasOverlay::snapToGrid(const gp_Pnt2d& point) const
    {
        if (!m_config.snapEnabled || m_currentSpacing <= 0) {
            return point;
        }

        double x = std::round(point.X() / m_currentSpacing) * m_currentSpacing;
        double y = std::round(point.Y() / m_currentSpacing) * m_currentSpacing;
        return gp_Pnt2d(x, y);
    }

    void TyrexCanvasOverlay::updateViewParameters()
    {
        if (!m_view.IsNull()) {
            m_viewScale = getViewScale();
            m_viewExtents = getViewExtents();
            calculateViewBounds(m_viewMinX, m_viewMaxX, m_viewMinY, m_viewMaxY);
            m_viewCenter = gp_Vec2d((m_viewMinX + m_viewMaxX) / 2, (m_viewMinY + m_viewMaxY) / 2);
        }

        // Update grid levels
        calculateMultiLevelSpacing();

        // Check if update needed
        if (std::abs(m_viewScale - m_lastViewScale) > VIEW_SCALE_EPSILON ||
            (m_viewCenter - m_lastViewCenter).Magnitude() > m_currentSpacing * 0.1) {
            m_needsUpdate = true;
            m_lastViewScale = m_viewScale;
            m_lastViewCenter = m_viewCenter;
        }
    }

    void TyrexCanvasOverlay::forceUpdate()
    {
        m_needsUpdate = true;
        updateViewParameters();
        emit gridDataChanged();
    }

    void TyrexCanvasOverlay::setAxisVisible(bool visible)
    {
        GridConfig config = m_config;
        config.showAxes = visible;
        setGridConfig(config);
    }

    void TyrexCanvasOverlay::update()
    {
        updateViewParameters();
        emit gridDataChanged();
    }

    std::vector<GridLineData> TyrexCanvasOverlay::computeGridLines()
    {
        std::vector<GridLineData> lines;

        if (!m_gridVisible || m_gridLevels.empty() || m_config.style != GridStyle::Lines) {
            return lines;
        }

        updateViewParameters();

        // Reserve space for efficiency
        lines.reserve(MAX_GRID_LINES);

        // Compute lines for each visible level
        for (const auto& level : m_gridLevels) {
            if (level.visible && level.opacity > 0.01f) {
                auto levelLines = computeGridLinesForLevel(level);
                lines.insert(lines.end(), levelLines.begin(), levelLines.end());

                // Prevent excessive lines
                if (lines.size() > MAX_GRID_LINES) {
                    lines.resize(MAX_GRID_LINES);
                    break;
                }
            }
        }

        return lines;
    }

    std::vector<GridPointData> TyrexCanvasOverlay::computeGridPoints()
    {
        std::vector<GridPointData> points;

        if (!m_gridVisible || m_gridLevels.empty() ||
            (m_config.style != GridStyle::Dots && m_config.style != GridStyle::Crosses)) {
            return points;
        }

        updateViewParameters();

        // Reserve space for efficiency
        points.reserve(MAX_GRID_POINTS);

        // Compute points for each visible level
        for (const auto& level : m_gridLevels) {
            if (level.visible && level.opacity > 0.01f) {
                auto levelPoints = computeGridPointsForLevel(level);
                points.insert(points.end(), levelPoints.begin(), levelPoints.end());

                // Prevent excessive points
                if (points.size() > MAX_GRID_POINTS) {
                    points.resize(MAX_GRID_POINTS);
                    break;
                }
            }
        }

        return points;
    }

    std::vector<GridLineData> TyrexCanvasOverlay::computeAxisLines()
    {
        std::vector<GridLineData> lines;

        if (!m_config.showAxes) {
            return lines;
        }

        // X-axis
        if (m_viewMinY <= 0 && m_viewMaxY >= 0) {
            GridLineData xAxis;
            xAxis.startPoint = gp_Pnt(m_viewMinX, 0, 0);
            xAxis.endPoint = gp_Pnt(m_viewMaxX, 0, 0);
            xAxis.color = m_config.axisColorX;
            xAxis.lineWidth = m_config.axisLineWidth;
            xAxis.opacity = 1.0f;
            lines.push_back(xAxis);
        }

        // Y-axis
        if (m_viewMinX <= 0 && m_viewMaxX >= 0) {
            GridLineData yAxis;
            yAxis.startPoint = gp_Pnt(0, m_viewMinY, 0);
            yAxis.endPoint = gp_Pnt(0, m_viewMaxY, 0);
            yAxis.color = m_config.axisColorY;
            yAxis.lineWidth = m_config.axisLineWidth;
            yAxis.opacity = 1.0f;
            lines.push_back(yAxis);
        }

        return lines;
    }

    std::vector<GridLineData> TyrexCanvasOverlay::computeGridLinesForLevel(const GridLevel& level) const
    {
        std::vector<GridLineData> lines;

        // Align bounds to grid
        double startX = std::floor(m_viewMinX / level.spacing) * level.spacing;
        double endX = std::ceil(m_viewMaxX / level.spacing) * level.spacing;
        double startY = std::floor(m_viewMinY / level.spacing) * level.spacing;
        double endY = std::ceil(m_viewMaxY / level.spacing) * level.spacing;

        // Count lines
        int numLinesX = static_cast<int>((endX - startX) / level.spacing) + 1;
        int numLinesY = static_cast<int>((endY - startY) / level.spacing) + 1;

        // Clamp to reasonable limits
        numLinesX = clampGridLineCount(numLinesX);
        numLinesY = clampGridLineCount(numLinesY);

        // Skip if too many lines (performance protection)
        if (numLinesX + numLinesY > MAX_GRID_LINES / 2) {
            return lines;
        }

        // Generate vertical lines
        for (int i = 0; i < numLinesX; ++i) {
            double x = startX + i * level.spacing;

            // Skip axis line if axes are shown
            if (m_config.showAxes && std::abs(x) < level.spacing * 0.01) {
                continue;
            }

            GridLineData line;
            line.startPoint = gp_Pnt(x, m_viewMinY, 0);
            line.endPoint = gp_Pnt(x, m_viewMaxY, 0);
            line.color = level.color;
            line.lineWidth = level.lineWidth;
            line.opacity = level.opacity;
            lines.push_back(line);
        }

        // Generate horizontal lines
        for (int i = 0; i < numLinesY; ++i) {
            double y = startY + i * level.spacing;

            // Skip axis line if axes are shown
            if (m_config.showAxes && std::abs(y) < level.spacing * 0.01) {
                continue;
            }

            GridLineData line;
            line.startPoint = gp_Pnt(m_viewMinX, y, 0);
            line.endPoint = gp_Pnt(m_viewMaxX, y, 0);
            line.color = level.color;
            line.lineWidth = level.lineWidth;
            line.opacity = level.opacity;
            lines.push_back(line);
        }

        return lines;
    }

    std::vector<GridPointData> TyrexCanvasOverlay::computeGridPointsForLevel(const GridLevel& level) const
    {
        std::vector<GridPointData> points;

        // Align bounds to grid
        double startX = std::floor(m_viewMinX / level.spacing) * level.spacing;
        double endX = std::ceil(m_viewMaxX / level.spacing) * level.spacing;
        double startY = std::floor(m_viewMinY / level.spacing) * level.spacing;
        double endY = std::ceil(m_viewMaxY / level.spacing) * level.spacing;

        // Generate grid points
        for (double x = startX; x <= endX; x += level.spacing) {
            for (double y = startY; y <= endY; y += level.spacing) {
                if (!isPointInView(x, y)) {
                    continue;
                }

                GridPointData point;
                point.position = gp_Pnt(x, y, 0);
                point.color = level.color;
                point.size = (m_config.style == GridStyle::Dots) ? m_config.dotSize : m_config.crossSize;
                point.opacity = level.opacity;
                points.push_back(point);

                if (points.size() >= MAX_GRID_POINTS) {
                    return points;
                }
            }
        }

        return points;
    }

    void TyrexCanvasOverlay::calculateViewBounds(double& minX, double& maxX,
        double& minY, double& maxY) const
    {
        if (m_view.IsNull()) {
            minX = -500; maxX = 500;
            minY = -500; maxY = 500;
            return;
        }

        try {
            Handle(Graphic3d_Camera) camera = m_view->Camera();
            if (!camera.IsNull() && camera->IsOrthographic()) {
                // Orthographic mode
                double scale = m_view->Scale();
                if (scale <= 0 || scale > 1e6) {
                    scale = 1.0;
                }

                Standard_Real winWidth, winHeight;
                m_view->Size(winWidth, winHeight);

                double halfWidth = winWidth / (2.0 * scale);
                double halfHeight = winHeight / (2.0 * scale);

                // Apply extension factor for smoother panning
                halfWidth *= GRID_EXTENSION_FACTOR;
                halfHeight *= GRID_EXTENSION_FACTOR;

                // Get view center - use camera target
                Handle(Graphic3d_Camera) camera = m_view->Camera();
                if (!camera.IsNull()) {
                    const gp_Pnt& target = camera->Center();
                    minX = target.X() - halfWidth;
                    maxX = target.X() + halfWidth;
                    minY = target.Y() - halfHeight;
                    maxY = target.Y() + halfHeight;
                }
                else {
                    minX = -halfWidth;
                    maxX = halfWidth;
                    minY = -halfHeight;
                    maxY = halfHeight;
                }
            }
            else {
                // Perspective mode - use corner conversion
                Standard_Real width, height;
                m_view->Size(width, height);

                Standard_Real x1, y1, z1, x2, y2, z2;
                m_view->Convert(0, 0, x1, y1, z1);
                m_view->Convert(static_cast<Standard_Integer>(width),
                    static_cast<Standard_Integer>(height), x2, y2, z2);

                minX = std::min(x1, x2) * GRID_EXTENSION_FACTOR;
                maxX = std::max(x1, x2) * GRID_EXTENSION_FACTOR;
                minY = std::min(y1, y2) * GRID_EXTENSION_FACTOR;
                maxY = std::max(y1, y2) * GRID_EXTENSION_FACTOR;
            }

            // Sanity check
            double viewSize = std::max(maxX - minX, maxY - minY);
            if (viewSize <= 0 || viewSize > 20000) {
                minX = -1000; maxX = 1000;
                minY = -1000; maxY = 1000;
            }
        }
        catch (...) {
            minX = -500; maxX = 500;
            minY = -500; maxY = 500;
        }
    }

    gp_Vec2d TyrexCanvasOverlay::getViewExtents() const
    {
        if (m_view.IsNull()) {
            return gp_Vec2d(1000, 1000);
        }

        double minX, maxX, minY, maxY;
        calculateViewBounds(minX, maxX, minY, maxY);
        return gp_Vec2d(maxX - minX, maxY - minY);
    }

    double TyrexCanvasOverlay::getViewScale() const
    {
        if (m_view.IsNull()) {
            return 1.0;
        }

        try {
            double scale = m_view->Scale();
            if (scale > 0 && scale < 1e6) {
                return scale;
            }
        }
        catch (...) {}

        return 1.0;
    }

    void TyrexCanvasOverlay::calculateMultiLevelSpacing()
    {
        if (!m_config.adaptiveSpacing) {
            m_currentSpacing = m_config.baseSpacing;
            m_gridLevels.clear();
            GridLevel level{ m_currentSpacing, 1.0f, m_config.lineWidthMinor,
                           m_config.gridColorMinor, true, 1 };
            m_gridLevels.push_back(level);
            return;
        }

        m_gridLevels = generateGridLevels(m_viewScale);

        // Update current spacing from primary level
        for (const auto& level : m_gridLevels) {
            if (level.priority == 1) {
                m_currentSpacing = level.spacing;
                break;
            }
        }

        if (std::abs(m_currentSpacing - m_config.baseSpacing) > 0.001) {
            emit gridSpacingChanged(m_currentSpacing);
        }
    }

    std::vector<GridLevel> TyrexCanvasOverlay::generateGridLevels(double viewScale) const
    {
        std::vector<GridLevel> levels;

        if (viewScale <= 0 || std::isnan(viewScale) || std::isinf(viewScale)) {
            viewScale = 1.0;
        }

        // Calculate optimal spacing
        double optimalSpacing = calculateOptimalSpacing(viewScale);

        // Primary level
        GridLevel primary;
        primary.spacing = optimalSpacing;
        primary.opacity = 1.0f;
        primary.lineWidth = m_config.lineWidthMinor;
        primary.color = m_config.gridColorMinor;
        primary.visible = true;
        primary.priority = 1;
        levels.push_back(primary);

        // Major grid lines (every N lines)
        if (m_config.majorGridInterval > 1) {
            GridLevel major;
            major.spacing = optimalSpacing * m_config.majorGridInterval;
            major.opacity = 1.0f;
            major.lineWidth = m_config.lineWidthMajor;
            major.color = m_config.gridColorMajor;
            major.visible = true;
            major.priority = 2;
            levels.push_back(major);
        }

        // Sub-grid (finer spacing) with fade-in
        if (optimalSpacing >= 1.0) {
            double subSpacing = optimalSpacing / 10.0;
            double pixelSpacing = subSpacing * viewScale;

            if (pixelSpacing > m_config.minPixelSpacing * 0.3) {
                GridLevel sub;
                sub.spacing = subSpacing;
                sub.opacity = calculateLevelOpacity(pixelSpacing,
                    m_config.minPixelSpacing * 0.3,
                    m_config.minPixelSpacing);
                sub.lineWidth = m_config.lineWidthMinor * 0.5f;
                sub.color = m_config.gridColorMinor;
                sub.visible = sub.opacity > 0.05f;
                sub.priority = 0;

                if (sub.visible) {
                    levels.push_back(sub);
                }
            }
        }

        // Sort by priority
        std::sort(levels.begin(), levels.end(),
            [](const GridLevel& a, const GridLevel& b) {
                return a.priority < b.priority;
            });

        return levels;
    }

    double TyrexCanvasOverlay::calculateOptimalSpacing(double viewScale) const
    {
        // AutoCAD-style spacing steps
        static const double spacingSteps[] = {
            0.001, 0.002, 0.005,
            0.01, 0.02, 0.05,
            0.1, 0.2, 0.5,
            1.0, 2.0, 5.0,
            10.0, 20.0, 50.0,
            100.0, 200.0, 500.0,
            1000.0, 2000.0, 5000.0,
            10000.0
        };

        // Target pixel spacing
        double targetPixelSpacing = (m_config.minPixelSpacing + m_config.maxPixelSpacing) / 2.0;
        double idealSpacing = targetPixelSpacing / viewScale;

        // Find closest step
        for (double spacing : spacingSteps) {
            double pixelSpacing = spacing * viewScale;
            if (pixelSpacing >= m_config.minPixelSpacing &&
                pixelSpacing <= m_config.maxPixelSpacing) {
                return spacing;
            }
        }

        // Dynamic calculation if no suitable step found
        double power = std::floor(std::log10(idealSpacing));
        double base = std::pow(10.0, power);
        double normalized = idealSpacing / base;

        double result;
        if (normalized <= 2.0) result = base * 2.0;
        else if (normalized <= 5.0) result = base * 5.0;
        else result = base * 10.0;

        return std::clamp(result, MIN_SPACING, MAX_SPACING);
    }

    float TyrexCanvasOverlay::calculateLevelOpacity(double pixelSpacing,
        double minSpacing,
        double maxSpacing) const
    {
        if (pixelSpacing <= minSpacing) return 0.0f;
        if (pixelSpacing >= maxSpacing) return 1.0f;

        float t = static_cast<float>((pixelSpacing - minSpacing) / (maxSpacing - minSpacing));
        return smoothstep(0.0f, 1.0f, t);
    }

    float TyrexCanvasOverlay::smoothstep(float edge0, float edge1, float x)
    {
        float t = std::clamp((x - edge0) / (edge1 - edge0), 0.0f, 1.0f);
        return t * t * (3.0f - 2.0f * t);
    }

    bool TyrexCanvasOverlay::isLineInViewFrustum(double x1, double y1,
        double x2, double y2) const
    {
        // Simple AABB check
        double lineMinX = std::min(x1, x2);
        double lineMaxX = std::max(x1, x2);
        double lineMinY = std::min(y1, y2);
        double lineMaxY = std::max(y1, y2);

        return !(lineMaxX < m_viewMinX || lineMinX > m_viewMaxX ||
            lineMaxY < m_viewMinY || lineMinY > m_viewMaxY);
    }

    bool TyrexCanvasOverlay::isPointInView(double x, double y) const
    {
        return x >= m_viewMinX && x <= m_viewMaxX &&
            y >= m_viewMinY && y <= m_viewMaxY;
    }

    int TyrexCanvasOverlay::clampGridLineCount(int count) const
    {
        return std::min(std::max(count, 2), MAX_GRID_LINES / 4);
    }

} // namespace TyrexCAD