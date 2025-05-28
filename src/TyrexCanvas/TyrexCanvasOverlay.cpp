#include "TyrexCanvas/TyrexCanvasOverlay.h"
#include "TyrexCanvas/TyrexGridConfig.h"
#include "TyrexCore/SafeHandleUtils.h"

#include <AIS_InteractiveContext.hxx>
#include <V3d_View.hxx>
#include <Graphic3d_AspectLine3d.hxx>
#include <Prs3d_LineAspect.hxx>
#include <AIS_Line.hxx>
#include <AIS_Shape.hxx>
#include <AIS_Point.hxx>
#include <gp_Ax2.hxx>
#include <gp_Pln.hxx>
#include <Geom_Line.hxx>
#include <Geom_CartesianPoint.hxx>
#include <Graphic3d_ArrayOfPoints.hxx>
#include <TColgp_Array1OfPnt.hxx>
#include <Geom_Circle.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <TopoDS_Edge.hxx>
#include <Graphic3d_ZLayerSettings.hxx>
#include <TColStd_SequenceOfInteger.hxx>
#include <cmath>

namespace TyrexCAD {

    TyrexCanvasOverlay::TyrexCanvasOverlay(const Handle(AIS_InteractiveContext)& context,
        const Handle(V3d_View)& view,
        QObject* parent)
        : QObject(parent),
        m_context(context),
        m_view(view),
        m_gridVisible(true),
        m_axisVisible(true),
        m_currentSpacing(10.0),
        m_lastSpacing(-1),
        m_lastStyle(GridStyle::Lines)
    {
        // Initialize with default configuration
        m_config.backgroundColor = Quantity_Color(0.0, 0.0, 0.0, Quantity_TOC_RGB);
        m_config.gridColorMajor = Quantity_Color(0.5, 0.5, 0.5, Quantity_TOC_RGB);
        m_config.gridColorMinor = Quantity_Color(0.3, 0.3, 0.3, Quantity_TOC_RGB);
        m_config.axisColorX = Quantity_Color(1.0, 0.0, 0.0, Quantity_TOC_RGB);
        m_config.axisColorY = Quantity_Color(0.0, 1.0, 0.0, Quantity_TOC_RGB);
        m_config.baseSpacing = 10.0;
        m_config.majorLineInterval = 5;
        m_config.style = GridStyle::Lines;
        m_config.adaptiveSpacing = true;
        m_config.minPixelSpacing = 15.0;
        m_config.maxPixelSpacing = 100.0;
        m_config.snapEnabled = false;
        m_config.showAxes = true;
        m_config.showOriginMarker = true;
        m_config.gridZLayerId = -1;

        // Setup proper Z-layer for grid
        setupProperZLayer();

        // Create the grid and axes initially
        updateGrid();
        updateAxes();
    }

    TyrexCanvasOverlay::~TyrexCanvasOverlay() {
        clearOverlay();
    }

    void TyrexCanvasOverlay::setupProperZLayer() {
        if (!m_context.IsNull() && !m_context->CurrentViewer().IsNull()) {
            // Get existing Z-layers
            TColStd_SequenceOfInteger layers;
            m_context->CurrentViewer()->GetAllZLayers(layers);

            Standard_Integer maxLayer = Graphic3d_ZLayerId_Default;
            for (int i = 1; i <= layers.Length(); i++) {
                if (layers.Value(i) > maxLayer &&
                    layers.Value(i) < Graphic3d_ZLayerId_Topmost) {
                    maxLayer = layers.Value(i);
                }
            }

            // Create new layer above existing ones
            m_config.gridZLayerId = maxLayer + 1;
            m_context->CurrentViewer()->AddZLayer(m_config.gridZLayerId);

            // Configure layer for grid
            Graphic3d_ZLayerSettings aSettings;
            aSettings.SetEnableDepthTest(Standard_False);
            aSettings.SetEnableDepthWrite(Standard_False);
            // Remove unsupported methods
            // aSettings.SetLightingEnabled(Standard_False);
            // aSettings.SetImmediate(Standard_True);
            m_context->CurrentViewer()->SetZLayerSettings(m_config.gridZLayerId, aSettings);

            qDebug() << "Created grid Z-layer with ID:" << m_config.gridZLayerId;
        }
    }

