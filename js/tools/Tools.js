/**
 * TyrexCAD Tools System - Enhanced Version
 * نظام إدارة أدوات الرسم والتعديل المتقدم
 * 
 * يحتوي على جميع أدوات الرسم والتعديل مع بنية تحتية محسنة
 */

// ==================== Base Classes ====================

/**
 * الفئة الأساسية لجميع الأدوات
 */
class ToolBase {
    constructor(toolsManager, name) {
        this.toolsManager = toolsManager;
        this.cad = toolsManager.cad;
        this.name = name;
        this.active = false;
        this.state = {};
        this.options = {};
        this.errors = [];
    }
    
    /**
     * تفعيل الأداة
     */
    activate(options = {}) {
        this.active = true;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.state = {};
        this.errors = [];
        this.onActivate();
    }
    
    /**
     * إلغاء تفعيل الأداة
     */
    deactivate() {
        this.active = false;
        this.onDeactivate();
        this.cleanup();
    }
    
    /**
     * الخيارات الافتراضية (للتعديل في الفئات الفرعية)
     */
    getDefaultOptions() {
        return {};
    }
    
    /**
     * معالجة النقر
     */
    handleClick(point) {
        try {
            if (!this.active) return;
            this.onClick(point);
        } catch (error) {
            this.handleError(error);
        }
    }
    
    /**
     * معالجة حركة الماوس
     */
    handleMouseMove(point) {
        try {
            if (!this.active) return;
            this.onMouseMove(point);
        } catch (error) {
            this.handleError(error);
        }
    }
    
    /**
     * معالجة ضغط المفاتيح
     */
    handleKeyPress(key) {
        try {
            if (!this.active) return;
            this.onKeyPress(key);
        } catch (error) {
            this.handleError(error);
        }
    }
    
    /**
     * معالجة الأخطاء المحسنة
     */
    handleError(error) {
        console.error(`[${this.name}] Error:`, error);
        this.errors.push(error);
        
        // عرض رسالة خطأ مفصلة
        if (this.cad.ui) {
            let message = error.message || 'An error occurred';
            
            // رسائل خطأ مخصصة
            if (message.includes('Advanced geometry not available')) {
                message = 'Advanced tools require GeometryAdvanced module';
            } else if (message.includes('Invalid selection')) {
                message = 'Please select valid objects for this operation';
            }
            
            this.cad.ui.showError(message);
        }
        
        // إلغاء العملية الحالية
        this.deactivate();
    }
    
    /**
     * تحديث الحالة
     */
    updateStatus(message) {
        this.cad.updateStatus(`${this.name.toUpperCase()}: ${message}`);
    }
    
    /**
     * تنظيف
     */
    cleanup() {
        this.state = {};
        this.errors = [];
    }
    
    // Methods to override in subclasses
    onActivate() {}
    onDeactivate() {}
    onClick(point) {}
    onMouseMove(point) {}
    onKeyPress(key) {}
}

/**
 * الفئة الأساسية لأدوات الرسم
 */
class DrawingToolBase extends ToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.drawingPoints = [];
        this.tempShape = null;
    }
    
    onActivate() {
        this.drawingPoints = [];
        this.tempShape = null;
    }
    
    onDeactivate() {
        this.finishDrawing();
    }
    
    finishDrawing() {
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.tempShape = null;
        this.cad.tempShape = null;
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
        this.cad.drawingPoints = this.drawingPoints;
    }
}

/**
 * الفئة الأساسية لأدوات التعديل
 */
class ModifyToolBase extends ToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.selection = [];
        this.originalShapes = [];
    }
    
    onActivate() {
        this.selection = [];
        this.originalShapes = [];
        
        // التحقق من وجود عناصر محددة
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select objects first');
            this.deactivate();
            return false;
        }
        
        // حفظ نسخ من الأشكال الأصلية
        this.selection = Array.from(this.cad.selectedShapes);
        this.originalShapes = this.selection.map(s => this.cad.cloneShape(s));
        
        return true;
    }
    
    applyModification() {
        this.cad.recordState();
    }
}

/**
 * الفئة الأساسية للأدوات المتقدمة
 */
class AdvancedToolBase extends ToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.ui = null;
        this.preview = null;
    }
    
    onActivate() {
        // إنشاء UI panel
        this.createUI();
    }
    
    onDeactivate() {
        // إزالة UI panel
        this.destroyUI();
        this.clearPreview();
    }
    
    createUI() {
        if (this.cad.ui) {
            // استخدام النظام الجديد للـ panels
            this.cad.ui.showToolPanel(this.name, {
                x: 350,
                y: 200
            });
        }
    }
    
    destroyUI() {
        if (this.cad.ui) {
            this.cad.ui.hideToolPanel();
        }
    }
    
    showPreview(shapes) {
        this.preview = shapes;
        this.cad.tempShapes = shapes;
        this.cad.render();
    }
    
    clearPreview() {
        this.preview = null;
        this.cad.tempShapes = null;
        this.cad.render();
    }
    
    getUIOptions() {
        return [];
    }
}

// ==================== Tools Manager ====================

class Tools {
    constructor() {
        // مرجع لـ CAD instance
        this.cad = null;
        
        // الأدوات المسجلة
        this.tools = new Map();
        
        // الأداة النشطة حالياً
        this.activeTool = null;
        
        // حالة خاصة بأدوات التعديل (للتوافق مع الكود القديم)
        this.modifyState = {
            originalShapes: [],
            baseDistance: 50,
            trimExtendBoundaries: [],
            offsetDistance: 10
        };
    }
    
    /**
     * تهيئة النظام
     * @param {TyrexCAD} cadInstance - مرجع للنظام الرئيسي
     */
    init(cadInstance) {
        this.cad = cadInstance;
        this.registerTools();
    }
    
    /**
     * تسجيل جميع الأدوات
     */
    registerTools() {
        // أدوات الرسم الأساسية
        this.registerTool('line', LineTool);
        this.registerTool('polyline', PolylineTool);
        this.registerTool('rectangle', RectangleTool);
        this.registerTool('circle', CircleTool);
        this.registerTool('arc', ArcTool);
        this.registerTool('ellipse', EllipseTool);
        this.registerTool('polygon', PolygonTool);
        this.registerTool('text', TextTool);
        
        // أدوات التعديل
        this.registerTool('move', MoveTool);
        this.registerTool('copy', CopyTool);
        this.registerTool('rotate', RotateTool);
        this.registerTool('scale', ScaleTool);
        this.registerTool('mirror', MirrorTool);
        this.registerTool('trim', TrimTool);
        this.registerTool('extend', ExtendTool);
        this.registerTool('offset', OffsetTool);
        
        // الأدوات المتقدمة
        this.registerTool('fillet', FilletTool);
        this.registerTool('chamfer', ChamferTool);
        this.registerTool('rectangular-array', RectangularArrayTool);
        this.registerTool('polar-array', PolarArrayTool);
        this.registerTool('path-array', PathArrayTool);
        
        // Boolean Operations
        this.registerTool('union', UnionTool);
        this.registerTool('difference', DifferenceTool);
        this.registerTool('intersection', IntersectionTool);
        
        // Analysis Tools
        this.registerTool('distance-analysis', DistanceAnalysisTool);
        this.registerTool('area-analysis', AreaAnalysisTool);
        this.registerTool('properties-analysis', PropertiesAnalysisTool);
        
        // Curves Tools
        this.registerTool('convert-to-polyline', ConvertToPolylineTool);
        this.registerTool('simplify-polyline', SimplifyPolylineTool);
        this.registerTool('smooth-polyline', SmoothPolylineTool);
    }
    
    /**
     * تسجيل أداة جديدة
     */
    registerTool(name, toolClass) {
        this.tools.set(name, new toolClass(this, name));
    }
    
