/**
 * TyrexCAD Main Entry Point
 * النقطة الرئيسية لدخول التطبيق
 */

// تحميل Three.js من CDN
await import('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');

// تحميل المكتبات الأساسية بالترتيب الصحيح
await loadScript('js/lib/clipper.js');
await loadScript('js/lib/earcut.min.js');

// تحميل وحدات النظام الأساسية
await loadScript('js/core/Units.js');
await loadScript('js/core/Geometry.js');
await loadScript('js/geometry/GeometryAdvanced.js');

// تحميل UI
await loadScript('js/ui/UI.js');

// تحميل TyrexCAD Core
await loadScript('js/core/TyrexCAD.js');

/**
 * Helper function to load scripts dynamically
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // تحقق من تحميل الملف مسبقاً
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`✅ Loaded: ${src}`);
            resolve();
        };
        script.onerror = () => {
            console.error(`❌ Failed to load: ${src}`);
            reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(script);
    });
}

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Starting TyrexCAD initialization...');
        
        // انتظر قليلاً للتأكد من تحميل كل شيء
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if TyrexCAD is loaded
        if (!window.TyrexCAD) {
            throw new Error('TyrexCAD core library not loaded');
        }
        
        // Check other critical libraries
        if (!window.Geometry) {
            console.warn('⚠️ Geometry library not loaded');
        }
        
        // Units قد يكون بإسم مختلف
        if (!window.UnitsSystem && !window.Units) {
            console.warn('⚠️ Units library not loaded');
        }
        
        if (!window.UI) {
            console.warn('⚠️ UI library not loaded');
        }
        
        // Create CAD instance
        console.log('📐 Creating TyrexCAD instance...');
        const cad = new window.TyrexCAD();
        
        // Make it globally accessible
        window.cad = cad;
        
        // Wait for initialization
        if (cad.ready === false) {
            // انتظر حتى يكتمل التهيئة
            let attempts = 0;
            const checkReady = setInterval(() => {
                attempts++;
                if (cad.ready || attempts > 50) { // 5 seconds max
                    clearInterval(checkReady);
                    if (cad.ready) {
                        console.log('✅ TyrexCAD initialized successfully');
                        showWelcomeMessage();
                    } else {
                        console.error('❌ TyrexCAD initialization timeout');
                    }
                }
            }, 100);
        } else {
            console.log('✅ TyrexCAD initialized successfully');
            showWelcomeMessage();
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize TyrexCAD:', error);
        
        // عرض رسالة خطأ للمستخدم
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: #ff4444;">
                    <h2>Initialization Error</h2>
                    <p>Failed to load TyrexCAD</p>
                    <p style="font-size: 14px; opacity: 0.8;">${error.message}</p>
                    <button onclick="location.reload()" 
                            style="margin-top: 20px; padding: 10px 20px; 
                                   background: #00d4aa; border: none; 
                                   color: white; border-radius: 4px; 
                                   cursor: pointer;">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }
});

/**
 * Show welcome message
 */
function showWelcomeMessage() {
    setTimeout(() => {
        if (window.cad && window.cad.updateStatus) {
            window.cad.updateStatus('Welcome to TyrexCAD Professional v3.0 - Press F1 for help');
        }
        
        // تفعيل أداة Select بشكل افتراضي
        if (window.cad && window.cad.setTool) {
            window.cad.setTool('select');
        }
    }, 2000);
}

// Error handling for module loading
window.addEventListener('error', (event) => {
    if (event.filename && event.filename.includes('.js')) {
        console.error('❌ Module loading error:', event.message, 'in', event.filename);
        
        // محاولة استرداد الخطأ
        if (event.filename.includes('tools') && window.cad) {
            console.log('⚠️ Tools loading failed, using fallback...');
            // يمكن إضافة fallback tools هنا
        }
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    
    // لا نريد أن يتوقف التطبيق بسبب أخطاء الأدوات
    if (event.reason && event.reason.toString().includes('tools')) {
        event.preventDefault();
        console.log('⚠️ Continuing without advanced tools...');
    }
});

// Performance monitoring
let lastFrameTime = performance.now();
let frameCount = 0;

function updateFPS() {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - lastFrameTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastFrameTime));
        const fpsElement = document.getElementById('fps');
        if (fpsElement) {
            fpsElement.textContent = `${fps} FPS`;
        }
        frameCount = 0;
        lastFrameTime = currentTime;
    }
    
    requestAnimationFrame(updateFPS);
}

// Start FPS monitoring
updateFPS();

// Export for debugging
export const version = '3.0.0';
export const buildDate = new Date().toISOString();

console.log(`
╔══════════════════════════════════════╗
║     TyrexCAD Professional v3.0       ║
║     Build: ${buildDate.split('T')[0]}              ║
║     © 2024 Ibrahim                   ║
╚══════════════════════════════════════╝
`);