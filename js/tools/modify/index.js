// ==================== js/tools/modify/index.js ====================

/**
 * Modify Tools Module
 * أدوات التعديل
 */

// Import all tools statically
import { MoveTool } from './MoveTool.js';
import { CopyTool } from './CopyTool.js';
import { RotateTool } from './RotateTool.js';
import { ScaleTool } from './ScaleTool.js';
import { MirrorTool } from './MirrorTool.js';
import { TrimTool } from './TrimTool.js';
import { ExtendTool } from './ExtendTool.js';
import { OffsetTool } from './OffsetTool.js';

// Direct export
export const tools = {
    'move': MoveTool,
    'copy': CopyTool,
    'rotate': RotateTool,
    'scale': ScaleTool,
    'mirror': MirrorTool,
    'trim': TrimTool,
    'extend': ExtendTool,
    'offset': OffsetTool
};

// تصدير بالاسم القديم للتوافق
export const modifyTools = tools;

// Remove console.log in production
const DEBUG = false;
DEBUG && console.log(`✅ Loaded ${Object.keys(tools).length} modify tools`);

// تصدير الأدوات بشكل منفصل
export { MoveTool } from './MoveTool.js';
export { CopyTool } from './CopyTool.js';
export { RotateTool } from './RotateTool.js';
export { ScaleTool } from './ScaleTool.js';
export { MirrorTool } from './MirrorTool.js';
export { TrimTool } from './TrimTool.js';
export { ExtendTool } from './ExtendTool.js';
export { OffsetTool } from './OffsetTool.js';