    /**
     * تفعيل أداة
     */
    activateTool(name, options = {}) {
        // إلغاء تفعيل الأداة الحالية
        if (this.activeTool) {
            this.activeTool.deactivate();
        }
        
        // تفعيل الأداة الجديدة
        const tool = this.tools.get(name);
        if (tool) {
            this.activeTool = tool;
            tool.activate(options);
            return true;
        }
        
        console.warn(`Tool not found: ${name}`);
        return false;
    }
    
    /**
     * إلغاء تفعيل الأداة الحالية
     */
    deactivateCurrentTool() {
        if (this.activeTool) {
            this.activeTool.deactivate();
            this.activeTool = null;
        }
    }
    
    /**
     * معالجة النقر (للتوافق مع الكود القديم)
     */
    handleClick(point) {
        if (this.activeTool) {
            this.activeTool.handleClick(point);
        }
    }
    
    /**
     * إعادة تعيين حالة التعديل
     */
    resetModifyState() {
        this.modifyState.originalShapes = [];
        this.modifyState.baseDistance = 50;
        this.modifyState.trimExtendBoundaries = [];
        this.modifyState.offsetDistance = 10;
    }
    
    // ==================== أدوات الرسم ====================
    
    // Wrapper functions للتوافق مع الكود القديم
    drawLine(point) {
        const tool = this.tools.get('line');
        if (tool) tool.onClick(point);
    }
    
    drawPolyline(point) {
        const tool = this.tools.get('polyline');
        if (tool) tool.onClick(point);
    }
    
    finishPolyline() {
        const tool = this.tools.get('polyline');
        if (tool && tool.active) tool.finishPolyline();
    }
    
    drawRectangle(point) {
        const tool = this.tools.get('rectangle');
        if (tool) tool.onClick(point);
    }
    
    drawCircle(point) {
        const tool = this.tools.get('circle');
        if (tool) tool.onClick(point);
    }
    
    drawArc(point) {
        const tool = this.tools.get('arc');
        if (tool) tool.onClick(point);
    }
    
    drawEllipse(point) {
        const tool = this.tools.get('ellipse');
        if (tool) tool.onClick(point);
    }
    
    drawText(point) {
        const tool = this.tools.get('text');
        if (tool) tool.onClick(point);
    }
    
    // أدوات التعديل
    moveStart(point) {
        const tool = this.tools.get('move');
        if (tool) tool.onClick(point);
    }
    
    copyStart(point) {
        const tool = this.tools.get('copy');
        if (tool) tool.onClick(point);
    }
    
    rotateStart(point) {
        const tool = this.tools.get('rotate');
        if (tool) tool.onClick(point);
    }
    
    scaleStart(point) {
        const tool = this.tools.get('scale');
        if (tool) tool.onClick(point);
    }
    
    mirrorStart(point) {
        const tool = this.tools.get('mirror');
        if (tool) tool.onClick(point);
    }
    
    handleTrim(point) {
        const tool = this.tools.get('trim');
        if (tool) tool.onClick(point);
    }
    
    handleExtend(point) {
        const tool = this.tools.get('extend');
        if (tool) tool.onClick(point);
    }
    
    handleOffset(point) {
        const tool = this.tools.get('offset');
        if (tool) tool.onClick(point);
    }
    
    updateOffsetDistance(distance) {
        this.modifyState.offsetDistance = distance;
        const tool = this.tools.get('offset');
        if (tool) tool.options.distance = distance;
    }
    
    // دوال للتوافق مع TyrexCAD.js
    performUnion() {
        this.activateTool('union');
    }
    
    performDifference() {
        this.activateTool('difference');
    }
    
    performIntersection() {
        this.activateTool('intersection');
    }
    
    analyzeDistance() {
        this.activateTool('distance-analysis');
    }
    
    analyzeArea() {
        this.activateTool('area-analysis');
    }
    
    analyzeProperties() {
        this.activateTool('properties-analysis');
    }
    
    convertToPolyline() {
        this.activateTool('convert-to-polyline');
    }
    
    simplifyPolyline(tolerance) {
        this.activateTool('simplify-polyline', { tolerance });
    }
    
    smoothPolyline(iterations) {
        this.activateTool('smooth-polyline', { iterations });
    }
}

// ==================== أدوات الرسم الأساسية ====================

/**
 * أداة رسم الخط
 */
class LineTool extends DrawingToolBase {
    onActivate() {
        super.onActivate();
        this.cad.isDrawing = false;
        this.updateStatus('Specify first point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            
            if (this.cad.pendingShapeProperties && this.cad.pendingShapeProperties.lineLength > 0) {
                const length = this.cad.pendingShapeProperties.lineLength;
                const angle = (this.cad.pendingShapeProperties.lineAngle || 0) * Math.PI / 180;
                
                const endPoint = {
                    x: point.x + length * Math.cos(angle),
                    y: point.y + length * Math.sin(angle)
                };
                
                this.createLine(point, endPoint);
                this.finishDrawing();
                this.cad.pendingShapeProperties = null;
            } else {
                this.updateStatus('Specify second point');
            }
        } else {
            this.createLine(this.drawingPoints[0], point);
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            this.tempShape = {
                type: 'line',
                start: this.drawingPoints[0],
                end: point,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType
            };
            this.cad.tempShape = this.tempShape;
        }
    }
    
    createLine(start, end) {
        const shape = {
            type: 'line',
            start: start,
            end: end,
            color: this.cad.currentColor,
            lineWidth: this.cad.currentLineWidth,
            lineType: this.cad.currentLineType,
            layerId: this.cad.currentLayerId,
            id: this.cad.generateId()
        };
        
        this.cad.addShape(shape);
    }
}

/**
 * أداة رسم الخط المتعدد
 */
class PolylineTool extends DrawingToolBase {
    onActivate() {
        super.onActivate();
        this.updateStatus('Specify first point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
        }
        
        this.addPoint(point);
        this.updateStatus(`Point ${this.drawingPoints.length} added (Enter to finish, Right-click to finish)`);
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            this.tempShape = {
                type: 'polyline',
                points: [...this.drawingPoints, point],
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType
            };
            this.cad.tempShape = this.tempShape;
        }
    }
    
    onKeyPress(key) {
        if (key === 'Enter' && this.cad.isDrawing) {
            this.finishPolyline();
        }
    }
    
    finishPolyline() {
        if (this.drawingPoints.length > 1) {
            const shape = {
                type: 'polyline',
                points: [...this.drawingPoints],
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType,
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
            
            this.cad.addShape(shape);
        }
        this.finishDrawing();
    }
}

/**
 * أداة رسم المستطيل
 */
class RectangleTool extends DrawingToolBase {
    onActivate() {
        super.onActivate();
        this.updateStatus('Specify first corner');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            
            if (this.cad.pendingShapeProperties && 
                this.cad.pendingShapeProperties.rectWidth > 0 && 
                this.cad.pendingShapeProperties.rectHeight > 0) {
                
                const width = this.cad.pendingShapeProperties.rectWidth;
                const height = this.cad.pendingShapeProperties.rectHeight;
                
                this.createRectangle(point, {
                    x: point.x + width,
                    y: point.y + height
                });
                
                this.finishDrawing();
                this.cad.pendingShapeProperties = null;
            } else {
                this.updateStatus('Specify opposite corner');
            }
        } else {
            this.createRectangle(this.drawingPoints[0], point);
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            this.tempShape = {
                type: 'rectangle',
                start: this.drawingPoints[0],
                end: point,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType
            };
            this.cad.tempShape = this.tempShape;
        }
    }
    
    createRectangle(start, end) {
        const shape = {
            type: 'rectangle',
            start: start,
            end: end,
            color: this.cad.currentColor,
            lineWidth: this.cad.currentLineWidth,
            lineType: this.cad.currentLineType,
            layerId: this.cad.currentLayerId,
            id: this.cad.generateId()
        };
        
        this.cad.addShape(shape);
    }
}

/**
 * أداة رسم الدائرة
 */
