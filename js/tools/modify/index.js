// ==================== js/tools/modify/index.js ====================

/**
 * تصدير جميع أدوات التعديل
 */

export { MoveTool } from './MoveTool.js';
export { CopyTool } from './CopyTool.js';
export { RotateTool } from './RotateTool.js';
export { ScaleTool } from './ScaleTool.js';
export { MirrorTool } from './MirrorTool.js';
export { TrimTool } from './TrimTool.js';
export { ExtendTool } from './ExtendTool.js';
export { OffsetTool } from './OffsetTool.js';

// للاستخدام مع ToolsManager
export const modifyTools = {
    'move': MoveTool,
    'copy': CopyTool,
    'rotate': RotateTool,
    'scale': ScaleTool,
    'mirror': MirrorTool,
    'trim': TrimTool,
    'extend': ExtendTool,
    'offset': OffsetTool
};