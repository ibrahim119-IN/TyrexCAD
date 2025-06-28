// ==================== js/tools/modify/index.js ====================

/**
 * Modify Tools Module
 * أدوات التعديل
 */

// تصدير الأدوات بشكل منفصل
export { MoveTool } from './MoveTool.js';
export { CopyTool } from './CopyTool.js';
export { RotateTool } from './RotateTool.js';
export { ScaleTool } from './ScaleTool.js';
export { MirrorTool } from './MirrorTool.js';
export { TrimTool } from './TrimTool.js';
export { ExtendTool } from './ExtendTool.js';
export { OffsetTool } from './OffsetTool.js';

// دالة لتحميل الأدوات ديناميكياً
export async function loadModifyTools() {
    const tools = {};
    
    try {
        tools.move = (await import('./MoveTool.js')).MoveTool;
        tools.copy = (await import('./CopyTool.js')).CopyTool;
        tools.rotate = (await import('./RotateTool.js')).RotateTool;
        tools.scale = (await import('./ScaleTool.js')).ScaleTool;
        tools.mirror = (await import('./MirrorTool.js')).MirrorTool;
        tools.trim = (await import('./TrimTool.js')).TrimTool;
        tools.extend = (await import('./ExtendTool.js')).ExtendTool;
        tools.offset = (await import('./OffsetTool.js')).OffsetTool;
    } catch (error) {
        console.error('Error loading modify tools:', error);
    }
    
    // إزالة الأدوات الفاشلة
    Object.keys(tools).forEach(key => {
        if (!tools[key]) {
            delete tools[key];
            console.warn(`⚠️ Modify tool '${key}' failed to load`);
        }
    });
    
    console.log(`✅ Loaded ${Object.keys(tools).length} modify tools`);
    return tools;
}

// تصدير مجموعة الأدوات (متوافق مع الإصدار القديم)
export const tools = await loadModifyTools();

// تصدير بالاسم القديم للتوافق
export const modifyTools = tools;