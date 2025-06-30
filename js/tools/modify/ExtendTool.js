// ==================== js/tools/modify/ExtendTool.js ====================

import { BaseTool } from '../BaseTool.js';

/**
 * أداة التمديد (Extend)
 */
export class ExtendTool extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-expand';
        this.boundaries = [];
    }
    
    onActivate() {
        this.boundaries = [];
        this.updateStatus('Select boundary edge');
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const coords = this.cad.getMouseCoordinates();
const shape = this.cad.getShapeAtScreen(coords.screenX, coords.screenY);
        
        if (!this.boundaries.length) {
            if (shape) {
                this.boundaries.push(shape);
                this.updateStatus('Select object to extend');
            }
        } else {
            if (shape && shape.type === 'line') {
                this.cad.recordState();
                
                for (const boundary of this.boundaries) {
                    if (boundary.type === 'line') {
                        const dx = shape.end.x - shape.start.x;
                        const dy = shape.end.y - shape.start.y;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        
                        if (len > 0) {
                            const extendedEnd = {
                                x: shape.start.x + (dx / len) * 10000,
                                y: shape.start.y + (dy / len) * 10000
                            };
                            
                            const intersection = this.cad.geo.lineLineIntersection(
                                shape.start, extendedEnd,
                                boundary.start, boundary.end
                            );
                            
                            if (intersection) {
                                const dist1 = this.cad.distance(world.x, world.y, shape.start.x, shape.start.y);
                                const dist2 = this.cad.distance(world.x, world.y, shape.end.x, shape.end.y);
                                
                                if (dist2 < dist1) {
                                    shape.end = intersection;
                                } else {
                                    const extendedStart = {
                                        x: shape.end.x - (dx / len) * 10000,
                                        y: shape.end.y - (dy / len) * 10000
                                    };
                                    
                                    const intersection2 = this.cad.geo.lineLineIntersection(
                                        extendedStart, shape.end,
                                        boundary.start, boundary.end
                                    );
                                    
                                    if (intersection2) {
                                        shape.start = intersection2;
                                    }
                                }
                                
                                this.cad.render();
                                break;
                            }
                        }
                    }
                }
                
                this.boundaries = [];
                this.updateStatus('EXTEND: Select boundary edge');
            }
        }
    }
}