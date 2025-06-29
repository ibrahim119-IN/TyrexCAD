// ==================== js/tools/drawing/ArcTool.js ====================

import { DrawingToolBase } from '../BaseTool.js';

/**
 * أداة رسم القوس
 */
export class ArcTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-curve';
    }
    
    onActivate() {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return false;
        }
        
        super.onActivate();
        this.updateStatus('Specify first point');
    }
    
    onClick(point) {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return;
        }
        
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            this.updateStatus('Specify second point');
        } else if (this.drawingPoints.length === 1) {
            this.addPoint(point);
            this.updateStatus('Specify end point');
        } else {
            const arc = this.cad.geo.calculateArcFrom3Points(
                this.drawingPoints[0],
                this.drawingPoints[1],
                point
            );
            
            if (arc) {
                const shape = this.createShape({
                    type: 'arc',
                    center: arc.center,
                    radius: arc.radius,
                    startAngle: arc.startAngle,
                    endAngle: arc.endAngle
                });
                
                this.cad.addShape(shape);
                this.updateStatus('Arc created');
            }
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length === 2) {
            const arc = this.cad.geo.calculateArcFrom3Points(
                this.drawingPoints[0],
                this.drawingPoints[1],
                point
            );
            
            if (arc) {
                // استخدام خصائص الطبقة الحالية للمعاينة
                const currentLayer = this.cad.layerManager?.getCurrentLayer();
                
                this.tempShape = {
                    type: 'arc',
                    center: arc.center,
                    radius: arc.radius,
                    startAngle: arc.startAngle,
                    endAngle: arc.endAngle,
                    color: currentLayer?.color || this.cad.currentColor,
                    lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
                    lineType: currentLayer?.lineType || this.cad.currentLineType
                };
                this.cad.tempShape = this.tempShape;
            }
        }
    }
}