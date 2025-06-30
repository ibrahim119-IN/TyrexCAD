// ==================== js/tools/drawing/CircleTool.js ====================

import { DrawingToolBase, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة رسم الدائرة - محدثة بالإدخال الديناميكي
 * Circle Tool with Dynamic Input Support
 */
export class CircleTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-circle';
        this.centerPoint = null;
        this.currentRadius = 0;
    }
    
    onActivate() {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return false;
        }
        
        super.onActivate();
        this.resetState();
        this.updateStatus('Specify center point');
    }
    
    onDeactivate() {
        this.hideDynamicInput();
        // 🔴 إزالة clearPreview() لأنها غير موجودة في DrawingToolBase
        // بدلاً من ذلك نظف المعاينة يدوياً
        this.cad.tempShape = null;
        this.cad.tempShapes = null;
        this.cad.render();
        super.onDeactivate();
    }
    
    onClick(point) {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return;
        }
        
        if (!this.centerPoint) {
            // النقطة الأولى - مركز الدائرة
            this.centerPoint = point;
            this.cad.isDrawing = true;
            this.addPoint(point);
            
            this.updateStatus('Specify radius or type value');
            
            // عرض الإدخال الديناميكي
            this.showDynamicInput();
            
        } else {
            // النقطة الثانية - تحديد نصف القطر
            const radius = this.cad.distance(
                this.centerPoint.x,
                this.centerPoint.y,
                point.x,
                point.y
            );
            
            if (radius > 0) {
                this.createCircle(this.centerPoint, radius);
            }
        }
    }
    
    /**
     * معالجة حركة الماوس
     */
    onMouseMove(point) {
        if (this.centerPoint && this.cad.isDrawing) {
            // حساب نصف القطر الحالي
            this.currentRadius = this.cad.distance(
                this.centerPoint.x,
                this.centerPoint.y,
                point.x,
                point.y
            );
            
            // تحديد نصف القطر الفعلي
            let effectiveRadius = this.currentRadius;
            
            if (this.constrainedMode && this.constrainedValue > 0) {
                // وضع مقيد: استخدم نصف القطر المحدد
                effectiveRadius = this.constrainedValue;
            }
            
            // تحديث القيمة في Dynamic Input (بالوحدة الحالية)
            if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
                let displayRadius = this.currentRadius;
                if (this.cad.units && this.cad.currentUnit) {
                    try {
                        displayRadius = this.cad.units.fromInternal(this.currentRadius, this.cad.currentUnit);
                    } catch (e) {
                        // استخدام القيمة الأصلية
                    }
                }
                this.cad.dynamicInputManager.updateLiveValue(displayRadius);
            }
            
            // عرض المعاينة
            this.showCirclePreview(effectiveRadius);
            
            // تحديث الحالة
            let displayRad = effectiveRadius;
            if (this.cad.units && this.cad.currentUnit) {
                try {
                    displayRad = this.cad.units.fromInternal(effectiveRadius, this.cad.currentUnit);
                } catch (e) {
                    // استخدام القيمة الأصلية
                }
            }
            
            let displayDia = displayRad * 2; // القطر
            
            this.updateStatus(
                `Radius: ${displayRad.toFixed(2)} ${this.cad.currentUnit}, ` +
                `Diameter: ${displayDia.toFixed(2)} ${this.cad.currentUnit}` +
                (this.constrainedMode ? ' [CONSTRAINED]' : '')
            );
        }
    }
    
    /**
     * عرض الإدخال الديناميكي
     */
    showDynamicInput() {
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.DISTANCE,
            label: 'Radius',
            defaultValue: this.getLastCircleRadius(),
            placeholder: 'Circle radius',
            
            onInput: (value) => {
                if (value !== null && value > 0) {
                    // القيمة محولة بالفعل للوحدة الداخلية
                    this.constrainedMode = true;
                    this.constrainedValue = value;
                    
                    // تحديث المعاينة فوراً
                    this.showCirclePreview(value);
                } else {
                    // مسح القيمة = العودة للوضع الحر
                    this.constrainedMode = false;
                    this.constrainedValue = null;
                    
                    // إذا لم تكن هناك قيمة، أظهر المعاينة بنصف القطر الحالي
                    if (this.currentRadius > 0) {
                        this.showCirclePreview(this.currentRadius);
                    }
                }
            },
            
            onConfirm: (value) => {
                if (value && value > 0) {
                    // إنشاء الدائرة بنصف القطر المحدد
                    this.createCircle(this.centerPoint, value);
                } else if (!this.constrainedMode && this.currentRadius > 0) {
                    // إنشاء بنصف القطر الحالي
                    this.createCircle(this.centerPoint, this.currentRadius);
                }
            },
            
            onCancel: () => {
                this.cancel();
            }
        });
    }
    
    /**
     * عرض معاينة الدائرة
     */
    showCirclePreview(radius) {
        if (!this.centerPoint || radius <= 0) return;
        
        // استخدام خصائص الطبقة الحالية للمعاينة
        const currentLayer = this.cad.layerManager?.getCurrentLayer();
        
        this.tempShape = {
            type: 'circle',
            center: this.centerPoint,
            radius: radius,
            color: currentLayer?.color || this.cad.currentColor,
            lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
            lineType: currentLayer?.lineType || this.cad.currentLineType,
            tempStyle: {
                opacity: this.constrainedMode ? 0.8 : 0.6
            }
        };
        
        // إضافة مركز الدائرة
        const centerMark = {
            type: 'circle',
            center: this.centerPoint,
            radius: 3 / this.cad.zoom,
            color: '#ff9900',
            lineWidth: 2,
            filled: true,
            tempStyle: { opacity: 0.8 }
        };
        
        // خط نصف القطر (اختياري)
        const radiusLine = {
            type: 'line',
            start: this.centerPoint,
            end: {
                x: this.centerPoint.x + radius,
                y: this.centerPoint.y
            },
            color: '#00ffcc',
            lineWidth: 1,
            lineType: 'dashed',
            tempStyle: { opacity: 0.4 }
        };
        
        this.cad.tempShape = this.tempShape;
        this.cad.tempShapes = [centerMark, radiusLine];
        this.cad.render();
    }
    
    /**
     * مسح المعاينة يدوياً
     */
    clearCirclePreview() {
        this.tempShape = null;
        this.cad.tempShape = null;
        this.cad.tempShapes = null;
        this.cad.render();
    }
    
    /**
     * إنشاء الدائرة
     */
    createCircle(center, radius) {
        const shape = this.createShape({
            type: 'circle',
            center: center,
            radius: radius
        });
        
        this.cad.addShape(shape);
        
        // حفظ آخر نصف قطر
        this.saveLastCircleRadius(radius);
        
        // رسالة النجاح بالوحدة الحالية
        let displayRadius = radius;
        let displayDiameter = radius * 2;
        if (this.cad.units && this.cad.currentUnit) {
            try {
                displayRadius = this.cad.units.fromInternal(radius, this.cad.currentUnit);
                displayDiameter = displayRadius * 2;
            } catch (e) {
                // استخدام القيم الأصلية
            }
        }
        
        this.updateStatus(
            `Circle created: Radius ${displayRadius.toFixed(2)} ${this.cad.currentUnit}, ` +
            `Diameter ${displayDiameter.toFixed(2)} ${this.cad.currentUnit}`
        );
        
        // 🔴 مهم جداً: إنهاء الرسم بعد إنشاء الدائرة
        this.finishDrawing();
    }
    
    /**
     * إنهاء الرسم
     */
    finishDrawing() {
        // إخفاء الإدخال الديناميكي
        this.hideDynamicInput();
        
        // تنظيف المعاينة يدوياً
        this.clearCirclePreview();
        
        // استدعاء الأصل
        super.finishDrawing();
        
        // إعادة تعيين الحالة
        this.resetState();
        
        // 🔴 مهم: تحديث الحالة للإشارة أن الأداة جاهزة لدائرة جديدة
        this.updateStatus('Circle tool ready - Specify center point');
    }
    
    /**
     * إلغاء العملية
     */
    cancel() {
        // تنظيف المعاينة
        this.clearCirclePreview();
        
        // إنهاء الرسم
        this.finishDrawing();
        
        this.updateStatus('Circle cancelled');
    }
    
    /**
     * معالجة المفاتيح
     */
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cancel();
        } else if (key === 'Enter' && this.centerPoint) {
            if (this.constrainedMode && this.constrainedValue > 0) {
                // إنشاء بنصف القطر المقيد
                this.createCircle(this.centerPoint, this.constrainedValue);
            } else if (this.currentRadius > 0) {
                // إنشاء بنصف القطر الحالي
                this.createCircle(this.centerPoint, this.currentRadius);
            }
        }
    }
    
    /**
     * إعادة تعيين الحالة
     */
    resetState() {
        this.centerPoint = null;
        this.currentRadius = 0;
        this.constrainedMode = false;
        this.constrainedValue = null;
        this.drawingPoints = [];
        this.tempShape = null;
        this.cad.isDrawing = false;
    }
    
    /**
     * الحصول على آخر نصف قطر للدائرة
     */
    getLastCircleRadius() {
        const lastRadius = this.toolsManager?.drawingState?.lastCircleRadius || 0;
        
        // تحويل من الوحدة الداخلية إلى الوحدة الحالية
        if (lastRadius > 0 && this.cad.units && this.cad.currentUnit) {
            try {
                return this.cad.units.fromInternal(lastRadius, this.cad.currentUnit);
            } catch (e) {
                return lastRadius;
            }
        }
        
        return lastRadius;
    }
    
    /**
     * حفظ آخر نصف قطر للدائرة
     */
    saveLastCircleRadius(radius) {
        if (this.toolsManager && !this.toolsManager.drawingState) {
            this.toolsManager.drawingState = {};
        }
        if (this.toolsManager) {
            this.toolsManager.drawingState.lastCircleRadius = radius;
        }
    }
}