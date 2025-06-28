// js/app.js - Entry Point للنظام المعياري
// TyrexCAD Professional v3.0

import { ToolsManager } from './tools/ToolsManager.js';

/**
 * دالة التهيئة الرئيسية للتطبيق
 */
export async function initializeApp() {
    try {
        console.log('🚀 Starting TyrexCAD initialization...');
        
        // انتظر قليلاً للتأكد من تحميل كل الـ scripts العادية
        await waitForDependencies();
        
        // إنشاء CAD instance
        console.log('📐 Creating TyrexCAD instance...');
        const cad = new window.TyrexCAD();
        
        // تعيين globally للتوافق مع الكود القديم
        window.cad = cad;
        
        // تحميل وتهيئة نظام الأدوات المعياري
        console.log('🔧 Loading modular tools system...');
        const toolsManager = new ToolsManager();
        await toolsManager.init(cad);
        
        // ربط مدير الأدوات بـ CAD
        cad.toolsManager = toolsManager;
        
        // تحسين وظائف CAD للعمل مع النظام الجديد
        enhanceCADFunctions(cad);
        
        // تهيئة اختصارات لوحة المفاتيح
        setupKeyboardShortcuts(cad);
        
        // تهيئة معالجات إضافية
        setupAdditionalHandlers(cad);
        
        // إظهار رسالة النجاح
        showSuccessMessage();
        
        // إخفاء شاشة التحميل
        hideLoadingScreen();
        
        // رسالة ترحيب
        if (cad.updateStatus) {
            setTimeout(() => {
                cad.updateStatus('Welcome to TyrexCAD Professional v3.0 - Press F1 for help');
            }, 1000);
        }
        
        // تصدير للـ debugging والتطوير
        window.TyrexCADDebug = {
            cad: cad,
            toolsManager: toolsManager,
            tools: toolsManager.tools,
            version: '3.0.0',
            buildDate: new Date().toISOString(),
            
            // دوال مساعدة للتطوير
            listTools: () => {
                console.table(Array.from(toolsManager.tools.keys()));
            },
            
            getTool: (name) => {
                return toolsManager.tools.get(name);
            },
            
            reloadTools: async () => {
                await toolsManager.loadTools();
                console.log('Tools reloaded');
            }
        };
        
        console.log('✅ TyrexCAD initialized successfully!');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showErrorScreen(error);
    }
}

/**
 * انتظار تحميل كل المكونات المطلوبة
 */
