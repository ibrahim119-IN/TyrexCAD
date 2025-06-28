// ==================== js/tools/modify/MoveTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة التحريك
 */
export class MoveTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-arrows-alt';
        this.drawingPoints = [];
    }
    
    onActivate() {
        if (!super.onActivate()) return;
        
        this.cad.isDrawing = false;
        this.updateStatus('Specify base point');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify second point');
        } else {
            const dx = point.x - this.drawingPoints[0].x;
            const dy = point.y - this.drawingPoints[0].y;
            
            this.applyModification();
            
            this.selection.forEach((shape, index) => {
                const original = this.originalShapes[index];
                this.cad.copyShapeProperties(shape, original);
                this.cad.translateShape(shape, dx, dy);
            });
            
            this.finishMoving();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const dx = point.x - this.drawingPoints[0].x;
            const dy = point.y - this.drawingPoints[0].y;
            
            const tempShapes = this.originalShapes.map(shape => {
                const temp = this.cad.cloneShape(shape);
                this.cad.translateShape(temp, dx, dy);
                return temp;
            });
            
            this.showPreview(tempShapes);
        }
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    finishMoving() {
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.clearPreview();
        this.cad.finishDrawing();
    }
    
    showPreview(shapes) {
        this.cad.tempShapes = shapes;
        this.cad.render();
    }
    
    clearPreview() {
        this.cad.tempShapes = null;
        this.cad.render();
    }
}
