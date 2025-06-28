// ==================== js/tools/modify/CopyTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة النسخ
 */
export class CopyTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-copy';
        this.drawingPoints = [];
    }
    
    getDefaultOptions() {
        return {
            multiple: false
        };
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
            
            const newShapes = [];
            this.originalShapes.forEach(shape => {
                const newShape = this.cad.cloneShape(shape);
                newShape.id = this.cad.generateId();
                this.cad.translateShape(newShape, dx, dy);
                this.cad.shapes.push(newShape);
                newShapes.push(newShape);
            });
            
            // Select new shapes
            this.cad.selectedShapes.clear();
            newShapes.forEach(shape => this.cad.selectedShapes.add(shape));
            
            if (this.options.multiple) {
                // Continue copying
                this.drawingPoints = [point];
                this.updateStatus('Specify next point or ESC to finish');
            } else {
                this.finishCopying();
            }
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            const dx = point.x - this.drawingPoints[0].x;
            const dy = point.y - this.drawingPoints[0].y;
            
            const tempShapes = this.originalShapes.map(shape => {
                const temp = this.cad.cloneShape(shape);
                this.cad.translateShape(temp, dx, dy);
                temp.color = this.cad.currentColor;
                temp.lineWidth = this.cad.currentLineWidth;
                return temp;
            });
            
            this.showPreview(tempShapes);
        }
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    finishCopying() {
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