// ==================== js/tools/index.js ====================

/**
 * TyrexCAD Tools System Entry Point
 * نقطة الدخول الرئيسية لنظام الأدوات
 */

import { ToolsManager } from './ToolsManager.js';

// إنشاء instance واحد من مدير الأدوات
const toolsManager = new ToolsManager();

// تصدير كـ singleton
export const Tools = toolsManager;

// تصدير للاستخدام العام
window.Tools = toolsManager;