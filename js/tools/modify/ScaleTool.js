// ==================== js/tools/modify/ScaleTool.js ====================

import { ModifyToolBase, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة التكبير/التصغير - محدثة بالإدخال الديناميكي الكامل
 * Scale Tool with Complete Dynamic Input Support
 */
export class ScaleTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-expand-arrows-alt';
        this.centerPoint = null;
        this.referenceDistance = 100; // مسافة مرجعية للمقارنة
        this.currentScale = 1;
        this.liveScale = 1;
    }
    
    onActivate() {
        // إعادة تعيين الحالة
        this.resetState();
        
        // استدعاء الأصل
        if (!super.onActivate()) return;
        
        this.updateStatus('Specify base point for scale');
    }
    
    onDeactivate() {
        // إخفاء Dynamic Input
        this.hideDynamicInput();
        
        // تنظيف
        this.clearPreview();
        super.onDeactivate();
    }
    
    onClick(point) {
        if (!this.centerPoint) {
            // النقطة الأولى - مركز التكبير/التصغير
            this.centerPoint = point;
            this.cad.isDrawing = true;
            this.updateStatus('Specify scale factor or second point');
            
            // حساب المسافة المرجعية بناءً على حجم الأشكال المحددة
            this.calculateReferenceDistance();
            
            // عرض الإدخال الديناميكي
            this.showDynamicInput();
            
        } else {
            // النقطة الثانية - تطبيق التكبير/التصغير
            if (this.constrainedValue && this.constrainedValue > 0) {
                this.applyScale(this.constrainedValue);
            } else {
                // حساب معامل التكبير من المسافة
                const distance = this.cad.distance(this.centerPoint.x, this.centerPoint.y, point.x, point.y);
                const scale = distance / this.referenceDistance;
                if (scale > 0) {
                    this.applyScale(scale);
                }
            }
        }
    }
    
    /**
     * معالجة حركة الماوس
     */
    processMouseMove(point) {
        if (!this.centerPoint) return;
        
        // حساب المسافة من المركز
        const distance = this.cad.distance(this.centerPoint.x, this.centerPoint.y, point.x, point.y);
        
        // حساب معامل التكبير
        this.liveScale = distance / this.referenceDistance;
        
        // تحديد معامل التكبير الفعلي
        let effectiveScale;
        
        if (this.constrainedMode && this.constrainedValue > 0) {
            // وضع مقيد: استخدم القيمة المحددة
            effectiveScale = this.constrainedValue;
        } else {
            // وضع حر: استخدم النسبة الحالية
            effectiveScale = this.liveScale;
        }
        
        // تحديث القيمة في Dynamic Input
        if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            this.cad.dynamicInputManager.updateLiveValue(this.liveScale);
        }
        
        // عرض المعاينة
        this.showScalePreview(effectiveScale);
        
        // تحديث الحالة
        const percentage = (effectiveScale * 100).toFixed(0);
        this.updateStatus(
            `Scale: ${effectiveScale.toFixed(3)} (${percentage}%)` +
            (this.constrainedMode ? ' [CONSTRAINED]' : '') +
            (this.cad.orthoEnabled ? ' [ORTHO]' : '') +
            (this.cad.polarEnabled ? ' [POLAR]' : '')
        );
        
        this.currentScale = effectiveScale;
    }
    
    /**
     * حساب المسافة المرجعية
     */
    calculateReferenceDistance() {
        if (this.selection.length === 0) {
            this.referenceDistance = 100;
            return;
        }
        
        // حساب bounding box للأشكال المحددة
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        this.selection.forEach(shape => {
            const bounds = this.getShapeBounds(shape);
            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
        });
        
        // المسافة من المركز إلى أبعد ركن
        const distances = [
            this.cad.distance(this.centerPoint.x, this.centerPoint.y, minX, minY),
            this.cad.distance(this.centerPoint.x, this.centerPoint.y, maxX, minY),
            this.cad.distance(this.centerPoint.x, this.centerPoint.y, minX, maxY),
            this.cad.distance(this.centerPoint.x, this.centerPoint.y, maxX, maxY)
        ];
        
        this.referenceDistance = Math.max(...distances, 50); // على الأقل 50
    }
    
    /**
     * الحصول على حدود الشكل
     */
    getShapeBounds(shape) {
        switch (shape.type) {
            case 'line':
                return {
                    minX: Math.min(shape.start.x, shape.end.x),
                    minY: Math.min(shape.start.y, shape.end.y),
                    maxX: Math.max(shape.start.x, shape.end.x),
                    maxY: Math.max(shape.start.y, shape.end.y)
                };
                
            case 'circle':
                return {
                    minX: shape.center.x - shape.radius,
                    minY: shape.center.y - shape.radius,
                    maxX: shape.center.x + shape.radius,
                    maxY: shape.center.y + shape.radius
                };
                
            case 'rectangle':
                return {
                    minX: Math.min(shape.start.x, shape.end.x),
                    minY: Math.min(shape.start.y, shape.end.y),
                    maxX: Math.max(shape.start.x, shape.end.x),
                    maxY: Math.max(shape.start.y, shape.end.y)
                };
                
            case 'polyline':
            case 'polygon':
                let minX = Infinity, minY = Infinity;
                let maxX = -Infinity, maxY = -Infinity;
                shape.points.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                return { minX, minY, maxX, maxY };
                
            default:
                // تقدير افتراضي
                return {
                    minX: shape.x || 0,
                    minY: shape.y || 0,
                    maxX: (shape.x || 0) + 100,
                    maxY: (shape.y || 0) + 100
                };
        }
    }
    
    /**
     * عرض الإدخال الديناميكي
     */
    showDynamicInput() {
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.SCALE,
            label: 'Scale',
            defaultValue: this.getLastScaleFactor(),
            placeholder: 'Scale factor',
            
            onInput: (value) => {
                if (value !== null && value !== '') {
                    // القيمة هنا بدون وحدة (scale factor)
                    this.constrainedMode = true;
                    this.constrainedValue = value;
                    
                    // تحديث المعاينة فوراً
                    this.updateConstrainedPreview();
                } else {
                    // مسح القيمة = العودة للوضع الحر
                    this.constrainedMode = false;
                    this.constrainedValue = null;
                }
            },
            
            onConfirm: (value) => {
                if (value > 0) {
                    // تطبيق التكبير/التصغير
                    this.applyScale(value);
                }
            },
            
            onCancel: () => {
                this.cancel();
            }
        });
    }
    
    /**
     * تحديث المعاينة المقيدة
     */
    updateConstrainedPreview() {
        if (!this.centerPoint || !this.constrainedValue || this.constrainedValue <= 0) return;
        
        this.showScalePreview(this.constrainedValue);
    }
    
    /**
     * عرض معاينة التكبير/التصغير
     */
    showScalePreview(scale) {
        const tempShapes = [];
        
        // 1. الأشكال الأصلية (باهتة)
        this.originalShapes.forEach(shape => {
            const ghost = this.cad.cloneShape(shape);
            ghost.tempStyle = {
                opacity: 0.3,
                lineType: 'solid',
                color: '#666'
            };
            tempShapes.push(ghost);
        });
        
        // 2. الأشكال المكبرة/المصغرة
        this.originalShapes.forEach(shape => {
            const preview = this.cad.cloneShape(shape);
            this.cad.scaleShape(preview, this.centerPoint, scale);
            preview.tempStyle = {
                opacity: 0.8,
                lineType: this.constrainedMode ? 'solid' : 'dashed',
                color: scale > 1 ? '#00ff00' : (scale < 1 ? '#ff9900' : '#00d4aa')
            };
            tempShapes.push(preview);
        });
        
        // 3. مركز التكبير
        const centerMarker = {
            type: 'circle',
            center: this.centerPoint,
            radius: 5 / this.cad.zoom,
            color: '#ff0000',
            lineWidth: 2,
            filled: true,
            tempStyle: { opacity: 0.8 }
        };
        tempShapes.push(centerMarker);
        
        // 4. خطوط من المركز إلى الأركان (للتوضيح)
        if (scale !== 1) {
            this.originalShapes.forEach(shape => {
                const bounds = this.getShapeBounds(shape);
                const corners = [
                    { x: bounds.minX, y: bounds.minY },
                    { x: bounds.maxX, y: bounds.minY },
                    { x: bounds.minX, y: bounds.maxY },
                    { x: bounds.maxX, y: bounds.maxY }
                ];
                
                corners.forEach(corner => {
                    // خط من المركز إلى الركن الأصلي
                    const line = {
                        type: 'line',
                        start: this.centerPoint,
                        end: corner,
                        color: '#666',
                        lineWidth: 1,
                        tempStyle: { opacity: 0.3, dashArray: [2, 2] }
                    };
                    tempShapes.push(line);
                    
                    // خط من المركز إلى الركن المكبر
                    const scaledX = this.centerPoint.x + (corner.x - this.centerPoint.x) * scale;
                    const scaledY = this.centerPoint.y + (corner.y - this.centerPoint.y) * scale;
                    const scaledLine = {
                        type: 'line',
                        start: this.centerPoint,
                        end: { x: scaledX, y: scaledY },
                        color: scale > 1 ? '#00ff00' : '#ff9900',
                        lineWidth: 1,
                        tempStyle: { opacity: 0.5, dashArray: [5, 3] }
                    };
                    tempShapes.push(scaledLine);
                });
            });
        }
        
        // 5. دائرة المسافة المرجعية
        const referenceCircle = {
            type: 'circle',
            center: this.centerPoint,
            radius: this.referenceDistance,
            color: '#00d4aa',
            lineWidth: 1,
            tempStyle: { opacity: 0.2, dashArray: [10, 5] }
        };
        tempShapes.push(referenceCircle);
        
        // 6. دائرة المسافة الحالية
        if (!this.constrainedMode) {
            const currentCircle = {
                type: 'circle',
                center: this.centerPoint,
                radius: this.referenceDistance * scale,
                color: '#00ffcc',
                lineWidth: 1,
                tempStyle: { opacity: 0.4, dashArray: [5, 5] }
            };
            tempShapes.push(currentCircle);
        }
        
        this.clearPreview();
        this.showPreview(tempShapes);
    }
    
    /**
     * تطبيق التكبير/التصغير
     */
    applyScale(scale) {
        // تسجيل للـ undo
        this.applyModification();
        
        // تطبيق التكبير/التصغير على الأشكال
        this.selection.forEach((shape, index) => {
            const original = this.originalShapes[index];
            this.cad.copyShapeProperties(shape, original);
            this.cad.scaleShape(shape, this.centerPoint, scale);
        });
        
        // حفظ معامل التكبير
        this.saveLastScaleFactor(scale);
        
        // إنهاء العملية
        this.finishOperation();
        
        // رسالة النجاح
        const percentage = (scale * 100).toFixed(0);
        const action = scale > 1 ? 'Enlarged' : (scale < 1 ? 'Reduced' : 'Scaled');
        this.updateStatus(
            `${action} ${this.selection.length} object${this.selection.length > 1 ? 's' : ''} ` +
            `by factor ${scale.toFixed(3)} (${percentage}%)`
        );
    }
    
    /**
     * إنهاء العملية
     */
    finishOperation() {
        // إخفاء Dynamic Input
        this.hideDynamicInput();
        
        // تنظيف
        this.clearPreview();
        this.cad.isDrawing = false;
        this.cad.finishDrawing();
        this.resetState();
    }
    
    /**
     * إلغاء العملية
     */
    cancel() {
        this.finishOperation();
        this.updateStatus('Scale cancelled');
    }
    
    /**
     * معالجة المفاتيح
     */
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cancel();
        } else if (key === 'Enter' && this.centerPoint) {
            if (this.constrainedMode && this.constrainedValue > 0) {
                // تطبيق بالقيمة المقيدة
                this.applyScale(this.constrainedValue);
            } else if (this.currentScale > 0) {
                // تطبيق بالقيمة الحالية
                this.applyScale(this.currentScale);
            }
        } else if (key === 'Tab' && this.centerPoint) {
            // Tab لتبديل الوضع
            if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
                this.cad.dynamicInputManager.handleTab();
            }
        } else if (key === '-' && this.centerPoint) {
            // عكس معامل التكبير (1/scale)
            if (this.constrainedMode && this.constrainedValue > 0) {
                this.constrainedValue = 1 / this.constrainedValue;
                this.updateConstrainedPreview();
            } else if (this.currentScale > 0) {
                const inverted = 1 / this.currentScale;
                if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
                    this.cad.dynamicInputManager.displayValue(inverted);
                }
            }
        }
    }
    
    /**
     * إعادة تعيين الحالة
     */
    resetState() {
        this.centerPoint = null;
        this.constrainedValue = null;
        this.constrainedMode = false;
        this.referenceDistance = 100;
        this.currentScale = 1;
        this.liveScale = 1;
    }
    
    /**
     * الحصول على آخر معامل تكبير
     */
    getLastScaleFactor() {
        return this.toolsManager?.modifyState?.lastScaleFactor || 1;
    }
    
    /**
     * حفظ آخر معامل تكبير
     */
    saveLastScaleFactor(scale) {
        if (this.toolsManager && !this.toolsManager.modifyState) {
            this.toolsManager.modifyState = {};
        }
        if (this.toolsManager) {
            this.toolsManager.modifyState.lastScaleFactor = scale;
        }
    }
}