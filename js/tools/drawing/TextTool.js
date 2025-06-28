// ==================== js/tools/drawing/TextTool.js ====================

import { DrawingToolBase } from '../BaseTool.js';

/**
 * أداة إضافة النص
 */
export class TextTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-text';
    }
    
    onClick(point) {
        if (this.cad.ui) {
            this.cad.ui.showTextDialog((text) => {
                if (text) {
                    const shape = this.createShape({
                        type: 'text',
                        position: point,
                        text: text,
                        fontSize: 16
                    });
                    
                    this.cad.addShape(shape);
                }
            });
        }
    }
}