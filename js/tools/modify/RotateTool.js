// ==================== js/tools/modify/RotateTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة التدوير
 */
export class RotateTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-sync-alt';
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
            this.cad.showDynamicInput('Angle:', point);
            this.updateStatus('Specify rotation angle');
        } else {
            const center = this.drawingPoints[0];
            const angle = Math.atan2(
                point.y - center.y,
                point.x - center.x
            );
            
            this.applyModification();
            
            this.selection.forEach((shape, index) => {
                const original = this.originalShapes[index];
                this.cad.copyShapeProperties(shape, original);
                this.cad.rotateShape(shape, center, angle);
            });
            
            this.finishRotating();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const center = this.drawingPoints[0];
            const angle = Math.atan2(
                point.y - center.y,
                point.x - center.x
            );
            
            const tempShapes = this.originalShapes.map(shape => {
                const temp = this.cad.cloneShape(shape);
                this.cad.rotateShape(temp, center, angle);
                return temp;
            });
            
            this.showPreview(tempShapes);
            
            // Update dynamic input
            const degrees = angle * 180 / Math.PI;
            if (this.cad.ui) {
                this.cad.ui.updateDynamicInput(degrees.toFixed(1) + '°');
            }
        }
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    finishRotating() {
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