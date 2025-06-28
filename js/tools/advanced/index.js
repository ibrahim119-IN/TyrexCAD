// ==================== js/tools/advanced/index.js ====================

/**
 * تصدير جميع الأدوات المتقدمة
 */

export { FilletTool } from './FilletTool.js';
export { ChamferTool } from './ChamferTool.js';
export { RectangularArrayTool, PolarArrayTool, PathArrayTool } from './ArrayTools.js';
export { UnionTool, DifferenceTool, IntersectionTool } from './BooleanTools.js';
export { DistanceAnalysisTool, AreaAnalysisTool, PropertiesAnalysisTool } from './AnalysisTools.js';
export { ConvertToPolylineTool, SimplifyPolylineTool, SmoothPolylineTool } from './CurvesTools.js';

// للاستخدام مع ToolsManager
export const advancedTools = {
    'fillet': FilletTool,
    'chamfer': ChamferTool,
    'rectangular-array': RectangularArrayTool,
    'polar-array': PolarArrayTool,
    'path-array': PathArrayTool,
    'union': UnionTool,
    'difference': DifferenceTool,
    'intersection': IntersectionTool,
    'distance-analysis': DistanceAnalysisTool,
    'area-analysis': AreaAnalysisTool,
    'properties-analysis': PropertiesAnalysisTool,
    'convert-to-polyline': ConvertToPolylineTool,
    'simplify-polyline': SimplifyPolylineTool,
    'smooth-polyline': SmoothPolylineTool
};