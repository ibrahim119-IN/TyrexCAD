// ==================== js/tools/advanced/AnalysisTools.js ====================

import { AdvancedToolBase } from '../BaseTool.js';

/**
 * أداة Distance Analysis
 */
export class DistanceAnalysisTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-ruler';
        this.shapes = [];
    }
    
    onActivate() {
        super.onActivate();
        this.shapes = [];
        this.updateStatus('Select first shape');
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const coords = this.cad.getMouseCoordinates();
        const shape = this.cad.getShapeAtScreen(coords.screenX, coords.screenY);
        
        if (!shape) return;
        
        if (this.shapes.length === 0) {
            this.shapes.push(shape);
            this.updateStatus('Select second shape');
        } else {
            this.analyzeDistance(this.shapes[0], shape);
        }
    }
    
    async analyzeDistance(shape1, shape2) {
        const geo = await this.cad.loadAdvancedGeometry();
        
        try {
            const result = geo.calculateDistance(shape1, shape2);
            
            // عرض النتائج في UI
            if (this.cad.ui) {
                this.cad.ui.showAnalysisResult({
                    type: 'distance',
                    distance: result.distance,
                    point1: result.point1,
                    point2: result.point2,
                    dx: result.point2.x - result.point1.x,
                    dy: result.point2.y - result.point1.y
                });
            }
            
            // رسم خط القياس
            const dimension = {
                type: 'dimension-linear',
                start: result.point1,
                end: result.point2,
                offset: 20,
                text: this.cad.formatValue(result.distance),
                color: '#ff0099',
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
            
            this.cad.addShape(dimension);
            
        } catch (error) {
            this.handleError(error);
        }
    }
}

/**
 * أداة Area Analysis
 */
export class AreaAnalysisTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-vector-square';
    }
    
    onActivate() {
        super.onActivate();
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select shapes to analyze');
            this.deactivate();
            return;
        }
        this.analyzeArea();
    }
    
    async analyzeArea() {
        const geo = await this.cad.loadAdvancedGeometry();
        const selected = Array.from(this.cad.selectedShapes);
        
        try {
            let totalArea = 0;
            const details = [];
            
            for (const shape of selected) {
                const area = geo.calculateArea(shape);
                totalArea += area;
                details.push({
                    type: shape.type,
                    area: area
                });
            }
            
            // عرض النتائج في UI
            if (this.cad.ui) {
                this.cad.ui.showAnalysisResult({
                    type: 'area',
                    totalArea: totalArea,
                    details: details
                });
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }
}

/**
 * أداة Properties Analysis
 */
export class PropertiesAnalysisTool extends AdvancedToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-info-circle';
    }
    
    onActivate() {
        super.onActivate();
        if (this.cad.selectedShapes.size !== 1) {
            this.updateStatus('Select exactly 1 shape');
            this.deactivate();
            return;
        }
        this.analyzeProperties();
    }
    
    async analyzeProperties() {
        const geo = await this.cad.loadAdvancedGeometry();
        const shape = Array.from(this.cad.selectedShapes)[0];
        
        try {
            const props = geo.getShapeProperties(shape);
            
            // عرض النتائج في UI
            if (this.cad.ui) {
                this.cad.ui.showAnalysisResult({
                    type: 'properties',
                    shape: shape,
                    properties: props
                });
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }
}