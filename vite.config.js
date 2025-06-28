import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  
  server: {
    port: 3000,
    open: true,
    host: true, // للوصول من الشبكة المحلية
    cors: true
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@core': resolve(__dirname, './js/core'),
      '@tools': resolve(__dirname, './js/tools'),
      '@geometry': resolve(__dirname, './js/geometry'),
      '@ui': resolve(__dirname, './js/ui'),
      '@lib': resolve(__dirname, './js/lib')
    }
  },
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true, // لسهولة debugging
    
    // تحسين حجم الملفات
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      
      output: {
        // أسماء الملفات النهائية
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          } else if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          } else {
            return `assets/[name]-[hash][extname]`;
          }
        },
        
        // تقسيم ذكي للملفات
        manualChunks: (id) => {
          // Three.js في ملف منفصل
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
          
          // المكتبات الخارجية الأخرى
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          
          // Geometry المتقدمة (إذا كانت كبيرة)
          if (id.includes('GeometryAdvanced') || id.includes('clipper') || id.includes('earcut')) {
            return 'geometry-advanced';
          }
          
          // الأدوات المتقدمة
          if (id.includes('/tools/advanced/') || id.includes('/tools/boolean/')) {
            return 'tools-advanced';
          }
          
          // Core في الملف الرئيسي
          // لا نحدد شيء، سيكون في الملف الرئيسي
        }
      }
    },
    
    // حد التحذير لحجم الملفات (2MB)
    chunkSizeWarningLimit: 2000,
    
    // تحسينات إضافية
    cssCodeSplit: true,
    assetsInlineLimit: 4096 // inline للملفات الصغيرة
  },
  
  // تحسين الأداء في وضع التطوير
  optimizeDeps: {
    include: ['three'],
    exclude: [],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  
  // دعم المتصفحات الحديثة
  esbuild: {
    target: 'es2020',
    supported: {
      'top-level-await': true
    }
  },
  
  // Plugins (يمكن إضافة plugins إضافية هنا)
  plugins: [
    // مثال: لإضافة دعم لـ PWA
    // VitePWA({ ... })
  ]
});