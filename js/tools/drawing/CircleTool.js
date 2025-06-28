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
        super.onActivate();
        this.updateStatus('Specify center point');
    }
    
    onClick(point) {
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
            
            this.tempShape = {
                type: 'circle',
                center: this.drawingPoints[0],
                radius: radius,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType
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
    }
}