class CircleTool extends DrawingToolBase {
    onActivate() {
        super.onActivate();
        this.updateStatus('Specify center point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            
            if (this.cad.pendingShapeProperties && this.cad.pendingShapeProperties.circleRadius > 0) {
                const radius = this.cad.pendingShapeProperties.circleRadius;
                this.createCircle(point, radius);
                this.finishDrawing();
                this.cad.pendingShapeProperties = null;
            } else {
                this.updateStatus('Specify radius');
            }
        } else {
            const radius = this.cad.distance(
                this.drawingPoints[0].x,
                this.drawingPoints[0].y,
                point.x,
                point.y
            );
            
            this.createCircle(this.drawingPoints[0], radius);
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const radius = this.cad.distance(
                this.drawingPoints[0].x,
                this.drawingPoints[0].y,
                point.x,
                point.y
            );
            
            this.tempShape = {
                type: 'circle',
                center: this.drawingPoints[0],
                radius: radius,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType
            };
            this.cad.tempShape = this.tempShape;
        }
    }
    
    createCircle(center, radius) {
        const shape = {
            type: 'circle',
            center: center,
            radius: radius,
            color: this.cad.currentColor,
            lineWidth: this.cad.currentLineWidth,
            lineType: this.cad.currentLineType,
            layerId: this.cad.currentLayerId,
            id: this.cad.generateId()
        };
        
        this.cad.addShape(shape);
    }
}

/**
 * أداة رسم القوس
 */
class ArcTool extends DrawingToolBase {
    onActivate() {
        super.onActivate();
        this.updateStatus('Specify first point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify second point');
        } else if (this.drawingPoints.length === 1) {
            this.addPoint(point);
            this.updateStatus('Specify end point');
        } else {
            const arc = this.cad.geo.calculateArcFrom3Points(
                this.drawingPoints[0],
                this.drawingPoints[1],
                point
            );
            
            if (arc) {
                const shape = {
                    type: 'arc',
                    center: arc.center,
                    radius: arc.radius,
                    startAngle: arc.startAngle,
                    endAngle: arc.endAngle,
                    color: this.cad.currentColor,
                    lineWidth: this.cad.currentLineWidth,
                    lineType: this.cad.currentLineType,
                    layerId: this.cad.currentLayerId,
                    id: this.cad.generateId()
                };
                
                this.cad.addShape(shape);
            }
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length === 2) {
            const arc = this.cad.geo.calculateArcFrom3Points(
                this.drawingPoints[0],
                this.drawingPoints[1],
                point
            );
            
            if (arc) {
                this.tempShape = {
                    type: 'arc',
                    center: arc.center,
                    radius: arc.radius,
                    startAngle: arc.startAngle,
                    endAngle: arc.endAngle,
                    color: this.cad.currentColor,
                    lineWidth: this.cad.currentLineWidth,
                    lineType: this.cad.currentLineType
                };
                this.cad.tempShape = this.tempShape;
            }
        }
    }
}

/**
 * أداة رسم الشكل البيضاوي
 */
class EllipseTool extends DrawingToolBase {
    onActivate() {
        super.onActivate();
        this.updateStatus('Specify center point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify first axis');
        } else if (this.drawingPoints.length === 1) {
            this.addPoint(point);
            this.updateStatus('Specify second axis');
        } else {
            const center = this.drawingPoints[0];
            const radiusX = Math.abs(this.drawingPoints[1].x - center.x);
            const radiusY = Math.abs(point.y - center.y);
            
            const shape = {
                type: 'ellipse',
                center: center,
                radiusX: radiusX,
                radiusY: radiusY,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType,
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
            
            this.cad.addShape(shape);
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing) {
            if (this.drawingPoints.length === 1) {
                const center = this.drawingPoints[0];
                this.tempShape = {
                    type: 'ellipse',
                    center: center,
                    radiusX: Math.abs(point.x - center.x),
                    radiusY: Math.abs(point.y - center.y),
                    color: this.cad.currentColor,
                    lineWidth: this.cad.currentLineWidth,
                    lineType: this.cad.currentLineType
                };
                this.cad.tempShape = this.tempShape;
            }
        }
    }
}

/**
 * أداة رسم المضلع المنتظم
 */
class PolygonTool extends DrawingToolBase {
    getDefaultOptions() {
        return {
            sides: 6
        };
    }
    
    onActivate() {
        super.onActivate();
        
        // عرض dialog لعدد الأضلاع
        if (this.cad.ui) {
            this.cad.ui.showPolygonDialog((sides) => {
                this.options.sides = sides;
                this.updateStatus('Specify center point');
            });
        }
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify radius');
        } else {
            const center = this.drawingPoints[0];
            const radius = this.cad.distance(center.x, center.y, point.x, point.y);
            
            this.createPolygon(center, radius);
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const center = this.drawingPoints[0];
            const radius = this.cad.distance(center.x, center.y, point.x, point.y);
            
            const points = [];
            const angleStep = (2 * Math.PI) / this.options.sides;
            
            for (let i = 0; i < this.options.sides; i++) {
                const angle = i * angleStep - Math.PI / 2;
                points.push({
                    x: center.x + radius * Math.cos(angle),
                    y: center.y + radius * Math.sin(angle)
                });
            }
            points.push(points[0]);
            
            this.tempShape = {
                type: 'polyline',
                points: points,
                closed: true,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType
            };
            this.cad.tempShape = this.tempShape;
        }
    }
    
    async createPolygon(center, radius) {
        if (this.cad.geometryAdvanced) {
            const polygon = this.cad.geometryAdvanced.createPolygon(center, radius, this.options.sides);
            polygon.color = this.cad.currentColor;
            polygon.lineWidth = this.cad.currentLineWidth;
            polygon.lineType = this.cad.currentLineType;
            polygon.layerId = this.cad.currentLayerId;
            polygon.id = this.cad.generateId();
            
            this.cad.addShape(polygon);
        }
    }
}

/**
 * أداة إضافة النص
 */
class TextTool extends DrawingToolBase {
    onClick(point) {
        if (this.cad.ui) {
            this.cad.ui.showTextDialog((text) => {
                if (text) {
                    const shape = {
                        type: 'text',
                        position: point,
                        text: text,
                        fontSize: 16,
                        color: this.cad.currentColor,
                        layerId: this.cad.currentLayerId,
                        id: this.cad.generateId()
                    };
                    
                    this.cad.addShape(shape);
                }
            });
        }
    }
}

// ==================== أدوات التعديل ====================

/**
 * أداة التحريك
 */
class MoveTool extends ModifyToolBase {
    onActivate() {
        if (!super.onActivate()) return;
        
        this.cad.isDrawing = false;
        this.updateStatus('Specify base point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify second point');
        } else {
            const dx = point.x - this.drawingPoints[0].x;
            const dy = point.y - this.drawingPoints[0].y;
            
            this.applyModification();
            
            this.selection.forEach((shape, index) => {
                const original = this.originalShapes[index];
                this.cad.copyShapeProperties(shape, original);
                this.cad.translateShape(shape, dx, dy);
            });
            
            this.finishMoving();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const dx = point.x - this.drawingPoints[0].x;
            const dy = point.y - this.drawingPoints[0].y;
            
            const tempShapes = this.originalShapes.map(shape => {
                const temp = this.cad.cloneShape(shape);
                this.cad.translateShape(temp, dx, dy);
                return temp;
            });
            
            this.showPreview(tempShapes);
        }
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    finishMoving() {
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.clearPreview();
        this.cad.finishDrawing();
    }
}

/**
 * أداة النسخ
 */
class CopyTool extends ModifyToolBase {
    getDefaultOptions() {
        return {
            multiple: false
        };
    }
    
