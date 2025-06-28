// ==================== js/tools/advanced/CurvesTools.js ====================

import { AdvancedToolBase } from '../BaseTool.js';

/**
 * أداة Convert to Polyline
 */
export class ConvertToPolylineTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-project-diagram';
    }
    
    getDefaultOptions() {
        return {
            segments: 16,
            tolerance: 0.1
        };
    }
    
    onActivate() {
        super.onActivate();
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select curves to convert');
            this.deactivate();
            return;
        }
        this.convert();
    }
    
    async convert() {
        const geo = await this.cad.loadAdvancedGeometry();
        const selected = Array.from(this.cad.selectedShapes);
        
        try {
            this.cad.recordState();
            
            for (const shape of selected) {
                if (shape.type === 'arc' || shape.type === 'circle' || 
                    shape.type === 'ellipse') {
                    
                    const polyline = geo.curveToPolyline(shape, this.options);
                    polyline.color = shape.color;
                    polyline.lineWidth = shape.lineWidth;
                    polyline.layerId = shape.layerId;
                    polyline.id = this.cad.generateId();
                    
                    this.cad.shapes.push(polyline);
                    this.cad.deleteShape(shape);
                }
            }
            
            this.cad.render();
            this.updateStatus('Conversion completed');
            
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}

/**
 * أداة Simplify Polyline
 */
export class SimplifyPolylineTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-project-diagram';
        this.polylines = [];
    }
    
    getDefaultOptions() {
        return {
            tolerance: 1.0
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'number',
                name: 'tolerance',
                label: 'Tolerance',
                value: this.options.tolerance,
                min: 0.1,
                max: 10,
                step: 0.1,
                onChange: (value) => {
                    this.options.tolerance = value;
                    this.updatePreview();
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        const selected = Array.from(this.cad.selectedShapes);
        const polylines = selected.filter(s => s.type === 'polyline');
        
        if (polylines.length === 0) {
            this.updateStatus('Select polylines to simplify');
            this.deactivate();
            return;
        }
        
        this.polylines = polylines;
        this.updatePreview();
    }
    
    async updatePreview() {
        const geo = await this.cad.loadAdvancedGeometry();
        const preview = [];
        
        for (const polyline of this.polylines) {
            const simplified = geo.simplifyPolyline(polyline, this.options.tolerance);
            simplified.color = '#00d4aa';
            simplified.lineType = 'dashed';
            preview.push(simplified);
        }
        
        this.showPreview(preview);
    }
    
    async apply() {
        const geo = await this.cad.loadAdvancedGeometry();
        
        try {
            this.cad.recordState();
            
            for (const polyline of this.polylines) {
                const simplified = geo.simplifyPolyline(polyline, this.options.tolerance);
                polyline.points = simplified.points;
            }
            
            this.cad.render();
            this.updateStatus('Simplification completed');
            
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}

/**
 * أداة Smooth Polyline
 */
export class SmoothPolylineTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-bezier-curve';
        this.polylines = [];
    }
    
    getDefaultOptions() {
        return {
            iterations: 2,
            factor: 0.5
        };
    }
    
    getUIOptions() {
        return [
            {
                type: 'number',
                name: 'iterations',
                label: 'Iterations',
                value: this.options.iterations,
                min: 1,
                max: 10,
                onChange: (value) => {
                    this.options.iterations = value;
                    this.updatePreview();
                }
            },
            {
                type: 'number',
                name: 'factor',
                label: 'Smoothing Factor',
                value: this.options.factor,
                min: 0.1,
                max: 0.9,
                step: 0.1,
                onChange: (value) => {
                    this.options.factor = value;
                    this.updatePreview();
                }
            }
        ];
    }
    
    onActivate() {
        super.onActivate();
        const selected = Array.from(this.cad.selectedShapes);
        const polylines = selected.filter(s => s.type === 'polyline');
        
        if (polylines.length === 0) {
            this.updateStatus('Select polylines to smooth');
            this.deactivate();
            return;
        }
        
        this.polylines = polylines;
        this.updatePreview();
    }
    
    async updatePreview() {
        const geo = await this.cad.loadAdvancedGeometry();
        const preview = [];
        
        for (const polyline of this.polylines) {
            const smoothed = geo.smoothPolyline(polyline, this.options);
            smoothed.color = '#00d4aa';
            smoothed.lineType = 'dashed';
            preview.push(smoothed);
        }
        
        this.showPreview(preview);
    }
    
    async apply() {
        const geo = await this.cad.loadAdvancedGeometry();
        
        try {
            this.cad.recordState();
            
            for (const polyline of this.polylines) {
                const smoothed = geo.smoothPolyline(polyline, this.options);
                polyline.points = smoothed.points;
            }
            
            this.cad.render();
            this.updateStatus('Smoothing completed');
            
        } catch (error) {
            this.handleError(error);
        }
        
        this.deactivate();
    }
}