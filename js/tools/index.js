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
export { ToolsManager };

// تصدير للاستخدام العام
window.Tools = toolsManager;

// معلومات النظام
console.log('📦 Tools system module loaded');

// دالة مساعدة لإعادة تحميل الأدوات (للتطوير)
export async function reloadTools() {
    console.log('🔄 Reloading tools...');
    await toolsManager.loadModularTools();
}

// تصدير معلومات للتطوير
export const ToolsInfo = {
    version: '3.0.0',
    getLoadedTools: () => toolsManager.getAvailableTools(),
    getSystemInfo: () => toolsManager.getSystemInfo(),
    reload: reloadTools
};