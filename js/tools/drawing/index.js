// ==================== js/tools/drawing/index.js ====================

/**
 * Drawing Tools Module
 * أدوات الرسم الأساسية
 */

// تصدير الأدوات بشكل منفصل (للاستيراد المباشر)
export { LineTool } from './LineTool.js';
export { PolylineTool } from './PolylineTool.js';
export { RectangleTool } from './RectangleTool.js';
export { CircleTool } from './CircleTool.js';
export { ArcTool } from './ArcTool.js';
export { EllipseTool } from './EllipseTool.js';
export { PolygonTool } from './PolygonTool.js';
export { TextTool } from './TextTool.js';

// تصدير مجموعة الأدوات (للاستخدام مع ToolsManager)
export const tools = {
    'line': await import('./LineTool.js').then(m => m.LineTool).catch(() => null),
    'polyline': await import('./PolylineTool.js').then(m => m.PolylineTool).catch(() => null),
    'rectangle': await import('./RectangleTool.js').then(m => m.RectangleTool).catch(() => null),
    'circle': await import('./CircleTool.js').then(m => m.CircleTool).catch(() => null),
    'arc': await import('./ArcTool.js').then(m => m.ArcTool).catch(() => null),
    'ellipse': await import('./EllipseTool.js').then(m => m.EllipseTool).catch(() => null),
    'polygon': await import('./PolygonTool.js').then(m => m.PolygonTool).catch(() => null),
    'text': await import('./TextTool.js').then(m => m.TextTool).catch(() => null)
};

// إزالة الأدوات الفاشلة
Object.keys(tools).forEach(key => {
    if (!tools[key]) {
        delete tools[key];
        console.warn(`⚠️ Drawing tool '${key}' failed to load`);
    }
});

// تصدير بالاسم القديم للتوافق
export const drawingTools = tools;

console.log(`✅ Loaded ${Object.keys(tools).length} drawing tools`);