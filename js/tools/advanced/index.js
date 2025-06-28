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

// دالة لتحميل الأدوات ديناميكياً
export async function loadAdvancedTools() {
    const tools = {};
    
    try {
        tools.fillet = (await import('./FilletTool.js')).FilletTool;
        tools.chamfer = (await import('./ChamferTool.js')).ChamferTool;
        
        const arrayTools = await import('./ArrayTools.js');
        tools['rectangular-array'] = arrayTools.RectangularArrayTool;
        tools['polar-array'] = arrayTools.PolarArrayTool;
        tools['path-array'] = arrayTools.PathArrayTool;
        
        const booleanTools = await import('./BooleanTools.js');
        tools.union = booleanTools.UnionTool;
        tools.difference = booleanTools.DifferenceTool;
        tools.intersection = booleanTools.IntersectionTool;
        
        const analysisTools = await import('./AnalysisTools.js');
        tools['distance-analysis'] = analysisTools.DistanceAnalysisTool;
        tools['area-analysis'] = analysisTools.AreaAnalysisTool;
        tools['properties-analysis'] = analysisTools.PropertiesAnalysisTool;
        
        const curvesTools = await import('./CurvesTools.js');
        tools['convert-to-polyline'] = curvesTools.ConvertToPolylineTool;
        tools['simplify-polyline'] = curvesTools.SimplifyPolylineTool;
        tools['smooth-polyline'] = curvesTools.SmoothPolylineTool;
    } catch (error) {
        console.error('Error loading advanced tools:', error);
    }
    
    // إزالة الأدوات الفاشلة
    Object.keys(tools).forEach(key => {
        if (!tools[key]) {
            delete tools[key];
            console.warn(`⚠️ Advanced tool '${key}' failed to load`);
        }
    });
    
    console.log(`✅ Loaded ${Object.keys(tools).length} advanced tools`);
    return tools;
}

// تصدير مجموعة الأدوات (متوافق مع الإصدار القديم)
export const tools = await loadAdvancedTools();

// تصدير بالاسم القديم للتوافق
export const advancedTools = tools;