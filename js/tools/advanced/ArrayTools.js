// ==================== js/tools/advanced/ArrayTools.js ====================

import { AdvancedToolBase } from '../BaseTool.js';

/**
 * أداة Rectangular Array
 */
export class RectangularArrayTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-th';
        this.selection = [];
    }
    
    getDefaultOptions() {
        return {
            rows: 3,
            columns: 3,
            rowSpacing: 50,
            columnSpacing: 50,
            angle: 0,
            associative: false
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'number',
                name: 'rows',
                label: 'Rows',
                value: this.options.rows,
                min: 1,
                onChange: (value) => {
                    this.options.rows = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'columns',
                label: 'Columns',
                value: this.options.columns,
                min: 1,
                onChange: (value) => {
                    this.options.columns = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'rowSpacing',
                label: 'Row Spacing',
                value: this.options.rowSpacing,
                onChange: (value) => {
                    this.options.rowSpacing = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'columnSpacing',
                label: 'Column Spacing',
                value: this.options.columnSpacing,
                onChange: (value) => {
                    this.options.columnSpacing = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'angle',
                label: 'Angle',
                value: this.options.angle,
                min: -360,
                max: 360,
                onChange: (value) => {
                    this.options.angle = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'associative',
                label: 'Associative',
                value: this.options.associative,
                onChange: (value) => {
                    this.options.associative = value;
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select objects first');
            this.deactivate();
            return;
        }
        
        this.selection = Array.from(this.cad.selectedShapes);
        this.updatePreview();
    }
    
    updatePreview() {
        if (!this.selection || this.selection.length === 0) return;
        
        const preview = [];
        
        for (let row = 0; row < this.options.rows; row++) {
            for (let col = 0; col < this.options.columns; col++) {
                if (row === 0 && col === 0) continue; // Skip original
                
                this.selection.forEach(shape => {
                    const copy = this.cad.cloneShape(shape);
                    
                    // Calculate position
                    let dx = col * this.options.columnSpacing;
                    let dy = row * this.options.rowSpacing;
                    
                    // Apply rotation if needed
                    if (this.options.angle !== 0) {
                        const angle = this.options.angle * Math.PI / 180;
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        const newDx = dx * cos - dy * sin;
                        const newDy = dx * sin + dy * cos;
                        dx = newDx;
                        dy = newDy;
                    }
                    
                    this.cad.translateShape(copy, dx, dy);
                    
                    copy.color = '#00d4aa';
                    copy.lineType = 'dashed';
                    preview.push(copy);
                });
            }
        }
        
        this.showPreview(preview);
    }
    
    onClick(point) {
        this.applyArray();
        this.deactivate();
    }
    
    async applyArray() {
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        this.cad.recordState();
        
        const result = geo.rectangularArray(this.selection, this.options);
        
        result.forEach(shape => {
            shape.id = this.cad.generateId();
            this.cad.shapes.push(shape);
        });
        
        if (this.options.associative) {
            // TODO: Create associative array group
        }
        
        this.cad.render();
        this.updateStatus(`Created ${result.length} copies`);
    }
}

/**
 * أداة Polar Array
 */
export class PolarArrayTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-circle-notch';
        this.selection = [];
        this.center = null;
    }
    
    getDefaultOptions() {
        return {
            count: 6,
            angle: 360,
            rotateItems: true,
            associative: false
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'number',
                name: 'count',
                label: 'Count',
                value: this.options.count,
                min: 2,
                onChange: (value) => {
                    this.options.count = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'angle',
                label: 'Fill Angle',
                value: this.options.angle,
                min: -360,
                max: 360,
                onChange: (value) => {
                    this.options.angle = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'rotateItems',
                label: 'Rotate Items',
                value: this.options.rotateItems,
                onChange: (value) => {
                    this.options.rotateItems = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'associative',
                label: 'Associative',
                value: this.options.associative,
                onChange: (value) => {
                    this.options.associative = value;
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select objects first');
            this.deactivate();
            return;
        }
        
        this.selection = Array.from(this.cad.selectedShapes);
        this.center = null;
        this.updateStatus('Specify center point');
    }
    
    onClick(point) {
        if (!this.center) {
            this.center = point;
            this.updatePreview();
            this.updateStatus('Click to confirm or adjust parameters');
        } else {
            this.applyArray();
            this.deactivate();
        }
    }
    
    onMouseMove(point) {
        if (!this.center && this.selection.length > 0) {
            this.showCenterPreview(point);
        }
    }
    
    showCenterPreview(point) {
        // Show crosshair at center point
        const preview = [{
            type: 'line',
            start: { x: point.x - 10, y: point.y },
            end: { x: point.x + 10, y: point.y },
            color: '#00d4aa',
            lineType: 'dashed'
        }, {
            type: 'line',
            start: { x: point.x, y: point.y - 10 },
            end: { x: point.x, y: point.y + 10 },
            color: '#00d4aa',
            lineType: 'dashed'
        }];
        
        this.showPreview(preview);
    }
    
    updatePreview() {
        if (!this.center || !this.selection || this.selection.length === 0) return;
        
        const preview = [];
        const angleStep = (this.options.angle * Math.PI / 180) / (this.options.count - 1);
        
        for (let i = 1; i < this.options.count; i++) {
            const currentAngle = i * angleStep;
            
            this.selection.forEach(shape => {
                const copy = this.cad.cloneShape(shape);
                
                // Rotate around center
                this.cad.rotateShape(copy, this.center, currentAngle);
                
                // Rotate item itself if needed
                if (this.options.rotateItems) {
                    const shapeBounds = this.cad.getShapeBounds(copy);
                    const shapeCenter = {
                        x: (shapeBounds.minX + shapeBounds.maxX) / 2,
                        y: (shapeBounds.minY + shapeBounds.maxY) / 2
                    };
                    this.cad.rotateShape(copy, shapeCenter, currentAngle);
                }
                
                copy.color = '#00d4aa';
                copy.lineType = 'dashed';
                preview.push(copy);
            });
        }
        
        this.showPreview(preview);
    }
    
    async applyArray() {
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        this.cad.recordState();
        
        const result = geo.polarArray(this.selection, {
            center: this.center,
            count: this.options.count,
            angle: this.options.angle,
            rotateItems: this.options.rotateItems
        });
        
        result.forEach(shape => {
            shape.id = this.cad.generateId();
            this.cad.shapes.push(shape);
        });
        
        if (this.options.associative) {
            // TODO: Create associative array group
        }
        
        this.cad.render();
        this.updateStatus(`Created ${result.length} copies`);
    }
}

/**
 * أداة Path Array
 */
export class PathArrayTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-route';
        this.selection = [];
        this.path = null;
    }
    
    getDefaultOptions() {
        return {
            count: 10,
            spacing: 0, // 0 = divide evenly
            alignToPath: true,
            associative: false,
            method: 'divide' // 'divide' or 'measure'
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
                    { value: 'divide', label: 'Divide' },
                    { value: 'measure', label: 'Measure' }
                ],
                onChange: (value) => {
                    this.options.method = value;
                    this.updateUI();
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'count',
                label: 'Count',
                value: this.options.count,
                min: 2,
                visible: () => this.options.method === 'divide',
                onChange: (value) => {
                    this.options.count = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'spacing',
                label: 'Spacing',
                value: this.options.spacing,
                min: 0,
                visible: () => this.options.method === 'measure',
                onChange: (value) => {
                    this.options.spacing = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'alignToPath',
                label: 'Align to Path',
                value: this.options.alignToPath,
                onChange: (value) => {
                    this.options.alignToPath = value;
                    this.updatePreview();
                }
            },
            {
                type: 'toggle',
                name: 'associative',
                label: 'Associative',
                value: this.options.associative,
                onChange: (value) => {
                    this.options.associative = value;
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select objects first');
            this.deactivate();
            return;
        }
        
        this.selection = Array.from(this.cad.selectedShapes);
        this.path = null;
        this.updateStatus('Select path');
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!shape) return;
        
        if (shape.type === 'line' || shape.type === 'polyline' || 
            shape.type === 'arc' || shape.type === 'circle') {
            this.path = shape;
            this.updatePreview();
            this.updateStatus('Click to confirm or adjust parameters');
        } else {
            this.updateStatus('Select a valid path (line, polyline, arc, or circle)');
        }
    }
    
    updateUI() {
        if (this.ui) {
            this.ui = this.cad.ui.updateAdvancedToolPanel(this.name, this.getUIOptions());
        }
    }
    
    updatePreview() {
        if (!this.path || !this.selection || this.selection.length === 0) return;
        
        const geo = this.cad.geometryAdvanced;
        if (!geo) return;
        
        const options = {
            count: this.options.count,
            alignToPath: this.options.alignToPath
        };
        
        if (this.options.method === 'measure') {
            // Calculate count based on spacing
            const pathLength = geo.calculatePathLength(this.path);
            options.count = Math.floor(pathLength / this.options.spacing) + 1;
        }
        
        const preview = [];
        
        // Use geometry advanced to calculate positions
        const pathLength = geo.calculatePathLength(this.path);
        const step = pathLength / (options.count - 1);
        
        for (let i = 0; i < options.count; i++) {
            const distance = i * step;
            const position = geo.getPointAtDistance(this.path, distance);
            
            if (!position) continue;
            
            this.selection.forEach(shape => {
                const copy = this.cad.cloneShape(shape);
                
                // Move to position
                const bounds = this.cad.getShapeBounds(shape);
                const centerX = (bounds.minX + bounds.maxX) / 2;
                const centerY = (bounds.minY + bounds.maxY) / 2;
                
                this.cad.translateShape(
                    copy, 
                    position.point.x - centerX, 
                    position.point.y - centerY
                );
                
                // Align to path if needed
                if (options.alignToPath && position.angle !== undefined) {
                    this.cad.rotateShape(copy, position.point, position.angle);
                }
                
                copy.color = '#00d4aa';
                copy.lineType = 'dashed';
                preview.push(copy);
            });
        }
        
        this.showPreview(preview);
    }
    
    async applyArray() {
        const geo = await this.cad.loadAdvancedGeometry();
        if (!geo) throw new Error('Advanced geometry not available');
        
        this.cad.recordState();
        
        const result = geo.pathArray(this.selection, this.path, {
            count: this.options.count,
            alignToPath: this.options.alignToPath
        });
        
        result.forEach(shape => {
            shape.id = this.cad.generateId();
            this.cad.shapes.push(shape);
        });
        
        if (this.options.associative) {
            // TODO: Create associative array group
        }
        
        this.cad.render();
        this.updateStatus(`Created ${result.length} copies`);
    }
}