    onActivate() {
        if (!super.onActivate()) return;
        
        this.cad.isDrawing = false;
        this.updateStatus('Specify base point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify second point');
        } else {
            const dx = point.x - this.drawingPoints[0].x;
            const dy = point.y - this.drawingPoints[0].y;
            
            this.applyModification();
            
            const newShapes = [];
            this.originalShapes.forEach(shape => {
                const newShape = this.cad.cloneShape(shape);
                newShape.id = this.cad.generateId();
                this.cad.translateShape(newShape, dx, dy);
                this.cad.shapes.push(newShape);
                newShapes.push(newShape);
            });
            
            // Select new shapes
            this.cad.selectedShapes.clear();
            newShapes.forEach(shape => this.cad.selectedShapes.add(shape));
            
            if (this.options.multiple) {
                // Continue copying
                this.drawingPoints = [point];
                this.updateStatus('Specify next point or ESC to finish');
            } else {
                this.finishCopying();
            }
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const dx = point.x - this.drawingPoints[0].x;
            const dy = point.y - this.drawingPoints[0].y;
            
            const tempShapes = this.originalShapes.map(shape => {
                const temp = this.cad.cloneShape(shape);
                this.cad.translateShape(temp, dx, dy);
                temp.color = this.cad.currentColor;
                temp.lineWidth = this.cad.currentLineWidth;
                return temp;
            });
            
            this.showPreview(tempShapes);
        }
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    finishCopying() {
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.clearPreview();
        this.cad.finishDrawing();
    }
}

/**
 * أداة التدوير
 */
class RotateTool extends ModifyToolBase {
    onActivate() {
        if (!super.onActivate()) return;
        
        this.cad.isDrawing = false;
        this.updateStatus('Specify base point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.cad.showDynamicInput('Angle:', point);
            this.updateStatus('Specify rotation angle');
        } else {
            const center = this.drawingPoints[0];
            const angle = Math.atan2(
                point.y - center.y,
                point.x - center.x
            );
            
            this.applyModification();
            
            this.selection.forEach((shape, index) => {
                const original = this.originalShapes[index];
                this.cad.copyShapeProperties(shape, original);
                this.cad.rotateShape(shape, center, angle);
            });
            
            this.finishRotating();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const center = this.drawingPoints[0];
            const angle = Math.atan2(
                point.y - center.y,
                point.x - center.x
            );
            
            const tempShapes = this.originalShapes.map(shape => {
                const temp = this.cad.cloneShape(shape);
                this.cad.rotateShape(temp, center, angle);
                return temp;
            });
            
            this.showPreview(tempShapes);
            
            // Update dynamic input
            const degrees = angle * 180 / Math.PI;
            if (this.cad.ui) {
                this.cad.ui.updateDynamicInput(degrees.toFixed(1) + '°');
            }
        }
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    finishRotating() {
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.clearPreview();
        this.cad.finishDrawing();
    }
}

/**
 * أداة التكبير/التصغير
 */
class ScaleTool extends ModifyToolBase {
    onActivate() {
        if (!super.onActivate()) return;
        
        this.cad.isDrawing = false;
        this.baseDistance = 50;
        this.updateStatus('Specify base point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.cad.showDynamicInput('Scale:', point);
            this.updateStatus('Specify scale factor');
        } else {
            const center = this.drawingPoints[0];
            const distance = this.cad.distance(center.x, center.y, point.x, point.y);
            const scale = distance / this.baseDistance;
            
            this.applyModification();
            
            this.selection.forEach((shape, index) => {
                const original = this.originalShapes[index];
                this.cad.copyShapeProperties(shape, original);
                this.cad.scaleShape(shape, center, scale);
            });
            
            this.finishScaling();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const center = this.drawingPoints[0];
            const distance = this.cad.distance(center.x, center.y, point.x, point.y);
            const scale = distance / this.baseDistance;
            
            const tempShapes = this.originalShapes.map(shape => {
                const temp = this.cad.cloneShape(shape);
                this.cad.scaleShape(temp, center, scale);
                return temp;
            });
            
            this.showPreview(tempShapes);
            
            // Update dynamic input
            if (this.cad.ui) {
                this.cad.ui.updateDynamicInput(scale.toFixed(2));
            }
        }
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    finishScaling() {
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.clearPreview();
        this.cad.finishDrawing();
    }
}

/**
 * أداة المرآة
 */
class MirrorTool extends ModifyToolBase {
    getDefaultOptions() {
        return {
            copy: true
        };
    }
    
    onActivate() {
        if (!super.onActivate()) return;
        
        this.cad.isDrawing = false;
        this.updateStatus('Specify first point of mirror line');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify second point of mirror line');
        } else {
            const mirrorLine = {
                start: this.drawingPoints[0],
                end: point
            };
            
            this.applyModification();
            
            if (this.options.copy) {
                // Mirror copy
                const newShapes = [];
                this.selection.forEach(shape => {
                    const newShape = this.cad.cloneShape(shape);
                    newShape.id = this.cad.generateId();
                    this.cad.mirrorShape(newShape, mirrorLine);
                    this.cad.shapes.push(newShape);
                    newShapes.push(newShape);
                });
            } else {
                // Mirror in place
                this.selection.forEach(shape => {
                    this.cad.mirrorShape(shape, mirrorLine);
                });
            }
            
            this.cad.render();
            this.finishMirroring();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            // Show mirror line
            this.tempShape = {
                type: 'line',
                start: this.drawingPoints[0],
                end: point,
                color: '#00d4aa',
                lineWidth: 1,
                lineType: 'dashed'
            };
            this.cad.tempShape = this.tempShape;
            
            // Show preview
            const mirrorLine = {
                start: this.drawingPoints[0],
                end: point
            };
            
            const tempShapes = this.originalShapes.map(shape => {
                const temp = this.cad.cloneShape(shape);
                this.cad.mirrorShape(temp, mirrorLine);
                temp.color = '#00d4aa';
                temp.lineType = 'dashed';
                return temp;
            });
            
            this.cad.tempShapes = tempShapes;
        }
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    finishMirroring() {
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.cad.tempShape = null;
        this.cad.tempShapes = null;
        this.cad.finishDrawing();
    }
}

/**
 * أداة القص (Trim)
 */
class TrimTool extends ToolBase {
    onActivate() {
        this.boundaries = [];
        this.updateStatus('Select cutting edge');
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!this.boundaries.length) {
            if (shape) {
                this.boundaries.push(shape);
                this.updateStatus('Select object to trim');
            }
        } else {
            if (shape && shape.type === 'line') {
                this.cad.recordState();
                
                for (const boundary of this.boundaries) {
                    if (boundary.type === 'line') {
                        const intersection = this.cad.geo.lineLineIntersection(
                            shape.start, shape.end,
                            boundary.start, boundary.end
                        );
                        
                        if (intersection) {
                            const dist1 = this.cad.distance(world.x, world.y, shape.start.x, shape.start.y);
                            const dist2 = this.cad.distance(world.x, world.y, shape.end.x, shape.end.y);
                            
                            if (dist1 < dist2) {
                                shape.end = intersection;
                            } else {
                                shape.start = intersection;
                            }
                            
                            this.cad.render();
                            break;
                        }
                    }
                }
                
                this.boundaries = [];
                this.updateStatus('TRIM: Select cutting edge');
            }
        }
    }
}

/**
 * أداة التمديد (Extend)
 */
class ExtendTool extends ToolBase {
    onActivate() {
        this.boundaries = [];
        this.updateStatus('Select boundary edge');
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!this.boundaries.length) {
            if (shape) {
                this.boundaries.push(shape);
                this.updateStatus('Select object to extend');
            }
        } else {
            if (shape && shape.type === 'line') {
                this.cad.recordState();
                
                for (const boundary of this.boundaries) {
                    if (boundary.type === 'line') {
                        const dx = shape.end.x - shape.start.x;
                        const dy = shape.end.y - shape.start.y;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        
                        if (len > 0) {
                            const extendedEnd = {
                                x: shape.start.x + (dx / len) * 10000,
                                y: shape.start.y + (dy / len) * 10000
                            };
                            
                            const intersection = this.cad.geo.lineLineIntersection(
                                shape.start, extendedEnd,
                                boundary.start, boundary.end
                            );
                            
                            if (intersection) {
                                const dist1 = this.cad.distance(world.x, world.y, shape.start.x, shape.start.y);
                                const dist2 = this.cad.distance(world.x, world.y, shape.end.x, shape.end.y);
                                
                                if (dist2 < dist1) {
                                    shape.end = intersection;
                                } else {
                                    const extendedStart = {
                                        x: shape.end.x - (dx / len) * 10000,
                                        y: shape.end.y - (dy / len) * 10000
                                    };
                                    
                                    const intersection2 = this.cad.geo.lineLineIntersection(
                                        extendedStart, shape.end,
                                        boundary.start, boundary.end
                                    );
                                    
                                    if (intersection2) {
                                        shape.start = intersection2;
                                    }
                                }
                                
                                this.cad.render();
                                break;
                            }
                        }
                    }
                }
                
                this.boundaries = [];
                this.updateStatus('EXTEND: Select boundary edge');
            }
        }
    }
}

