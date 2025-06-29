// ==================== js/tools/modify/index.js ====================

/**
 * Modify Tools Module - Updated with Phase 1 Tools
 * أدوات التعديل - محدث مع أدوات المرحلة الأولى
 */

// Import existing tools
import { MoveTool } from './MoveTool.js';
import { CopyTool } from './CopyTool.js';
import { RotateTool } from './RotateTool.js';
import { ScaleTool } from './ScaleTool.js';
import { MirrorTool } from './MirrorTool.js';
import { TrimTool } from './TrimTool.js';
import { ExtendTool } from './ExtendTool.js';
import { OffsetTool } from './OffsetTool.js';

// 🆕 Import new Phase 1 tools
import { StretchTool } from './StretchTool.js';
import { BreakTool } from './BreakTool.js';
import { BreakAtPointTool } from './BreakAtPointTool.js';

// Direct export with all tools
export const tools = {
    // ✅ Existing tools (8 tools)
    'move': MoveTool,
    'copy': CopyTool,
    'rotate': RotateTool,
    'scale': ScaleTool,
    'mirror': MirrorTool,
    'trim': TrimTool,
    'extend': ExtendTool,
    'offset': OffsetTool,
    
    // 🆕 New Phase 1 tools (3 tools)
    'stretch': StretchTool,
    'break': BreakTool,
    'break-at-point': BreakAtPointTool
};

// Legacy compatibility export
export const modifyTools = tools;

// Debug info (disabled in production)
const DEBUG = false;
if (DEBUG) {
    console.log(`✅ Loaded ${Object.keys(tools).length} modify tools:`);
    console.log('  📦 Existing: move, copy, rotate, scale, mirror, trim, extend, offset');
    console.log('  🆕 Phase 1: stretch, break, break-at-point');
}

// Export individual tools for direct import
// Existing tools
export { MoveTool } from './MoveTool.js';
export { CopyTool } from './CopyTool.js';
export { RotateTool } from './RotateTool.js';
export { ScaleTool } from './ScaleTool.js';
export { MirrorTool } from './MirrorTool.js';
export { TrimTool } from './TrimTool.js';
export { ExtendTool } from './ExtendTool.js';
export { OffsetTool } from './OffsetTool.js';

// 🆕 New Phase 1 tools
export { StretchTool } from './StretchTool.js';
export { BreakTool } from './BreakTool.js';
export { BreakAtPointTool } from './BreakAtPointTool.js';

// 🚀 Phase 1 completion info
export const phase1Info = {
    completedDate: new Date().toISOString().split('T')[0],
    toolsAdded: ['stretch', 'break', 'break-at-point'],
    totalTools: Object.keys(tools).length,
    description: 'Added 3 new modify tools following CAD standards',
    features: [
        'Post-selection support (select first, then tool)',
        'Selection box support',
        'Live preview during operations',
        'Escape key cancellation',
        'Full layer compatibility',
        'Professional CAD behavior'
    ]
};

// Development utilities
export const getToolsInfo = () => ({
    total: Object.keys(tools).length,
    existing: 8,
    phase1: 3,
    categories: {
        transform: ['move', 'copy', 'rotate', 'scale', 'mirror'],
        edit: ['trim', 'extend', 'offset', 'stretch'],
        break: ['break', 'break-at-point']
    },
    shortcuts: {
        'move': 'M',
        'copy': 'C', 
        'rotate': 'R',
        'stretch': 'Shift+S',
        'break': 'B',
        'break-at-point': 'Shift+B'
    }
});

// Validation function
export const validateToolsIntegrity = () => {
    const issues = [];
    
    // Check all tools are properly imported
    Object.entries(tools).forEach(([name, ToolClass]) => {
        if (!ToolClass) {
            issues.push(`Tool '${name}' is undefined`);
        } else if (typeof ToolClass !== 'function') {
            issues.push(`Tool '${name}' is not a constructor function`);
        }
    });
    
    // Check required methods exist
    const requiredMethods = ['onActivate', 'onDeactivate', 'onClick'];
    Object.entries(tools).forEach(([name, ToolClass]) => {
        if (ToolClass && ToolClass.prototype) {
            requiredMethods.forEach(method => {
                if (typeof ToolClass.prototype[method] !== 'function') {
                    issues.push(`Tool '${name}' missing method '${method}'`);
                }
            });
        }
    });
    
    return {
        valid: issues.length === 0,
        issues: issues,
        totalTools: Object.keys(tools).length
    };
};

// Auto-validation in development
if (DEBUG) {
    const validation = validateToolsIntegrity();
    if (validation.valid) {
        console.log('✅ All modify tools validated successfully');
    } else {
        console.error('❌ Tool validation failed:', validation.issues);
    }
}