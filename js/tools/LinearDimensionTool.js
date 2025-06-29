/**
 * Linear Dimension Tool for TyrexCAD
 * أداة الأبعاد الخطية
 */

class LinearDimensionTool {
    constructor(toolsManager, name) {
        this.toolsManager = toolsManager;
        this.cad = toolsManager.cad;
        this.name = name;
        
        // حالة الأداة
        this.firstPoint = null;
        this.secondPoint = null;
        this.state = 'pickFirst'; // pickFirst, pickSecond, pickPosition
        this.tempDimension = null;
    }
    
    activate() {
        this.reset();
        this.cad.updateStatus('Linear Dimension: Select first point');
        this.cad.canvas.style.cursor = 'crosshair';
    }
    
    deactivate() {
        this.reset();
        this.cad.canvas.style.cursor = 'default';
    }
    
    reset() {
        this.firstPoint = null;
        this.secondPoint = null;
        this.state = 'pickFirst';
        this.tempDimension = null;
        this.cad.clearTempShapes();
    }
    
    onMouseDown(point) {
        switch (this.state) {
            case 'pickFirst':
                this.firstPoint = { ...point };
                this.state = 'pickSecond';
                this.cad.updateStatus('Linear Dimension: Select second point');
                break;
                
            case 'pickSecond':
                this.secondPoint = { ...point };
                this.state = 'pickPosition';
                this.cad.updateStatus('Linear Dimension: Select dimension line position');
                break;
                
            case 'pickPosition':
                this.createDimension(point);
                this.reset();
                this.cad.updateStatus('Linear Dimension: Select first point');
                break;
        }
    }
    
    onMouseMove(point) {
        if (this.state === 'pickSecond' && this.firstPoint) {
            // عرض خط مؤقت
            this.cad.clearTempShapes();
            this.cad.addTempShape({
                type: 'line',
                x1: this.firstPoint.x,
                y1: this.firstPoint.y,
                x2: point.x,
                y2: point.y,
                color: '#00d4aa',
                lineWidth: 1,
                dashed: true
            });
        } else if (this.state === 'pickPosition' && this.firstPoint && this.secondPoint) {
            // عرض البُعد المؤقت
            this.showTempDimension(point);
        }
    }
    
    showTempDimension(mousePos) {
        this.cad.clearTempShapes();
        
        // حساب المسافة
        const distance = this.cad.distance(
            this.firstPoint.x, this.firstPoint.y,
            this.secondPoint.x, this.secondPoint.y
        );
        
        // حساب الزاوية
        const angle = Math.atan2(
            this.secondPoint.y - this.firstPoint.y,
            this.secondPoint.x - this.firstPoint.x
        );
        
        // حساب موقع خط البُعد
        const dimLineOffset = this.calculateDimensionOffset(mousePos);
        
        // نقاط خط البُعد
        const dimLine = {
            x1: this.firstPoint.x + dimLineOffset.x,
            y1: this.firstPoint.y + dimLineOffset.y,
            x2: this.secondPoint.x + dimLineOffset.x,
            y2: this.secondPoint.y + dimLineOffset.y
        };
        
        // خطوط الامتداد
        const extLine1 = {
            x1: this.firstPoint.x,
            y1: this.firstPoint.y,
            x2: dimLine.x1,
            y2: dimLine.y1
        };
        
        const extLine2 = {
            x1: this.secondPoint.x,
            y1: this.secondPoint.y,
            x2: dimLine.x2,
            y2: dimLine.y2
        };
        
        // النص
        const textPos = {
            x: (dimLine.x1 + dimLine.x2) / 2,
            y: (dimLine.y1 + dimLine.y2) / 2
        };
        
        // رسم الأجزاء المؤقتة
        const tempShapes = this.createDimensionShapes(
            dimLine, extLine1, extLine2, textPos, distance, angle
        );
        
        tempShapes.forEach(shape => this.cad.addTempShape(shape));
    }
    
    calculateDimensionOffset(mousePos) {
        // حساب المسافة العمودية من الماوس لخط القياس
        const lineVec = {
            x: this.secondPoint.x - this.firstPoint.x,
            y: this.secondPoint.y - this.firstPoint.y
        };
        
        const lineLen = Math.sqrt(lineVec.x * lineVec.x + lineVec.y * lineVec.y);
        
        // normalize
        lineVec.x /= lineLen;
        lineVec.y /= lineLen;
        
        // العمودي على الخط
        const perpVec = {
            x: -lineVec.y,
            y: lineVec.x
        };
        
        // المسافة من نقطة البداية للماوس
        const toMouse = {
            x: mousePos.x - this.firstPoint.x,
            y: mousePos.y - this.firstPoint.y
        };
        
        // المسافة العمودية
        const perpDist = toMouse.x * perpVec.x + toMouse.y * perpVec.y;
        
        return {
            x: perpVec.x * perpDist,
            y: perpVec.y * perpDist
        };
    }
    
