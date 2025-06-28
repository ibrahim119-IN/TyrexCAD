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

// تصدير مجموعة الأدوات
export const tools = {
    'move': await import('./MoveTool.js').then(m => m.MoveTool).catch(() => null),
    'copy': await import('./CopyTool.js').then(m => m.CopyTool).catch(() => null),
    'rotate': await import('./RotateTool.js').then(m => m.RotateTool).catch(() => null),
    'scale': await import('./ScaleTool.js').then(m => m.ScaleTool).catch(() => null),
    'mirror': await import('./MirrorTool.js').then(m => m.MirrorTool).catch(() => null),
    'trim': await import('./TrimTool.js').then(m => m.TrimTool).catch(() => null),
    'extend': await import('./ExtendTool.js').then(m => m.ExtendTool).catch(() => null),
    'offset': await import('./OffsetTool.js').then(m => m.OffsetTool).catch(() => null)
};

// إزالة الأدوات الفاشلة
Object.keys(tools).forEach(key => {
    if (!tools[key]) {
        delete tools[key];
        console.warn(`⚠️ Modify tool '${key}' failed to load`);
    }
});

// تصدير بالاسم القديم للتوافق
export const modifyTools = tools;

console.log(`✅ Loaded ${Object.keys(tools).length} modify tools`);