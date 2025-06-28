// ==================== js/tools/modify/MirrorTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة المرآة
 */
export class MirrorTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-object-ungroup';
        this.drawingPoints = [];
    }
    
    getDefaultOptions() {
        return {
            copy: true
        };
    }
    
    onActivate() {
        if (!super.onActivate()) return;
        
        this.cad.isDrawing = false;
        this.updateStatus('Specify first point of mirror line');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify second point of mirror line');
        } else {
            const mirrorLine = {
                start: this.drawingPoints[0],
                end: point
            };
            
            this.applyModification();
            
            if (this.options.copy) {
                // Mirror copy
                const newShapes = [];
                this.selection.forEach(shape => {
                    const newShape = this.cad.cloneShape(shape);
                    newShape.id = this.cad.generateId();
                    this.cad.mirrorShape(newShape, mirrorLine);
                    this.cad.shapes.push(newShape);
                    newShapes.push(newShape);
                });
            } else {
                // Mirror in place
                this.selection.forEach(shape => {
                    this.cad.mirrorShape(shape, mirrorLine);
                });
            }
            
            this.cad.render();
            this.finishMirroring();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            // Show mirror line
            this.tempShape = {
                type: 'line',
                start: this.drawingPoints[0],
                end: point,
                color: '#00d4aa',
                lineWidth: 1,
                lineType: 'dashed'
            };
            this.cad.tempShape = this.tempShape;
            
            // Show preview
            const mirrorLine = {
                start: this.drawingPoints[0],
                end: point
            };
            
            const tempShapes = this.originalShapes.map(shape => {
                const temp = this.cad.cloneShape(shape);
                this.cad.mirrorShape(temp, mirrorLine);
                temp.color = '#00d4aa';
                temp.lineType = 'dashed';
                return temp;
            });
            
            this.cad.tempShapes = tempShapes;
        }
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    finishMirroring() {
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.cad.tempShape = null;
        this.cad.tempShapes = null;
        this.cad.finishDrawing();
    }
}