async function waitForDependencies() {
    const maxAttempts = 50; // 5 ثواني maximum
    let attempts = 0;
    
    const requirements = [
        { name: 'THREE', check: () => window.THREE },
        { name: 'Geometry', check: () => window.Geometry },
        { name: 'UI', check: () => window.UI },
        { name: 'TyrexCAD', check: () => window.TyrexCAD }
    ];
    
    while (attempts < maxAttempts) {
        let allLoaded = true;
        
        for (const req of requirements) {
            if (!req.check()) {
                allLoaded = false;
                console.log(`⏳ Waiting for ${req.name}...`);
                break;
            }
        }
        
        if (allLoaded) {
            // تحقق نهائي
            for (const req of requirements) {
                console.log(`✅ ${req.name} loaded`);
            }
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    // إذا فشل التحميل
    const missing = requirements
        .filter(req => !req.check())
        .map(req => req.name);
    
    throw new Error(`Failed to load required components: ${missing.join(', ')}`);
}

/**
 * تحسين وظائف CAD للعمل مع النظام المعياري
 */
function enhanceCADFunctions(cad) {
    // حفظ الدوال الأصلية
    const originalFunctions = {
        setTool: cad.setTool ? cad.setTool.bind(cad) : null,
        handleDrawing: cad.handleDrawing ? cad.handleDrawing.bind(cad) : null,
        updateDrawingPreview: cad.updateDrawingPreview ? cad.updateDrawingPreview.bind(cad) : null
    };
    
    // Override دالة setTool
    cad.setTool = function(toolName) {
        console.log(`🔧 Setting tool: ${toolName}`);
        
        // تحديث الحالة
        this.currentTool = toolName;
        
        // إلغاء أي عمليات جارية
        this.cancelCurrentOperation();
        
        // محاولة تفعيل الأداة من النظام الجديد
        if (this.toolsManager) {
            const activated = this.toolsManager.activateTool(toolName);
            
            if (activated) {
                // نجح التفعيل
                this.updateStatus(`${toolName.toUpperCase()} tool activated`);
                document.getElementById('statusTool').textContent = toolName.toUpperCase();
                
                // تحديث UI
                this.updateToolUI(toolName);
            } else {
                // فشل التفعيل - استخدم النظام القديم
                console.warn(`Tool ${toolName} not found in new system, trying legacy...`);
                
                if (originalFunctions.setTool) {
                    originalFunctions.setTool.call(this, toolName);
                } else {
                    console.error(`Tool ${toolName} not found`);
                    this.updateStatus(`Tool ${toolName} not available`);
                }
            }
        } else if (originalFunctions.setTool) {
            // لا يوجد toolsManager - استخدم النظام القديم
            originalFunctions.setTool.call(this, toolName);
        }
    };
    
    // Override معالج الرسم
    cad.handleDrawing = function(point) {
        if (this.toolsManager && this.toolsManager.activeTool) {
            // استخدم النظام الجديد
            this.toolsManager.activeTool.onMouseDown(point);
        } else if (originalFunctions.handleDrawing) {
            // استخدم النظام القديم
            originalFunctions.handleDrawing.call(this, point);
        } else {
            // معالج افتراضي
            console.warn('No drawing handler available');
        }
    };
    
    // Override معالج المعاينة
    cad.updateDrawingPreview = function() {
        if (this.toolsManager && this.toolsManager.activeTool && this.isDrawing) {
            // حساب النقطة الحالية
            const world = this.screenToWorld(this.mouseX, this.mouseY);
            const snapPoint = this.getSnapPoint(world.x, world.y);
            
            // استدعاء معالج الأداة
            if (this.toolsManager.activeTool.onMouseMove) {
                this.toolsManager.activeTool.onMouseMove(snapPoint);
            }
        } else if (originalFunctions.updateDrawingPreview) {
            // استخدم النظام القديم
            originalFunctions.updateDrawingPreview.call(this);
        }
    };
    
    // إضافة دالة مساعدة لتحديث UI
    cad.updateToolUI = function(toolName) {
        // إزالة active من كل الأدوات
        document.querySelectorAll('.ribbon-tool').forEach(el => {
            el.classList.remove('active');
        });
        
        // إضافة active للأداة الحالية
        document.querySelectorAll('.ribbon-tool').forEach(el => {
            if (el.onclick && el.onclick.toString().includes(`'${toolName}'`)) {
                el.classList.add('active');
            }
        });
    };
    
    // معالج الأحداث للـ keyboard في الأدوات
    const originalOnKeyDown = cad.onKeyDown ? cad.onKeyDown.bind(cad) : null;
    cad.onKeyDown = function(e) {
        // أولاً، دع الأداة النشطة تعالج الحدث
        if (this.toolsManager && this.toolsManager.activeTool) {
            if (this.toolsManager.activeTool.onKeyDown) {
                this.toolsManager.activeTool.onKeyDown(e);
                
                // إذا تم إلغاء الحدث، توقف
                if (e.defaultPrevented) {
                    return;
                }
            }
        }
        
        // ثم استخدم المعالج الأصلي
        if (originalOnKeyDown) {
            originalOnKeyDown.call(this, e);
        }
    };
}

/**
 * إعداد اختصارات لوحة المفاتيح الإضافية
 */
function setupKeyboardShortcuts(cad) {
    // اختصارات سريعة للأدوات
    const toolShortcuts = {
        'l': 'line',
        'c': 'circle',
        'r': 'rectangle',
        'p': 'polyline',
        'a': 'arc',
        'e': 'ellipse',
        't': 'text',
        'm': 'move',
        'o': 'copy',
        's': 'scale',
        'd': 'dimension'
    };
    
    // إضافة معالج للاختصارات
    document.addEventListener('keypress', (e) => {
        // تجاهل إذا كان في حقل إدخال
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const key = e.key.toLowerCase();
        if (toolShortcuts[key] && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            cad.setTool(toolShortcuts[key]);
        }
    });
}

/**
 * إعداد معالجات إضافية
 */
function setupAdditionalHandlers(cad) {
    // معالج لتغيير حجم النافذة
    window.addEventListener('resize', () => {
        if (cad.resizeCanvas) {
            cad.resizeCanvas();
        }
    });
    
    // معالج للأخطاء غير المتوقعة
    window.addEventListener('error', (event) => {
        if (event.filename && event.filename.includes('tools/')) {
            console.error('Tool loading error:', event.message);
            // لا نوقف التطبيق بسبب خطأ في أداة واحدة
            event.preventDefault();
        }
    });
    
    // معالج لـ promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        
        // إذا كان متعلق بتحميل أداة
        if (event.reason && event.reason.message && event.reason.message.includes('import')) {
            console.warn('Tool import failed, continuing with available tools');
            event.preventDefault();
        }
    });
}

