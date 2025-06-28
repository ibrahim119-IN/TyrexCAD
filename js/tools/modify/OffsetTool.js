// ==================== js/tools/modify/OffsetTool.js ====================

import { BaseTool } from '../BaseTool.js';

/**
 * أداة الإزاحة (Offset)
 */
export class OffsetTool extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-clone';
        this.originalShape = null;
        this.basePoint = null;
    }
    
    getDefaultOptions() {
        return {
            distance: 10,
            multiple: false
        };
    }
    
    onActivate() {
        this.cad.isDrawing = false;
        this.originalShape = null;
        this.updateStatus('Select object to offset');
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
            const shape = this.cad.getShapeAt(world.x, world.y);
            
            if (shape) {
                this.cad.isDrawing = true;
                this.originalShape = shape;
                this.basePoint = point;
                this.cad.showDynamicInput('Offset distance:', point);
                this.updateStatus('Specify offset side');
            }
        } else {
            const offsetShape = this.cad.cloneShape(this.originalShape);
            offsetShape.id = this.cad.generateId();
            
            const side = this.determineOffsetSide(this.originalShape, point);
            
            switch (this.originalShape.type) {
                case 'line':
                    this.offsetLine(offsetShape, this.options.distance * side);
                    break;
                case 'circle':
                    offsetShape.radius += this.options.distance * side;
                    if (offsetShape.radius > 0) {
                        this.cad.shapes.push(offsetShape);
                    }
                    break;
                case 'rectangle':
                    offsetShape.start.x -= this.options.distance * side;
                    offsetShape.start.y -= this.options.distance * side;
                    offsetShape.end.x += this.options.distance * side;
                    offsetShape.end.y += this.options.distance * side;
                    this.cad.shapes.push(offsetShape);
                    break;
            }
            
            this.cad.recordState();
            this.cad.render();
            
            if (this.options.multiple) {
                this.cad.isDrawing = false;
                this.updateStatus('Select object to offset');
            } else {
                this.finishOffset();
            }
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.originalShape) {
            const side = this.determineOffsetSide(this.originalShape, point);
            const tempShape = this.cad.cloneShape(this.originalShape);
            
            switch (this.originalShape.type) {
                case 'line':
                    this.offsetLine(tempShape, this.options.distance * side);
                    break;
                case 'circle':
                    tempShape.radius += this.options.distance * side;
                    break;
                case 'rectangle':
                    tempShape.start.x -= this.options.distance * side;
                    tempShape.start.y -= this.options.distance * side;
                    tempShape.end.x += this.options.distance * side;
                    tempShape.end.y += this.options.distance * side;
                    break;
            }
            
            tempShape.color = '#00d4aa';
            tempShape.lineType = 'dashed';
            this.cad.tempShape = tempShape;
        }
    }
    
    offsetLine(line, distance) {
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            
            line.start.x += nx * distance;
            line.start.y += ny * distance;
            line.end.x += nx * distance;
            line.end.y += ny * distance;
            
            this.cad.shapes.push(line);
        }
    }
    
    determineOffsetSide(shape, point) {
        switch (shape.type) {
            case 'line':
                const dx = shape.end.x - shape.start.x;
                const dy = shape.end.y - shape.start.y;
                const cross = (point.x - shape.start.x) * dy - (point.y - shape.start.y) * dx;
                return cross > 0 ? 1 : -1;
            case 'circle':
                const dist = this.cad.distance(point.x, point.y, shape.center.x, shape.center.y);
                return dist > shape.radius ? 1 : -1;
            default:
                return 1;
        }
    }
    
    finishOffset() {
        this.cad.isDrawing = false;
        this.originalShape = null;
        this.cad.tempShape = null;
        this.cad.finishDrawing();
    }
}
