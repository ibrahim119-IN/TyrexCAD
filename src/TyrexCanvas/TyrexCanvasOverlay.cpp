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
#include <algorithm>

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
        m_lastStyle(GridStyle::Lines),
        m_lastViewScale(-1),
        m_viewScale(1.0),
        m_gridNeedsUpdate(true)
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
            try {
                // Get existing Z-layers
                TColStd_SequenceOfInteger layers;
                m_context->CurrentViewer()->GetAllZLayers(layers);

                // البحث عن أعلى layer موجود
                Standard_Integer maxLayer = Graphic3d_ZLayerId_Default;
                for (int i = 1; i <= layers.Length(); i++) {
                    Standard_Integer layerId = layers.Value(i);
                    // تجنب الطبقات الخاصة
                    if (layerId > maxLayer &&
                        layerId < Graphic3d_ZLayerId_Topmost &&
                        layerId != Graphic3d_ZLayerId_TopOSD) {
                        maxLayer = layerId;
                    }
                }

                // Create new layer above existing ones
                m_config.gridZLayerId = maxLayer + 1;

                // التحقق من أن الـ ID لا يتعارض مع الطبقات المحجوزة
                if (m_config.gridZLayerId >= Graphic3d_ZLayerId_TopOSD) {
                    m_config.gridZLayerId = maxLayer + 1;
                }

                m_context->CurrentViewer()->AddZLayer(m_config.gridZLayerId);

                // Configure layer for grid
                Graphic3d_ZLayerSettings aSettings;
                aSettings.SetEnableDepthTest(Standard_False);
                aSettings.SetEnableDepthWrite(Standard_False);
                m_context->CurrentViewer()->SetZLayerSettings(m_config.gridZLayerId, aSettings);

                qDebug() << "Created grid Z-layer with ID:" << m_config.gridZLayerId;

            }
            catch (const Standard_Failure& ex) {
                qCritical() << "Failed to setup Z-layer:" << ex.GetMessageString();
                m_config.gridZLayerId = Graphic3d_ZLayerId_Default;
            }
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
        m_gridNeedsUpdate = true;
        update();
        emit gridConfigChanged();
    }

    const GridConfig& TyrexCanvasOverlay::getGridConfig() const {
        return m_config;
    }

    void TyrexCanvasOverlay::setGridStyle(GridStyle style) {
        if (m_config.style != style) {
            m_config.style = style;
            m_gridNeedsUpdate = true;
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
            m_gridNeedsUpdate = true;
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
        if (!m_view.IsNull()) {
            m_viewScale = m_view->Scale();

            // التحقق من صحة المقياس
            if (m_viewScale <= 0 || std::isnan(m_viewScale) || std::isinf(m_viewScale)) {
                qDebug() << "Invalid view scale detected:" << m_viewScale << ", using default";
                m_viewScale = 1.0;
            }
        }

        // تحديث المستويات المتعددة
        calculateMultiLevelSpacing();

        // التحقق من الحاجة للتحديث الكامل
        gp_Vec2d currentExtents = getViewExtents();
        bool needsFullUpdate = m_gridNeedsUpdate;

        if (!needsFullUpdate) {
            // التحقق من التغييرات الكبيرة
            if (std::abs(m_viewScale - m_lastViewScale) > VIEW_SCALE_EPSILON) {
                needsFullUpdate = true;
            }

            double extentsDiff = std::sqrt(
                std::pow(currentExtents.X() - m_lastExtents.X(), 2) +
                std::pow(currentExtents.Y() - m_lastExtents.Y(), 2)
            );

            // استخدام نسبة مئوية من الحجم الحالي أو قيمة ثابتة
            double threshold = std::min(currentExtents.Magnitude() * 0.1, 100.0);
            if (extentsDiff > threshold) {
                needsFullUpdate = true;
            }
        }

        if (needsFullUpdate || m_gridObjects.empty()) {
            clearOverlay();

            if (m_gridVisible) {
                updateInfiniteGrid();
            }

            if (m_axisVisible) {
                updateAxes();
            }

            m_lastExtents = currentExtents;
            m_lastViewScale = m_viewScale;
            m_gridNeedsUpdate = false;
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

        m_gridNeedsUpdate = true;
        clearOverlay();
        update();

        if (!m_view.IsNull()) {
            m_view->MustBeResized();
            m_view->Invalidate();
            m_view->Redraw();

            if (!m_context->CurrentViewer().IsNull()) {
                m_context->CurrentViewer()->Redraw();
            }
        }
    }

    // NEW: حساب حدود العرض مع هامش إضافي للشبكة اللانهائية
    void TyrexCanvasOverlay::calculateViewBounds(double& minX, double& maxX,
        double& minY, double& maxY) const {
        if (m_view.IsNull()) {
            minX = -500; maxX = 500;
            minY = -500; maxY = 500;
            return;
        }

        try {
            // استخدام طريقة مختلفة بناءً على نوع الكاميرا
            Handle(Graphic3d_Camera) camera = m_view->Camera();
            if (!camera.IsNull() && camera->IsOrthographic()) {
                // في وضع Orthographic (2D)، استخدم حسابات أبسط
                double scale = m_view->Scale();
                if (scale <= 0 || scale > 1e6 || std::isnan(scale) || std::isinf(scale)) {
                    qDebug() << "Invalid scale in orthographic mode:" << scale;
                    minX = -500; maxX = 500;
                    minY = -500; maxY = 500;
                    return;
                }

                // حجم النافذة
                Standard_Real winWidth, winHeight;
                m_view->Size(winWidth, winHeight);

                // حساب النطاق المرئي
                double halfWidth = winWidth / (2.0 * scale);
                double halfHeight = winHeight / (2.0 * scale);

                // الحد الأقصى للحجم المعقول
                const double MAX_HALF_SIZE = 5000.0;
                halfWidth = std::min(halfWidth, MAX_HALF_SIZE);
                halfHeight = std::min(halfHeight, MAX_HALF_SIZE);

                // استخدام مركز ثابت في وضع 2D
                minX = -halfWidth * 1.5;
                maxX = halfWidth * 1.5;
                minY = -halfHeight * 1.5;
                maxY = halfHeight * 1.5;
            }
            else {
                // في وضع Perspective (3D)
                Standard_Real width, height;
                m_view->Size(width, height);

                Standard_Real x1, y1, z1, x2, y2, z2;
                m_view->Convert(0, 0, x1, y1, z1);
                m_view->Convert(static_cast<Standard_Integer>(width),
                    static_cast<Standard_Integer>(height), x2, y2, z2);

                // التحقق من صحة القيم
                if (std::isnan(x1) || std::isnan(y1) || std::isnan(x2) || std::isnan(y2) ||
                    std::isinf(x1) || std::isinf(y1) || std::isinf(x2) || std::isinf(y2)) {
                    qDebug() << "Invalid view bounds detected, using defaults";
                    minX = -500; maxX = 500;
                    minY = -500; maxY = 500;
                    return;
                }

                double viewWidth = std::abs(x2 - x1);
                double viewHeight = std::abs(y2 - y1);

                const double MAX_VIEW_SIZE = 10000.0;
                if (viewWidth > MAX_VIEW_SIZE || viewHeight > MAX_VIEW_SIZE) {
                    qDebug() << "View size too large, clamping to" << MAX_VIEW_SIZE;
                    viewWidth = std::min(viewWidth, MAX_VIEW_SIZE);
                    viewHeight = std::min(viewHeight, MAX_VIEW_SIZE);
                }

                double margin = std::max(viewWidth, viewHeight) * 0.5;

                minX = std::min(x1, x2) - margin;
                maxX = std::max(x1, x2) + margin;
                minY = std::min(y1, y2) - margin;
                maxY = std::max(y1, y2) + margin;
            }

            // التحقق النهائي من معقولية القيم
            double totalWidth = maxX - minX;
            double totalHeight = maxY - minY;
            const double MAX_TOTAL_SIZE = 20000.0;

            if (totalWidth > MAX_TOTAL_SIZE || totalHeight > MAX_TOTAL_SIZE) {
                qDebug() << "Total bounds too large, using defaults";
                minX = -1000; maxX = 1000;
                minY = -1000; maxY = 1000;
            }

            m_viewCenter = gp_Vec2d((minX + maxX) / 2, (minY + maxY) / 2);

        }
        catch (...) {
            qDebug() << "Exception in calculateViewBounds, using defaults";
            minX = -500; maxX = 500;
            minY = -500; maxY = 500;
        }
    }

    // NEW: التحقق من وجود خط في مجال الرؤية
    bool TyrexCanvasOverlay::isLineInViewFrustum(double x1, double y1,
        double x2, double y2) const {
        double minX, maxX, minY, maxY;
        calculateViewBounds(minX, maxX, minY, maxY);

        // فحص بسيط: إذا كان أي من النقاط داخل المجال
        bool p1Inside = (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY);
        bool p2Inside = (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY);

        return p1Inside || p2Inside;
    }

    // NEW: تحديث الشبكة اللانهائية
    void TyrexCanvasOverlay::updateInfiniteGrid() {
        SAFE_HANDLE_CHECK_RETURN(m_context, "Context is null in updateInfiniteGrid", );

        if (!m_gridVisible || m_gridLevels.empty()) {
            return;
        }

        m_context->SetAutomaticHilight(Standard_False);

        // رسم كل مستوى من مستويات الشبكة
        for (const auto& level : m_gridLevels) {
            if (level.visible && level.opacity > 0.01f) {
                drawGridLevel(level);
            }
        }

        m_context->SetAutomaticHilight(Standard_True);
    }

    // NEW: حساب المستويات المتعددة للشبكة
    void TyrexCanvasOverlay::calculateMultiLevelSpacing() {
        if (!m_config.adaptiveSpacing || m_view.IsNull()) {
            m_currentSpacing = m_config.baseSpacing;
            m_gridLevels.clear();
            m_gridLevels.push_back({ m_currentSpacing, 1.0f, m_config.lineWidthMajor,
                                   m_config.gridColorMajor, true, 1 });
            return;
        }

        m_gridLevels = generateGridLevels(m_viewScale);

        // تحديث التباعد الحالي بناءً على المستوى الأساسي
        for (const auto& level : m_gridLevels) {
            if (level.priority == 1) { // المستوى الأساسي
                m_currentSpacing = level.spacing;
                break;
            }
        }

        emit gridSpacingChanged(m_currentSpacing);
    }

    // NEW: توليد مستويات الشبكة بناءً على مقياس العرض
    std::vector<GridLevel> TyrexCanvasOverlay::generateGridLevels(double viewScale) const {
        std::vector<GridLevel> levels;

        // التحقق من صحة viewScale
        if (viewScale <= 0 || std::isnan(viewScale) || std::isinf(viewScale)) {
            qDebug() << "Invalid view scale:" << viewScale;
            // إرجاع مستوى افتراضي واحد
            GridLevel defaultLevel;
            defaultLevel.spacing = m_config.baseSpacing;
            defaultLevel.opacity = 1.0f;
            defaultLevel.lineWidth = m_config.lineWidthMinor;
            defaultLevel.color = m_config.gridColorMinor;
            defaultLevel.visible = true;
            defaultLevel.priority = 1;
            levels.push_back(defaultLevel);
            return levels;
        }

        // حساب التباعد الأمثل
        double optimalSpacing = calculateOptimalSpacing(viewScale);

        // المستوى الأساسي (100% opacity)
        GridLevel primary;
        primary.spacing = optimalSpacing;
        primary.opacity = 1.0f;
        primary.lineWidth = m_config.lineWidthMinor;
        primary.color = m_config.gridColorMinor;
        primary.visible = true;
        primary.priority = 1;
        levels.push_back(primary);

        // المستوى الفرعي (شبكة أدق مع شفافية متغيرة)
        // فقط إذا كان التباعد معقولاً
        if (optimalSpacing >= 0.1) { // لا نريد شبكة فرعية دقيقة جداً
            double subSpacing = optimalSpacing / 10.0;
            double pixelSpacing = subSpacing * viewScale;

            if (pixelSpacing > m_config.minPixelSpacing * 0.5) {
                GridLevel sub;
                sub.spacing = subSpacing;
                sub.opacity = calculateLevelOpacity(pixelSpacing,
                    m_config.minPixelSpacing * 0.5,
                    m_config.minPixelSpacing);
                sub.lineWidth = m_config.lineWidthMinor * 0.7f;
                sub.color = m_config.gridColorMinor;
                sub.visible = sub.opacity > 0.1f;
                sub.priority = 0;
                levels.push_back(sub);
            }
        }

        // المستوى الرئيسي (خطوط أكثر سمكاً كل 5 أو 10 وحدات)
        // فقط إذا كان التباعد لن ينتج عدد كبير من الخطوط
        if (optimalSpacing <= 100.0) { // تجنب المستويات الرئيسية الكبيرة جداً
            double majorSpacing = optimalSpacing * m_config.majorLineInterval;

            // التحقق من أن المستوى الرئيسي لن ينتج عدد كبير من الخطوط
            double viewSize = 2000.0 / viewScale; // تقدير حجم العرض
            int estimatedLines = static_cast<int>(viewSize / majorSpacing);

            if (estimatedLines < 100) { // حد آمن للخطوط الرئيسية
                GridLevel major;
                major.spacing = majorSpacing;
                major.opacity = 1.0f;
                major.lineWidth = m_config.lineWidthMajor;
                major.color = m_config.gridColorMajor;
                major.visible = true;
                major.priority = 2;
                levels.push_back(major);
            }
        }

        // ترتيب المستويات حسب الأولوية
        std::sort(levels.begin(), levels.end(),
            [](const GridLevel& a, const GridLevel& b) {
                return a.priority < b.priority;
            });

        return levels;
    }

    // NEW: حساب التباعد الأمثل بناءً على مقياس العرض
    double TyrexCanvasOverlay::calculateOptimalSpacing(double viewScale) const {
        // مصفوفة خطوات التباعد (مشابهة لـ AutoCAD)
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

        // حساب التباعد المثالي بالبكسل
        double idealSpacing = m_config.minPixelSpacing / viewScale;

        // التحقق من صحة القيمة
        if (std::isnan(idealSpacing) || std::isinf(idealSpacing) || idealSpacing <= 0) {
            qDebug() << "Invalid ideal spacing calculated, using default";
            return m_config.baseSpacing;
        }

        // البحث عن أقرب قيمة في المصفوفة
        for (double spacing : spacingSteps) {
            double pixelSpacing = spacing * viewScale;
            if (pixelSpacing >= m_config.minPixelSpacing &&
                pixelSpacing <= m_config.maxPixelSpacing) {
                return spacing;
            }
        }

        // إذا لم نجد قيمة مناسبة، نحسبها ديناميكياً مع حدود آمنة
        const double MAX_SPACING = 1000.0; // حد أقصى آمن للتباعد

        double power = std::floor(std::log10(idealSpacing));
        double base = std::pow(10.0, power);
        double normalized = idealSpacing / base;

        double result;
        if (normalized <= 2.0) result = base * 2.0;
        else if (normalized <= 5.0) result = base * 5.0;
        else result = base * 10.0;

        // تطبيق الحد الأقصى
        return std::min(result, MAX_SPACING);
    }

    // NEW: حساب شفافية المستوى بناءً على حجم البكسل
    float TyrexCanvasOverlay::calculateLevelOpacity(double pixelSpacing,
        double minSpacing,
        double maxSpacing) const {
        if (pixelSpacing <= minSpacing) return 0.0f;
        if (pixelSpacing >= maxSpacing) return 1.0f;

        // استخدام دالة انتقال سلسة
        float t = static_cast<float>((pixelSpacing - minSpacing) / (maxSpacing - minSpacing));
        return smoothstep(0.0f, 1.0f, t);
    }

    // NEW: دالة انتقال سلسة
    float TyrexCanvasOverlay::smoothstep(float edge0, float edge1, float x) {
        float t = std::clamp((x - edge0) / (edge1 - edge0), 0.0f, 1.0f);
        return t * t * (3.0f - 2.0f * t);
    }

    // NEW: رسم مستوى واحد من الشبكة
    void TyrexCanvasOverlay::drawGridLevel(const GridLevel& level) {
        double minX, maxX, minY, maxY;
        calculateViewBounds(minX, maxX, minY, maxY);

        // التحقق من صحة الحدود
        double viewSize = std::max(maxX - minX, maxY - minY);
        if (viewSize <= 0 || viewSize > 20000 || std::isnan(viewSize) || std::isinf(viewSize)) {
            // لا نطبع رسالة خطأ هنا لتجنب spam
            return;
        }

        // محاذاة الحدود مع الشبكة
        minX = std::floor(minX / level.spacing) * level.spacing;
        maxX = std::ceil(maxX / level.spacing) * level.spacing;
        minY = std::floor(minY / level.spacing) * level.spacing;
        maxY = std::ceil(maxY / level.spacing) * level.spacing;

        // حساب عدد الخطوط
        int numLinesX = static_cast<int>((maxX - minX) / level.spacing) + 1;
        int numLinesY = static_cast<int>((maxY - minY) / level.spacing) + 1;

        // تحديد عدد الخطوط بشكل أكثر صرامة
        const int SAFE_MAX_LINES = 200;
        if (numLinesX > SAFE_MAX_LINES || numLinesY > SAFE_MAX_LINES) {
            // لا نطبع رسالة خطأ لتجنب spam
            return;
        }

        if (numLinesX + numLinesY > MAX_GRID_LINES) {
            return;
        }

        // جمع الخطوط للرسم الدفعي
        std::vector<std::pair<gp_Pnt, gp_Pnt>> lines;
        lines.reserve(numLinesX + numLinesY);

        // الخطوط العمودية
        for (double x = minX; x <= maxX; x += level.spacing) {
            if (m_axisVisible && std::abs(x) < 0.001) continue;
            lines.emplace_back(gp_Pnt(x, minY, 0), gp_Pnt(x, maxY, 0));
        }

        // الخطوط الأفقية
        for (double y = minY; y <= maxY; y += level.spacing) {
            if (m_axisVisible && std::abs(y) < 0.001) continue;
            lines.emplace_back(gp_Pnt(minX, y, 0), gp_Pnt(maxX, y, 0));
        }

        // رسم دفعي للخطوط
        if (!lines.empty()) {
            batchCreateGridLines(lines, level);
        }
    }

    // NEW: إنشاء خطوط الشبكة بشكل دفعي لتحسين الأداء
    void TyrexCanvasOverlay::batchCreateGridLines(const std::vector<std::pair<gp_Pnt, gp_Pnt>>& lines,
        const GridLevel& level) {
        if (m_context.IsNull() || lines.empty()) return;

        try {
            // التحقق من صحة Z-layer
            if (m_config.gridZLayerId < 0) {
                qDebug() << "Invalid Z-layer ID, recreating...";
                setupProperZLayer();
            }

            // إنشاء وعرض الخطوط
            for (const auto& line : lines) {
                Handle(Geom_Line) geomLine = new Geom_Line(line.first,
                    gp_Dir(gp_Vec(line.first, line.second)));
                Handle(AIS_Line) aisLine = new AIS_Line(geomLine);

                // تطبيق اللون والشفافية
                aisLine->SetColor(level.color);
                aisLine->SetWidth(level.lineWidth);

                if (level.opacity < 1.0f) {
                    aisLine->SetTransparency(1.0 - level.opacity);
                }

                // تعيين Z-layer بحذر
                if (m_config.gridZLayerId > 0) {
                    aisLine->SetZLayer(m_config.gridZLayerId);
                }

                // عرض بدون تفعيل التحديد مع معالجة الأخطاء
                try {
                    m_context->Display(aisLine, AIS_WireFrame, -1, Standard_False, Standard_False);
                    m_context->Deactivate(aisLine);
                    m_gridObjects.push_back(aisLine);
                }
                catch (const Standard_Failure& ex) {
                    qDebug() << "Failed to display grid line:" << ex.GetMessageString();
                }
            }
        }
        catch (const Standard_Failure& ex) {
            qDebug() << "Exception in batchCreateGridLines:" << ex.GetMessageString();
        }
        catch (...) {
            qDebug() << "Unknown exception in batchCreateGridLines";
        }
    }

    void TyrexCanvasOverlay::updateGrid() {
        // استخدام النظام الجديد
        updateInfiniteGrid();
    }

    void TyrexCanvasOverlay::updateAxes() {
        SAFE_HANDLE_CHECK_RETURN(m_context, "Context is null in updateAxes", );

        if (!m_axisVisible) {
            return;
        }

        try {
            // حساب طول المحاور بناءً على حدود العرض
            double minX, maxX, minY, maxY;
            calculateViewBounds(minX, maxX, minY, maxY);

            // إنشاء المحور X
            Handle(Geom_Line) xAxis = new Geom_Line(gp_Pnt(minX, 0, 0), gp_Dir(1, 0, 0));
            Handle(AIS_Line) aisXAxis = new AIS_Line(xAxis);
            aisXAxis->SetColor(m_config.axisColorX);
            aisXAxis->SetWidth(m_config.axisLineWidth);

            // استخدام Z-layer موثوق
            if (m_config.gridZLayerId > 0) {
                aisXAxis->SetZLayer(m_config.gridZLayerId);
            }
            else {
                aisXAxis->SetZLayer(Graphic3d_ZLayerId_Default);
            }

            // إنشاء المحور Y
            Handle(Geom_Line) yAxis = new Geom_Line(gp_Pnt(0, minY, 0), gp_Dir(0, 1, 0));
            Handle(AIS_Line) aisYAxis = new AIS_Line(yAxis);
            aisYAxis->SetColor(m_config.axisColorY);
            aisYAxis->SetWidth(m_config.axisLineWidth);

            if (m_config.gridZLayerId > 0) {
                aisYAxis->SetZLayer(m_config.gridZLayerId);
            }
            else {
                aisYAxis->SetZLayer(Graphic3d_ZLayerId_Default);
            }

            // علامة الأصل
            if (m_config.showOriginMarker) {
                double markerSize = m_config.originMarkerSize / m_viewScale;

                // تحديد حجم معقول للعلامة
                markerSize = std::max(0.1, std::min(markerSize, 50.0));

                Handle(Geom_Circle) circle = new Geom_Circle(gp_Ax2(gp_Pnt(0, 0, 0),
                    gp_Dir(0, 0, 1)), markerSize);
                TopoDS_Edge edgeCircle = BRepBuilderAPI_MakeEdge(circle);
                Handle(AIS_Shape) originMarker = new AIS_Shape(edgeCircle);
                originMarker->SetColor(Quantity_NOC_WHITE);
                originMarker->SetWidth(m_config.axisLineWidth);

                if (m_config.gridZLayerId > 0) {
                    originMarker->SetZLayer(m_config.gridZLayerId);
                }
                else {
                    originMarker->SetZLayer(Graphic3d_ZLayerId_Default);
                }

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
        catch (const Standard_Failure& ex) {
            qCritical() << "Exception in updateAxes:" << ex.GetMessageString();
        }
    }

    void TyrexCanvasOverlay::clearOverlay() {
        SAFE_HANDLE_CHECK_RETURN(m_context, "Context is null in clearOverlay", );

        m_context->SetAutomaticHilight(Standard_False);

        // مسح كائنات الشبكة
        for (auto& obj : m_gridObjects) {
            if (!obj.IsNull()) {
                m_context->Remove(obj, Standard_False);
            }
        }
        m_gridObjects.clear();

        // مسح كائنات المحاور
        for (auto& obj : m_axisObjects) {
            if (!obj.IsNull()) {
                m_context->Remove(obj, Standard_False);
            }
        }
        m_axisObjects.clear();

        m_context->SetAutomaticHilight(Standard_True);
    }

    void TyrexCanvasOverlay::calculateAdaptiveSpacing() {
        // يتم استخدام النظام الجديد في calculateMultiLevelSpacing
        calculateMultiLevelSpacing();
    }

    gp_Vec2d TyrexCanvasOverlay::getViewExtents() const {
        if (m_view.IsNull()) {
            return gp_Vec2d(1000, 1000);
        }

        try {
            double minX, maxX, minY, maxY;
            calculateViewBounds(minX, maxX, minY, maxY);

            double width = maxX - minX;
            double height = maxY - minY;

            // التحقق من معقولية القيم
            if (width <= 0 || height <= 0 || width > 100000 || height > 100000 ||
                std::isnan(width) || std::isnan(height) ||
                std::isinf(width) || std::isinf(height)) {
                qDebug() << "Invalid view extents calculated:" << width << "x" << height;
                return gp_Vec2d(1000, 1000);
            }

            return gp_Vec2d(width, height);
        }
        catch (...) {
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
        qDebug() << "Grid levels count:" << m_gridLevels.size();

        for (size_t i = 0; i < m_gridLevels.size(); ++i) {
            const auto& level = m_gridLevels[i];
            qDebug() << "  Level" << i << ":"
                << "spacing=" << level.spacing
                << "opacity=" << level.opacity
                << "priority=" << level.priority
                << "visible=" << level.visible;
        }

        if (!m_context.IsNull()) {
            qDebug() << "Context is valid";
            qDebug() << "Viewer is null:" << m_context->CurrentViewer().IsNull();

            if (!m_context->CurrentViewer().IsNull()) {
                TColStd_SequenceOfInteger layers;
                m_context->CurrentViewer()->GetAllZLayers(layers);
                qDebug() << "Z-Layers count:" << layers.Length();
                qDebug() << "Grid Z-Layer ID:" << m_config.gridZLayerId;
            }
        }
        else {
            qDebug() << "Context is NULL!";
        }

        if (!m_view.IsNull()) {
            qDebug() << "View scale:" << m_view->Scale();

            gp_Vec2d extents = getViewExtents();
            qDebug() << "View extents:" << extents.X() << "x" << extents.Y();

            qDebug() << "View center:" << m_viewCenter.X() << "," << m_viewCenter.Y();
        }
        else {
            qDebug() << "View is NULL!";
        }
    }

} // namespace TyrexCAD