    bool TyrexCanvasOverlay::isGridVisible() const {
        return m_gridVisible;
    }

    bool TyrexCanvasOverlay::isAxisVisible() const {
        return m_axisVisible;
    }

    void TyrexCanvasOverlay::setGridVisible(bool visible) {
        if (m_gridVisible != visible) {
            m_gridVisible = visible;
            update();
        }
    }

    void TyrexCanvasOverlay::setAxisVisible(bool visible) {
        if (m_axisVisible != visible) {
            m_axisVisible = visible;
            update();
        }
    }

    void TyrexCanvasOverlay::setGridConfig(const GridConfig& config) {
        m_config = config;
        calculateAdaptiveSpacing();
        update();
        emit gridConfigChanged();
    }

    const GridConfig& TyrexCanvasOverlay::getGridConfig() const {
        return m_config;
    }

    void TyrexCanvasOverlay::setGridStyle(GridStyle style) {
        if (m_config.style != style) {
            m_config.style = style;
            update();
            emit gridConfigChanged();
        }
    }

    GridStyle TyrexCanvasOverlay::getGridStyle() const {
        return m_config.style;
    }

    double TyrexCanvasOverlay::getCurrentGridSpacing() const {
        return m_currentSpacing;
    }

    void TyrexCanvasOverlay::setGridSpacing(double spacing) {
        if (m_config.baseSpacing != spacing) {
            m_config.baseSpacing = spacing;
            calculateAdaptiveSpacing();
            update();
            emit gridSpacingChanged(m_currentSpacing);
            emit gridConfigChanged();
        }
    }

    void TyrexCanvasOverlay::setSnapEnabled(bool enabled) {
        if (m_config.snapEnabled != enabled) {
            m_config.snapEnabled = enabled;
            emit gridConfigChanged();
        }
    }

    gp_Pnt2d TyrexCanvasOverlay::screenToWorld(const QPoint& screenPos) const {
        if (m_view.IsNull()) {
            return gp_Pnt2d(screenPos.x(), screenPos.y());
        }

        double xv, yv, zv;
        m_view->Convert(screenPos.x(), screenPos.y(), xv, yv, zv);
        return gp_Pnt2d(xv, yv);
    }

    gp_Pnt2d TyrexCanvasOverlay::snapToGrid(const gp_Pnt2d& point) const {
        if (!m_config.snapEnabled) {
            return point;
        }

        double x = std::round(point.X() / m_currentSpacing) * m_currentSpacing;
        double y = std::round(point.Y() / m_currentSpacing) * m_currentSpacing;
        return gp_Pnt2d(x, y);
    }

    void TyrexCanvasOverlay::update() {
        // PERFORMANCE: Smart update - only update what changed
        gp_Vec2d currentExtents = getViewExtents();
        calculateAdaptiveSpacing();

        bool needsFullUpdate = false;

        // Check what changed
        if (m_config.style != m_lastStyle) {
            needsFullUpdate = true;
            m_lastStyle = m_config.style;
        }

        if (std::abs(m_currentSpacing - m_lastSpacing) > 0.001) {
            needsFullUpdate = true;
            m_lastSpacing = m_currentSpacing;
        }

        if ((currentExtents - m_lastExtents).Magnitude() > 1.0) {
            needsFullUpdate = true;
            m_lastExtents = currentExtents;
        }

        if (needsFullUpdate || m_gridObjects.empty() || m_axisObjects.empty()) {
            clearOverlay();

            if (m_gridVisible) {
                updateGrid();
            }

            if (m_axisVisible) {
                updateAxes();
            }
        }

        redraw();
    }

    void TyrexCanvasOverlay::redraw() {
        if (!m_view.IsNull()) {
            m_view->Redraw();
        }
    }

