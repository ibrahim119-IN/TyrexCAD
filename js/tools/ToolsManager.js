// ==================== js/tools/ToolsManager.js ====================

/**
 * TyrexCAD Tools Manager
 * مدير الأدوات المركزي
 */

export class ToolsManager {
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
    async registerTools() {
        // Import dynamic للأدوات
        const { drawingTools } = await import('./drawing/index.js');
        const { modifyTools } = await import('./modify/index.js');
        const { advancedTools } = await import('./advanced/index.js');
        
        // تسجيل أدوات الرسم
        Object.entries(drawingTools).forEach(([name, ToolClass]) => {
            this.registerTool(name, ToolClass);
        });
        
        // تسجيل أدوات التعديل
        Object.entries(modifyTools).forEach(([name, ToolClass]) => {
            this.registerTool(name, ToolClass);
        });
        
        // تسجيل الأدوات المتقدمة
        Object.entries(advancedTools).forEach(([name, ToolClass]) => {
            this.registerTool(name, ToolClass);
        });
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
     * معالجة حركة الماوس
     */
    handleMouseMove(point) {
        if (this.activeTool) {
            this.activeTool.handleMouseMove(point);
        }
    }
    
    /**
     * معالجة ضغط المفاتيح
     */
    handleKeyPress(key) {
        if (this.activeTool) {
            this.activeTool.handleKeyPress(key);
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
    
    // ==================== Wrapper Functions للتوافق ====================
    
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