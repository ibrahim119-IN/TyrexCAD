// ==================== js/tools/drawing/PolygonTool.js ====================

import { DrawingToolBase, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة رسم المضلع المنتظم - محدثة بالإدخال الديناميكي
 * Polygon Tool with Dynamic Input Support
 */
export class PolygonTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-draw-polygon';
        this.centerPoint = null;
        this.currentRadius = 0;
        this.defaultSides = 6;
    }
    
    getDefaultOptions() {
        return {
            sides: this.getLastPolygonSides() || this.defaultSides
        };
    }
    
    onActivate() {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return false;
        }
        
        super.onActivate();
        this.resetState();
        
        // عرض إدخال عدد الأضلاع
        this.showSidesInput();
    }
    
    onDeactivate() {
        this.hideDynamicInput();
        this.clearPreview();
        super.onDeactivate();
    }
    
    /**
     * عرض إدخال عدد الأضلاع
     */
    showSidesInput() {
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.COUNT,
            label: 'Sides',
            defaultValue: this.options.sides,
            placeholder: 'Number of sides',
            min: 3,
            max: 100,
            autoFocus: true,
            trackMouse: false,
            
            onConfirm: (value) => {
                if (value && value >= 3) {
                    this.options.sides = value;
                    this.saveLastPolygonSides(value);
                    this.updateStatus(`${value}-sided polygon: Specify center point`);
                    
                    // إخفاء الإدخال الحالي
                    this.hideDynamicInput();
                } else {
                    // استخدام القيمة الافتراضية
                    this.updateStatus(`${this.options.sides}-sided polygon: Specify center point`);
                    this.hideDynamicInput();
                }
            },
            
            onCancel: () => {
                // استخدام القيمة الافتراضية
                this.updateStatus(`${this.options.sides}-sided polygon: Specify center point`);
                this.hideDynamicInput();
            }
        });
    }
    
    onClick(point) {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return;
        }
        
        if (!this.centerPoint) {
            // النقطة الأولى - المركز
            this.centerPoint = point;
            this.cad.isDrawing = true;
            this.updateStatus(`${this.options.sides}-sided polygon: Specify radius`);
            
            // عرض إدخال نصف القطر
            this.showRadiusInput();
        } else {
            // النقطة الثانية - تحديد نصف القطر
            const constrainedPoint = this.applyConstraints(this.centerPoint, point);
            const radius = this.cad.distance(
                this.centerPoint.x, this.centerPoint.y,
                constrainedPoint.x, constrainedPoint.y
            );
            
            if (radius > 0) {
                this.createPolygon(this.centerPoint, radius);
                this.finishDrawing();
            }
        }
    }
    
    /**
     * معالجة حركة الماوس
     */
    processMouseMove(point) {
        if (!this.centerPoint) return;
        
        // حساب نصف القطر الحالي
        const dx = point.x - this.centerPoint.x;
        const dy = point.y - this.centerPoint.y;
        this.currentRadius = Math.sqrt(dx * dx + dy * dy);
        
        // تحديد نصف القطر الفعلي
        let effectiveRadius;
        
        if (this.constrainedMode && this.constrainedValue > 0) {
            effectiveRadius = this.constrainedValue;
        } else {
            effectiveRadius = this.currentRadius;
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
        this.showPolygonPreview(effectiveRadius);
        
        // تحديث الحالة
        let displayRad = effectiveRadius;
        if (this.cad.units && this.cad.currentUnit) {
            try {
                displayRad = this.cad.units.fromInternal(effectiveRadius, this.cad.currentUnit);
            } catch (e) {
                // استخدام القيمة الأصلية
            }
        }
        
        this.updateStatus(
            `${this.options.sides}-sided polygon: Radius: ${displayRad.toFixed(2)} ${this.cad.currentUnit}` +
            (this.constrainedMode ? ' [CONSTRAINED]' : '') +
            (this.cad.orthoEnabled ? ' [ORTHO]' : '') +
            (this.cad.polarEnabled ? ' [POLAR]' : '')
        );
    }
    
    /**
     * عرض إدخال نصف القطر
     */
    showRadiusInput() {
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.DISTANCE,
            label: 'Radius',
            defaultValue: this.getLastPolygonRadius(),
            placeholder: 'Polygon radius',
            
            onInput: (value) => {
                if (value !== null && value > 0) {
                    this.constrainedMode = true;
                    this.constrainedValue = value;
                    this.showPolygonPreview(value);
                } else {
                    this.constrainedMode = false;
                    this.constrainedValue = null;
                }
            },
            
            onConfirm: (value) => {
                if (value && value > 0) {
                    this.createPolygon(this.centerPoint, value);
                    this.finishDrawing();
                } else if (!this.constrainedMode && this.currentRadius > 0) {
                    this.createPolygon(this.centerPoint, this.currentRadius);
                    this.finishDrawing();
                }
            }
        });
    }
    
    /**
     * عرض معاينة المضلع
     */
    showPolygonPreview(radius) {
        if (!this.centerPoint || radius <= 0) return;
        
        const points = this.calculatePolygonPoints(this.centerPoint, radius, this.options.sides);
        
        // استخدام خصائص الطبقة الحالية للمعاينة
        const currentLayer = this.cad.layerManager?.getCurrentLayer();
        
        // المضلع نفسه
        this.tempShape = {
            type: 'polygon',
            points: points,
            closed: true,
            filled: false,
            color: currentLayer?.color || this.cad.currentColor,
            lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
            lineType: currentLayer?.lineType || this.cad.currentLineType,
            tempStyle: {
                opacity: 0.8,
                dashArray: this.constrainedMode ? null : [5, 5]
            }
        };
        
        // عناصر إضافية للمعاينة
        const tempShapes = [this.tempShape];
        
        // دائرة المرجع
        tempShapes.push({
            type: 'circle',
            center: this.centerPoint,
            radius: radius,
            color: '#00d4aa',
            lineWidth: 1,
            tempStyle: {
                opacity: 0.3,
                dashArray: [2, 4]
            }
        });
        
        // نقطة المركز
        tempShapes.push({
            type: 'circle',
            center: this.centerPoint,
            radius: 3 / this.cad.zoom,
            color: '#ff9900',
            lineWidth: 2,
            filled: true,
            tempStyle: { opacity: 0.8 }
        });
        
        // خط نصف القطر
        if (this.options.sides > 0) {
            tempShapes.push({
                type: 'line',
                start: this.centerPoint,
                end: points[0],
                color: '#00ffcc',
                lineWidth: 1,
                tempStyle: {
                    opacity: 0.5,
                    dashArray: [5, 5]
                }
            });
        }
        
        this.cad.tempShapes = tempShapes;
        this.cad.render();
    }
    
    /**
     * حساب نقاط المضلع
     */
    calculatePolygonPoints(center, radius, sides) {
        const points = [];
        const angleStep = (2 * Math.PI) / sides;
        
        // البدء من الأعلى (90 درجة)
        const startAngle = -Math.PI / 2;
        
        for (let i = 0; i < sides; i++) {
            const angle = startAngle + (i * angleStep);
            points.push({
                x: center.x + radius * Math.cos(angle),
                y: center.y + radius * Math.sin(angle)
            });
        }
        
        return points;
    }
    
    /**
     * إنشاء المضلع النهائي
     */
    createPolygon(center, radius) {
        // حفظ نصف القطر
        this.saveLastPolygonRadius(radius);
        
        if (this.cad.geometryAdvanced) {
            // استخدام النظام المتقدم إن وجد
            const polygon = this.cad.geometryAdvanced.createPolygon(center, radius, this.options.sides);
            const shape = this.createShape(polygon);
            shape.filled = false;
            this.cad.addShape(shape);
        } else {
            // إنشاء مضلع يدوياً
            const points = this.calculatePolygonPoints(center, radius, this.options.sides);
            
            const shape = this.createShape({
                type: 'polygon',
                points: points,
                closed: true,
                filled: false
            });
            
            this.cad.addShape(shape);
        }
        
        // رسالة النجاح (بالوحدة الحالية)
        let displayRadius = radius;
        if (this.cad.units && this.cad.currentUnit) {
            try {
                displayRadius = this.cad.units.fromInternal(radius, this.cad.currentUnit);
            } catch (e) {
                // استخدام القيمة الأصلية
            }
        }
        
        this.updateStatus(
            `${this.options.sides}-sided polygon created with radius ${displayRadius.toFixed(2)} ${this.cad.currentUnit}`
        );
    }
    
    /**
     * إنهاء الرسم
     */
    finishDrawing() {
        this.hideDynamicInput();
        this.cad.isDrawing = false;
        this.cad.tempShapes = null;
        this.cad.render();
        this.resetState();
    }
    
    /**
     * معالجة المفاتيح
     */
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cancel();
        } else if (key === 'Enter' && this.centerPoint) {
            if (this.constrainedMode && this.constrainedValue > 0) {
                this.createPolygon(this.centerPoint, this.constrainedValue);
                this.finishDrawing();
            } else if (this.currentRadius > 0) {
                this.createPolygon(this.centerPoint, this.currentRadius);
                this.finishDrawing();
            }
        } else if (key === 'Tab' && this.centerPoint) {
            if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
                this.cad.dynamicInputManager.handleTab();
            }
        }
    }
    
    /**
     * إلغاء العملية
     */
    cancel() {
        this.finishDrawing();
        this.updateStatus('Polygon cancelled');
    }
    
    /**
     * إعادة تعيين الحالة
     */
    resetState() {
        this.centerPoint = null;
        this.currentRadius = 0;
        this.constrainedMode = false;
        this.constrainedValue = null;
    }
    
    /**
     * حفظ/استرجاع الإعدادات
     */
    getLastPolygonSides() {
        return this.toolsManager?.drawingState?.lastPolygonSides || this.defaultSides;
    }
    
    saveLastPolygonSides(sides) {
        if (!this.toolsManager.drawingState) {
            this.toolsManager.drawingState = {};
        }
        this.toolsManager.drawingState.lastPolygonSides = sides;
    }
    
    getLastPolygonRadius() {
        const lastRadius = this.toolsManager?.drawingState?.lastPolygonRadius || 0;
        
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
    
    saveLastPolygonRadius(radius) {
        if (!this.toolsManager.drawingState) {
            this.toolsManager.drawingState = {};
        }
        this.toolsManager.drawingState.lastPolygonRadius = radius;
    }
}