    void TyrexCanvasOverlay::forceUpdate() {
        SAFE_HANDLE_CHECK_RETURN(m_context, "Context is null in forceUpdate", );

        // Clear and recreate
        clearOverlay();
        calculateAdaptiveSpacing();

        if (m_gridVisible) {
            updateGrid();
        }

        if (m_axisVisible) {
            updateAxes();
        }

        // Force viewer update
        if (!m_view.IsNull()) {
            m_view->MustBeResized();
            m_view->Invalidate();
            m_view->Redraw();

            if (!m_context->CurrentViewer().IsNull()) {
                m_context->CurrentViewer()->Redraw();
            }
        }
    }

    void TyrexCanvasOverlay::updateGrid() {
        SAFE_HANDLE_CHECK_RETURN(m_context, "Context is null in updateGrid", );

        if (!m_gridVisible) {
            return;
        }

        // PERFORMANCE: Batch operations
        m_context->SetAutomaticHilight(Standard_False);

        // Calculate grid bounds based on view extents
        gp_Vec2d extents = getViewExtents();
        double width = extents.X() * m_config.gridExtensionFactor;
        double height = extents.Y() * m_config.gridExtensionFactor;

        double minX = -width / 2;
        double maxX = width / 2;
        double minY = -height / 2;
        double maxY = height / 2;

        // Round grid bounds to multiples of spacing for better alignment
        minX = std::floor(minX / m_currentSpacing) * m_currentSpacing;
        maxX = std::ceil(maxX / m_currentSpacing) * m_currentSpacing;
        maxY = std::ceil(maxY / m_currentSpacing) * m_currentSpacing;
        minY = std::floor(minY / m_currentSpacing) * m_currentSpacing;

        if (m_config.style == GridStyle::Lines) {
            // PERFORMANCE: Pre-reserve vector capacity
            int estimatedLines = static_cast<int>((maxX - minX) / m_currentSpacing +
                (maxY - minY) / m_currentSpacing + 2);
            m_gridObjects.reserve(estimatedLines);

            // Create vertical lines
            for (double x = minX; x <= maxX; x += m_currentSpacing) {
                bool isMajor = (std::fmod(std::abs(x), m_currentSpacing * m_config.majorLineInterval) < 0.001);

                // Skip if this is where an axis would be and axes are shown
                if (m_axisVisible && std::abs(x) < 0.001) {
                    continue;
                }

                Handle(Geom_Line) line = new Geom_Line(gp_Pnt(x, minY, 0), gp_Dir(0, 1, 0));
                Handle(AIS_Line) aisLine = new AIS_Line(line);

                if (isMajor) {
                    aisLine->SetColor(m_config.gridColorMajor);
                    aisLine->SetWidth(m_config.lineWidthMajor);
                }
                else {
                    aisLine->SetColor(m_config.gridColorMinor);
                    aisLine->SetWidth(m_config.lineWidthMinor);
                }

                // Set Z-layer
                aisLine->SetZLayer(m_config.gridZLayerId);

                // Display without selection
                m_context->Display(aisLine, AIS_WireFrame, -1, Standard_False, Standard_False);
                m_context->Deactivate(aisLine);

                m_gridObjects.push_back(aisLine);
            }

            // Create horizontal lines
            for (double y = minY; y <= maxY; y += m_currentSpacing) {
                bool isMajor = (std::fmod(std::abs(y), m_currentSpacing * m_config.majorLineInterval) < 0.001);

                // Skip if this is where an axis would be and axes are shown
                if (m_axisVisible && std::abs(y) < 0.001) {
                    continue;
                }

                Handle(Geom_Line) line = new Geom_Line(gp_Pnt(minX, y, 0), gp_Dir(1, 0, 0));
                Handle(AIS_Line) aisLine = new AIS_Line(line);

                if (isMajor) {
                    aisLine->SetColor(m_config.gridColorMajor);
                    aisLine->SetWidth(m_config.lineWidthMajor);
                }
                else {
                    aisLine->SetColor(m_config.gridColorMinor);
                    aisLine->SetWidth(m_config.lineWidthMinor);
                }

                // Set Z-layer
                aisLine->SetZLayer(m_config.gridZLayerId);

                // Display without selection
                m_context->Display(aisLine, AIS_WireFrame, -1, Standard_False, Standard_False);
                m_context->Deactivate(aisLine);

                m_gridObjects.push_back(aisLine);
            }
        }
        else if (m_config.style == GridStyle::Dots) {
            // Create grid dots
            int dotCount = 0;

            for (double x = minX; x <= maxX && dotCount < m_config.maxDots; x += m_currentSpacing) {
                for (double y = minY; y <= maxY && dotCount < m_config.maxDots; y += m_currentSpacing) {
                    bool isMajorX = (std::fmod(std::abs(x), m_currentSpacing * m_config.majorLineInterval) < 0.001);
                    bool isMajorY = (std::fmod(std::abs(y), m_currentSpacing * m_config.majorLineInterval) < 0.001);
                    bool isMajor = isMajorX || isMajorY;

                    // Skip grid point at origin if showing axis
                    if (m_axisVisible && std::abs(x) < 0.001 && std::abs(y) < 0.001) {
                        continue;
                    }

                    Handle(Geom_CartesianPoint) point = new Geom_CartesianPoint(x, y, 0);
                    Handle(AIS_Point) aisPoint = new AIS_Point(point);

                    Quantity_Color color = isMajor ? m_config.gridColorMajor : m_config.gridColorMinor;

                    aisPoint->SetColor(color);
                    aisPoint->SetMarker(Aspect_TOM_POINT);
                    aisPoint->SetZLayer(m_config.gridZLayerId);

                    m_context->Display(aisPoint, Standard_False);
                    m_context->Deactivate(aisPoint);

                    m_gridObjects.push_back(aisPoint);

                    dotCount++;
                }
            }
        }
        else if (m_config.style == GridStyle::Crosses) {
            // Create grid crosses
            int crossCount = 0;
            double crossSize = m_config.crossSize / 2.0;

            for (double x = minX; x <= maxX && crossCount < m_config.maxDots; x += m_currentSpacing) {
                for (double y = minY; y <= maxY && crossCount < m_config.maxDots; y += m_currentSpacing) {
                    // Skip grid point at origin if showing axis
                    if (m_axisVisible && std::abs(x) < 0.001 && std::abs(y) < 0.001) {
                        continue;
                    }

                    bool isMajorX = (std::fmod(std::abs(x), m_currentSpacing * m_config.majorLineInterval) < 0.001);
                    bool isMajorY = (std::fmod(std::abs(y), m_currentSpacing * m_config.majorLineInterval) < 0.001);
                    bool isMajor = isMajorX || isMajorY;

                    Quantity_Color color = isMajor ? m_config.gridColorMajor : m_config.gridColorMinor;
                    double size = isMajor ? crossSize * 1.5 : crossSize;

                    // Create horizontal line of the cross
                    TopoDS_Edge edge1 = BRepBuilderAPI_MakeEdge(gp_Pnt(x - size, y, 0), gp_Pnt(x + size, y, 0));
                    Handle(AIS_Shape) hShape = new AIS_Shape(edge1);
                    hShape->SetColor(color);
                    hShape->SetWidth(isMajor ? m_config.lineWidthMajor : m_config.lineWidthMinor);
                    hShape->SetZLayer(m_config.gridZLayerId);

                    // Create vertical line of the cross
                    TopoDS_Edge edge2 = BRepBuilderAPI_MakeEdge(gp_Pnt(x, y - size, 0), gp_Pnt(x, y + size, 0));
                    Handle(AIS_Shape) vShape = new AIS_Shape(edge2);
                    vShape->SetColor(color);
                    vShape->SetWidth(isMajor ? m_config.lineWidthMajor : m_config.lineWidthMinor);
                    vShape->SetZLayer(m_config.gridZLayerId);

                    m_context->Display(hShape, Standard_False);
                    m_context->Display(vShape, Standard_False);
                    m_context->Deactivate(hShape);
                    m_context->Deactivate(vShape);

                    m_gridObjects.push_back(hShape);
                    m_gridObjects.push_back(vShape);

                    crossCount++;
                }
            }
        }

        // Restore automatic highlighting
        m_context->SetAutomaticHilight(Standard_True);
    }

