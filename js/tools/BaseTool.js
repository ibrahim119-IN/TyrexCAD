// ==================== js/tools/BaseTool.js ====================

/**
 * TyrexCAD Base Tool Classes
 * الفئات الأساسية لجميع الأدوات
 */

/**
 * الفئة الأساسية لجميع الأدوات
 */
export class BaseTool {
    constructor(toolsManager, name) {
        this.toolsManager = toolsManager;
        this.cad = toolsManager.cad;
        this.name = name;
        this.active = false;
        this.state = {};
        this.options = {};
        this.errors = [];
        
        // خصائص UI
        this.icon = 'fa-mouse-pointer';
        this.cursor = 'default';
    }
    
    /**
     * تفعيل الأداة
     */
    activate(options = {}) {
        this.active = true;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.state = {};
        this.errors = [];
        this.cad.canvas.style.cursor = this.cursor;
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
        this.cad.canvas.style.cursor = 'default';
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
export class DrawingToolBase extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.drawingPoints = [];
        this.tempShape = null;
        this.cursor = 'crosshair';
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
    
    /**
     * إنشاء شكل جديد مع الخصائص الافتراضية
     */
    createShape(shapeData) {
        return {
            ...shapeData,
            id: this.cad.generateId(),
            color: this.cad.currentColor,
            lineWidth: this.cad.currentLineWidth,
            lineType: this.cad.currentLineType,
            layerId: this.cad.currentLayerId
        };
    }
}

/**
 * الفئة الأساسية لأدوات التعديل
 */
export class ModifyToolBase extends BaseTool {
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
export class AdvancedToolBase extends BaseTool {
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