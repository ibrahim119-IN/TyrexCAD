// ==================== js/tools/drawing/PolylineTool.js ====================

import { DrawingToolBase } from '../BaseTool.js';

/**
 * أداة رسم الخط المتعدد
 */
export class PolylineTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-project-diagram';
    }
    
    onActivate() {
        super.onActivate();
        this.updateStatus('Specify first point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
        }
        
        this.addPoint(point);
        this.updateStatus(`Point ${this.drawingPoints.length} added (Enter to finish, Right-click to finish)`);
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            this.tempShape = {
                type: 'polyline',
                points: [...this.drawingPoints, point],
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType
            };
            this.cad.tempShape = this.tempShape;
        }
    }
    
    onKeyPress(key) {
        if (key === 'Enter' && this.cad.isDrawing) {
            this.finishPolyline();
        }
    }
    
    finishPolyline() {
        if (this.drawingPoints.length > 1) {
            const shape = this.createShape({
                type: 'polyline',
                points: [...this.drawingPoints]
            });
            
            this.cad.addShape(shape);
        }
        this.finishDrawing();
    }
}