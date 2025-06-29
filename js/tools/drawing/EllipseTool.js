// ==================== js/tools/drawing/EllipseTool.js ====================

import { DrawingToolBase } from '../BaseTool.js';

/**
 * أداة رسم الشكل البيضاوي
 */
export class EllipseTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-ellipsis-h';
    }
    
    onActivate() {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return false;
        }
        
        super.onActivate();
        this.updateStatus('Specify center point');
    }
    
    onClick(point) {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return;
        }
        
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify first axis');
        } else if (this.drawingPoints.length === 1) {
            this.addPoint(point);
            this.updateStatus('Specify second axis');
        } else {
            const center = this.drawingPoints[0];
            const radiusX = Math.abs(this.drawingPoints[1].x - center.x);
            const radiusY = Math.abs(point.y - center.y);
            
            const shape = this.createShape({
                type: 'ellipse',
                center: center,
                radiusX: radiusX,
                radiusY: radiusY
            });
            
            this.cad.addShape(shape);
            this.updateStatus('Ellipse created');
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing) {
            if (this.drawingPoints.length === 1) {
                const center = this.drawingPoints[0];
                
                // استخدام خصائص الطبقة الحالية للمعاينة
                const currentLayer = this.cad.layerManager?.getCurrentLayer();
                
                this.tempShape = {
                    type: 'ellipse',
                    center: center,
                    radiusX: Math.abs(point.x - center.x),
                    radiusY: Math.abs(point.y - center.y),
                    color: currentLayer?.color || this.cad.currentColor,
                    lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
                    lineType: currentLayer?.lineType || this.cad.currentLineType
                };
                this.cad.tempShape = this.tempShape;
            }
        }
    }
}