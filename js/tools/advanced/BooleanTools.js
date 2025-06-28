// ==================== js/tools/advanced/BooleanTools.js ====================

import { AdvancedToolBase } from '../BaseTool.js';

/**
 * أداة Union
 */
export class UnionTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-object-group';
    }
    
    onActivate() {
        super.onActivate();
        if (this.cad.selectedShapes.size < 2) {
            this.updateStatus('Select at least 2 shapes');
            this.deactivate();
            return;
        }
        this.executeUnion();
    }
    
    async executeUnion() {
        const geo = await this.cad.loadAdvancedGeometry();
        const selected = Array.from(this.cad.selectedShapes);
        
        try {
            const result = await geo.union(selected);
            this.cad.recordState();
            
            // إضافة الشكل الناتج
            result.forEach(shape => {
                shape.color = this.cad.currentColor;
                shape.lineWidth = this.cad.currentLineWidth;
                shape.layerId = this.cad.currentLayerId;
                shape.id = this.cad.generateId();
                this.cad.shapes.push(shape);
            });
            
            // حذف الأشكال الأصلية
            selected.forEach(shape => this.cad.deleteShape(shape));
            
            this.cad.render();
            this.updateStatus('Union completed');
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}

/**
 * أداة Difference
 */
export class DifferenceTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-object-ungroup';
        this.firstShape = null;
    }
    
    onActivate() {
        super.onActivate();
        this.firstShape = null;
        this.updateStatus('Select main shape');
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!shape) return;
        
        if (!this.firstShape) {
            this.firstShape = shape;
            this.updateStatus('Select shape to subtract');
        } else {
            this.executeDifference(this.firstShape, shape);
        }
    }
    
    async executeDifference(mainShape, subtractShape) {
        const geo = await this.cad.loadAdvancedGeometry();
        
        try {
            const result = await geo.difference(mainShape, [subtractShape]);
            this.cad.recordState();
            
            // إضافة الشكل الناتج
            result.forEach(shape => {
                shape.color = this.cad.currentColor;
                shape.lineWidth = this.cad.currentLineWidth;
                shape.layerId = this.cad.currentLayerId;
                shape.id = this.cad.generateId();
                this.cad.shapes.push(shape);
            });
            
            // حذف الأشكال الأصلية
            this.cad.deleteShape(mainShape);
            this.cad.deleteShape(subtractShape);
            
            this.cad.render();
            this.updateStatus('Difference completed');
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}

/**
 * أداة Intersection
 */
export class IntersectionTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-object-group';
    }
    
    onActivate() {
        super.onActivate();
        if (this.cad.selectedShapes.size < 2) {
            this.updateStatus('Select at least 2 shapes');
            this.deactivate();
            return;
        }
        this.executeIntersection();
    }
    
    async executeIntersection() {
        const geo = await this.cad.loadAdvancedGeometry();
        const selected = Array.from(this.cad.selectedShapes);
        
        try {
            const result = await geo.intersection(selected);
            this.cad.recordState();
            
            // إضافة الشكل الناتج
            result.forEach(shape => {
                shape.color = this.cad.currentColor;
                shape.lineWidth = this.cad.currentLineWidth;
                shape.layerId = this.cad.currentLayerId;
                shape.id = this.cad.generateId();
                this.cad.shapes.push(shape);
            });
            
            // حذف الأشكال الأصلية
            selected.forEach(shape => this.cad.deleteShape(shape));
            
            this.cad.render();
            this.updateStatus('Intersection completed');
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}
