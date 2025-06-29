// ==================== js/tools/drawing/RectangleTool.js ====================

import { DrawingToolBase } from '../BaseTool.js';

/**
 * أداة رسم المستطيل
 */
export class RectangleTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-square';
    }
    
    onActivate() {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return false;
        }
        
        super.onActivate();
        this.updateStatus('Specify first corner');
    }
    
    onClick(point) {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return;
        }
        
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.addPoint(point);
            
            if (this.cad.pendingShapeProperties && 
                this.cad.pendingShapeProperties.rectWidth > 0 && 
                this.cad.pendingShapeProperties.rectHeight > 0) {
                
                const width = this.cad.pendingShapeProperties.rectWidth;
                const height = this.cad.pendingShapeProperties.rectHeight;
                
                this.createRectangle(point, {
                    x: point.x + width,
                    y: point.y + height
                });
                
                this.finishDrawing();
                this.cad.pendingShapeProperties = null;
            } else {
                this.updateStatus('Specify opposite corner');
            }
        } else {
            this.createRectangle(this.drawingPoints[0], point);
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            // استخدام خصائص الطبقة الحالية للمعاينة
            const currentLayer = this.cad.layerManager?.getCurrentLayer();
            
            this.tempShape = {
                type: 'rectangle',
                start: this.drawingPoints[0],
                end: point,
                color: currentLayer?.color || this.cad.currentColor,
                lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
                lineType: currentLayer?.lineType || this.cad.currentLineType
            };
            this.cad.tempShape = this.tempShape;
        }
    }
    
    createRectangle(start, end) {
        const shape = this.createShape({
            type: 'rectangle',
            start: start,
            end: end
        });
        
        this.cad.addShape(shape);
        this.updateStatus('Rectangle created');
    }
}