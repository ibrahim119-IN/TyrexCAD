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

// دالة لتحميل الأدوات بشكل ديناميكي
export async function loadDrawingTools() {
    const tools = {};
    
    try {
        tools.line = (await import('./LineTool.js')).LineTool;
        tools.polyline = (await import('./PolylineTool.js')).PolylineTool;
        tools.rectangle = (await import('./RectangleTool.js')).RectangleTool;
        tools.circle = (await import('./CircleTool.js')).CircleTool;
        tools.arc = (await import('./ArcTool.js')).ArcTool;
        tools.ellipse = (await import('./EllipseTool.js')).EllipseTool;
        tools.polygon = (await import('./PolygonTool.js')).PolygonTool;
        tools.text = (await import('./TextTool.js')).TextTool;
    } catch (error) {
        console.error('Error loading drawing tools:', error);
    }
    
    return tools;
}

// تصدير مجموعة الأدوات (متوافق مع الإصدار القديم)
export const tools = await loadDrawingTools();

// تصدير بالاسم القديم للتوافق
export const drawingTools = tools;

console.log(`✅ Loaded ${Object.keys(tools).length} drawing tools`);