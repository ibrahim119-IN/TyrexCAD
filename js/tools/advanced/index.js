// ==================== js/tools/advanced/index.js ====================

/**
 * Advanced Tools Module
 * الأدوات المتقدمة
 */

// Import all tools statically
import { FilletTool } from './FilletTool.js';
import { ChamferTool } from './ChamferTool.js';
import { RectangularArrayTool, PolarArrayTool, PathArrayTool } from './ArrayTools.js';
import { UnionTool, DifferenceTool, IntersectionTool } from './BooleanTools.js';
import { DistanceAnalysisTool, AreaAnalysisTool, PropertiesAnalysisTool } from './AnalysisTools.js';
import { ConvertToPolylineTool, SimplifyPolylineTool, SmoothPolylineTool } from './CurvesTools.js';

// Direct export
export const tools = {
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

// تصدير بالاسم القديم للتوافق
export const advancedTools = tools;

// Remove console.log in production
const DEBUG = false;
DEBUG && console.log(`✅ Loaded ${Object.keys(tools).length} advanced tools`);

// تصدير الأدوات بشكل منفصل
export { FilletTool } from './FilletTool.js';
export { ChamferTool } from './ChamferTool.js';
export { RectangularArrayTool, PolarArrayTool, PathArrayTool } from './ArrayTools.js';
export { UnionTool, DifferenceTool, IntersectionTool } from './BooleanTools.js';
export { DistanceAnalysisTool, AreaAnalysisTool, PropertiesAnalysisTool } from './AnalysisTools.js';
export { ConvertToPolylineTool, SimplifyPolylineTool, SmoothPolylineTool } from './CurvesTools.js';