    createDimensionShapes(dimLine, extLine1, extLine2, textPos, distance, angle) {
        const shapes = [];
        const color = '#00d4aa';
        
        // خط البُعد
        shapes.push({
            type: 'line',
            x1: dimLine.x1,
            y1: dimLine.y1,
            x2: dimLine.x2,
            y2: dimLine.y2,
            color: color,
            lineWidth: 1
        });
        
        // خطوط الامتداد
        shapes.push({
            type: 'line',
            x1: extLine1.x1,
            y1: extLine1.y1,
            x2: extLine1.x2,
            y2: extLine1.y2,
            color: color,
            lineWidth: 1
        });
        
        shapes.push({
            type: 'line',
            x1: extLine2.x1,
            y1: extLine2.y1,
            x2: extLine2.x2,
            y2: extLine2.y2,
            color: color,
            lineWidth: 1
        });
        
        // الأسهم
        const arrowSize = 10;
        const arrowAngle = Math.PI / 6; // 30 degrees
        
        // سهم البداية
        shapes.push({
            type: 'line',
            x1: dimLine.x1,
            y1: dimLine.y1,
            x2: dimLine.x1 + arrowSize * Math.cos(angle + Math.PI - arrowAngle),
            y2: dimLine.y1 + arrowSize * Math.sin(angle + Math.PI - arrowAngle),
            color: color,
            lineWidth: 1
        });
        
        shapes.push({
            type: 'line',
            x1: dimLine.x1,
            y1: dimLine.y1,
            x2: dimLine.x1 + arrowSize * Math.cos(angle + Math.PI + arrowAngle),
            y2: dimLine.y1 + arrowSize * Math.sin(angle + Math.PI + arrowAngle),
            color: color,
            lineWidth: 1
        });
        
        // سهم النهاية
        shapes.push({
            type: 'line',
            x1: dimLine.x2,
            y1: dimLine.y2,
            x2: dimLine.x2 + arrowSize * Math.cos(angle - arrowAngle),
            y2: dimLine.y2 + arrowSize * Math.sin(angle - arrowAngle),
            color: color,
            lineWidth: 1
        });
        
        shapes.push({
            type: 'line',
            x1: dimLine.x2,
            y1: dimLine.y2,
            x2: dimLine.x2 + arrowSize * Math.cos(angle + arrowAngle),
            y2: dimLine.y2 + arrowSize * Math.sin(angle + arrowAngle),
            color: color,
            lineWidth: 1
        });
        
        // النص
        const textValue = this.cad.formatValue(distance);
        shapes.push({
            type: 'text',
            x: textPos.x,
            y: textPos.y,
            text: textValue,
            fontSize: 14,
            color: color,
            align: 'center',
            baseline: 'middle',
            rotation: angle * 180 / Math.PI
        });
        
        return shapes;
    }
    
    createDimension(position) {
        const dimLineOffset = this.calculateDimensionOffset(position);
        
        // حساب المسافة
        const distance = this.cad.distance(
            this.firstPoint.x, this.firstPoint.y,
            this.secondPoint.x, this.secondPoint.y
        );
        
        // حساب الزاوية
        const angle = Math.atan2(
            this.secondPoint.y - this.firstPoint.y,
            this.secondPoint.x - this.firstPoint.x
        );
        
        // نقاط خط البُعد
        const dimLine = {
            x1: this.firstPoint.x + dimLineOffset.x,
            y1: this.firstPoint.y + dimLineOffset.y,
            x2: this.secondPoint.x + dimLineOffset.x,
            y2: this.secondPoint.y + dimLineOffset.y
        };
        
        // إنشاء البُعد ككائن مركب
        const dimension = {
            type: 'dimension',
            subtype: 'linear',
            id: this.cad.generateId(),
            layerId: this.cad.getCurrentLayerId(),
            color: this.cad.currentColor,
            lineWidth: this.cad.currentLineWidth,
            lineType: this.cad.currentLineType,
            
            // نقاط القياس
            point1: { ...this.firstPoint },
            point2: { ...this.secondPoint },
            
            // موقع خط البُعد
            dimLineOffset: { ...dimLineOffset },
            
            // القيمة
            distance: distance,
            text: this.cad.formatValue(distance),
            
            // خصائص العرض
            arrowSize: 10,
            textSize: 14,
            
            // دالة الرسم المخصصة
            draw: function(ctx, cad) {
                // إنشاء instance مؤقت من الأداة للوصول لدالة createDimensionShapes
                const tool = cad.toolsManager?.tools?.get('dimension');
                if (!tool) {
                    console.warn('Dimension tool not found');
                    return;
                }
                
                const shapes = tool.createDimensionShapes(
                    {
                        x1: this.point1.x + this.dimLineOffset.x,
                        y1: this.point1.y + this.dimLineOffset.y,
                        x2: this.point2.x + this.dimLineOffset.x,
                        y2: this.point2.y + this.dimLineOffset.y
                    },
                    {
                        x1: this.point1.x,
                        y1: this.point1.y,
                        x2: this.point1.x + this.dimLineOffset.x,
                        y2: this.point1.y + this.dimLineOffset.y
                    },
                    {
                        x1: this.point2.x,
                        y1: this.point2.y,
                        x2: this.point2.x + this.dimLineOffset.x,
                        y2: this.point2.y + this.dimLineOffset.y
                    },
                    {
                        x: (this.point1.x + this.point2.x) / 2 + this.dimLineOffset.x,
                        y: (this.point1.y + this.point2.y) / 2 + this.dimLineOffset.y
                    },
                    this.distance,
                    Math.atan2(this.point2.y - this.point1.y, this.point2.x - this.point1.x)
                );
                
                // رسم كل جزء
                shapes.forEach(shape => {
                    shape.color = this.color;
                    cad.drawShape(shape);
                });
            }
        };
        
        // إضافة البُعد للمشروع
        this.cad.addShape(dimension);
        this.cad.recordState();
        this.cad.clearTempShapes();
        this.cad.render();
    }
    
    onKeyDown(e) {
        if (e.key === 'Escape') {
            this.reset();
            this.cad.clearTempShapes();
            this.cad.updateStatus('Linear Dimension cancelled');
        }
    }
}

// تصدير الأداة
window.LinearDimensionTool = LinearDimensionTool;

// ملاحظة: تسجيل الأداة يجب أن يتم في ToolsManager.js
// في دالة loadBuiltInTools أضف:
// this.registerTool('dimension', new LinearDimensionTool(this, 'dimension'));