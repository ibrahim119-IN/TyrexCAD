// ==================== js/tools/drawing/ArcTool.js ====================

import { DrawingToolBase, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة رسم القوس المحسّنة
 */
export class ArcTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-curve';
        this.drawingMethod = '3point'; // الطريقة الافتراضية
    }
    
    onActivate() {
        if (!this.canDrawOnCurrentLayer()) {
            return false;
        }
        
        super.onActivate();
        this.updateStatus('Arc: Specify first point (TAB for options)');
    }
    
    onClick(point) {
        if (!this.canDrawOnCurrentLayer()) {
            return;
        }
        
        // تطبيق قيود Ortho/Polar
        if (this.drawingPoints.length > 0) {
            const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
            point = this.applyConstraints(lastPoint, point);
        }
        
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify second point');
            
        } else if (this.drawingPoints.length === 1) {
            this.addPoint(point);
            this.updateStatus('Specify end point');
            
            // عرض الإدخال الديناميكي للنصف القطر
            this.showRadiusInput();
            
        } else {
            const arc = this.cad.geo.calculateArcFrom3Points(
                this.drawingPoints[0],
                this.drawingPoints[1],
                point
            );
            
            if (arc) {
                const shape = this.createShape({
                    type: 'arc',
                    center: arc.center,
                    radius: arc.radius,
                    startAngle: arc.startAngle,
                    endAngle: arc.endAngle
                });
                
                this.cad.addShape(shape);
                this.updateStatus('Arc created');
            }
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (!this.cad.isDrawing) return;
        
        // تطبيق قيود Ortho/Polar
        if (this.drawingPoints.length > 0) {
            const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
            point = this.applyConstraints(lastPoint, point);
        }
        
        if (this.drawingPoints.length === 1) {
            // معاينة الخط المساعد
            this.showLinePreview(this.drawingPoints[0], point);
            
        } else if (this.drawingPoints.length === 2) {
            const arc = this.cad.geo.calculateArcFrom3Points(
                this.drawingPoints[0],
                this.drawingPoints[1],
                point
            );
            
            if (arc) {
                this.showArcPreview(arc);
                
                // عرض المعلومات
                const radius = arc.radius;
                let displayRadius = radius;
                
                if (this.cad.units && this.cad.currentUnit) {
                    try {
                        displayRadius = this.cad.units.fromInternal(radius, this.cad.currentUnit);
                    } catch (e) {}
                }
                
                const sweepAngle = this.calculateSweepAngle(arc.startAngle, arc.endAngle);
                this.updateStatus(
                    `Radius: ${displayRadius.toFixed(2)} ${this.cad.currentUnit}, ` +
                    `Angle: ${(sweepAngle * 180 / Math.PI).toFixed(1)}°`
                );
                
                // تحديث الإدخال الديناميكي إن كان مفتوحاً
                if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
                    this.cad.dynamicInputManager.updateLiveValue(displayRadius);
                }
            }
        }
    }
    
    /**
     * عرض معاينة الخط المساعد
     */
    showLinePreview(start, end) {
        const tempShapes = [{
            type: 'line',
            start: start,
            end: end,
            color: this.cad.currentColor,
            lineWidth: 1,
            tempStyle: {
                opacity: 0.5,
                dashArray: [5, 5]
            }
        }];
        
        this.clearPreview();
        this.showPreview(tempShapes);
    }
    
    /**
     * عرض معاينة القوس
     */
    showArcPreview(arc) {
        const currentLayer = this.cad.layerManager?.getCurrentLayer();
        
        this.tempShape = {
            type: 'arc',
            center: arc.center,
            radius: arc.radius,
            startAngle: arc.startAngle,
            endAngle: arc.endAngle,
            color: currentLayer?.color || this.cad.currentColor,
            lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
            lineType: currentLayer?.lineType || this.cad.currentLineType
        };
        this.cad.tempShape = this.tempShape;
    }
    
    /**
     * عرض إدخال نصف القطر
     */
    showRadiusInput() {
        if (this.drawingPoints.length !== 2) return;
        
        // حساب المسافة بين النقطتين
        const dist = this.cad.distance(
            this.drawingPoints[0].x, 
            this.drawingPoints[0].y,
            this.drawingPoints[1].x,
            this.drawingPoints[1].y
        );
        
        let defaultRadius = dist / 2;
        if (this.cad.units && this.cad.currentUnit) {
            try {
                defaultRadius = this.cad.units.fromInternal(defaultRadius, this.cad.currentUnit);
            } catch (e) {}
        }
        
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.DISTANCE,
            label: 'Radius',
            defaultValue: defaultRadius,
            placeholder: 'Arc radius',
            
            onInput: (value) => {
                if (value !== null && value > 0) {
                    // إنشاء قوس بنصف القطر المحدد
                    const arc = this.createArcWithRadius(
                        this.drawingPoints[0],
                        this.drawingPoints[1],
                        value // القيمة محولة بالفعل للوحدة الداخلية
                    );
                    
                    if (arc) {
                        this.showArcPreview(arc);
                    }
                }
            },
            
            onConfirm: (value) => {
                if (value && value > 0) {
                    const arc = this.createArcWithRadius(
                        this.drawingPoints[0],
                        this.drawingPoints[1],
                        value
                    );
                    
                    if (arc) {
                        const shape = this.createShape({
                            type: 'arc',
                            center: arc.center,
                            radius: arc.radius,
                            startAngle: arc.startAngle,
                            endAngle: arc.endAngle
                        });
                        
                        this.cad.addShape(shape);
                        this.updateStatus('Arc created with specified radius');
                    }
                    
                    this.finishDrawing();
                }
            }
        });
    }
    
    /**
     * إنشاء قوس بنصف قطر محدد
     */
    createArcWithRadius(p1, p2, radius) {
        // حساب المركز لقوس بنصف قطر محدد يمر بنقطتين
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (radius < dist / 2) {
            this.updateStatus('Radius too small for these points');
            return null;
        }
        
        // نقطة المنتصف
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        
        // المسافة من المنتصف للمركز
        const h = Math.sqrt(radius * radius - (dist * dist) / 4);
        
        // اتجاه عمودي على الخط
        const perpX = -dy / dist;
        const perpY = dx / dist;
        
        // المركز (نختار الجهة بناءً على موضع الماوس)
        const center = {
            x: mx + h * perpX,
            y: my + h * perpY
        };
        
        const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
        const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);
        
        return {
            center: center,
            radius: radius,
            startAngle: startAngle,
            endAngle: endAngle
        };
    }
    
    /**
     * حساب زاوية القوس
     */
    calculateSweepAngle(startAngle, endAngle) {
        let sweep = endAngle - startAngle;
        if (sweep < 0) sweep += 2 * Math.PI;
        return sweep;
    }
    
    /**
     * معالجة المفاتيح
     */
    onKeyPress(key) {
        if (key === 'Escape') {
            this.finishDrawing();
        } else if (key === 'Tab' && !this.cad.isDrawing) {
            // يمكن إضافة قائمة لاختيار طريقة الرسم
            this.updateStatus('3-point arc method active');
        }
    }
}