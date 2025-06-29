// ==================== js/tools/drawing/CircleTool.js ====================

import { DrawingToolBase } from '../BaseTool.js';

/**
 * أداة رسم الدائرة
 */
export class CircleTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-circle';
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
            
            if (this.cad.pendingShapeProperties && this.cad.pendingShapeProperties.circleRadius > 0) {
                const radius = this.cad.pendingShapeProperties.circleRadius;
                this.createCircle(point, radius);
                this.finishDrawing();
                this.cad.pendingShapeProperties = null;
            } else {
                this.updateStatus('Specify radius');
            }
        } else {
            const radius = this.cad.distance(
                this.drawingPoints[0].x,
                this.drawingPoints[0].y,
                point.x,
                point.y
            );
            
            this.createCircle(this.drawingPoints[0], radius);
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const radius = this.cad.distance(
                this.drawingPoints[0].x,
                this.drawingPoints[0].y,
                point.x,
                point.y
            );
            
            // استخدام خصائص الطبقة الحالية للمعاينة
            const currentLayer = this.cad.layerManager?.getCurrentLayer();
            
            this.tempShape = {
                type: 'circle',
                center: this.drawingPoints[0],
                radius: radius,
                color: currentLayer?.color || this.cad.currentColor,
                lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
                lineType: currentLayer?.lineType || this.cad.currentLineType
            };
            this.cad.tempShape = this.tempShape;
        }
    }
    
    createCircle(center, radius) {
        const shape = this.createShape({
            type: 'circle',
            center: center,
            radius: radius
        });
        
        this.cad.addShape(shape);
        this.updateStatus('Circle created');
    }
}