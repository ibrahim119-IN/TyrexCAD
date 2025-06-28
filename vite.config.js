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
                // تجميع الأدوات في chunk منفصل
                manualChunks: {
                    'tools': [
                        './js/tools/ToolsManager.js',
                        './js/tools/base/BaseTool.js',
                        './js/tools/drawing/index.js',
                        './js/tools/modify/index.js',
                        './js/tools/advanced/index.js',
                    ],
                    'vendor': ['three']
                },
                
                // أسماء ملفات واضحة
                entryFileNames: 'js/[name]-[hash].js',
                chunkFileNames: 'js/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]'
            }
        },
        
        // تحسينات الأداء
        target: 'es2015',
        sourcemap: true
    },
    
    server: {
        port: 3000,
        open: true,
        cors: true
    },
    
    // تجاهل تحذيرات معينة
    logLevel: 'info',
    clearScreen: false
});