/**
 * أداة الإزاحة (Offset)
 */
class OffsetTool extends ToolBase {
    getDefaultOptions() {
        return {
            distance: 10,
            multiple: false
        };
    }
    
    onActivate() {
        this.cad.isDrawing = false;
        this.originalShape = null;
        this.updateStatus('Select object to offset');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
            const shape = this.cad.getShapeAt(world.x, world.y);
            
            if (shape) {
                this.cad.isDrawing = true;
                this.originalShape = shape;
                this.basePoint = point;
                this.cad.showDynamicInput('Offset distance:', point);
                this.updateStatus('Specify offset side');
            }
        } else {
            const offsetShape = this.cad.cloneShape(this.originalShape);
            offsetShape.id = this.cad.generateId();
            
            const side = this.determineOffsetSide(this.originalShape, point);
            
            switch (this.originalShape.type) {
                case 'line':
                    this.offsetLine(offsetShape, this.options.distance * side);
                    break;
                case 'circle':
                    offsetShape.radius += this.options.distance * side;
                    if (offsetShape.radius > 0) {
                        this.cad.shapes.push(offsetShape);
                    }
                    break;
                case 'rectangle':
                    offsetShape.start.x -= this.options.distance * side;
                    offsetShape.start.y -= this.options.distance * side;
                    offsetShape.end.x += this.options.distance * side;
                    offsetShape.end.y += this.options.distance * side;
                    this.cad.shapes.push(offsetShape);
                    break;
            }
            
            this.cad.recordState();
            this.cad.render();
            
            if (this.options.multiple) {
                this.cad.isDrawing = false;
                this.updateStatus('Select object to offset');
            } else {
                this.finishOffset();
            }
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.originalShape) {
            const side = this.determineOffsetSide(this.originalShape, point);
            const tempShape = this.cad.cloneShape(this.originalShape);
            
            switch (this.originalShape.type) {
                case 'line':
                    this.offsetLine(tempShape, this.options.distance * side);
                    break;
                case 'circle':
                    tempShape.radius += this.options.distance * side;
                    break;
                case 'rectangle':
                    tempShape.start.x -= this.options.distance * side;
                    tempShape.start.y -= this.options.distance * side;
                    tempShape.end.x += this.options.distance * side;
                    tempShape.end.y += this.options.distance * side;
                    break;
            }
            
            tempShape.color = '#00d4aa';
            tempShape.lineType = 'dashed';
            this.cad.tempShape = tempShape;
        }
    }
    
    offsetLine(line, distance) {
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            
            line.start.x += nx * distance;
            line.start.y += ny * distance;
            line.end.x += nx * distance;
            line.end.y += ny * distance;
            
            this.cad.shapes.push(line);
        }
    }
    
    determineOffsetSide(shape, point) {
        switch (shape.type) {
            case 'line':
                const dx = shape.end.x - shape.start.x;
                const dy = shape.end.y - shape.start.y;
                const cross = (point.x - shape.start.x) * dy - (point.y - shape.start.y) * dx;
                return cross > 0 ? 1 : -1;
            case 'circle':
                const dist = this.cad.distance(point.x, point.y, shape.center.x, shape.center.y);
                return dist > shape.radius ? 1 : -1;
            default:
                return 1;
        }
    }
    
    finishOffset() {
        this.cad.isDrawing = false;
        this.originalShape = null;
        this.cad.tempShape = null;
        this.cad.finishDrawing();
    }
}

// ==================== الأدوات المتقدمة ====================

/**
 * أداة Fillet
 */