    void TyrexCanvasOverlay::updateAxes() {
        SAFE_HANDLE_CHECK_RETURN(m_context, "Context is null in updateAxes", );

        if (!m_axisVisible) {
            return;
        }

        // Calculate axes length based on view extents
        gp_Vec2d extents = getViewExtents();
        double width = extents.X() * m_config.gridExtensionFactor;
        double height = extents.Y() * m_config.gridExtensionFactor;

        // Create X axis (horizontal)
        Handle(Geom_Line) xAxis = new Geom_Line(gp_Pnt(-width / 2, 0, 0), gp_Dir(1, 0, 0));
        Handle(AIS_Line) aisXAxis = new AIS_Line(xAxis);
        aisXAxis->SetColor(m_config.axisColorX);
        aisXAxis->SetWidth(m_config.axisLineWidth);
        aisXAxis->SetZLayer(Graphic3d_ZLayerId_Topmost);

        // Create Y axis (vertical)
        Handle(Geom_Line) yAxis = new Geom_Line(gp_Pnt(0, -height / 2, 0), gp_Dir(0, 1, 0));
        Handle(AIS_Line) aisYAxis = new AIS_Line(yAxis);
        aisYAxis->SetColor(m_config.axisColorY);
        aisYAxis->SetWidth(m_config.axisLineWidth);
        aisYAxis->SetZLayer(Graphic3d_ZLayerId_Topmost);

        // Create origin marker
        if (m_config.showOriginMarker) {
            double markerSize = m_config.originMarkerSize;

            // Create origin circle
            Handle(Geom_Circle) circle = new Geom_Circle(gp_Ax2(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)), markerSize / 2.0);
            TopoDS_Edge edgeCircle = BRepBuilderAPI_MakeEdge(circle);
            Handle(AIS_Shape) originMarker = new AIS_Shape(edgeCircle);
            originMarker->SetColor(Quantity_NOC_WHITE);
            originMarker->SetWidth(m_config.axisLineWidth);
            originMarker->SetZLayer(Graphic3d_ZLayerId_Topmost);

            m_context->Display(originMarker, Standard_False);
            m_context->Deactivate(originMarker);
            m_axisObjects.push_back(originMarker);
        }

