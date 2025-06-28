import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: '.', // المشروع في الجذر
    base: './',
    
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './js'),
            '@tools': path.resolve(__dirname, './js/tools'),
            '@core': path.resolve(__dirname, './js/core'),
        }
    },
    
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        minify: 'terser',
        
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
            },
            
            output: {
                // تجميع ذكي للملفات
                manualChunks: {
                    'vendor': ['three'],
                    'core': [
                        './js/core/TyrexCAD.js',
                        './js/core/Geometry.js',
                        './js/core/Units.js'
                    ],
                    'tools': [
                        './js/tools/ToolsManager.js',
                        './js/tools/BaseTool.js'
                    ],
                    'geometry': [
                        './js/geometry/GeometryAdvanced.js'
                    ]
                },
                
                // أسماء ملفات واضحة
                entryFileNames: 'js/[name]-[hash].js',
                chunkFileNames: 'js/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]'
            }
        },
        
        // تحسينات الأداء
        target: 'es2015',
        sourcemap: true,
        
        // تحسين حجم البناء
        terserOptions: {
            compress: {
                drop_console: false, // احتفظ بـ console.log للتطوير
                drop_debugger: true
            }
        }
    },
    
    server: {
        port: 3000,
        open: true,
        cors: true,
        hmr: {
            overlay: false // تجنب مشاكل Canvas
        }
    },
    
    // إعدادات Worker
    worker: {
        format: 'es',
        plugins: []
    },
    
    // تحسين التبعيات
    optimizeDeps: {
        include: ['three'],
        exclude: [
            'js/geometry/GeometryWorker.js', // استبعاد Worker مؤقتاً
            'js/lib/clipper.js',
            'js/lib/earcut.min.js',
            'js/lib/martinez.min.js'
        ]
    },
    
    // تجاهل تحذيرات معينة
    logLevel: 'info',
    clearScreen: false
});