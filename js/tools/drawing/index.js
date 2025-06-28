// ==================== js/tools/drawing/index.js ====================

/**
 * تصدير جميع أدوات الرسم
 */

export { LineTool } from './LineTool.js';
export { PolylineTool } from './PolylineTool.js';
export { RectangleTool } from './RectangleTool.js';
export { CircleTool } from './CircleTool.js';
export { ArcTool } from './ArcTool.js';
export { EllipseTool } from './EllipseTool.js';
export { PolygonTool } from './PolygonTool.js';
export { TextTool } from './TextTool.js';

// للاستخدام مع ToolsManager
export const drawingTools = {
    'line': LineTool,
    'polyline': PolylineTool,
    'rectangle': RectangleTool,
    'circle': CircleTool,
    'arc': ArcTool,
    'ellipse': EllipseTool,
    'polygon': PolygonTool,
    'text': TextTool
};