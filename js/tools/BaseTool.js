// ==================== js/tools/BaseTool.js ====================

/**
 * Base Tool Classes with Dynamic Input Support
 * الفئات الأساسية للأدوات مع دعم الإدخال الديناميكي
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
        this.icon = '';
        this.cursor = 'crosshair';
        
        // حالة الأداة
        this.state = {};
        this.errors = [];
        
        // دعم الإدخال الديناميكي
        this.dynamicInput = null;
        this.waitingForInput = false;
        this.inputCallback = null;
    }
    
    /**
     * تفعيل الأداة
     */
    activate() {
        this.active = true;
        this.onActivate();
        this.updateCursor();
        
        // تهيئة الإدخال الديناميكي
        if (this.cad.dynamicInputManager) {
            this.dynamicInput = this.cad.dynamicInputManager;
        }
    }
    
    /**
     * إلغاء تفعيل الأداة
     */
    deactivate() {
        this.active = false;
        
        // إلغاء أي إدخال ديناميكي نشط
        if (this.dynamicInput && this.dynamicInput.isActive()) {
            this.dynamicInput.hide();
        }
        
        this.onDeactivate();
        this.cleanup();
    }
    
    /**
     * تحديث شكل المؤشر
     */
    updateCursor() {
        if (this.cad.canvas) {
            this.cad.canvas.style.cursor = this.cursor;
        }
    }
    
    /**
     * تحديث رسالة الحالة
     */
    updateStatus(message) {
        if (this.cad.updateStatus) {
            this.cad.updateStatus(`${this.name.toUpperCase()}: ${message}`);
        }
    }
    
    /**
     * طلب إدخال ديناميكي من المستخدم
     * @param {Object} options - خيارات الإدخال
     * @param {Function} callback - دالة معالجة القيمة
     */
    requestDynamicInput(options, callback) {
        if (!this.dynamicInput) {
            console.warn('Dynamic input not available');
            return;
        }
        
        this.waitingForInput = true;
        this.inputCallback = callback;
        
        this.dynamicInput.show(options, (value, confirmed) => {
            this.waitingForInput = false;
            
            if (callback) {
                callback(value, confirmed);
            }
            
            // إذا كان preview فقط، لا تغلق الإدخال
            if (!confirmed && value !== null) {
                // تحديث المعاينة
                this.updatePreview(value);
            }
        });
    }
    
    /**
     * تحديث المعاينة (يمكن للأدوات الفرعية تخصيصها)
     */
    updatePreview(value) {
        // تطبيق افتراضي فارغ
        // الأدوات الفرعية ستعيد تعريف هذه الدالة
    }
    
    /**
     * معالجة الأخطاء
     */
    handleError(error) {
        console.error(`Tool error (${this.name}):`, error);
        this.errors.push(error);
        this.updateStatus(`Error: ${error.message || error}`);
    }
    
    /**
     * التحقق من إمكانية الرسم على الطبقة الحالية
     */
    canDrawOnCurrentLayer() {
        if (this.cad.layerManager) {
            const currentLayer = this.cad.layerManager.getCurrentLayer();
            if (!currentLayer || currentLayer.locked || !currentLayer.visible) {
                this.updateStatus('Cannot draw on locked or hidden layer');
                this.deactivate();
                return false;
            }
        }
        return true;
    }
    
    /**
     * إنشاء شكل بخصائص الطبقة الحالية
     */
    createShape(shapeData) {
        const shape = Object.assign({}, shapeData);
        
        // تعيين معرف فريد
        shape.id = this.cad.generateId();
        
        // تطبيق خصائص الطبقة الحالية
        if (this.cad.layerManager) {
            const layer = this.cad.layerManager.getCurrentLayer();
            shape.layerId = layer.id;
            
            // الألوان والخصائص
            if (!shape.color) {
                shape.color = layer.color || this.cad.currentColor;
            }
            
            // سمك الخط
            if (!shape.lineWidth) {
                if (layer.lineWeight !== undefined && layer.lineWeight !== 'bylayer') {
                    shape.lineWidth = layer.lineWeight === 'default' ? 
                        this.cad.currentLineWidth : layer.lineWeight;
                } else {
                    shape.lineWidth = this.cad.currentLineWidth;
                }
            }
            
            // نوع الخط
            if (!shape.lineType) {
                shape.lineType = layer.lineType || this.cad.currentLineType;
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
    
    /**
     * تنظيف
     */
    cleanup() {
        this.state = {};
        this.errors = [];
        this.waitingForInput = false;
        this.inputCallback = null;
    }
    
    // Methods to override in subclasses
    onActivate() {}
    onDeactivate() {}
    onClick(point) {}
    onMouseMove(point) {}
    onKeyPress(key) {}
}

/**
 * الفئة الأساسية لأدوات الرسم مع دعم الإدخال الديناميكي
 */
export class DrawingToolBase extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.drawingPoints = [];
        this.tempShape = null;
        this.constrainedValue = null; // للقيم المقيدة من الإدخال الديناميكي
    }
    
    onActivate() {
        this.drawingPoints = [];
        this.tempShape = null;
        this.constrainedValue = null;
    }
    
    onDeactivate() {
        this.finishDrawing();
    }
    
    finishDrawing() {
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.tempShape = null;
        this.cad.tempShape = null;
        this.constrainedValue = null;
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
        this.cad.drawingPoints = this.drawingPoints;
    }
    
    /**
     * الحصول على نقطة مقيدة بناءً على الإدخال الديناميكي
     */
    getConstrainedPoint(basePoint, currentPoint) {
        if (this.constrainedValue !== null) {
            // حساب النقطة بناءً على القيمة المقيدة
            const angle = Math.atan2(
                currentPoint.y - basePoint.y,
                currentPoint.x - basePoint.x
            );
            
            return {
                x: basePoint.x + this.constrainedValue * Math.cos(angle),
                y: basePoint.y + this.constrainedValue * Math.sin(angle)
            };
        }
        
        return currentPoint;
    }
}

