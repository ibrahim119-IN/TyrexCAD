// ==================== js/tools/advanced/FilletTool.js ====================

import { AdvancedToolBase } from '../BaseTool.js';

/**
 * أداة Fillet
 */
export class FilletTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-bezier-curve';
        this.selection = [];
    }
    
    getDefaultOptions() {
        return {
            radius: 10,
            trim: true,
            multiple: false,
            polyline: false
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'number',
                name: 'radius',
                label: 'Radius',
                value: this.options.radius,
                min: 0,
                onChange: (value) => {
                    this.options.radius = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'trim',
                label: 'Trim',
                value: this.options.trim,
                onChange: (value) => {
                    this.options.trim = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'multiple',
                label: 'Multiple',
                value: this.options.multiple,
                onChange: (value) => {
                    this.options.multiple = value;
                }
            },
            {
                type: 'button',
                name: 'polyline',
                label: 'Polyline',
                onClick: () => {
                    this.handlePolylineFillet();
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        this.selection = [];
        this.updateStatus('Select first object');
    }
    
    async onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!shape) return;
        
        if (this.selection.length === 0) {
            this.selection.push(shape);
            this.updateStatus('Select second object');
        } else {
            const shape1 = this.selection[0];
            const shape2 = shape;
            
            if (shape1 === shape2) {
                this.updateStatus('Select a different object');
                return;
            }
            
            try {
                await this.executeFillet(shape1, shape2);
                
                if (this.options.multiple) {
                    this.selection = [];
                    this.updateStatus('Select first object');
                } else {
                    this.deactivate();
                }
            } catch (error) {
                this.handleError(error);
            }
        }
    }
    
    async executeFillet(shape1, shape2) {
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        const result = await geo.fillet(shape1, shape2, this.options.radius);
        
        if (result.success) {
            this.cad.recordState();
            
            // Add new shapes
            result.shapes.forEach(s => {
                s.color = this.cad.currentColor;
                s.lineWidth = this.cad.currentLineWidth;
                s.lineType = this.cad.currentLineType;
                s.layerId = this.cad.currentLayerId;
                s.id = this.cad.generateId();
                this.cad.shapes.push(s);
            });
            
            // Trim original shapes if needed
            if (this.options.trim) {
                // TODO: Implement trimming logic
            }
            
            this.cad.render();
            this.updateStatus('Fillet created');
        } else {
            throw new Error(result.message || 'Fillet failed');
        }
    }
    
    async handlePolylineFillet() {
        const selected = Array.from(this.cad.selectedShapes);
        const polylines = selected.filter(s => s.type === 'polyline');
        
        if (polylines.length === 0) {
            this.updateStatus('Select a polyline first');
            return;
        }
        
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        this.cad.recordState();
        
        for (const polyline of polylines) {
            try {
                const result = await geo.filletPolygon(polyline, this.options.radius);
                // Apply result...
            } catch (error) {
                this.handleError(error);
            }
        }
        
        this.cad.render();
    }
    
    updatePreview() {
        // TODO: Implement preview update
    }
}