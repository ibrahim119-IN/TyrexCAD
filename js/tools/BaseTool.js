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
     * معالجة الأخطاء
     */
    handleError(error) {
        console.error(`[${this.name}] Error:`, error);
        this.errors.push(error);
        
        if (this.cad.ui) {
            let message = error.message || 'An error occurred';
            this.cad.ui.showError(message);
        }
        
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
        // التحقق من إمكانية الرسم على الطبقة الحالية
        if (!this.canDrawOnCurrentLayer()) {
            this.cad.updateStatus('Cannot draw on frozen layer');
            this.toolsManager.activateTool('select');
            return false;
        }
        
        this.drawingPoints = [];
        this.tempShape = null;
    }
    
    onDeactivate() {
        this.finishDrawing();
    }
    
    /**
     * التحقق من إمكانية الرسم على الطبقة الحالية
     */
    canDrawOnCurrentLayer() {
        if (this.cad.layerManager) {
            const currentLayer = this.cad.layerManager.getCurrentLayer();
            if (!currentLayer) return false;
            
            // لا يمكن الرسم على طبقة مجمدة
            if (currentLayer.frozen) {
                this.cad.updateStatus('Cannot draw on frozen layer');
                return false;
            }
            
            // لا يمكن الرسم على طبقة غير مرئية (تحذير فقط)
            if (!currentLayer.visible) {
                this.cad.updateStatus('Warning: Drawing on hidden layer');
            }
            
            return true;
        }
        
        // Fallback للنظام القديم
        const layer = this.cad.layers?.get(this.cad.currentLayerId);
        return layer && !layer.frozen;
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
     * إنشاء شكل جديد مع خصائص الطبقة
     */
    createShape(shapeData) {
        // الخصائص الأساسية
        const shape = {
            ...shapeData,
            id: this.cad.generateId()
        };
        
        // تطبيق layerId
        if (this.cad.layerManager) {
            shape.layerId = this.cad.layerManager.currentLayerId;
            
            // تطبيق خصائص الطبقة إذا لم تكن محددة مسبقاً
            const layer = this.cad.layerManager.getCurrentLayer();
            if (layer) {
                // اللون - أولوية للون المحدد مباشرة
                if (!shape.color || shape.color === this.cad.currentColor) {
                    shape.color = layer.color || this.cad.currentColor;
                }
                
                // عرض الخط
                if (!shape.lineWidth) {
                    shape.lineWidth = layer.lineWidth || this.cad.currentLineWidth;
                }
                
                // نوع الخط
                if (!shape.lineType) {
                    shape.lineType = layer.lineType || this.cad.currentLineType;
                }
            }
        } else {
            // Fallback للنظام القديم
            shape.layerId = this.cad.currentLayerId || 0;
            shape.color = shape.color || this.cad.currentColor;
            shape.lineWidth = shape.lineWidth || this.cad.currentLineWidth;
            shape.lineType = shape.lineType || this.cad.currentLineType;
        }
        
        return shape;
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
        
        // التحقق من وجود عناصر محددة قابلة للتعديل
        const modifiableShapes = this.getModifiableSelection();
        
        if (modifiableShapes.length === 0) {
            this.updateStatus('No modifiable objects selected');
            this.deactivate();
            return false;
        }
        
        // حفظ نسخ من الأشكال الأصلية
        this.selection = modifiableShapes;
        this.originalShapes = this.selection.map(s => this.cad.cloneShape(s));
        
        return true;
    }
    
    /**
     * الحصول على الأشكال المحددة القابلة للتعديل
     */
    getModifiableSelection() {
        const shapes = [];
        
        this.cad.selectedShapes.forEach(shape => {
            if (this.canModifyShape(shape)) {
                shapes.push(shape);
            }
        });
        
        return shapes;
    }
    
    /**
     * التحقق من إمكانية تعديل شكل
     */
    canModifyShape(shape) {
        if (this.cad.layerManager) {
            const layer = this.cad.layerManager.layers.get(shape.layerId);
            if (!layer) return false;
            
            // لا يمكن تعديل أشكال في طبقة مقفولة أو مجمدة
            if (layer.locked || layer.frozen) {
                return false;
            }
            
            // تحذير إذا كانت الطبقة غير مرئية
            if (!layer.visible) {
                console.warn(`Modifying shape on hidden layer: ${layer.name}`);
            }
            
            return true;
        }
        
        // Fallback للنظام القديم
        const layer = this.cad.layers?.get(shape.layerId);
        return layer && !layer.locked;
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