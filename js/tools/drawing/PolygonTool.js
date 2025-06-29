// ==================== js/tools/drawing/PolygonTool.js ====================

import { DrawingToolBase } from '../BaseTool.js';

/**
 * أداة رسم المضلع المنتظم
 */
export class PolygonTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-draw-polygon';
    }
    
    getDefaultOptions() {
        return {
            sides: 6
        };
    }
    
    onActivate() {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return false;
        }
        
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
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return;
        }
        
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
            
            // استخدام خصائص الطبقة الحالية للمعاينة
            const currentLayer = this.cad.layerManager?.getCurrentLayer();
            
            this.tempShape = {
                type: 'polyline',
                points: points,
                closed: true,
                color: currentLayer?.color || this.cad.currentColor,
                lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
                lineType: currentLayer?.lineType || this.cad.currentLineType
            };
            this.cad.tempShape = this.tempShape;
        }
    }
    
    async createPolygon(center, radius) {
        if (this.cad.geometryAdvanced) {
            const polygon = this.cad.geometryAdvanced.createPolygon(center, radius, this.options.sides);
            const shape = this.createShape(polygon);
            this.cad.addShape(shape);
            this.updateStatus('Polygon created');
        } else {
            // Fallback - رسم مضلع بسيط
            const points = [];
            const angleStep = (2 * Math.PI) / this.options.sides;
            
            for (let i = 0; i < this.options.sides; i++) {
                const angle = i * angleStep - Math.PI / 2;
                points.push({
                    x: center.x + radius * Math.cos(angle),
                    y: center.y + radius * Math.sin(angle)
                });
            }
            
            const shape = this.createShape({
                type: 'polygon',
                points: points,
                closed: true
            });
            
            this.cad.addShape(shape);
            this.updateStatus('Polygon created');
        }
    }
}