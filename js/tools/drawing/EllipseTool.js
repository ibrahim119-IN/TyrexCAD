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
        super.onActivate();
        this.updateStatus('Specify center point');
    }
    
    onClick(point) {
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
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing) {
            if (this.drawingPoints.length === 1) {
                const center = this.drawingPoints[0];
                this.tempShape = {
                    type: 'ellipse',
                    center: center,
                    radiusX: Math.abs(point.x - center.x),
                    radiusY: Math.abs(point.y - center.y),
                    color: this.cad.currentColor,
                    lineWidth: this.cad.currentLineWidth,
                    lineType: this.cad.currentLineType
                };
                this.cad.tempShape = this.tempShape;
            }
        }
    }
}
