/**
 * TyrexCAD Main Entry Point
 * النقطة الرئيسية لدخول التطبيق
 */

// Wait for DOM and all scripts to be ready
window.addEventListener('load', async () => {
    try {
        // Check if TyrexCAD is loaded
        if (!window.TyrexCAD) {
            throw new Error('TyrexCAD core library not loaded');
        }
        
        // Create CAD instance
        console.log('Initializing TyrexCAD...');
        
        // Initialize CAD
        const cad = new window.TyrexCAD();
        
        // Make it globally accessible for legacy code
        window.cad = cad;
        
        console.log('TyrexCAD initialized successfully');
        
        // إظهار رسالة ترحيب
        setTimeout(() => {
            if (cad.updateStatus) {
                cad.updateStatus('Welcome to TyrexCAD Professional v3.0 - Press F1 for help');
            }
        }, 2000);
        
    } catch (error) {
        console.error('Failed to initialize TyrexCAD:', error);
        
        // عرض رسالة خطأ للمستخدم
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: #ff4444;">
                    <h2>Initialization Error</h2>
                    <p>Failed to load TyrexCAD</p>
                    <p style="font-size: 14px; opacity: 0.8;">${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: var(--accent-primary); border: none; color: white; border-radius: 4px; cursor: pointer;">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }
});

// Error handling for module loading
window.addEventListener('error', (event) => {
    if (event.filename && event.filename.includes('.js')) {
        console.error('Module loading error:', event.message, 'in', event.filename);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Export for debugging
export const version = '3.0.0';
export const buildDate = new Date().toISOString();