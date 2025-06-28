// ==================== js/tools/modify/ScaleTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة التكبير/التصغير
 */
export class ScaleTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-expand-arrows-alt';
        this.drawingPoints = [];
        this.baseDistance = 50;
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
            this.cad.showDynamicInput('Scale:', point);
            this.updateStatus('Specify scale factor');
        } else {
            const center = this.drawingPoints[0];
            const distance = this.cad.distance(center.x, center.y, point.x, point.y);
            const scale = distance / this.baseDistance;
            
            this.applyModification();
            
            this.selection.forEach((shape, index) => {
                const original = this.originalShapes[index];
                this.cad.copyShapeProperties(shape, original);
                this.cad.scaleShape(shape, center, scale);
            });
            
            this.finishScaling();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const center = this.drawingPoints[0];
            const distance = this.cad.distance(center.x, center.y, point.x, point.y);
            const scale = distance / this.baseDistance;
            
            const tempShapes = this.originalShapes.map(shape => {
                const temp = this.cad.cloneShape(shape);
                this.cad.scaleShape(temp, center, scale);
                return temp;
            });
            
            this.showPreview(tempShapes);
            
            // Update dynamic input
            if (this.cad.ui) {
                this.cad.ui.updateDynamicInput(scale.toFixed(2));
            }
        }
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    finishScaling() {
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