/**
 * إظهار رسالة النجاح
 */
function showSuccessMessage() {
    console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║      TyrexCAD Professional v3.0           ║
║      ─────────────────────────           ║
║                                           ║
║      Build Date: ${new Date().toISOString().split('T')[0]}              ║
║      © 2024 Ibrahim                       ║
║                                           ║
║      Status: ✅ Ready                     ║
║                                           ║
╚═══════════════════════════════════════════╝
    `);
}

/**
 * إخفاء شاشة التحميل
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        // تأثير التلاشي
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        loadingScreen.style.opacity = '0';
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

/**
 * عرض شاشة الخطأ
 */
function showErrorScreen(error) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div style="text-align: center; color: #ff4444; padding: 20px; max-width: 800px; margin: 0 auto;">
                <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
                <h2 style="margin-bottom: 20px;">Initialization Error</h2>
                <p style="font-size: 18px; margin-bottom: 30px;">
                    Failed to start TyrexCAD Professional
                </p>
                
                <div style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 8px; 
                            text-align: left; margin-bottom: 30px;">
                    <p style="color: #ff6666; margin-bottom: 10px;">
                        <strong>Error:</strong> ${error.message}
                    </p>
                    
                    ${error.stack ? `
                    <details style="margin-top: 15px;">
                        <summary style="cursor: pointer; color: #999;">
                            Technical Details
                        </summary>
                        <pre style="color: #777; font-size: 12px; margin-top: 10px; 
                                    overflow-x: auto; white-space: pre-wrap;">
${error.stack}
                        </pre>
                    </details>
                    ` : ''}
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="location.reload()" 
                            style="padding: 12px 30px; background: #00d4aa; 
                                   border: none; color: white; border-radius: 6px; 
                                   cursor: pointer; font-size: 16px;
                                   transition: background 0.3s;">
                        <i class="fas fa-redo"></i> Reload Page
                    </button>
                    
                    <button onclick="window.TyrexCADDebug && console.log(window.TyrexCADDebug)" 
                            style="padding: 12px 30px; background: #666; 
                                   border: none; color: white; border-radius: 6px; 
                                   cursor: pointer; font-size: 16px;">
                        <i class="fas fa-bug"></i> Debug Info
                    </button>
                </div>
            </div>
        `;
    }
}

// تصدير للمعلومات
export const version = '3.0.0';
export const buildDate = new Date().toISOString();

// لا نبدأ التهيئة تلقائياً - سيتم استدعاؤها من index.html
console.log('📦 App module loaded, waiting for initialization call...');