        m_context->Display(aisXAxis, Standard_False);
        m_context->Display(aisYAxis, Standard_False);
        m_context->Deactivate(aisXAxis);
        m_context->Deactivate(aisYAxis);

        m_axisObjects.push_back(aisXAxis);
        m_axisObjects.push_back(aisYAxis);
    }

    void TyrexCanvasOverlay::clearOverlay() {
        SAFE_HANDLE_CHECK_RETURN(m_context, "Context is null in clearOverlay", );

        // PERFORMANCE: Batch removal
        m_context->SetAutomaticHilight(Standard_False);

        // Clear grid objects
        for (auto& obj : m_gridObjects) {
            if (!obj.IsNull()) {
                m_context->Remove(obj, Standard_False);
            }
        }
        m_gridObjects.clear();

        // Clear axis objects
        for (auto& obj : m_axisObjects) {
            if (!obj.IsNull()) {
                m_context->Remove(obj, Standard_False);
            }
        }
        m_axisObjects.clear();

        m_context->SetAutomaticHilight(Standard_True);
    }

    void TyrexCanvasOverlay::calculateAdaptiveSpacing() {
        if (!m_config.adaptiveSpacing || m_view.IsNull()) {
            m_currentSpacing = m_config.baseSpacing;
            return;
        }

        try {
            // Get view scale factor
            double scale = m_view->Scale();
            double pixelsPerUnit = 1.0 / scale;

            // Calculate ideal spacing based on desired pixel distance
            double idealSpacing = m_config.minPixelSpacing / pixelsPerUnit;

            // Find appropriate power of 10 for spacing
            double power10 = 1.0;
            while (idealSpacing >= power10 * 10) power10 *= 10;
            while (idealSpacing < power10) power10 /= 10;

            // Choose between 1, 2, or 5 times power of 10
            double candidates[] = { power10, power10 * 2, power10 * 5, power10 * 10 };
            double bestDiff = std::numeric_limits<double>::max();
            double bestSpacing = m_config.baseSpacing;

            for (double candidate : candidates) {
                double pixelDist = candidate * pixelsPerUnit;
                if (pixelDist >= m_config.minPixelSpacing && pixelDist <= m_config.maxPixelSpacing) {
                    double diff = std::abs(idealSpacing - candidate);
                    if (diff < bestDiff) {
                        bestDiff = diff;
                        bestSpacing = candidate;
                    }
                }
            }

            m_currentSpacing = bestSpacing;
        }
        catch (...) {
            // Fallback to base spacing if any error occurs during calculation
            m_currentSpacing = m_config.baseSpacing;
        }

        // Emit signal for listeners
        emit gridSpacingChanged(m_currentSpacing);
    }

    gp_Vec2d TyrexCanvasOverlay::getViewExtents() const {
        if (m_view.IsNull()) {
            return gp_Vec2d(1000, 1000); // Default fallback size
        }

        try {
            double width = 0, height = 0;

            // Convert view size to world coordinates
            Standard_Real viewWidth = 0.0, viewHeight = 0.0;
            m_view->Size(viewWidth, viewHeight);

            // Get world coordinates of viewport corners
            Standard_Real xmin, ymin, zmin, xmax, ymax, zmax;
            m_view->Convert(0, 0, xmin, ymin, zmin);
            m_view->Convert(static_cast<Standard_Integer>(viewWidth),
                static_cast<Standard_Integer>(viewHeight),
                xmax, ymax, zmax);

            // Calculate size
            width = std::abs(xmax - xmin);
            height = std::abs(ymax - ymin);

            return gp_Vec2d(width, height);
        }
        catch (...) {
            // Return default size in case of error
            return gp_Vec2d(1000, 1000);
        }
    }

    void TyrexCanvasOverlay::debugGridState() const {
        qDebug() << "=== Grid Debug Information ===";
        qDebug() << "Grid visible:" << m_gridVisible;
        qDebug() << "Axis visible:" << m_axisVisible;
        qDebug() << "Current spacing:" << m_currentSpacing;
        qDebug() << "Grid objects count:" << m_gridObjects.size();
        qDebug() << "Axis objects count:" << m_axisObjects.size();

        if (!m_context.IsNull()) {
            qDebug() << "Context is valid";
            qDebug() << "Viewer is null:" << m_context->CurrentViewer().IsNull();

            if (!m_context->CurrentViewer().IsNull()) {
                TColStd_SequenceOfInteger layers;
                m_context->CurrentViewer()->GetAllZLayers(layers);
                qDebug() << "Z-Layers count:" << layers.Length();
                qDebug() << "Grid Z-Layer ID:" << m_config.gridZLayerId;

                for (int i = 1; i <= layers.Length(); i++) {
                    qDebug() << "  Layer" << i << "ID:" << layers.Value(i);
                }
            }
        }
        else {
            qDebug() << "Context is NULL!";
        }

        if (!m_view.IsNull()) {
            qDebug() << "View scale:" << m_view->Scale();

            Standard_Real width, height;
            m_view->Size(width, height);
            qDebug() << "View size:" << width << "x" << height;

            gp_Vec2d extents = getViewExtents();
            qDebug() << "View extents:" << extents.X() << "x" << extents.Y();
        }
        else {
            qDebug() << "View is NULL!";
        }

        qDebug() << "Last extents:" << m_lastExtents.X() << "x" << m_lastExtents.Y();
        qDebug() << "Last spacing:" << m_lastSpacing;
        qDebug() << "Last style:" << static_cast<int>(m_lastStyle);
    }

} // namespace TyrexCAD