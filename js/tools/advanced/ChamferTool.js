// ==================== js/tools/advanced/ChamferTool.js ====================

import { AdvancedToolBase } from '../BaseTool.js';

/**
 * أداة Chamfer
 */
export class ChamferTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-ruler-combined';
        this.selection = [];
    }
    
    getDefaultOptions() {
        return {
            distance1: 10,
            distance2: 10,
            method: 'distance', // 'distance' or 'angle'
            angle: 45,
            trim: true,
            multiple: false,
            polyline: false
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'select',
                name: 'method',
                label: 'Method',
                value: this.options.method,
                options: [
                    { value: 'distance', label: 'Distance' },
                    { value: 'angle', label: 'Angle' }
                ],
                onChange: (value) => {
                    this.options.method = value;
                    this.updateUI();
                }
            },
            {
                type: 'number',
                name: 'distance1',
                label: 'Distance 1',
                value: this.options.distance1,
                min: 0,
                visible: () => this.options.method === 'distance',
                onChange: (value) => {
                    this.options.distance1 = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'distance2',
                label: 'Distance 2',
                value: this.options.distance2,
                min: 0,
                visible: () => this.options.method === 'distance',
                onChange: (value) => {
                    this.options.distance2 = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'angle',
                label: 'Angle',
                value: this.options.angle,
                min: 0,
                max: 90,
                visible: () => this.options.method === 'angle',
                onChange: (value) => {
                    this.options.angle = value;
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
                    this.handlePolylineChamfer();
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
                await this.executeChamfer(shape1, shape2);
                
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
    
    async executeChamfer(shape1, shape2) {
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        let result;
        
        if (this.options.method === 'distance') {
            result = await geo.chamfer(shape1, shape2, this.options.distance1, this.options.distance2);
        } else {
            // Angle method
            // TODO: Implement angle method
            throw new Error('Angle method not implemented yet');
        }
        
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
            this.updateStatus('Chamfer created');
        } else {
            throw new Error(result.message || 'Chamfer failed');
        }
    }
    
    async handlePolylineChamfer() {
        // Similar to handlePolylineFillet
    }
    
    updateUI() {
        if (this.ui) {
            this.ui = this.cad.ui.updateAdvancedToolPanel(this.name, this.getUIOptions());
        }
    }
    
    updatePreview() {
        // TODO: Implement preview update
    }
}