// ==================== js/tools/drawing/index.js ====================

/**
 * Drawing Tools Module
 * أدوات الرسم الأساسية
 */

// Import all tools statically
import { LineTool } from './LineTool.js';
import { PolylineTool } from './PolylineTool.js';
import { RectangleTool } from './RectangleTool.js';
import { CircleTool } from './CircleTool.js';
import { ArcTool } from './ArcTool.js';
import { EllipseTool } from './EllipseTool.js';
import { PolygonTool } from './PolygonTool.js';
import { TextTool } from './TextTool.js';

// Direct export - no dynamic loading
export const tools = {
    'line': LineTool,
    'polyline': PolylineTool,
    'rectangle': RectangleTool,
    'circle': CircleTool,
    'arc': ArcTool,
    'ellipse': EllipseTool,
    'polygon': PolygonTool,
    'text': TextTool
};

// تصدير بالاسم القديم للتوافق
export const drawingTools = tools;

// Remove console.log in production
const DEBUG = false;
DEBUG && console.log(`✅ Loaded ${Object.keys(tools).length} drawing tools`);

// تصدير الأدوات بشكل منفصل (للاستيراد المباشر)
export { LineTool } from './LineTool.js';
export { PolylineTool } from './PolylineTool.js';
export { RectangleTool } from './RectangleTool.js';
export { CircleTool } from './CircleTool.js';
export { ArcTool } from './ArcTool.js';
export { EllipseTool } from './EllipseTool.js';
export { PolygonTool } from './PolygonTool.js';
export { TextTool } from './TextTool.js';