class FilletTool extends AdvancedToolBase {
    getDefaultOptions() {
        return {
            radius: 10,
            trim: true,
            multiple: false,
            polyline: false
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'number',
                name: 'radius',
                label: 'Radius',
                value: this.options.radius,
                min: 0,
                onChange: (value) => {
                    this.options.radius = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'trim',
                label: 'Trim',
                value: this.options.trim,
                onChange: (value) => {
                    this.options.trim = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'multiple',
                label: 'Multiple',
                value: this.options.multiple,
                onChange: (value) => {
                    this.options.multiple = value;
                }
            },
            {
                type: 'button',
                name: 'polyline',
                label: 'Polyline',
                onClick: () => {
                    this.handlePolylineFillet();
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        this.selection = [];
        this.updateStatus('Select first object');
    }
    
    async onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!shape) return;
        
        if (this.selection.length === 0) {
            this.selection.push(shape);
            this.updateStatus('Select second object');
        } else {
            const shape1 = this.selection[0];
            const shape2 = shape;
            
            if (shape1 === shape2) {
                this.updateStatus('Select a different object');
                return;
            }
            
            try {
                await this.executeFillet(shape1, shape2);
                
                if (this.options.multiple) {
                    this.selection = [];
                    this.updateStatus('Select first object');
                } else {
                    this.deactivate();
                }
            } catch (error) {
                this.handleError(error);
            }
        }
    }
    
    async executeFillet(shape1, shape2) {
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        const result = await geo.fillet(shape1, shape2, this.options.radius);
        
        if (result.success) {
            this.cad.recordState();
            
            // Add new shapes
            result.shapes.forEach(s => {
                s.color = this.cad.currentColor;
                s.lineWidth = this.cad.currentLineWidth;
                s.lineType = this.cad.currentLineType;
                s.layerId = this.cad.currentLayerId;
                s.id = this.cad.generateId();
                this.cad.shapes.push(s);
            });
            
            // Trim original shapes if needed
            if (this.options.trim) {
                // TODO: Implement trimming logic
            }
            
            this.cad.render();
            this.updateStatus('Fillet created');
        } else {
            throw new Error(result.message || 'Fillet failed');
        }
    }
    
    async handlePolylineFillet() {
        const selected = Array.from(this.cad.selectedShapes);
        const polylines = selected.filter(s => s.type === 'polyline');
        
        if (polylines.length === 0) {
            this.updateStatus('Select a polyline first');
            return;
        }
        
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        this.cad.recordState();
        
        for (const polyline of polylines) {
            try {
                const result = await geo.filletPolygon(polyline, this.options.radius);
                // Apply result...
            } catch (error) {
                this.handleError(error);
            }
        }
        
        this.cad.render();
    }
    
    updatePreview() {
        // TODO: Implement preview update
    }
}

/**
 * أداة Chamfer
 */
class ChamferTool extends AdvancedToolBase {
    getDefaultOptions() {
        return {
            distance1: 10,
            distance2: 10,
            method: 'distance', // 'distance' or 'angle'
            angle: 45,
            trim: true,
            multiple: false,
            polyline: false
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'select',
                name: 'method',
                label: 'Method',
                value: this.options.method,
                options: [
                    { value: 'distance', label: 'Distance' },
                    { value: 'angle', label: 'Angle' }
                ],
                onChange: (value) => {
                    this.options.method = value;
                    this.updateUI();
                }
            },
            {
                type: 'number',
                name: 'distance1',
                label: 'Distance 1',
                value: this.options.distance1,
                min: 0,
                visible: () => this.options.method === 'distance',
                onChange: (value) => {
                    this.options.distance1 = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'distance2',
                label: 'Distance 2',
                value: this.options.distance2,
                min: 0,
                visible: () => this.options.method === 'distance',
                onChange: (value) => {
                    this.options.distance2 = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'angle',
                label: 'Angle',
                value: this.options.angle,
                min: 0,
                max: 90,
                visible: () => this.options.method === 'angle',
                onChange: (value) => {
                    this.options.angle = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'trim',
                label: 'Trim',
                value: this.options.trim,
                onChange: (value) => {
                    this.options.trim = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'multiple',
                label: 'Multiple',
                value: this.options.multiple,
                onChange: (value) => {
                    this.options.multiple = value;
                }
            },
            {
                type: 'button',
                name: 'polyline',
                label: 'Polyline',
                onClick: () => {
                    this.handlePolylineChamfer();
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        this.selection = [];
        this.updateStatus('Select first object');
    }
    
    async onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!shape) return;
        
        if (this.selection.length === 0) {
            this.selection.push(shape);
            this.updateStatus('Select second object');
        } else {
            const shape1 = this.selection[0];
            const shape2 = shape;
            
            if (shape1 === shape2) {
                this.updateStatus('Select a different object');
                return;
            }
            
            try {
                await this.executeChamfer(shape1, shape2);
                
                if (this.options.multiple) {
                    this.selection = [];
                    this.updateStatus('Select first object');
                } else {
                    this.deactivate();
                }
            } catch (error) {
                this.handleError(error);
            }
        }
    }
    
    async executeChamfer(shape1, shape2) {
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        let result;
        
        if (this.options.method === 'distance') {
            result = await geo.chamfer(shape1, shape2, this.options.distance1, this.options.distance2);
        } else {
            // Angle method
            // TODO: Implement angle method
            throw new Error('Angle method not implemented yet');
        }
        
        if (result.success) {
            this.cad.recordState();
            
            // Add new shapes
            result.shapes.forEach(s => {
                s.color = this.cad.currentColor;
                s.lineWidth = this.cad.currentLineWidth;
                s.lineType = this.cad.currentLineType;
                s.layerId = this.cad.currentLayerId;
                s.id = this.cad.generateId();
                this.cad.shapes.push(s);
            });
            
            // Trim original shapes if needed
            if (this.options.trim) {
                // TODO: Implement trimming logic
            }
            
            this.cad.render();
            this.updateStatus('Chamfer created');
        } else {
            throw new Error(result.message || 'Chamfer failed');
        }
    }
    
    async handlePolylineChamfer() {
        // Similar to handlePolylineFillet
    }
    
    updateUI() {
        if (this.ui) {
            this.ui = this.cad.ui.updateAdvancedToolPanel(this.name, this.getUIOptions());
        }
    }
    
    updatePreview() {
        // TODO: Implement preview update
    }
}

/**
 * أداة Rectangular Array
 */
class RectangularArrayTool extends AdvancedToolBase {
    getDefaultOptions() {
        return {
            rows: 3,
            columns: 3,
            rowSpacing: 50,
            columnSpacing: 50,
            angle: 0,
            associative: false
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'number',
                name: 'rows',
                label: 'Rows',
                value: this.options.rows,
                min: 1,
                onChange: (value) => {
                    this.options.rows = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'columns',
                label: 'Columns',
                value: this.options.columns,
                min: 1,
                onChange: (value) => {
                    this.options.columns = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'rowSpacing',
                label: 'Row Spacing',
                value: this.options.rowSpacing,
                onChange: (value) => {
                    this.options.rowSpacing = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'columnSpacing',
                label: 'Column Spacing',
                value: this.options.columnSpacing,
                onChange: (value) => {
                    this.options.columnSpacing = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'angle',
                label: 'Angle',
                value: this.options.angle,
                min: -360,
                max: 360,
                onChange: (value) => {
                    this.options.angle = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'associative',
                label: 'Associative',
                value: this.options.associative,
                onChange: (value) => {
                    this.options.associative = value;
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select objects first');
            this.deactivate();
            return;
        }
        
        this.selection = Array.from(this.cad.selectedShapes);
        this.updatePreview();
    }
    
    updatePreview() {
        if (!this.selection || this.selection.length === 0) return;
        
        const preview = [];
        
        for (let row = 0; row < this.options.rows; row++) {
            for (let col = 0; col < this.options.columns; col++) {
                if (row === 0 && col === 0) continue; // Skip original
                
                this.selection.forEach(shape => {
                    const copy = this.cad.cloneShape(shape);
                    
                    // Calculate position
                    let dx = col * this.options.columnSpacing;
                    let dy = row * this.options.rowSpacing;
                    
                    // Apply rotation if needed
                    if (this.options.angle !== 0) {
                        const angle = this.options.angle * Math.PI / 180;
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        const newDx = dx * cos - dy * sin;
                        const newDy = dx * sin + dy * cos;
                        dx = newDx;
                        dy = newDy;
                    }
                    
                    this.cad.translateShape(copy, dx, dy);
                    
                    copy.color = '#00d4aa';
                    copy.lineType = 'dashed';
                    preview.push(copy);
                });
            }
        }
        
        this.showPreview(preview);
    }
    
    onClick(point) {
        this.applyArray();
        this.deactivate();
    }
    
    async applyArray() {
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        this.cad.recordState();
        
        const result = geo.rectangularArray(this.selection, this.options);
        
        result.forEach(shape => {
            shape.id = this.cad.generateId();
            this.cad.shapes.push(shape);
        });
        
        if (this.options.associative) {
            // TODO: Create associative array group
        }
        
        this.cad.render();
        this.updateStatus(`Created ${result.length} copies`);
    }
}

/**
 * أداة Polar Array
 */
class PolarArrayTool extends AdvancedToolBase {
    getDefaultOptions() {
        return {
            count: 6,
            angle: 360,
            rotateItems: true,
            associative: false
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'number',
                name: 'count',
                label: 'Count',
                value: this.options.count,
                min: 2,
                onChange: (value) => {
                    this.options.count = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'angle',
                label: 'Fill Angle',
                value: this.options.angle,
                min: -360,
                max: 360,
                onChange: (value) => {
                    this.options.angle = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'rotateItems',
                label: 'Rotate Items',
                value: this.options.rotateItems,
                onChange: (value) => {
                    this.options.rotateItems = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'associative',
                label: 'Associative',
                value: this.options.associative,
                onChange: (value) => {
                    this.options.associative = value;
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select objects first');
            this.deactivate();
            return;
        }
        
        this.selection = Array.from(this.cad.selectedShapes);
        this.center = null;
        this.updateStatus('Specify center point');
    }
    
    onClick(point) {
        if (!this.center) {
            this.center = point;
            this.updatePreview();
            this.updateStatus('Click to confirm or adjust parameters');
        } else {
            this.applyArray();
            this.deactivate();
        }
    }
    
    onMouseMove(point) {
        if (!this.center && this.selection.length > 0) {
            this.showCenterPreview(point);
        }
    }
    
    showCenterPreview(point) {
        // Show crosshair at center point
        const preview = [{
            type: 'line',
            start: { x: point.x - 10, y: point.y },
            end: { x: point.x + 10, y: point.y },
            color: '#00d4aa',
            lineType: 'dashed'
        }, {
            type: 'line',
            start: { x: point.x, y: point.y - 10 },
            end: { x: point.x, y: point.y + 10 },
            color: '#00d4aa',
            lineType: 'dashed'
        }];
        
        this.showPreview(preview);
    }
    
    updatePreview() {
        if (!this.center || !this.selection || this.selection.length === 0) return;
        
        const preview = [];
        const angleStep = (this.options.angle * Math.PI / 180) / (this.options.count - 1);
        
        for (let i = 1; i < this.options.count; i++) {
            const currentAngle = i * angleStep;
            
            this.selection.forEach(shape => {
                const copy = this.cad.cloneShape(shape);
                
                // Rotate around center
                this.cad.rotateShape(copy, this.center, currentAngle);
                
                // Rotate item itself if needed
                if (this.options.rotateItems) {
                    const shapeBounds = this.cad.getShapeBounds(copy);
                    const shapeCenter = {
                        x: (shapeBounds.minX + shapeBounds.maxX) / 2,
                        y: (shapeBounds.minY + shapeBounds.maxY) / 2
                    };
                    this.cad.rotateShape(copy, shapeCenter, currentAngle);
                }
                
                copy.color = '#00d4aa';
                copy.lineType = 'dashed';
                preview.push(copy);
            });
        }
        
        this.showPreview(preview);
    }
    
    async applyArray() {
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        this.cad.recordState();
        
        const result = geo.polarArray(this.selection, {
            center: this.center,
            count: this.options.count,
            angle: this.options.angle,
            rotateItems: this.options.rotateItems
        });
        
        result.forEach(shape => {
            shape.id = this.cad.generateId();
            this.cad.shapes.push(shape);
        });
        
        if (this.options.associative) {
            // TODO: Create associative array group
        }
        
        this.cad.render();
        this.updateStatus(`Created ${result.length} copies`);
    }
}

/**
 * أداة Path Array
 */
class PathArrayTool extends AdvancedToolBase {
    getDefaultOptions() {
        return {
            count: 10,
            spacing: 0, // 0 = divide evenly
            alignToPath: true,
            associative: false,
            method: 'divide' // 'divide' or 'measure'
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'select',
                name: 'method',
                label: 'Method',
                value: this.options.method,
                options: [
                    { value: 'divide', label: 'Divide' },
                    { value: 'measure', label: 'Measure' }
                ],
                onChange: (value) => {
                    this.options.method = value;
                    this.updateUI();
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'count',
                label: 'Count',
                value: this.options.count,
                min: 2,
                visible: () => this.options.method === 'divide',
                onChange: (value) => {
                    this.options.count = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'spacing',
                label: 'Spacing',
                value: this.options.spacing,
                min: 0,
                visible: () => this.options.method === 'measure',
                onChange: (value) => {
                    this.options.spacing = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'alignToPath',
                label: 'Align to Path',
                value: this.options.alignToPath,
                onChange: (value) => {
                    this.options.alignToPath = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'associative',
                label: 'Associative',
                value: this.options.associative,
                onChange: (value) => {
                    this.options.associative = value;
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select objects first');
            this.deactivate();
            return;
        }
        
        this.selection = Array.from(this.cad.selectedShapes);
        this.path = null;
        this.updateStatus('Select path');
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!shape) return;
        
        if (shape.type === 'line' || shape.type === 'polyline' || 
            shape.type === 'arc' || shape.type === 'circle') {
            this.path = shape;
            this.updatePreview();
            this.updateStatus('Click to confirm or adjust parameters');
        } else {
            this.updateStatus('Select a valid path (line, polyline, arc, or circle)');
        }
    }
    
    updateUI() {
        if (this.ui) {
            this.ui = this.cad.ui.updateAdvancedToolPanel(this.name, this.getUIOptions());
        }
    }
    
    updatePreview() {
        if (!this.path || !this.selection || this.selection.length === 0) return;
        
        const geo = this.cad.geometryAdvanced;
        if (!geo) return;
        
        const options = {
            count: this.options.count,
            alignToPath: this.options.alignToPath
        };
        
        if (this.options.method === 'measure') {
            // Calculate count based on spacing
            const pathLength = geo.calculatePathLength(this.path);
            options.count = Math.floor(pathLength / this.options.spacing) + 1;
        }
        
        const preview = [];
        
        // Use geometry advanced to calculate positions
        const pathLength = geo.calculatePathLength(this.path);
        const step = pathLength / (options.count - 1);
        
        for (let i = 0; i < options.count; i++) {
            const distance = i * step;
            const position = geo.getPointAtDistance(this.path, distance);
            
            if (!position) continue;
            
            this.selection.forEach(shape => {
                const copy = this.cad.cloneShape(shape);
                
                // Move to position
                const bounds = this.cad.getShapeBounds(shape);
                const centerX = (bounds.minX + bounds.maxX) / 2;
                const centerY = (bounds.minY + bounds.maxY) / 2;
                
                this.cad.translateShape(
                    copy, 
                    position.point.x - centerX, 
                    position.point.y - centerY
                );
                
                // Align to path if needed
                if (options.alignToPath && position.angle !== undefined) {
                    this.cad.rotateShape(copy, position.point, position.angle);
                }
                
                copy.color = '#00d4aa';
                copy.lineType = 'dashed';
                preview.push(copy);
            });
        }
        
        this.showPreview(preview);
    }
    
    async applyArray() {
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        this.cad.recordState();
        
        const result = geo.pathArray(this.selection, this.path, {
            count: this.options.count,
            alignToPath: this.options.alignToPath
        });
        
        result.forEach(shape => {
            shape.id = this.cad.generateId();
            this.cad.shapes.push(shape);
        });
        
        if (this.options.associative) {
            // TODO: Create associative array group
        }
        
        this.cad.render();
        this.updateStatus(`Created ${result.length} copies`);
    }
}

// ==================== Boolean Operations ====================

/**
 * أداة Union
 */
class UnionTool extends AdvancedToolBase {
    onActivate() {
        super.onActivate();
        if (this.cad.selectedShapes.size < 2) {
            this.updateStatus('Select at least 2 shapes');
            this.deactivate();
            return;
        }
        this.executeUnion();
    }
    
    async executeUnion() {
        const geo = await this.cad.loadAdvancedGeometry();
        const selected = Array.from(this.cad.selectedShapes);
        
        try {
            const result = await geo.union(selected);
            this.cad.recordState();
            
            // إضافة الشكل الناتج
            result.forEach(shape => {
                shape.color = this.cad.currentColor;
                shape.lineWidth = this.cad.currentLineWidth;
                shape.layerId = this.cad.currentLayerId;
                shape.id = this.cad.generateId();
                this.cad.shapes.push(shape);
            });
            
            // حذف الأشكال الأصلية
            selected.forEach(shape => this.cad.deleteShape(shape));
            
            this.cad.render();
            this.updateStatus('Union completed');
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}

/**
 * أداة Difference
 */
class DifferenceTool extends AdvancedToolBase {
    onActivate() {
        super.onActivate();
        this.firstShape = null;
        this.updateStatus('Select main shape');
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!shape) return;
        
        if (!this.firstShape) {
            this.firstShape = shape;
            this.updateStatus('Select shape to subtract');
        } else {
            this.executeDifference(this.firstShape, shape);
        }
    }
    
    async executeDifference(mainShape, subtractShape) {
        const geo = await this.cad.loadAdvancedGeometry();
        
        try {
            const result = await geo.difference(mainShape, [subtractShape]);
            this.cad.recordState();
            
            // إضافة الشكل الناتج
            result.forEach(shape => {
                shape.color = this.cad.currentColor;
                shape.lineWidth = this.cad.currentLineWidth;
                shape.layerId = this.cad.currentLayerId;
                shape.id = this.cad.generateId();
                this.cad.shapes.push(shape);
            });
            
            // حذف الأشكال الأصلية
            this.cad.deleteShape(mainShape);
            this.cad.deleteShape(subtractShape);
            
            this.cad.render();
            this.updateStatus('Difference completed');
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}

/**
 * أداة Intersection
 */
class IntersectionTool extends AdvancedToolBase {
    onActivate() {
        super.onActivate();
        if (this.cad.selectedShapes.size < 2) {
            this.updateStatus('Select at least 2 shapes');
            this.deactivate();
            return;
        }
        this.executeIntersection();
    }
    
    async executeIntersection() {
        const geo = await this.cad.loadAdvancedGeometry();
        const selected = Array.from(this.cad.selectedShapes);
        
        try {
            const result = await geo.intersection(selected);
            this.cad.recordState();
            
            // إضافة الشكل الناتج
            result.forEach(shape => {
                shape.color = this.cad.currentColor;
                shape.lineWidth = this.cad.currentLineWidth;
                shape.layerId = this.cad.currentLayerId;
                shape.id = this.cad.generateId();
                this.cad.shapes.push(shape);
            });
            
            // حذف الأشكال الأصلية
            selected.forEach(shape => this.cad.deleteShape(shape));
            
            this.cad.render();
            this.updateStatus('Intersection completed');
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}

// ==================== Analysis Tools ====================

/**
 * أداة Distance Analysis
 */
class DistanceAnalysisTool extends AdvancedToolBase {
    onActivate() {
        super.onActivate();
        this.shapes = [];
        this.updateStatus('Select first shape');
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!shape) return;
        
        if (this.shapes.length === 0) {
            this.shapes.push(shape);
            this.updateStatus('Select second shape');
        } else {
            this.analyzeDistance(this.shapes[0], shape);
        }
    }
    
    async analyzeDistance(shape1, shape2) {
        const geo = await this.cad.loadAdvancedGeometry();
        
        try {
            const result = geo.calculateDistance(shape1, shape2);
            
            // عرض النتائج في UI
            if (this.cad.ui) {
                this.cad.ui.showAnalysisResult({
                    type: 'distance',
                    distance: result.distance,
                    point1: result.point1,
                    point2: result.point2,
                    dx: result.point2.x - result.point1.x,
                    dy: result.point2.y - result.point1.y
                });
            }
            
            // رسم خط القياس
            const dimension = {
                type: 'dimension-linear',
                start: result.point1,
                end: result.point2,
                offset: 20,
                text: this.cad.formatValue(result.distance),
                color: '#ff0099',
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
            
            this.cad.addShape(dimension);
            
        } catch (error) {
            this.handleError(error);
        }
    }
}

/**
 * أداة Area Analysis
 */
class AreaAnalysisTool extends AdvancedToolBase {
    onActivate() {
        super.onActivate();
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select shapes to analyze');
            this.deactivate();
            return;
        }
        this.analyzeArea();
    }
    
    async analyzeArea() {
        const geo = await this.cad.loadAdvancedGeometry();
        const selected = Array.from(this.cad.selectedShapes);
        
        try {
            let totalArea = 0;
            const details = [];
            
            for (const shape of selected) {
                const area = geo.calculateArea(shape);
                totalArea += area;
                details.push({
                    type: shape.type,
                    area: area
                });
            }
            
            // عرض النتائج في UI
            if (this.cad.ui) {
                this.cad.ui.showAnalysisResult({
                    type: 'area',
                    totalArea: totalArea,
                    details: details
                });
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }
}

/**
 * أداة Properties Analysis
 */
class PropertiesAnalysisTool extends AdvancedToolBase {
    onActivate() {
        super.onActivate();
        if (this.cad.selectedShapes.size !== 1) {
            this.updateStatus('Select exactly 1 shape');
            this.deactivate();
            return;
        }
        this.analyzeProperties();
    }
    
    async analyzeProperties() {
        const geo = await this.cad.loadAdvancedGeometry();
        const shape = Array.from(this.cad.selectedShapes)[0];
        
        try {
            const props = geo.getShapeProperties(shape);
            
            // عرض النتائج في UI
            if (this.cad.ui) {
                this.cad.ui.showAnalysisResult({
                    type: 'properties',
                    shape: shape,
                    properties: props
                });
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }
}

// ==================== Curves Tools ====================

/**
 * أداة Convert to Polyline
 */
class ConvertToPolylineTool extends AdvancedToolBase {
    getDefaultOptions() {
        return {
            segments: 16,
            tolerance: 0.1
        };
    }
    
    onActivate() {
        super.onActivate();
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select curves to convert');
            this.deactivate();
            return;
        }
        this.convert();
    }
    
    async convert() {
        const geo = await this.cad.loadAdvancedGeometry();
        const selected = Array.from(this.cad.selectedShapes);
        
        try {
            this.cad.recordState();
            
            for (const shape of selected) {
                if (shape.type === 'arc' || shape.type === 'circle' || 
                    shape.type === 'ellipse') {
                    
                    const polyline = geo.curveToPolyline(shape, this.options);
                    polyline.color = shape.color;
                    polyline.lineWidth = shape.lineWidth;
                    polyline.layerId = shape.layerId;
                    polyline.id = this.cad.generateId();
                    
                    this.cad.shapes.push(polyline);
                    this.cad.deleteShape(shape);
                }
            }
            
            this.cad.render();
            this.updateStatus('Conversion completed');
            
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}

/**
 * أداة Simplify Polyline
 */
class SimplifyPolylineTool extends AdvancedToolBase {
    getDefaultOptions() {
        return {
            tolerance: 1.0
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'number',
                name: 'tolerance',
                label: 'Tolerance',
                value: this.options.tolerance,
                min: 0.1,
                max: 10,
                step: 0.1,
                onChange: (value) => {
                    this.options.tolerance = value;
                    this.updatePreview();
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        const selected = Array.from(this.cad.selectedShapes);
        const polylines = selected.filter(s => s.type === 'polyline');
        
        if (polylines.length === 0) {
            this.updateStatus('Select polylines to simplify');
            this.deactivate();
            return;
        }
        
        this.polylines = polylines;
        this.updatePreview();
    }
    
    async updatePreview() {
        const geo = await this.cad.loadAdvancedGeometry();
        const preview = [];
        
        for (const polyline of this.polylines) {
            const simplified = geo.simplifyPolyline(polyline, this.options.tolerance);
            simplified.color = '#00d4aa';
            simplified.lineType = 'dashed';
            preview.push(simplified);
        }
        
        this.showPreview(preview);
    }
    
    async apply() {
        const geo = await this.cad.loadAdvancedGeometry();
        
        try {
            this.cad.recordState();
            
            for (const polyline of this.polylines) {
                const simplified = geo.simplifyPolyline(polyline, this.options.tolerance);
                polyline.points = simplified.points;
            }
            
            this.cad.render();
            this.updateStatus('Simplification completed');
            
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}

/**
 * أداة Smooth Polyline
 */
class SmoothPolylineTool extends AdvancedToolBase {
    getDefaultOptions() {
        return {
            iterations: 2,
            factor: 0.5
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'number',
                name: 'iterations',
                label: 'Iterations',
                value: this.options.iterations,
                min: 1,
                max: 10,
                onChange: (value) => {
                    this.options.iterations = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'factor',
                label: 'Smoothing Factor',
                value: this.options.factor,
                min: 0.1,
                max: 0.9,
                step: 0.1,
                onChange: (value) => {
                    this.options.factor = value;
                    this.updatePreview();
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        const selected = Array.from(this.cad.selectedShapes);
        const polylines = selected.filter(s => s.type === 'polyline');
        
        if (polylines.length === 0) {
            this.updateStatus('Select polylines to smooth');
            this.deactivate();
            return;
        }
        
        this.polylines = polylines;
        this.updatePreview();
    }
    
    async updatePreview() {
        const geo = await this.cad.loadAdvancedGeometry();
        const preview = [];
        
        for (const polyline of this.polylines) {
            const smoothed = geo.smoothPolyline(polyline, this.options);
            smoothed.color = '#00d4aa';
            smoothed.lineType = 'dashed';
            preview.push(smoothed);
        }
        
        this.showPreview(preview);
    }
    
    async apply() {
        const geo = await this.cad.loadAdvancedGeometry();
        
        try {
            this.cad.recordState();
            
            for (const polyline of this.polylines) {
                const smoothed = geo.smoothPolyline(polyline, this.options);
                polyline.points = smoothed.points;
            }
            
            this.cad.render();
            this.updateStatus('Smoothing completed');
            
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}

// تصدير النظام
window.Tools = new Tools();