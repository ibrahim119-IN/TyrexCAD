// ==================== js/tools/drawing/LineTool.js ====================

import { DrawingToolBase } from '../BaseTool.js';

/**
 * أداة رسم الخط
 */
export class LineTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-slash';
    }
    
    onActivate() {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return false;
        }
        
        super.onActivate();
        this.cad.isDrawing = false;
        this.updateStatus('Specify first point');
    }
    
    onClick(point) {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return;
        }
        
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            
            if (this.cad.pendingShapeProperties && this.cad.pendingShapeProperties.lineLength > 0) {
                const length = this.cad.pendingShapeProperties.lineLength;
                const angle = (this.cad.pendingShapeProperties.lineAngle || 0) * Math.PI / 180;
                
                const endPoint = {
                    x: point.x + length * Math.cos(angle),
                    y: point.y + length * Math.sin(angle)
                };
                
                this.createLine(point, endPoint);
                this.finishDrawing();
                this.cad.pendingShapeProperties = null;
            } else {
                this.updateStatus('Specify second point');
            }
        } else {
            this.createLine(this.drawingPoints[0], point);
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            // استخدام خصائص الطبقة الحالية للمعاينة
            const currentLayer = this.cad.layerManager?.getCurrentLayer();
            
            this.tempShape = {
                type: 'line',
                start: this.drawingPoints[0],
                end: point,
                color: currentLayer?.color || this.cad.currentColor,
                lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
                lineType: currentLayer?.lineType || this.cad.currentLineType
            };
            this.cad.tempShape = this.tempShape;
        }
    }
    
    createLine(start, end) {
        const shape = this.createShape({
            type: 'line',
            start: start,
            end: end
        });
        
        this.cad.addShape(shape);
        this.updateStatus('Line created');
    }
}