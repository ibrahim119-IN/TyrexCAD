// ################################################################
// الملف 3: js/tools/3d/index.js
// ################################################################
// ملف الفهرس لأدوات 3D

/**
 * 3D Tools Module
 * أدوات التحويل من 2D إلى 3D
 */

// Import all 3D tools
import { ExtrudeTool } from './ExtrudeTool.js';
// RevolveTool سيتم إضافته لاحقاً
// import { RevolveTool } from './RevolveTool.js';
// import { LoftTool } from './LoftTool.js';
// import { SweepTool } from './SweepTool.js';

// Direct export
export const tools = {
    'extrude': ExtrudeTool,
    // 'revolve': RevolveTool,
    // 'loft': LoftTool,
    // 'sweep': SweepTool
};

// تصدير للتوافق
export const tools3D = tools;

// معلومات التحميل
const DEBUG = true; // تشغيل في وضع التطوير
if (DEBUG) {
    console.log(`📦 3D Tools Module Loaded`);
    console.log(`✅ Available 3D tools: ${Object.keys(tools).join(', ')}`);
}

// تصدير الأدوات بشكل منفصل للاستيراد المباشر
export { ExtrudeTool } from './ExtrudeTool.js';
// export { RevolveTool } from './RevolveTool.js';

// معلومات عن الأدوات المتاحة
export const toolsInfo = {
    extrude: {
        name: 'Extrude',
        description: 'Convert 2D shapes to 3D by extruding them along Z-axis',
        icon: 'fa-arrow-up',
        supportedShapes: ['rectangle', 'circle', 'ellipse', 'polygon', 'polyline'],
        settings: ['depth', 'bevel', 'segments']
    },
    revolve: {
        name: 'Revolve',
        description: 'Create 3D shapes by revolving 2D profiles around an axis',
        icon: 'fa-sync',
        supportedShapes: ['line', 'polyline', 'rectangle'],
        settings: ['angle', 'segments', 'axis'],
        status: 'planned'
    },
    loft: {
        name: 'Loft',
        description: 'Create 3D shapes by connecting multiple 2D cross-sections',
        icon: 'fa-layer-group',
        supportedShapes: ['all'],
        settings: ['sections', 'interpolation', 'twist'],
        status: 'planned'
    },
    sweep: {
        name: 'Sweep',
        description: 'Create 3D shapes by sweeping a profile along a path',
        icon: 'fa-route',
        supportedShapes: ['all'],
        settings: ['path', 'scale', 'rotation'],
        status: 'planned'
    }
};

// دالة مساعدة للتحقق من توفر Three.js
export function check3DCapabilities() {
    const capabilities = {
        threejs: !!window.THREE,
        webgl: !!document.createElement('canvas').getContext('webgl'),
        shape3DConverter: false,
        extrudeGeometry: false,
        latheGeometry: false
    };
    
    if (window.THREE) {
        capabilities.extrudeGeometry = !!window.THREE.ExtrudeGeometry;
        capabilities.latheGeometry = !!window.THREE.LatheGeometry;
    }
    
    if (window.cad && window.cad.shape3DConverter) {
        capabilities.shape3DConverter = true;
    }
    
    return capabilities;
}

// دالة تهيئة أدوات 3D
export async function initialize3DTools(cad) {
    console.log('🚀 Initializing 3D tools...');
    
    // التحقق من المتطلبات
    const capabilities = check3DCapabilities();
    
    if (!capabilities.threejs) {
        console.error('❌ Three.js not found! 3D tools will not work.');
        return false;
    }
    
    if (!capabilities.webgl) {
        console.error('❌ WebGL not supported! 3D tools will not work.');
        return false;
    }
    
    // تهيئة محول الأشكال إذا لم يكن موجوداً
    if (!capabilities.shape3DConverter && cad.initializeShape3DConverter) {
        try {
            await cad.initializeShape3DConverter();
            console.log('✅ Shape3D Converter initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Shape3D Converter:', error);
            return false;
        }
    }
    
    console.log('✅ 3D tools ready');
    console.log('📊 Capabilities:', capabilities);
    
    return true;
}