/**
 * الفئة الأساسية لأدوات التعديل مع دعم الإدخال الديناميكي
 */
export class ModifyToolBase extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.selection = [];
        this.originalShapes = [];
        this.previewShapes = [];
    }
    
    onActivate() {
        this.selection = [];
        this.originalShapes = [];
        this.previewShapes = [];
        
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
        // التحقق من القفل
        if (shape.locked) return false;
        
        // التحقق من الطبقة
        if (this.cad.layerManager) {
            const layer = this.cad.layerManager.getLayer(shape.layerId);
            if (layer && (layer.locked || !layer.visible)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * تطبيق التعديل
     */
    applyModification() {
        this.cad.recordState();
    }
    
    /**
     * عرض معاينة التعديل
     */
    showPreview(shapes) {
        this.previewShapes = shapes;
        this.cad.tempShapes = shapes;
        this.cad.render();
    }
    
    /**
     * مسح المعاينة
     */
    clearPreview() {
        this.previewShapes = [];
        this.cad.tempShapes = null;
        this.cad.render();
    }
}

/**
 * الفئة الأساسية للأدوات المتقدمة مع دعم الإدخال الديناميكي
 */
export class AdvancedToolBase extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.ui = null;
        this.preview = null;
        this.options = this.getDefaultOptions();
    }
    
    /**
     * الحصول على الخيارات الافتراضية
     */
    getDefaultOptions() {
        return {};
    }
    
    onActivate() {
        // إنشاء UI panel إذا لزم الأمر
        this.createUI();
    }
    
    onDeactivate() {
        // إزالة UI panel
        this.destroyUI();
        this.clearPreview();
    }
    
    createUI() {
        if (this.cad.ui && this.cad.ui.tools) {
            // استخدام النظام الجديد للـ panels
            this.cad.ui.showToolPanel(this.name, {
                x: 350,
                y: 200
            });
        }
    }
    
    destroyUI() {
        if (this.cad.ui && this.cad.ui.tools) {
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
    
    /**
     * الحصول على خيارات UI (للأدوات الفرعية)
     */
    getUIOptions() {
        return [];
    }
    
    /**
     * تحديث الخيارات من UI
     */
    updateOptions(newOptions) {
        this.options = Object.assign({}, this.options, newOptions);
        this.onOptionsChanged();
    }
    
    /**
     * معالج تغيير الخيارات
     */
    onOptionsChanged() {
        // يمكن للأدوات الفرعية تخصيص هذا
        if (this.preview) {
            this.updatePreview();
        }
    }
}