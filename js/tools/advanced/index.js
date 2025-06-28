
// ==================== js/tools/advanced/index.js ====================

/**
 * Advanced Tools Module
 * الأدوات المتقدمة
 */

// تصدير الأدوات بشكل منفصل
export { FilletTool } from './FilletTool.js';
export { ChamferTool } from './ChamferTool.js';
export { RectangularArrayTool, PolarArrayTool, PathArrayTool } from './ArrayTools.js';
export { UnionTool, DifferenceTool, IntersectionTool } from './BooleanTools.js';
export { DistanceAnalysisTool, AreaAnalysisTool, PropertiesAnalysisTool } from './AnalysisTools.js';
export { ConvertToPolylineTool, SimplifyPolylineTool, SmoothPolylineTool } from './CurvesTools.js';

// تصدير مجموعة الأدوات
export const tools = {
    'fillet': await import('./FilletTool.js').then(m => m.FilletTool).catch(() => null),
    'chamfer': await import('./ChamferTool.js').then(m => m.ChamferTool).catch(() => null),
    'rectangular-array': await import('./ArrayTools.js').then(m => m.RectangularArrayTool).catch(() => null),
    'polar-array': await import('./ArrayTools.js').then(m => m.PolarArrayTool).catch(() => null),
    'path-array': await import('./ArrayTools.js').then(m => m.PathArrayTool).catch(() => null),
    'union': await import('./BooleanTools.js').then(m => m.UnionTool).catch(() => null),
    'difference': await import('./BooleanTools.js').then(m => m.DifferenceTool).catch(() => null),
    'intersection': await import('./BooleanTools.js').then(m => m.IntersectionTool).catch(() => null),
    'distance-analysis': await import('./AnalysisTools.js').then(m => m.DistanceAnalysisTool).catch(() => null),
    'area-analysis': await import('./AnalysisTools.js').then(m => m.AreaAnalysisTool).catch(() => null),
    'properties-analysis': await import('./AnalysisTools.js').then(m => m.PropertiesAnalysisTool).catch(() => null),
    'convert-to-polyline': await import('./CurvesTools.js').then(m => m.ConvertToPolylineTool).catch(() => null),
    'simplify-polyline': await import('./CurvesTools.js').then(m => m.SimplifyPolylineTool).catch(() => null),
    'smooth-polyline': await import('./CurvesTools.js').then(m => m.SmoothPolylineTool).catch(() => null)
};

// إزالة الأدوات الفاشلة
Object.keys(tools).forEach(key => {
    if (!tools[key]) {
        delete tools[key];
        console.warn(`⚠️ Advanced tool '${key}' failed to load`);
    }
});

// تصدير بالاسم القديم للتوافق
export const advancedTools = tools;

console.log(`✅ Loaded ${Object.keys(tools).length} advanced tools`);