// ==================== js/tools/modify/TrimTool.js ====================

import { BaseTool } from '../BaseTool.js';

/**
 * أداة القص (Trim)
 */
export class TrimTool extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-cut';
        this.boundaries = [];
    }
    
    onActivate() {
        this.boundaries = [];
        this.updateStatus('Select cutting edge');
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!this.boundaries.length) {
            if (shape) {
                this.boundaries.push(shape);
                this.updateStatus('Select object to trim');
            }
        } else {
            if (shape && shape.type === 'line') {
                this.cad.recordState();
                
                for (const boundary of this.boundaries) {
                    if (boundary.type === 'line') {
                        const intersection = this.cad.geo.lineLineIntersection(
                            shape.start, shape.end,
                            boundary.start, boundary.end
                        );
                        
                        if (intersection) {
                            const dist1 = this.cad.distance(world.x, world.y, shape.start.x, shape.start.y);
                            const dist2 = this.cad.distance(world.x, world.y, shape.end.x, shape.end.y);
                            
                            if (dist1 < dist2) {
                                shape.end = intersection;
                            } else {
                                shape.start = intersection;
                            }
                            
                            this.cad.render();
                            break;
                        }
                    }
                }
                
                this.boundaries = [];
                this.updateStatus('TRIM: Select cutting edge');
            }
        }
    }
}
