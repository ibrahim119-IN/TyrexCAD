/**
 * TyrexCAD GeometryAdvanced System
 * نظام العمليات الهندسية المتقدمة
 * 
 * يوفر عمليات هندسية معقدة مع تحسينات الأداء
 * - Lazy loading للمكتبات الخارجية
 * - Web Worker support للعمليات الثقيلة
 * - Cache system للنتائج
 * - تكامل كامل مع نظام TyrexCAD
 */

// في البداية، أضف هذا التحقق للـ Worker
const WORKER_SUPPORTED = typeof Worker !== 'undefined' && !import.meta.env?.SSR;

class GeometryAdvanced {
    constructor() {
        // حالة المكتبات الخارجية
          // حالة المكتبات الخارجية
        this.libraries = {
            clipper: { 
                loaded: false, 
                loading: false, 
                instance: null,
                url: 'js/lib/clipper.js' // مسار محلي
            },
            martinez: { 
                loaded: false, 
                loading: false, 
                instance: null,
                url: 'js/lib/martinez.min.js' // مسار محلي
            },
            earcut: { 
                loaded: false, 
                loading: false, 
                instance: null,
                url: 'js/lib/earcut.min.js' // مسار محلي
            }
        };
        
        // Web Worker
        this.worker = null;
        this.workerReady = false;
        this.workerCallbacks = new Map();
        this.workerId = 0;
        
        // Cache system
        this.cache = new Map();
        this.cacheMaxSize = 100;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        
        // Performance thresholds
        this.complexityThreshold = 1000;  // نقاط للتبديل إلى Worker
        this.batchThreshold = 50;         // عدد الأشكال للمعالجة المجمعة
        
        // مرجع لـ CAD instance
        this.cad = null;
    }
    
    /**
     * تهيئة النظام
     */
    async init(cadInstance) {
        this.cad = cadInstance;
        
        // تهيئة Web Worker إذا كان متاحاً
        if (typeof Worker !== 'undefined') {
            try {
                await this.initWorker();
            } catch (error) {
                console.warn('Web Worker initialization failed:', error);
                this.worker = null;
            }
        }
        
        // إذا فشل Worker، حمّل المكتبات مباشرة
        if (!this.worker) {
            console.info('Loading libraries in main thread');
            await this.loadLibrariesDirect();
        }
        
        return this;
    }
    
   /**
     * تهيئة Web Worker مع Vite
     */
    async initWorker() {
        if (!WORKER_SUPPORTED) {
            console.warn('Web Workers not supported in this environment');
            this.worker = null;
            return;
        }
        
        try {
            // Method 1: استخدام Vite Worker syntax (الأفضل)
            const WorkerModule = await import('./GeometryWorker.js?worker');
            this.worker = new WorkerModule.default();
            
            // إذا فشلت الطريقة الأولى، جرب الطريقة الثانية
        } catch (error) {
            console.warn('Failed to load worker with Vite syntax, trying URL method:', error);
            
            try {
                // Method 2: استخدام Worker URL
                const workerUrl = new URL('./GeometryWorker.js', import.meta.url);
                this.worker = new Worker(workerUrl, { type: 'module' });
            } catch (error2) {
                console.error('Failed to initialize Web Worker:', error2);
                this.worker = null;
                return;
            }
        }
        
        // إعداد معالج الرسائل
        this.worker.onmessage = (event) => {
            const { id, type, result, error } = event.data;
            
            if (type === 'ready') {
                this.workerReady = true;
                console.log('✅ GeometryWorker ready');
                return;
            }
            
            const callback = this.workerCallbacks.get(id);
            if (callback) {
                if (error) {
                    callback.reject(new Error(error));
                } else {
                    callback.resolve(result);
                }
                this.workerCallbacks.delete(id);
            }
        };
        
        // معالج الأخطاء
        this.worker.onerror = (error) => {
            console.error('Worker error:', error);
            this.workerReady = false;
        };
        
        // انتظر حتى يكون Worker جاهز (مع timeout)
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (!this.workerReady) {
                    reject(new Error('Worker initialization timeout'));
                }
            }, 5000);
            
            const checkReady = setInterval(() => {
                if (this.workerReady) {
                    clearInterval(checkReady);
                    clearTimeout(timeout);
                    resolve();
                }
            }, 100);
        });
    }

/**
 * إعداد معالجات أحداث Worker
 */
setupWorkerHandlers() {
    this.worker.onmessage = (event) => {
        const { id, type, result, error } = event.data;
        
        if (type === 'ready') {
            this.workerReady = true;
            console.log('Worker initialized successfully');
            return;
        }
        
        const callback = this.workerCallbacks.get(id);
        if (callback) {
            if (error) {
                callback.reject(new Error(error));
            } else {
                callback.resolve(result);
            }
            this.workerCallbacks.delete(id);
        }
    };
    
    this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.workerReady = false;
        this.worker = null;
    };
}

/**
 * تحميل كود المكتبة من URL
 */
async loadLibraryCode(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load library from ${url}: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error loading library from ${url}:`, error);
        return '// Failed to load library';
    }
}

/**
 * تحميل مكتبة خارجية عند الحاجة (للاستخدام في main thread)
 */
async loadLibrary(name) {
    const lib = this.libraries[name];
    if (lib.loaded || lib.loading) return lib.instance;
    
    lib.loading = true;
    
    try {
        // تحديث المسارات لتعمل مع Vite
        const libraryUrls = {
            clipper: '/js/lib/clipper.js',
            martinez: '/js/lib/martinez.min.js',
            earcut: '/js/lib/earcut.min.js'
        };
        
        const url = libraryUrls[name] || lib.url;
        
        // تحميل المكتبة
        await this.loadScript(url);
        
        // التحقق من تحميل المكتبة
        switch (name) {
            case 'clipper':
                if (window.ClipperLib) {
                    lib.instance = window.ClipperLib;
                    lib.loaded = true;
                } else {
                    throw new Error('ClipperLib not found after loading');
                }
                break;
                
            case 'martinez':
                if (window.martinez) {
                    lib.instance = window.martinez;
                    lib.loaded = true;
                } else {
                    throw new Error('Martinez not found after loading');
                }
                break;
                
            case 'earcut':
                if (window.earcut) {
                    lib.instance = window.earcut;
                    lib.loaded = true;
                } else {
                    throw new Error('Earcut not found after loading');
                }
                break;
        }
        
        console.log(`✅ ${name} library loaded`);
        return lib.instance;
        
    } catch (error) {
        lib.loading = false;
        console.error(`Failed to load ${name} library:`, error);
        throw error;
    }
}

/**
 * تحميل script ديناميكياً
 */
loadScript(url) {
    return new Promise((resolve, reject) => {
        // تحقق من وجود script موجود مسبقاً
        const existingScript = document.querySelector(`script[src="${url}"]`);
        if (existingScript) {
            console.log(`Script already loaded: ${url}`);
            
            // تحقق من تحميل المكتبة فعلاً
            setTimeout(() => {
                resolve();
            }, 100);
            return;
        }
        
        const script = document.createElement('script');
        script.src = url;
        script.type = 'text/javascript';
        
        script.onload = () => {
            console.log(`Script loaded successfully: ${url}`);
            resolve();
        };
        
        script.onerror = (error) => {
            console.error(`Failed to load script: ${url}`, error);
            reject(new Error(`Failed to load script: ${url}`));
        };
        
        document.head.appendChild(script);
    });
}

/**
 * إرسال مهمة للـ Worker
 */
async sendToWorker(operation, data) {
    // إذا لم يكن Worker جاهزاً، استخدم العمليات المحلية
    if (!this.worker || !this.workerReady) {
        console.log(`Executing ${operation} locally (Worker not available)`);
        return await this.executeLocally(operation, data);
    }
    
    return new Promise((resolve, reject) => {
        const id = this.workerId++;
        
        // إضافة timeout
        const timeout = setTimeout(() => {
            this.workerCallbacks.delete(id);
            console.warn(`Worker operation timeout: ${operation}`);
            // حاول تنفيذ العملية محلياً
            this.executeLocally(operation, data)
                .then(resolve)
                .catch(reject);
        }, 30000); // 30 ثانية
        
        this.workerCallbacks.set(id, { 
            resolve: (result) => {
                clearTimeout(timeout);
                resolve(result);
            },
            reject: (error) => {
                clearTimeout(timeout);
                reject(error);
            }
        });
        
        try {
            this.worker.postMessage({
                id,
                operation,
                data
            });
        } catch (error) {
            clearTimeout(timeout);
            this.workerCallbacks.delete(id);
            console.error(`Failed to post message to worker: ${error.message}`);
            // حاول تنفيذ العملية محلياً
            this.executeLocally(operation, data)
                .then(resolve)
                .catch(reject);
        }
    });
}

/**
 * تنفيذ العمليات محلياً (fallback)
 */
async executeLocally(operation, data) {
    console.log(`Executing ${operation} locally`);
    
    // تأكد من تحميل المكتبات المطلوبة
    try {
        switch (operation) {
            case 'union':
            case 'difference':
            case 'intersection':
            case 'xor':
            case 'offsetPolygon':
            case 'offsetPolyline':
                if (!this.libraries.clipper.loaded) {
                    await this.loadLibrary('clipper');
                }
                break;
                
            case 'triangulate':
                if (!this.libraries.earcut.loaded) {
                    await this.loadLibrary('earcut');
                }
                break;
        }
    } catch (error) {
        console.error(`Failed to load required libraries for ${operation}:`, error);
        throw error;
    }
    
    // تنفيذ العملية
    try {
        switch (operation) {
            case 'union':
                return await this.unionDirect(data.shapes);
                
            case 'difference':
                return await this.difference(data.subject, data.clips);
                
            case 'intersection':
                return await this.intersection(data.shapes);
                
            case 'xor':
                return await this.xor(data.shape1, data.shape2);
                
            case 'offsetPolygon':
                return await this.offsetPolygon(data.polygon, data.distance);
                
            case 'offsetPolyline':
                return await this.offsetPolyline(data.polyline, data.distance);
                
            case 'triangulate':
                return await this.triangulatePolygon(data.polygon);
                
            case 'simplify':
                return this.douglasPeucker(data.points, data.tolerance);
                
            case 'convexHull':
                return this.convexHull(data.points);
                
            case 'rectangularArray':
                return this.rectangularArray(data.shape, data.rows, data.cols, data.spacing);
                
            case 'polarArray':
                return this.polarArray(data.shape, data.center, data.count, data.angle);
                
            case 'pathArray':
                return this.pathArray(data.shape, data.path, data.count, data.align);
                
            default:
                // حاول استدعاء الدالة مباشرة إذا كانت موجودة
                if (typeof this[operation] === 'function') {
                    return await this[operation](data);
                }
                throw new Error(`Unknown operation: ${operation}`);
        }
    } catch (error) {
        console.error(`Error executing ${operation} locally:`, error);
        throw error;
    }
}
    
    /**
     * حساب تعقيد الشكل
     */
    getShapeComplexity(shape) {
        switch (shape.type) {
            case 'line':
                return 2;
            case 'rectangle':
                return 4;
            case 'circle':
                return 32; // تقريب الدائرة
            case 'arc':
                return 16;
            case 'ellipse':
                return 32;
            case 'polyline':
                return shape.points.length;
            default:
                return 10;
        }
    }
    
    /**
     * توليد مفتاح للـ cache
     */
    generateCacheKey(operation, ...args) {
        const data = JSON.stringify({ operation, args });
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `${operation}_${hash}`;
    }
    
    /**
     * تنظيف الـ cache
     */
    cleanCache() {
        if (this.cache.size > this.cacheMaxSize) {
            const toDelete = this.cache.size - this.cacheMaxSize + 10;
            const keys = Array.from(this.cache.keys());
            for (let i = 0; i < toDelete; i++) {
                this.cache.delete(keys[i]);
            }
        }
    }
    
    // ==================== العمليات البوليانية ====================
    
    /**
     * دمج الأشكال (Union)
     */
    async union(shapes) {
        if (!shapes || shapes.length === 0) return [];
        if (shapes.length === 1) return [shapes[0]];
        
        // تحقق من الـ cache
        const cacheKey = this.generateCacheKey('union', shapes);
        if (this.cache.has(cacheKey)) {
            this.cacheHits++;
            return this.cache.get(cacheKey);
        }
        this.cacheMisses++;
        
        // حساب التعقيد
        const totalComplexity = shapes.reduce((sum, shape) => {
            return sum + this.getShapeComplexity(shape);
        }, 0);
        
        let result;
        
        // قرار استخدام Worker أم لا
        if (totalComplexity > this.complexityThreshold && this.workerReady) {
            result = await this.sendToWorker('union', { shapes });
        } else {
            result = await this.unionDirect(shapes);
        }
        
        // حفظ في الـ cache
        this.cache.set(cacheKey, result);
        this.cleanCache();
        
        return result;
    }
    
    /**
     * تنفيذ Union مباشرة
     */
    async unionDirect(shapes) {
        const ClipperLib = await this.loadLibrary('clipper');
        
        const scale = 100000;
        const clipper = new ClipperLib.Clipper();
        
        // تحويل كل الأشكال لمسارات Clipper
        shapes.forEach(shape => {
            const paths = this.shapeToClipperPaths(shape, scale);
            paths.forEach(path => {
                clipper.AddPath(
                    path,
                    ClipperLib.PolyType.ptSubject,
                    true
                );
            });
        });
        
        // تنفيذ العملية
        const solution = new ClipperLib.Paths();
        const success = clipper.Execute(
            ClipperLib.ClipType.ctUnion,
            solution,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
        );
        
        if (!success) return [];
        
        // تحويل النتائج للصيغة الأصلية
        return this.clipperPathsToShapes(solution, scale);
    }
    
    /**
     * طرح شكل من آخر (Difference)
     */
    async difference(subject, clips) {
        if (!subject || !clips || clips.length === 0) return [subject];
        
        const cacheKey = this.generateCacheKey('difference', subject, clips);
        if (this.cache.has(cacheKey)) {
            this.cacheHits++;
            return this.cache.get(cacheKey);
        }
        this.cacheMisses++;
        
        const ClipperLib = await this.loadLibrary('clipper');
        
        const scale = 100000;
        const clipper = new ClipperLib.Clipper();
        
        // إضافة الشكل الأساسي
        const subjectPaths = this.shapeToClipperPaths(subject, scale);
        subjectPaths.forEach(path => {
            clipper.AddPath(
                path,
                ClipperLib.PolyType.ptSubject,
                true
            );
        });
        
        // إضافة الأشكال المطروحة
        clips.forEach(clip => {
            const clipPaths = this.shapeToClipperPaths(clip, scale);
            clipPaths.forEach(path => {
                clipper.AddPath(
                    path,
                    ClipperLib.PolyType.ptClip,
                    true
                );
            });
        });
        
        // تنفيذ العملية
        const solution = new ClipperLib.Paths();
        const success = clipper.Execute(
            ClipperLib.ClipType.ctDifference,
            solution,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
        );
        
        if (!success) return [];
        
        const result = this.clipperPathsToShapes(solution, scale);
        
        this.cache.set(cacheKey, result);
        this.cleanCache();
        
        return result;
    }
    
    /**
     * تقاطع الأشكال (Intersection)
     */
    async intersection(shapes) {
        if (!shapes || shapes.length < 2) return [];
        
        const cacheKey = this.generateCacheKey('intersection', shapes);
        if (this.cache.has(cacheKey)) {
            this.cacheHits++;
            return this.cache.get(cacheKey);
        }
        this.cacheMisses++;
        
        const ClipperLib = await this.loadLibrary('clipper');
        
        // البدء بأول شكلين
        let result = await this.intersectionPair(shapes[0], shapes[1]);
        
        // تقاطع تدريجي مع باقي الأشكال
        for (let i = 2; i < shapes.length; i++) {
            if (result.length === 0) break;
            result = await this.intersectionPair(result[0], shapes[i]);
        }
        
        this.cache.set(cacheKey, result);
        this.cleanCache();
        
        return result;
    }
    
    /**
     * تقاطع شكلين
     */
    async intersectionPair(shape1, shape2) {
        const ClipperLib = await this.loadLibrary('clipper');
        
        const scale = 100000;
        const clipper = new ClipperLib.Clipper();
        
        // إضافة الشكل الأول
        const paths1 = this.shapeToClipperPaths(shape1, scale);
        paths1.forEach(path => {
            clipper.AddPath(
                path,
                ClipperLib.PolyType.ptSubject,
                true
            );
        });
        
        // إضافة الشكل الثاني
        const paths2 = this.shapeToClipperPaths(shape2, scale);
        paths2.forEach(path => {
            clipper.AddPath(
                path,
                ClipperLib.PolyType.ptClip,
                true
            );
        });
        
        // تنفيذ العملية
        const solution = new ClipperLib.Paths();
        const success = clipper.Execute(
            ClipperLib.ClipType.ctIntersection,
            solution,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
        );
        
        if (!success) return [];
        
        return this.clipperPathsToShapes(solution, scale);
    }
    
    /**
     * الفرق المتماثل (XOR)
     */
    async xor(shape1, shape2) {
        const cacheKey = this.generateCacheKey('xor', shape1, shape2);
        if (this.cache.has(cacheKey)) {
            this.cacheHits++;
            return this.cache.get(cacheKey);
        }
        this.cacheMisses++;
        
        const ClipperLib = await this.loadLibrary('clipper');
        
        const scale = 100000;
        const clipper = new ClipperLib.Clipper();
        
        // إضافة الأشكال
        const paths1 = this.shapeToClipperPaths(shape1, scale);
        paths1.forEach(path => {
            clipper.AddPath(
                path,
                ClipperLib.PolyType.ptSubject,
                true
            );
        });
        
        const paths2 = this.shapeToClipperPaths(shape2, scale);
        paths2.forEach(path => {
            clipper.AddPath(
                path,
                ClipperLib.PolyType.ptClip,
                true
            );
        });
        
        // تنفيذ العملية
        const solution = new ClipperLib.Paths();
        const success = clipper.Execute(
            ClipperLib.ClipType.ctXor,
            solution,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
        );
        
        if (!success) return [];
        
        const result = this.clipperPathsToShapes(solution, scale);
        
        this.cache.set(cacheKey, result);
        this.cleanCache();
        
        return result;
    }
    
    // ==================== عمليات Offset و Buffer ====================
    
    /**
     * إزاحة مضلع
     */
    async offsetPolygon(polygon, distance) {
        const cacheKey = this.generateCacheKey('offsetPolygon', polygon, distance);
        if (this.cache.has(cacheKey)) {
            this.cacheHits++;
            return this.cache.get(cacheKey);
        }
        this.cacheMisses++;
        
        const ClipperLib = await this.loadLibrary('clipper');
        
        const scale = 100000;
        const offset = new ClipperLib.ClipperOffset();
        
        // تحويل المضلع
        const path = this.polygonToClipperPath(polygon, scale);
        
        // تحديد نوع الزوايا
        const joinType = distance > 0 ? 
            ClipperLib.JoinType.jtMiter : 
            ClipperLib.JoinType.jtRound;
        
        // إضافة المسار
        offset.AddPath(
            path,
            joinType,
            ClipperLib.EndType.etClosedPolygon
        );
        
        // تنفيذ الإزاحة
        const solution = new ClipperLib.Paths();
        offset.Execute(solution, distance * scale);
        
        const result = solution.map(path => {
            return this.clipperPathToPolygon(path, scale);
        });
        
        this.cache.set(cacheKey, result);
        this.cleanCache();
        
        return result;
    }
    
    /**
     * إزاحة خط متعدد
     */
    async offsetPolyline(polyline, distance) {
        const cacheKey = this.generateCacheKey('offsetPolyline', polyline, distance);
        if (this.cache.has(cacheKey)) {
            this.cacheHits++;
            return this.cache.get(cacheKey);
        }
        this.cacheMisses++;
        
        const ClipperLib = await this.loadLibrary('clipper');
        
        const scale = 100000;
        const offset = new ClipperLib.ClipperOffset();
        
        // تحويل الخط المتعدد
        const path = this.polylineToClipperPath(polyline, scale);
        
        // إضافة المسار كخط مفتوح
        offset.AddPath(
            path,
            ClipperLib.JoinType.jtRound,
            ClipperLib.EndType.etOpenRound
        );
        
        // تنفيذ الإزاحة
        const solution = new ClipperLib.Paths();
        offset.Execute(solution, distance * scale);
        
        const result = solution.map(path => {
            return this.clipperPathToPolyline(path, scale);
        });
        
        this.cache.set(cacheKey, result);
        this.cleanCache();
        
        return result;
    }
    
    /**
     * إنشاء منطقة حول نقطة
     */
    async bufferPoint(point, radius) {
        // إنشاء دائرة حول النقطة
        return {
            type: 'circle',
            center: { x: point.x, y: point.y },
            radius: radius,
            id: this.cad.generateId()
        };
    }
    
    /**
     * إنشاء منطقة حول خط
     */
    async bufferLine(line, distance) {
        // حساب الاتجاه العمودي
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len === 0) return [];
        
        const nx = -dy / len * distance;
        const ny = dx / len * distance;
        
        // إنشاء مضلع حول الخط
        const polygon = {
            type: 'polygon',
            points: [
                { x: line.start.x + nx, y: line.start.y + ny },
                { x: line.end.x + nx, y: line.end.y + ny },
                { x: line.end.x - nx, y: line.end.y - ny },
                { x: line.start.x - nx, y: line.start.y - ny }
            ],
            id: this.cad.generateId()
        };
        
        return [polygon];
    }
    
    /**
     * إزاحة منحنى (بتحويله لخط متعدد أولاً)
     */
    async offsetCurve(curve, distance) {
        // تحويل المنحنى لخط متعدد
        const polyline = this.curveToPolyline(curve, 32);
        
        // إزاحة الخط المتعدد
        return await this.offsetPolyline(polyline, distance);
    }
    
    // ==================== عمليات التبسيط والتنعيم ====================
    
    /**
     * تبسيط مضلع باستخدام Douglas-Peucker
     */
    simplifyPolygon(polygon, tolerance) {
        const points = polygon.points || this.polygonToPoints(polygon);
        
        if (points.length <= 3) return polygon;
        
        const simplified = this.douglasPeucker(points, tolerance);
        
        return {
            type: 'polygon',
            points: simplified,
            id: this.cad.generateId()
        };
    }
    
    /**
     * خوارزمية Douglas-Peucker
     */
    douglasPeucker(points, tolerance) {
        if (points.length <= 2) return points;
        
        // إيجاد النقطة الأبعد
        let maxDistance = 0;
        let maxIndex = 0;
        
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.perpendicularDistance(
                points[i],
                firstPoint,
                lastPoint
            );
            
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        
        // التبسيط التكراري
        if (maxDistance > tolerance) {
            const firstHalf = this.douglasPeucker(
                points.slice(0, maxIndex + 1),
                tolerance
            );
            
            const secondHalf = this.douglasPeucker(
                points.slice(maxIndex),
                tolerance
            );
            
            return firstHalf.slice(0, -1).concat(secondHalf);
        } else {
            return [firstPoint, lastPoint];
        }
    }
    
    /**
     * تنعيم خط متعدد
     */
    smoothPolyline(polyline, factor = 0.5) {
        const points = polyline.points;
        if (points.length < 3) return polyline;
        
        const smoothed = [];
        
        // نقطة البداية
        smoothed.push({ ...points[0] });
        
        // النقاط الوسطى
        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];
            
            smoothed.push({
                x: curr.x * (1 - factor) + (prev.x + next.x) * factor / 2,
                y: curr.y * (1 - factor) + (prev.y + next.y) * factor / 2
            });
        }
        
        // نقطة النهاية
        smoothed.push({ ...points[points.length - 1] });
        
        return {
            type: 'polyline',
            points: smoothed,
            id: this.cad.generateId()
        };
    }
    
    /**
     * تنعيم Chaikin
     */
    chaikinSmooth(points, iterations = 2) {
        let smoothed = [...points];
        
        for (let iter = 0; iter < iterations; iter++) {
            const newPoints = [];
            
            for (let i = 0; i < smoothed.length - 1; i++) {
                const p1 = smoothed[i];
                const p2 = smoothed[i + 1];
                
                // نقاط 1/4 و 3/4
                newPoints.push({
                    x: 0.75 * p1.x + 0.25 * p2.x,
                    y: 0.75 * p1.y + 0.25 * p2.y
                });
                
                newPoints.push({
                    x: 0.25 * p1.x + 0.75 * p2.x,
                    y: 0.25 * p1.y + 0.75 * p2.y
                });
            }
            
            smoothed = newPoints;
        }
        
        return smoothed;
    }
    
    // ==================== التثليث والتجزئة ====================
    
    /**
     * تثليث مضلع
     */
    async triangulatePolygon(polygon) {
        const earcut = await this.loadLibrary('earcut');
        
        // تحضير البيانات لـ earcut
        const vertices = [];
        const points = polygon.points || this.polygonToPoints(polygon);
        
        points.forEach(point => {
            vertices.push(point.x, point.y);
        });
        
        // تنفيذ التثليث
        const triangles = earcut(vertices);
        
        // تحويل النتائج لمثلثات
        const result = [];
        for (let i = 0; i < triangles.length; i += 3) {
            const triangle = {
                type: 'polygon',
                points: [
                    points[triangles[i]],
                    points[triangles[i + 1]],
                    points[triangles[i + 2]]
                ],
                id: this.cad.generateId()
            };
            result.push(triangle);
        }
        
        return result;
    }
    
    /**
     * تثليث Delaunay
     */
    async delaunayTriangulation(points) {
        // استخدام خوارزمية Bowyer-Watson
        const triangles = [];
        
        // مثلث كبير يحتوي كل النقاط
        const superTriangle = this.createSuperTriangle(points);
        triangles.push(superTriangle);
        
        // إضافة نقطة تلو الأخرى
        for (const point of points) {
            const badTriangles = [];
            
            // إيجاد المثلثات التي تنتهك شرط Delaunay
            for (const triangle of triangles) {
                if (this.isPointInCircumcircle(point, triangle)) {
                    badTriangles.push(triangle);
                }
            }
            
            // إيجاد الحواف الخارجية للمثلثات السيئة
            const polygon = [];
            for (const triangle of badTriangles) {
                for (let i = 0; i < 3; i++) {
                    const edge = [
                        triangle.points[i],
                        triangle.points[(i + 1) % 3]
                    ];
                    
                    let isShared = false;
                    for (const other of badTriangles) {
                        if (other === triangle) continue;
                        if (this.triangleHasEdge(other, edge)) {
                            isShared = true;
                            break;
                        }
                    }
                    
                    if (!isShared) {
                        polygon.push(edge);
                    }
                }
            }
            
            // إزالة المثلثات السيئة
            for (const triangle of badTriangles) {
                const index = triangles.indexOf(triangle);
                if (index > -1) {
                    triangles.splice(index, 1);
                }
            }
            
            // إنشاء مثلثات جديدة
            for (const edge of polygon) {
                const newTriangle = {
                    type: 'polygon',
                    points: [edge[0], edge[1], point],
                    id: this.cad.generateId()
                };
                triangles.push(newTriangle);
            }
        }
        
        // إزالة المثلثات المتصلة بالمثلث الكبير
        return triangles.filter(triangle => {
            return !triangle.points.some(p => 
                superTriangle.points.includes(p)
            );
        });
    }
    
    /**
     * مخطط Voronoi
     */
    async voronoiDiagram(points) {
        // الحصول على تثليث Delaunay أولاً
        const triangulation = await this.delaunayTriangulation(points);
        
        // حساب مراكز الدوائر المحيطة
        const circumcenters = new Map();
        triangulation.forEach((triangle, index) => {
            const center = this.circumcenter(triangle.points);
            circumcenters.set(index, center);
        });
        
        // بناء خلايا Voronoi
        const cells = new Map();
        
        points.forEach(point => {
            const cell = [];
            
            // إيجاد كل المثلثات التي تحتوي هذه النقطة
            triangulation.forEach((triangle, index) => {
                if (triangle.points.some(p => 
                    p.x === point.x && p.y === point.y
                )) {
                    cell.push(circumcenters.get(index));
                }
            });
            
            // ترتيب نقاط الخلية
            if (cell.length > 0) {
                const sorted = this.sortPointsClockwise(cell);
                cells.set(point, {
                    type: 'polygon',
                    points: sorted,
                    id: this.cad.generateId()
                });
            }
        });
        
        return Array.from(cells.values());
    }
    
    /**
     * الغلاف المحدب
     */
    convexHull(points) {
        if (points.length < 3) return points;
        
        // خوارزمية Graham Scan
        // 1. إيجاد أدنى نقطة
        let lowest = points[0];
        for (const point of points) {
            if (point.y < lowest.y || 
                (point.y === lowest.y && point.x < lowest.x)) {
                lowest = point;
            }
        }
        
        // 2. ترتيب النقاط حسب الزاوية
        const sorted = points.slice().sort((a, b) => {
            if (a === lowest) return -1;
            if (b === lowest) return 1;
            
            const angleA = Math.atan2(a.y - lowest.y, a.x - lowest.x);
            const angleB = Math.atan2(b.y - lowest.y, b.x - lowest.x);
            
            if (angleA !== angleB) return angleA - angleB;
            
            // نفس الزاوية، الأقرب أولاً
            const distA = this.distance(a, lowest);
            const distB = this.distance(b, lowest);
            return distA - distB;
        });
        
        // 3. بناء الغلاف
        const hull = [];
        
        for (const point of sorted) {
            while (hull.length > 1) {
                const last = hull[hull.length - 1];
                const secondLast = hull[hull.length - 2];
                
                if (this.crossProduct(secondLast, last, point) <= 0) {
                    hull.pop();
                } else {
                    break;
                }
            }
            hull.push(point);
        }
        
        return {
            type: 'polygon',
            points: hull,
            id: this.cad.generateId()
        };
    }
    
    // ==================== عمليات المنحنيات المعقدة ====================
    
    /**
     * منحنى بيزييه
     */
    bezierCurve(controlPoints, segments = 50) {
        const points = [];
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this.calculateBezierPoint(controlPoints, t);
            points.push(point);
        }
        
        return {
            type: 'polyline',
            points: points,
            id: this.cad.generateId()
        };
    }
    
    /**
     * حساب نقطة على منحنى بيزييه
     */
    calculateBezierPoint(controlPoints, t) {
        const n = controlPoints.length - 1;
        let x = 0, y = 0;
        
        for (let i = 0; i <= n; i++) {
            const bernstein = this.bernsteinPolynomial(n, i, t);
            x += controlPoints[i].x * bernstein;
            y += controlPoints[i].y * bernstein;
        }
        
        return { x, y };
    }
    
    /**
     * منحنى B-Spline
     */
    bSpline(controlPoints, degree = 3, segments = 50) {
        const n = controlPoints.length - 1;
        const m = n + degree + 1;
        
        // إنشاء knot vector
        const knots = [];
        for (let i = 0; i <= m; i++) {
            if (i <= degree) {
                knots.push(0);
            } else if (i >= m - degree) {
                knots.push(m - 2 * degree - 1);
            } else {
                knots.push(i - degree);
            }
        }
        
        // حساب نقاط المنحنى
        const points = [];
        const tMin = knots[degree];
        const tMax = knots[m - degree];
        
        for (let i = 0; i <= segments; i++) {
            const t = tMin + (tMax - tMin) * i / segments;
            const point = this.calculateBSplinePoint(
                controlPoints, 
                degree, 
                knots, 
                t
            );
            points.push(point);
        }
        
        return {
            type: 'polyline',
            points: points,
            id: this.cad.generateId()
        };
    }
    
    /**
     * منحنى Catmull-Rom
     */
    catmullRomSpline(points, segments = 10) {
        if (points.length < 4) return null;
        
        const result = [];
        
        for (let i = 1; i < points.length - 2; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2];
            
            for (let j = 0; j < segments; j++) {
                const t = j / segments;
                const point = this.catmullRomPoint(p0, p1, p2, p3, t);
                result.push(point);
            }
        }
        
        // إضافة آخر نقطة
        result.push(points[points.length - 2]);
        
        return {
            type: 'polyline',
            points: result,
            id: this.cad.generateId()
        };
    }
    
    /**
     * تحويل قوس لمنحنى بيزييه
     */
    arcToBezier(center, radius, startAngle, endAngle) {
        const curves = [];
        let currentAngle = startAngle;
        
        while (currentAngle < endAngle) {
            const nextAngle = Math.min(currentAngle + Math.PI / 2, endAngle);
            const bezier = this.arcSegmentToBezier(
                center, 
                radius, 
                currentAngle, 
                nextAngle
            );
            curves.push(bezier);
            currentAngle = nextAngle;
        }
        
        return curves;
    }
    
    // ==================== عمليات Fillet و Chamfer ====================
    
    /**
     * تدوير زاوية بين خطين
     */
    async filletCorner(line1, line2, radius) {
        // إيجاد نقطة التقاطع
        const intersection = this.lineLineIntersection(
            line1.start, line1.end,
            line2.start, line2.end
        );
        
        if (!intersection) return null;
        
        // حساب الاتجاهات
        const dir1 = this.normalize({
            x: line1.end.x - line1.start.x,
            y: line1.end.y - line1.start.y
        });
        
        const dir2 = this.normalize({
            x: line2.end.x - line2.start.x,
            y: line2.end.y - line2.start.y
        });
        
        // حساب الزاوية بين الخطين
        const angle = Math.acos(dir1.x * dir2.x + dir1.y * dir2.y);
        
        // حساب المسافة للنقاط المماسة
        const tanDist = radius / Math.tan(angle / 2);
        
        // نقاط المماس
        const tan1 = {
            x: intersection.x - dir1.x * tanDist,
            y: intersection.y - dir1.y * tanDist
        };
        
        const tan2 = {
            x: intersection.x + dir2.x * tanDist,
            y: intersection.y + dir2.y * tanDist
        };
        
        // مركز القوس
        const bisector = this.normalize({
            x: dir1.x + dir2.x,
            y: dir1.y + dir2.y
        });
        
        const centerDist = radius / Math.sin(angle / 2);
        const center = {
            x: intersection.x + bisector.x * centerDist,
            y: intersection.y + bisector.y * centerDist
        };
        
        // زوايا القوس
        const startAngle = Math.atan2(tan1.y - center.y, tan1.x - center.x);
        const endAngle = Math.atan2(tan2.y - center.y, tan2.x - center.x);
        
        return {
            arc: {
                type: 'arc',
                center: center,
                radius: radius,
                startAngle: startAngle,
                endAngle: endAngle,
                id: this.cad.generateId()
            },
            tangentPoints: { tan1, tan2 }
        };
    }
    
    /**
     * قطع زاوية بين خطين
     */
    async chamferCorner(line1, line2, distance) {
        // إيجاد نقطة التقاطع
        const intersection = this.lineLineIntersection(
            line1.start, line1.end,
            line2.start, line2.end
        );
        
        if (!intersection) return null;
        
        // حساب الاتجاهات
        const dir1 = this.normalize({
            x: line1.end.x - line1.start.x,
            y: line1.end.y - line1.start.y
        });
        
        const dir2 = this.normalize({
            x: line2.end.x - line2.start.x,
            y: line2.end.y - line2.start.y
        });
        
        // نقاط القطع
        const chamfer1 = {
            x: intersection.x - dir1.x * distance,
            y: intersection.y - dir1.y * distance
        };
        
        const chamfer2 = {
            x: intersection.x + dir2.x * distance,
            y: intersection.y + dir2.y * distance
        };
        
        return {
            line: {
                type: 'line',
                start: chamfer1,
                end: chamfer2,
                id: this.cad.generateId()
            },
            chamferPoints: { chamfer1, chamfer2 }
        };
    }
    
    /**
     * تدوير كل زوايا مضلع
     */
    async filletPolygon(polygon, radius) {
        const points = polygon.points || this.polygonToPoints(polygon);
        const newSegments = [];
        
        for (let i = 0; i < points.length; i++) {
            const prev = points[(i - 1 + points.length) % points.length];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            // إنشاء خطين وهميين
            const line1 = { start: prev, end: curr };
            const line2 = { start: curr, end: next };
            
            // محاولة تدوير الزاوية
            const fillet = await this.filletCorner(line1, line2, radius);
            
            if (fillet) {
                // إضافة الخط حتى نقطة المماس الأولى
                newSegments.push({
                    type: 'line',
                    start: prev,
                    end: fillet.tangentPoints.tan1
                });
                
                // إضافة القوس
                newSegments.push(fillet.arc);
            } else {
                // إضافة الخط الأصلي
                newSegments.push({
                    type: 'line',
                    start: prev,
                    end: curr
                });
            }
        }
        
        return newSegments;
    }
    
    /**
     * تدوير سلسلة خطوط
     */
    async chainFillet(lines, radius) {
        const result = [];
        
        for (let i = 0; i < lines.length - 1; i++) {
            const line1 = lines[i];
            const line2 = lines[i + 1];
            
            const fillet = await this.filletCorner(line1, line2, radius);
            
            if (fillet) {
                // تعديل نهاية الخط الأول
                result.push({
                    type: 'line',
                    start: line1.start,
                    end: fillet.tangentPoints.tan1,
                    id: line1.id
                });
                
                // إضافة القوس
                result.push(fillet.arc);
                
                // تعديل بداية الخط الثاني
                if (i === lines.length - 2) {
                    result.push({
                        type: 'line',
                        start: fillet.tangentPoints.tan2,
                        end: line2.end,
                        id: line2.id
                    });
                }
            } else {
                result.push(line1);
                if (i === lines.length - 2) {
                    result.push(line2);
                }
            }
        }
        
        return result;
    }
    
    // ==================== Pattern و Array Operations ====================
    
    /**
     * مصفوفة مستطيلة
     */
    rectangularArray(shape, rows, cols, rowSpacing, colSpacing) {
        const result = [];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const copy = this.cloneShape(shape);
                
                // تحريك النسخة
                const dx = col * colSpacing;
                const dy = row * rowSpacing;
                
                this.translateShape(copy, dx, dy);
                result.push(copy);
            }
        }
        
        return result;
    }
    
    /**
     * مصفوفة قطبية
     */
    polarArray(shape, center, count, totalAngle = Math.PI * 2) {
        const result = [];
        const angleStep = totalAngle / count;
        
        for (let i = 0; i < count; i++) {
            const copy = this.cloneShape(shape);
            const angle = i * angleStep;
            
            // تدوير حول المركز
            this.rotateShape(copy, center, angle);
            result.push(copy);
        }
        
        return result;
    }
    
    /**
     * مصفوفة على مسار
     */
    pathArray(shape, path, count, align = true) {
        const result = [];
        const pathLength = this.calculatePathLength(path);
        const step = pathLength / (count - 1);
        
        for (let i = 0; i < count; i++) {
            const distance = i * step;
            const position = this.getPointAtDistance(path, distance);
            
            if (!position) continue;
            
            const copy = this.cloneShape(shape);
            
            // تحريك للموضع
            const bounds = this.getShapeBounds(shape);
            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;
            
            this.translateShape(
                copy, 
                position.point.x - centerX, 
                position.point.y - centerY
            );
            
            // محاذاة مع المسار إذا مطلوب
            if (align && position.angle !== undefined) {
                this.rotateShape(copy, position.point, position.angle);
            }
            
            result.push(copy);
        }
        
        return result;
    }
    
    /**
     * نمط عشوائي
     */
    randomPattern(shape, bounds, count, minDistance = 0) {
        const result = [];
        const attempts = count * 10;
        
        for (let i = 0; i < attempts && result.length < count; i++) {
            const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
            
            // تحقق من المسافة الدنيا
            let valid = true;
            if (minDistance > 0) {
                for (const existing of result) {
                    const existingBounds = this.getShapeBounds(existing);
                    const centerX = (existingBounds.minX + existingBounds.maxX) / 2;
                    const centerY = (existingBounds.minY + existingBounds.maxY) / 2;
                    
                    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    if (dist < minDistance) {
                        valid = false;
                        break;
                    }
                }
            }
            
            if (valid) {
                const copy = this.cloneShape(shape);
                const shapeBounds = this.getShapeBounds(shape);
                const centerX = (shapeBounds.minX + shapeBounds.maxX) / 2;
                const centerY = (shapeBounds.minY + shapeBounds.maxY) / 2;
                
                this.translateShape(copy, x - centerX, y - centerY);
                
                // دوران عشوائي اختياري
                const randomRotation = Math.random() * Math.PI * 2;
                this.rotateShape(copy, { x, y }, randomRotation);
                
                result.push(copy);
            }
        }
        
        return result;
    }
    
    // ==================== التحليل الهندسي المعقد ====================
    
    /**
     * أصغر مستطيل محيط
     */
    minimumBoundingBox(points) {
        // الحصول على الغلاف المحدب أولاً
        const hull = this.convexHull(points);
        
        let minArea = Infinity;
        let bestBox = null;
        
        // اختبار كل حافة من الغلاف المحدب
        for (let i = 0; i < hull.points.length; i++) {
            const p1 = hull.points[i];
            const p2 = hull.points[(i + 1) % hull.points.length];
            
            // حساب الزاوية
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            
            // تدوير كل النقاط
            const rotated = points.map(p => this.rotatePoint(p, { x: 0, y: 0 }, -angle));
            
            // إيجاد الحدود
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;
            
            for (const p of rotated) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
            
            const area = (maxX - minX) * (maxY - minY);
            
            if (area < minArea) {
                minArea = area;
                
                // إرجاع الزوايا للوضع الأصلي
                const corners = [
                    { x: minX, y: minY },
                    { x: maxX, y: minY },
                    { x: maxX, y: maxY },
                    { x: minX, y: maxY }
                ];
                
                bestBox = {
                    type: 'polygon',
                    points: corners.map(p => this.rotatePoint(p, { x: 0, y: 0 }, angle)),
                    area: minArea,
                    angle: angle,
                    id: this.cad.generateId()
                };
            }
        }
        
        return bestBox;
    }
    
    /**
     * أصغر دائرة محيطة
     */
    minimumBoundingCircle(points) {
        // خوارزمية Welzl
        const shuffled = [...points].sort(() => Math.random() - 0.5);
        return this.welzl(shuffled, []);
    }
    
    /**
     * خوارزمية Welzl للدائرة المحيطة
     */
    welzl(points, boundary) {
        if (points.length === 0 || boundary.length === 3) {
            return this.trivialCircle(boundary);
        }
        
        const p = points[points.length - 1];
        const remaining = points.slice(0, -1);
        
        const circle = this.welzl(remaining, boundary);
        
        if (circle && this.isPointInCircle(p, circle)) {
            return circle;
        }
        
        return this.welzl(remaining, [...boundary, p]);
    }
    
    /**
     * المحور الوسطي (تقريبي)
     */
    async medialAxis(polygon) {
        // تقريب باستخدام Voronoi diagram للنقاط على المحيط
        const points = [];
        const edges = this.polygonToEdges(polygon);
        
        // إضافة نقاط على كل حافة
        edges.forEach(edge => {
            const samples = 10;
            for (let i = 0; i <= samples; i++) {
                const t = i / samples;
                points.push({
                    x: edge.start.x + t * (edge.end.x - edge.start.x),
                    y: edge.start.y + t * (edge.end.y - edge.start.y)
                });
            }
        });
        
        // حساب Voronoi
        const voronoi = await this.voronoiDiagram(points);
        
        // فلترة الحواف داخل المضلع
        const medialEdges = [];
        
        voronoi.forEach(cell => {
            const edges = this.polygonToEdges(cell);
            edges.forEach(edge => {
                const midpoint = {
                    x: (edge.start.x + edge.end.x) / 2,
                    y: (edge.start.y + edge.end.y) / 2
                };
                
                if (this.isPointInPolygon(midpoint, polygon)) {
                    medialEdges.push(edge);
                }
            });
        });
        
        return medialEdges;
    }
    
    // ==================== عمليات الكنتور ====================
    
    /**
     * كنتور موازي
     */
    async contourParallel(contour, distance) {
        // استخدام offset polygon
        return await this.offsetPolygon(contour, distance);
    }
    
    /**
     * كنتورات متعددة
     */
    async contourOffset(contour, distances) {
        const results = [];
        
        for (const distance of distances) {
            const offset = await this.offsetPolygon(contour, distance);
            results.push(...offset);
        }
        
        return results;
    }
    
    // ==================== Text و Hatch Operations ====================
    
    /**
     * ملء مضلع بنمط
     */
    hatchPolygon(polygon, pattern = 'lines', spacing = 10, angle = 0) {
        const bounds = this.getPolygonBounds(polygon);
        const lines = [];
        
        switch (pattern) {
            case 'lines':
                // خطوط متوازية
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                
                // حساب النطاق
                const diagonal = Math.sqrt(
                    (bounds.maxX - bounds.minX) ** 2 + 
                    (bounds.maxY - bounds.minY) ** 2
                );
                
                for (let d = -diagonal; d <= diagonal; d += spacing) {
                    // خط في الاتجاه المطلوب
                    const line = {
                        start: {
                            x: bounds.minX - diagonal * cos + d * sin,
                            y: bounds.minY - diagonal * sin - d * cos
                        },
                        end: {
                            x: bounds.maxX + diagonal * cos + d * sin,
                            y: bounds.maxY + diagonal * sin - d * cos
                        }
                    };
                    
                    // قص الخط بالمضلع
                    const clipped = this.clipLineByPolygon(line, polygon);
                    if (clipped) {
                        lines.push(...clipped);
                    }
                }
                break;
                
            case 'dots':
                // نقاط منتظمة
                for (let x = bounds.minX; x <= bounds.maxX; x += spacing) {
                    for (let y = bounds.minY; y <= bounds.maxY; y += spacing) {
                        if (this.isPointInPolygon({ x, y }, polygon)) {
                            lines.push({
                                type: 'circle',
                                center: { x, y },
                                radius: spacing / 4,
                                id: this.cad.generateId()
                            });
                        }
                    }
                }
                break;
        }
        
        return lines;
    }
    
    /**
     * تهشير متقاطع
     */
    crossHatch(polygon, angle1 = 0, angle2 = Math.PI / 2, spacing = 10) {
        const hatch1 = this.hatchPolygon(polygon, 'lines', spacing, angle1);
        const hatch2 = this.hatchPolygon(polygon, 'lines', spacing, angle2);
        
        return [...hatch1, ...hatch2];
    }
    
    // ==================== دوال مساعدة للتحويل ====================
    
    /**
     * تحويل شكل TyrexCAD لمسارات Clipper
     */
    shapeToClipperPaths(shape, scale) {
        switch (shape.type) {
            case 'line':
                // خط مفرد يُحول لمضلع رفيع جداً
                const thickness = 0.01;
                return [this.lineToClipperPath(shape, scale, thickness)];
                
            case 'rectangle':
                return [this.rectangleToClipperPath(shape, scale)];
                
            case 'circle':
                return [this.circleToClipperPath(shape, scale)];
                
            case 'arc':
                return [this.arcToClipperPath(shape, scale)];
                
            case 'ellipse':
                return [this.ellipseToClipperPath(shape, scale)];
                
            case 'polyline':
                if (shape.closed) {
                    return [this.polylineToClipperPath(shape, scale)];
                } else {
                    // خط متعدد مفتوح يُحول لمضلع رفيع
                    return [this.openPolylineToClipperPath(shape, scale)];
                }
                
            case 'polygon':
                return [this.polygonToClipperPath(shape, scale)];
                
            default:
                console.warn(`Unknown shape type: ${shape.type}`);
                return [];
        }
    }
    
    /**
     * تحويل خط لمسار Clipper
     */
    lineToClipperPath(line, scale, thickness = 0.01) {
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len === 0) return [];
        
        const nx = -dy / len * thickness;
        const ny = dx / len * thickness;
        
        return [
            { X: Math.round((line.start.x + nx) * scale), Y: Math.round((line.start.y + ny) * scale) },
            { X: Math.round((line.end.x + nx) * scale), Y: Math.round((line.end.y + ny) * scale) },
            { X: Math.round((line.end.x - nx) * scale), Y: Math.round((line.end.y - ny) * scale) },
            { X: Math.round((line.start.x - nx) * scale), Y: Math.round((line.start.y - ny) * scale) }
        ];
    }
    
    /**
     * تحويل مستطيل لمسار Clipper
     */
    rectangleToClipperPath(rect, scale) {
        return [
            { X: Math.round(rect.start.x * scale), Y: Math.round(rect.start.y * scale) },
            { X: Math.round(rect.end.x * scale), Y: Math.round(rect.start.y * scale) },
            { X: Math.round(rect.end.x * scale), Y: Math.round(rect.end.y * scale) },
            { X: Math.round(rect.start.x * scale), Y: Math.round(rect.end.y * scale) }
        ];
    }
    
    /**
     * تحويل دائرة لمسار Clipper
     */
    circleToClipperPath(circle, scale, segments = 32) {
        const path = [];
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            path.push({
                X: Math.round((circle.center.x + circle.radius * Math.cos(angle)) * scale),
                Y: Math.round((circle.center.y + circle.radius * Math.sin(angle)) * scale)
            });
        }
        
        return path;
    }
    
    /**
     * تحويل قوس لمسار Clipper
     */
    arcToClipperPath(arc, scale, segments = 16) {
        const path = [];
        let angle = arc.startAngle;
        const angleStep = (arc.endAngle - arc.startAngle) / segments;
        
        for (let i = 0; i <= segments; i++) {
            path.push({
                X: Math.round((arc.center.x + arc.radius * Math.cos(angle)) * scale),
                Y: Math.round((arc.center.y + arc.radius * Math.sin(angle)) * scale)
            });
            angle += angleStep;
        }
        
        // إغلاق القوس بالمركز
        path.push({
            X: Math.round(arc.center.x * scale),
            Y: Math.round(arc.center.y * scale)
        });
        
        return path;
    }
    
    /**
     * تحويل شكل بيضاوي لمسار Clipper
     */
    ellipseToClipperPath(ellipse, scale, segments = 32) {
        const path = [];
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            path.push({
                X: Math.round((ellipse.center.x + ellipse.radiusX * Math.cos(angle)) * scale),
                Y: Math.round((ellipse.center.y + ellipse.radiusY * Math.sin(angle)) * scale)
            });
        }
        
        return path;
    }
    
    /**
     * تحويل خط متعدد لمسار Clipper
     */
    polylineToClipperPath(polyline, scale) {
        return polyline.points.map(point => ({
            X: Math.round(point.x * scale),
            Y: Math.round(point.y * scale)
        }));
    }
    
    /**
     * تحويل مضلع لمسار Clipper
     */
    polygonToClipperPath(polygon, scale) {
        const points = polygon.points || this.polygonToPoints(polygon);
        return points.map(point => ({
            X: Math.round(point.x * scale),
            Y: Math.round(point.y * scale)
        }));
    }
    
    /**
     * تحويل مسارات Clipper لأشكال TyrexCAD
     */
    clipperPathsToShapes(paths, scale) {
        return paths.map(path => {
            const points = path.map(p => ({
                x: p.X / scale,
                y: p.Y / scale
            }));
            
            return {
                type: 'polygon',
                points: points,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType,
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
        });
    }
    
    /**
     * تحويل مسار Clipper لمضلع
     */
    clipperPathToPolygon(path, scale) {
        return {
            type: 'polygon',
            points: path.map(p => ({
                x: p.X / scale,
                y: p.Y / scale
            })),
            id: this.cad.generateId()
        };
    }
    
    /**
     * تحويل مسار Clipper لخط متعدد
     */
    clipperPathToPolyline(path, scale) {
        return {
            type: 'polyline',
            points: path.map(p => ({
                x: p.X / scale,
                y: p.Y / scale
            })),
            id: this.cad.generateId()
        };
    }
    
    // ==================== دوال مساعدة هندسية ====================
    
    /**
     * حساب المسافة العمودية من نقطة لخط
     */
    perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        if (dx === 0 && dy === 0) {
            return this.distance(point, lineStart);
        }
        
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
        const closest = {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };
        
        return this.distance(point, closest);
    }
    
    /**
     * حساب المسافة بين نقطتين
     */
    distance(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }
    
    /**
     * تطبيع متجه
     */
    normalize(vector) {
        const len = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (len === 0) return { x: 0, y: 0 };
        return {
            x: vector.x / len,
            y: vector.y / len
        };
    }
    
    /**
     * حساب تقاطع خطين
     */
    lineLineIntersection(p1, p2, p3, p4) {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return null;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }
    
    /**
     * تدوير نقطة حول مركز
     */
    rotatePoint(point, center, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        
        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos
        };
    }
    
    /**
     * نسخ شكل
     */
    cloneShape(shape) {
        return JSON.parse(JSON.stringify(shape));
    }
    
    /**
     * تحريك شكل
     */
    translateShape(shape, dx, dy) {
        switch (shape.type) {
            case 'line':
                shape.start.x += dx;
                shape.start.y += dy;
                shape.end.x += dx;
                shape.end.y += dy;
                break;
            case 'rectangle':
                shape.start.x += dx;
                shape.start.y += dy;
                shape.end.x += dx;
                shape.end.y += dy;
                break;
            case 'circle':
            case 'arc':
            case 'ellipse':
                shape.center.x += dx;
                shape.center.y += dy;
                break;
            case 'polyline':
            case 'polygon':
                shape.points.forEach(p => {
                    p.x += dx;
                    p.y += dy;
                });
                break;
        }
    }
    
    /**
     * تدوير شكل
     */
    rotateShape(shape, center, angle) {
        switch (shape.type) {
            case 'line':
                shape.start = this.rotatePoint(shape.start, center, angle);
                shape.end = this.rotatePoint(shape.end, center, angle);
                break;
            case 'rectangle':
                // تحويل لمضلع للتدوير الصحيح
                const corners = [
                    { x: shape.start.x, y: shape.start.y },
                    { x: shape.end.x, y: shape.start.y },
                    { x: shape.end.x, y: shape.end.y },
                    { x: shape.start.x, y: shape.end.y }
                ];
                shape.type = 'polygon';
                shape.points = corners.map(p => this.rotatePoint(p, center, angle));
                delete shape.start;
                delete shape.end;
                break;
            case 'circle':
            case 'ellipse':
                shape.center = this.rotatePoint(shape.center, center, angle);
                break;
            case 'arc':
                shape.center = this.rotatePoint(shape.center, center, angle);
                shape.startAngle += angle;
                shape.endAngle += angle;
                break;
            case 'polyline':
            case 'polygon':
                shape.points = shape.points.map(p => this.rotatePoint(p, center, angle));
                break;
        }
    }
    
    /**
     * الحصول على حدود الشكل
     */
    getShapeBounds(shape) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        const updateBounds = (x, y) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        };
        
        switch (shape.type) {
            case 'line':
                updateBounds(shape.start.x, shape.start.y);
                updateBounds(shape.end.x, shape.end.y);
                break;
            case 'rectangle':
                updateBounds(shape.start.x, shape.start.y);
                updateBounds(shape.end.x, shape.end.y);
                break;
            case 'circle':
                updateBounds(shape.center.x - shape.radius, shape.center.y - shape.radius);
                updateBounds(shape.center.x + shape.radius, shape.center.y + shape.radius);
                break;
            case 'arc':
                // تقريبي - يمكن تحسينه
                updateBounds(shape.center.x - shape.radius, shape.center.y - shape.radius);
                updateBounds(shape.center.x + shape.radius, shape.center.y + shape.radius);
                break;
            case 'ellipse':
                updateBounds(shape.center.x - shape.radiusX, shape.center.y - shape.radiusY);
                updateBounds(shape.center.x + shape.radiusX, shape.center.y + shape.radiusY);
                break;
            case 'polyline':
            case 'polygon':
                shape.points.forEach(p => updateBounds(p.x, p.y));
                break;
        }
        
        return { minX, minY, maxX, maxY };
    }
    
    /**
     * تحويل مضلع لنقاط
     */
    polygonToPoints(polygon) {
        if (polygon.points) return polygon.points;
        
        // محاولة استخراج النقاط من أنواع أخرى
        if (polygon.type === 'rectangle') {
            return [
                { x: polygon.start.x, y: polygon.start.y },
                { x: polygon.end.x, y: polygon.start.y },
                { x: polygon.end.x, y: polygon.end.y },
                { x: polygon.start.x, y: polygon.end.y }
            ];
        }
        
        return [];
    }
    
    /**
     * تحويل منحنى لخط متعدد
     */
    curveToPolyline(curve, segments) {
        switch (curve.type) {
            case 'arc':
                return this.arcToPolyline(curve, segments);
            case 'circle':
                return this.circleToPolyline(curve, segments);
            case 'ellipse':
                return this.ellipseToPolyline(curve, segments);
            default:
                return curve;
        }
    }
    
    /**
     * تحويل قوس لخط متعدد
     */
    arcToPolyline(arc, segments) {
        const points = [];
        const angleStep = (arc.endAngle - arc.startAngle) / segments;
        
        for (let i = 0; i <= segments; i++) {
            const angle = arc.startAngle + i * angleStep;
            points.push({
                x: arc.center.x + arc.radius * Math.cos(angle),
                y: arc.center.y + arc.radius * Math.sin(angle)
            });
        }
        
        return {
            type: 'polyline',
            points: points,
            id: this.cad.generateId()
        };
    }
    
    /**
     * حساب طول المسار
     */
    calculatePathLength(path) {
        let length = 0;
        
        if (path.type === 'polyline' || path.type === 'polygon') {
            for (let i = 0; i < path.points.length - 1; i++) {
                length += this.distance(path.points[i], path.points[i + 1]);
            }
        }
        
        return length;
    }
    
    /**
     * الحصول على نقطة على مسافة معينة على المسار
     */
    getPointAtDistance(path, targetDistance) {
        let currentDistance = 0;
        
        if (path.type === 'polyline' || path.type === 'polygon') {
            for (let i = 0; i < path.points.length - 1; i++) {
                const segmentLength = this.distance(path.points[i], path.points[i + 1]);
                
                if (currentDistance + segmentLength >= targetDistance) {
                    const t = (targetDistance - currentDistance) / segmentLength;
                    const point = {
                        x: path.points[i].x + t * (path.points[i + 1].x - path.points[i].x),
                        y: path.points[i].y + t * (path.points[i + 1].y - path.points[i].y)
                    };
                    
                    const angle = Math.atan2(
                        path.points[i + 1].y - path.points[i].y,
                        path.points[i + 1].x - path.points[i].x
                    );
                    
                    return { point, angle };
                }
                
                currentDistance += segmentLength;
            }
        }
        
        return null;
    }
    
    /**
     * حساب حاصل الضرب الاتجاهي
     */
    crossProduct(p1, p2, p3) {
        return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    }
    
    /**
     * ترتيب النقاط باتجاه عقارب الساعة
     */
    sortPointsClockwise(points) {
        // حساب المركز
        const center = {
            x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
            y: points.reduce((sum, p) => sum + p.y, 0) / points.length
        };
        
        // ترتيب حسب الزاوية
        return points.sort((a, b) => {
            const angleA = Math.atan2(a.y - center.y, a.x - center.x);
            const angleB = Math.atan2(b.y - center.y, b.x - center.x);
            return angleA - angleB;
        });
    }
    
    /**
     * إنشاء مثلث كبير للـ Delaunay
     */
    createSuperTriangle(points) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const point of points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        const dx = maxX - minX;
        const dy = maxY - minY;
        const deltaMax = Math.max(dx, dy);
        const midx = (minX + maxX) / 2;
        const midy = (minY + maxY) / 2;
        
        return {
            type: 'polygon',
            points: [
                { x: midx - 20 * deltaMax, y: midy - deltaMax },
                { x: midx, y: midy + 20 * deltaMax },
                { x: midx + 20 * deltaMax, y: midy - deltaMax }
            ]
        };
    }
    
    /**
     * فحص إذا كانت النقطة داخل الدائرة المحيطة بالمثلث
     */
    isPointInCircumcircle(point, triangle) {
        const p1 = triangle.points[0];
        const p2 = triangle.points[1];
        const p3 = triangle.points[2];
        
        const ax = p1.x - point.x;
        const ay = p1.y - point.y;
        const bx = p2.x - point.x;
        const by = p2.y - point.y;
        const cx = p3.x - point.x;
        const cy = p3.y - point.y;
        
        return (
            (ax * ax + ay * ay) * (bx * cy - cx * by) -
            (bx * bx + by * by) * (ax * cy - cx * ay) +
            (cx * cx + cy * cy) * (ax * by - bx * ay)
        ) > 0;
    }
    
    /**
     * فحص إذا كان المثلث يحتوي على حافة معينة
     */
    triangleHasEdge(triangle, edge) {
        const points = triangle.points;
        for (let i = 0; i < 3; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % 3];
            
            if ((p1.x === edge[0].x && p1.y === edge[0].y && 
                 p2.x === edge[1].x && p2.y === edge[1].y) ||
                (p1.x === edge[1].x && p1.y === edge[1].y && 
                 p2.x === edge[0].x && p2.y === edge[0].y)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * حساب مركز الدائرة المحيطة
     */
    circumcenter(points) {
        const p1 = points[0];
        const p2 = points[1];
        const p3 = points[2];
        
        const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
        
        if (Math.abs(d) < 0.0001) return null;
        
        const ux = ((p1.x * p1.x + p1.y * p1.y) * (p2.y - p3.y) +
                    (p2.x * p2.x + p2.y * p2.y) * (p3.y - p1.y) +
                    (p3.x * p3.x + p3.y * p3.y) * (p1.y - p2.y)) / d;
                    
        const uy = ((p1.x * p1.x + p1.y * p1.y) * (p3.x - p2.x) +
                    (p2.x * p2.x + p2.y * p2.y) * (p1.x - p3.x) +
                    (p3.x * p3.x + p3.y * p3.y) * (p2.x - p1.x)) / d;
        
        return { x: ux, y: uy };
    }
    
    /**
     * متعدد حدود برنشتاين
     */
    bernsteinPolynomial(n, i, t) {
        const binomial = this.binomialCoefficient(n, i);
        return binomial * Math.pow(t, i) * Math.pow(1 - t, n - i);
    }
    
    /**
     * معامل ثنائي
     */
    binomialCoefficient(n, k) {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    }
    
    /**
     * حساب نقطة B-Spline
     */
    calculateBSplinePoint(controlPoints, degree, knots, t) {
        const n = controlPoints.length - 1;
        let x = 0, y = 0;
        
        for (let i = 0; i <= n; i++) {
            const basis = this.bSplineBasis(i, degree, knots, t);
            x += controlPoints[i].x * basis;
            y += controlPoints[i].y * basis;
        }
        
        return { x, y };
    }
    
    /**
     * دالة أساس B-Spline
     */
    bSplineBasis(i, p, knots, t) {
        if (p === 0) {
            return (t >= knots[i] && t < knots[i + 1]) ? 1 : 0;
        }
        
        let c1 = 0, c2 = 0;
        
        if (knots[i + p] !== knots[i]) {
            c1 = (t - knots[i]) / (knots[i + p] - knots[i]);
        }
        
        if (knots[i + p + 1] !== knots[i + 1]) {
            c2 = (knots[i + p + 1] - t) / (knots[i + p + 1] - knots[i + 1]);
        }
        
        return c1 * this.bSplineBasis(i, p - 1, knots, t) + 
               c2 * this.bSplineBasis(i + 1, p - 1, knots, t);
    }
    
    /**
     * نقطة Catmull-Rom
     */
    catmullRomPoint(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        return {
            x: 0.5 * (
                2 * p1.x +
                (-p0.x + p2.x) * t +
                (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
            ),
            y: 0.5 * (
                2 * p1.y +
                (-p0.y + p2.y) * t +
                (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
            )
        };
    }
    
    /**
     * تحويل جزء قوس لبيزييه
     */
    arcSegmentToBezier(center, radius, startAngle, endAngle) {
        const sweep = endAngle - startAngle;
        const alpha = sweep / 2;
        
        const cos_alpha = Math.cos(alpha);
        const sin_alpha = Math.sin(alpha);
        const cot_alpha = 1 / Math.tan(alpha);
        
        const phi = startAngle + alpha;
        const cos_phi = Math.cos(phi);
        const sin_phi = Math.sin(phi);
        
        const lambda = (4 - cos_alpha) / 3;
        const mu = sin_alpha + (cos_alpha - lambda) * cot_alpha;
        
        return {
            type: 'bezier',
            controlPoints: [
                {
                    x: center.x + radius * Math.cos(startAngle),
                    y: center.y + radius * Math.sin(startAngle)
                },
                {
                    x: center.x + radius * (Math.cos(startAngle) - mu * Math.sin(startAngle)),
                    y: center.y + radius * (Math.sin(startAngle) + mu * Math.cos(startAngle))
                },
                {
                    x: center.x + radius * (Math.cos(endAngle) + mu * Math.sin(endAngle)),
                    y: center.y + radius * (Math.sin(endAngle) - mu * Math.cos(endAngle))
                },
                {
                    x: center.x + radius * Math.cos(endAngle),
                    y: center.y + radius * Math.sin(endAngle)
                }
            ]
        };
    }
    
    /**
     * الحصول على حدود مضلع
     */
    getPolygonBounds(polygon) {
        const points = polygon.points || this.polygonToPoints(polygon);
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const point of points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        return { minX, minY, maxX, maxY };
    }
    
    /**
     * قص خط بمضلع
     */
    clipLineByPolygon(line, polygon) {
        // Sutherland-Hodgman algorithm adaptation
        const intersections = [];
        const edges = this.polygonToEdges(polygon);
        
        // إيجاد كل نقاط التقاطع
        for (const edge of edges) {
            const intersection = this.lineLineIntersection(
                line.start, line.end,
                edge.start, edge.end
            );
            
            if (intersection) {
                const t = this.getParameterOnLine(line.start, line.end, intersection);
                if (t >= 0 && t <= 1) {
                    intersections.push({ point: intersection, t: t });
                }
            }
        }
        
        // ترتيب نقاط التقاطع
        intersections.sort((a, b) => a.t - b.t);
        
        // بناء الأجزاء داخل المضلع
        const segments = [];
        let inside = this.isPointInPolygon(line.start, polygon);
        let lastPoint = line.start;
        
        for (const intersection of intersections) {
            if (inside) {
                segments.push({
                    type: 'line',
                    start: lastPoint,
                    end: intersection.point,
                    id: this.cad.generateId()
                });
            }
            inside = !inside;
            lastPoint = intersection.point;
        }
        
        if (inside) {
            segments.push({
                type: 'line',
                start: lastPoint,
                end: line.end,
                id: this.cad.generateId()
            });
        }
        
        return segments;
    }
    
    /**
     * تحويل مضلع لحواف
     */
    polygonToEdges(polygon) {
        const points = polygon.points || this.polygonToPoints(polygon);
        const edges = [];
        
        for (let i = 0; i < points.length; i++) {
            edges.push({
                start: points[i],
                end: points[(i + 1) % points.length]
            });
        }
        
        return edges;
    }
    
    /**
     * الحصول على معامل t لنقطة على خط
     */
    getParameterOnLine(start, end, point) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            return (point.x - start.x) / dx;
        } else {
            return (point.y - start.y) / dy;
        }
    }
    
    /**
     * فحص إذا كانت النقطة داخل مضلع
     */
    isPointInPolygon(point, polygon) {
        const points = polygon.points || this.polygonToPoints(polygon);
        let inside = false;
        
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
                
            if (intersect) inside = !inside;
        }
        
        return inside;
    }
    
    /**
     * فحص إذا كانت النقطة داخل دائرة
     */
    isPointInCircle(point, circle) {
        const dist = this.distance(point, circle.center);
        return dist <= circle.radius;
    }
    
    /**
     * دائرة بسيطة من نقاط
     */
    trivialCircle(points) {
        if (points.length === 0) return null;
        if (points.length === 1) {
            return {
                center: points[0],
                radius: 0
            };
        }
        if (points.length === 2) {
            return {
                center: {
                    x: (points[0].x + points[1].x) / 2,
                    y: (points[0].y + points[1].y) / 2
                },
                radius: this.distance(points[0], points[1]) / 2
            };
        }
        
        // ثلاث نقاط - دائرة محيطة
        return this.circleFrom3Points(points[0], points[1], points[2]);
    }
    
    /**
     * دائرة من ثلاث نقاط
     */
    circleFrom3Points(p1, p2, p3) {
        const center = this.circumcenter([p1, p2, p3]);
        if (!center) return null;
        
        const radius = this.distance(center, p1);
        return {
            type: 'circle',
            center: center,
            radius: radius,
            id: this.cad.generateId()
        };
    }
    
    /**
     * تسجيل إحصائيات الأداء
     */
    logPerformance() {
        console.log('GeometryAdvanced Performance Stats:');
        console.log(`Cache Hits: ${this.cacheHits}`);
        console.log(`Cache Misses: ${this.cacheMisses}`);
        console.log(`Cache Hit Rate: ${(this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2)}%`);
        console.log(`Cache Size: ${this.cache.size} items`);
    }

    // أضف هذه الدوال في نهاية GeometryAdvanced class قبل closing brace

/**
 * إنشاء مضلع منتظم
 * @param {Object} center - مركز المضلع {x, y}
 * @param {number} radius - نصف قطر المضلع
 * @param {number} sides - عدد الأضلاع
 * @returns {Object} كائن المضلع
 */
createPolygon(center, radius, sides) {
    if (sides < 3) {
        throw new Error('Polygon must have at least 3 sides');
    }
    
    const points = [];
    const angleStep = (2 * Math.PI) / sides;
    
    // إنشاء نقاط المضلع
    for (let i = 0; i < sides; i++) {
        const angle = i * angleStep - Math.PI / 2; // بدء من الأعلى
        points.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
        });
    }
    
    // إغلاق المضلع
    points.push({ ...points[0] });
    
    return {
        type: 'polyline',
        points: points,
        closed: true,
        id: this.cad ? this.cad.generateId() : Math.random().toString(36).substr(2, 9)
    };
}

/**
 * تدوير زاوية بين شكلين (Wrapper للتوافق)
 * @param {Object} shape1 - الشكل الأول
 * @param {Object} shape2 - الشكل الثاني
 * @param {number} radius - نصف قطر التدوير
 * @returns {Object} نتيجة التدوير
 */
async fillet(shape1, shape2, radius) {
    // تحويل الأشكال لخطوط إذا أمكن
    const line1 = this.shapeToLine(shape1);
    const line2 = this.shapeToLine(shape2);
    
    if (!line1 || !line2) {
        return { success: false, message: 'Shapes must be convertible to lines' };
    }
    
    const result = await this.filletCorner(line1, line2, radius);
    
    if (result) {
        return {
            success: true,
            shapes: [result.arc]
        };
    }
    
    return { success: false, message: 'Failed to create fillet' };
}

/**
 * قطع زاوية بين شكلين (Wrapper للتوافق)
 * @param {Object} shape1 - الشكل الأول
 * @param {Object} shape2 - الشكل الثاني
 * @param {number} distance1 - المسافة الأولى
 * @param {number} distance2 - المسافة الثانية
 * @returns {Object} نتيجة القطع
 */
async chamfer(shape1, shape2, distance1, distance2) {
    // تحويل الأشكال لخطوط إذا أمكن
    const line1 = this.shapeToLine(shape1);
    const line2 = this.shapeToLine(shape2);
    
    if (!line1 || !line2) {
        return { success: false, message: 'Shapes must be convertible to lines' };
    }
    
    const result = await this.chamferCorner(line1, line2, distance1);
    
    if (result) {
        return {
            success: true,
            shapes: [result.line]
        };
    }
    
    return { success: false, message: 'Failed to create chamfer' };
}

/**
 * حساب المسافة بين شكلين
 * @param {Object} shape1 - الشكل الأول
 * @param {Object} shape2 - الشكل الثاني
 * @returns {Object} المسافة ونقاط القياس
 */
calculateDistance(shape1, shape2) {
    let minDistance = Infinity;
    let point1 = null;
    let point2 = null;
    
    // الحصول على نقاط من كل شكل
    const points1 = this.getShapePoints(shape1);
    const points2 = this.getShapePoints(shape2);
    
    // حساب أقل مسافة
    for (const p1 of points1) {
        for (const p2 of points2) {
            const dist = this.distance(p1, p2);
            if (dist < minDistance) {
                minDistance = dist;
                point1 = p1;
                point2 = p2;
            }
        }
    }
    
    // معالجة خاصة للدوائر
    if (shape1.type === 'circle' && shape2.type === 'circle') {
        const centerDist = this.distance(shape1.center, shape2.center);
        minDistance = Math.max(0, centerDist - shape1.radius - shape2.radius);
        
        const angle = Math.atan2(
            shape2.center.y - shape1.center.y,
            shape2.center.x - shape1.center.x
        );
        
        point1 = {
            x: shape1.center.x + shape1.radius * Math.cos(angle),
            y: shape1.center.y + shape1.radius * Math.sin(angle)
        };
        
        point2 = {
            x: shape2.center.x - shape2.radius * Math.cos(angle),
            y: shape2.center.y - shape2.radius * Math.sin(angle)
        };
    }
    
    return {
        distance: minDistance,
        point1: point1,
        point2: point2
    };
}

/**
 * حساب مساحة الشكل
 * @param {Object} shape - الشكل
 * @returns {number} المساحة
 */
calculateArea(shape) {
    switch (shape.type) {
        case 'circle':
            return Math.PI * shape.radius * shape.radius;
            
        case 'ellipse':
            return Math.PI * shape.radiusX * shape.radiusY;
            
        case 'rectangle':
            const width = Math.abs(shape.end.x - shape.start.x);
            const height = Math.abs(shape.end.y - shape.start.y);
            return width * height;
            
        case 'polygon':
        case 'polyline':
            if (shape.closed || shape.type === 'polygon') {
                return this.calculatePolygonArea(shape.points);
            }
            return 0;
            
        case 'arc':
            // مساحة القطاع الدائري
            const angleDiff = shape.endAngle - shape.startAngle;
            return 0.5 * shape.radius * shape.radius * angleDiff;
            
        default:
            return 0;
    }
}

/**
 * حساب مساحة مضلع
 * @param {Array} points - نقاط المضلع
 * @returns {number} المساحة
 */
calculatePolygonArea(points) {
    let area = 0;
    const n = points.length;
    
    for (let i = 0; i < n - 1; i++) {
        area += points[i].x * points[i + 1].y;
        area -= points[i + 1].x * points[i].y;
    }
    
    // إغلاق المضلع إذا لم يكن مغلقاً
    if (points[0].x !== points[n-1].x || points[0].y !== points[n-1].y) {
        area += points[n - 1].x * points[0].y;
        area -= points[0].x * points[n - 1].y;
    }
    
    return Math.abs(area) / 2;
}

/**
 * الحصول على خصائص الشكل
 * @param {Object} shape - الشكل
 * @returns {Object} خصائص الشكل
 */
getShapeProperties(shape) {
    const props = {
        type: shape.type,
        perimeter: this.calculatePerimeter(shape),
        area: this.calculateArea(shape),
        centroid: this.calculateCentroid(shape),
        boundingBox: this.getShapeBounds(shape)
    };
    
    // حساب العرض والارتفاع من الحدود
    if (props.boundingBox) {
        props.boundingBox.width = props.boundingBox.maxX - props.boundingBox.minX;
        props.boundingBox.height = props.boundingBox.maxY - props.boundingBox.minY;
    }
    
    return props;
}

/**
 * حساب محيط الشكل
 * @param {Object} shape - الشكل
 * @returns {number} المحيط
 */
calculatePerimeter(shape) {
    switch (shape.type) {
        case 'circle':
            return 2 * Math.PI * shape.radius;
            
        case 'ellipse':
            // تقريب Ramanujan
            const a = shape.radiusX;
            const b = shape.radiusY;
            const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
            return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
            
        case 'rectangle':
            const width = Math.abs(shape.end.x - shape.start.x);
            const height = Math.abs(shape.end.y - shape.start.y);
            return 2 * (width + height);
            
        case 'line':
            return this.distance(shape.start, shape.end);
            
        case 'polyline':
        case 'polygon':
            let perimeter = 0;
            for (let i = 0; i < shape.points.length - 1; i++) {
                perimeter += this.distance(shape.points[i], shape.points[i + 1]);
            }
            return perimeter;
            
        case 'arc':
            return shape.radius * Math.abs(shape.endAngle - shape.startAngle);
            
        default:
            return 0;
    }
}

/**
 * حساب مركز الكتلة للشكل
 * @param {Object} shape - الشكل
 * @returns {Object} مركز الكتلة {x, y}
 */
calculateCentroid(shape) {
    switch (shape.type) {
        case 'circle':
        case 'arc':
        case 'ellipse':
            return { ...shape.center };
            
        case 'rectangle':
            return {
                x: (shape.start.x + shape.end.x) / 2,
                y: (shape.start.y + shape.end.y) / 2
            };
            
        case 'line':
            return {
                x: (shape.start.x + shape.end.x) / 2,
                y: (shape.start.y + shape.end.y) / 2
            };
            
        case 'polygon':
        case 'polyline':
            if (shape.points.length === 0) return { x: 0, y: 0 };
            
            if (shape.type === 'polyline' && !shape.closed) {
                // مركز كتلة خط متعدد مفتوح
                let sumX = 0, sumY = 0;
                for (const point of shape.points) {
                    sumX += point.x;
                    sumY += point.y;
                }
                return {
                    x: sumX / shape.points.length,
                    y: sumY / shape.points.length
                };
            } else {
                // مركز كتلة مضلع مغلق
                return this.calculatePolygonCentroid(shape.points);
            }
            
        default:
            return { x: 0, y: 0 };
    }
}

/**
 * حساب مركز كتلة مضلع
 * @param {Array} points - نقاط المضلع
 * @returns {Object} مركز الكتلة {x, y}
 */
calculatePolygonCentroid(points) {
    let area = 0;
    let cx = 0;
    let cy = 0;
    const n = points.length;
    
    for (let i = 0; i < n - 1; i++) {
        const cross = points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
        area += cross;
        cx += (points[i].x + points[i + 1].x) * cross;
        cy += (points[i].y + points[i + 1].y) * cross;
    }
    
    // إغلاق المضلع إذا لم يكن مغلقاً
    if (points[0].x !== points[n-1].x || points[0].y !== points[n-1].y) {
        const cross = points[n - 1].x * points[0].y - points[0].x * points[n - 1].y;
        area += cross;
        cx += (points[n - 1].x + points[0].x) * cross;
        cy += (points[n - 1].y + points[0].y) * cross;
    }
    
    area *= 0.5;
    
    if (Math.abs(area) < 0.0001) {
        // إذا كانت المساحة صفر، استخدم المتوسط البسيط
        let sumX = 0, sumY = 0;
        for (const point of points) {
            sumX += point.x;
            sumY += point.y;
        }
        return {
            x: sumX / points.length,
            y: sumY / points.length
        };
    }
    
    return {
        x: cx / (6 * area),
        y: cy / (6 * area)
    };
}

/**
 * تبسيط خط متعدد (Wrapper للتوافق)
 * @param {Object} polyline - الخط المتعدد
 * @param {Object} options - خيارات التبسيط
 * @returns {Object} الخط المبسط
 */
simplifyPolyline(polyline, options = {}) {
    const tolerance = options.tolerance || 1;
    
    // استخدم دالة التبسيط الموجودة
    const simplified = this.douglasPeucker(polyline.points, tolerance);
    
    return {
        type: 'polyline',
        points: simplified,
        closed: polyline.closed || false,
        id: this.cad ? this.cad.generateId() : polyline.id
    };
}

/**
 * تحويل منحنى لخط متعدد (تحديث للتوافق)
 * @param {Object} curve - المنحنى
 * @param {Object} options - خيارات التحويل
 * @returns {Object} الخط المتعدد
 */
curveToPolyline(curve, options = {}) {
    const segments = options.segments || 32;
    
    switch (curve.type) {
        case 'arc':
            return this.arcToPolyline(curve, segments);
        case 'circle':
            return this.circleToPolyline(curve, segments);
        case 'ellipse':
            return this.ellipseToPolyline(curve, segments);
        default:
            return curve;
    }
}

/**
 * تحويل دائرة لخط متعدد
 * @param {Object} circle - الدائرة
 * @param {number} segments - عدد القطع
 * @returns {Object} الخط المتعدد
 */
circleToPolyline(circle, segments) {
    const points = [];
    const angleStep = (2 * Math.PI) / segments;
    
    for (let i = 0; i <= segments; i++) {
        const angle = i * angleStep;
        points.push({
            x: circle.center.x + circle.radius * Math.cos(angle),
            y: circle.center.y + circle.radius * Math.sin(angle)
        });
    }
    
    return {
        type: 'polyline',
        points: points,
        closed: true,
        id: this.cad ? this.cad.generateId() : Math.random().toString(36).substr(2, 9)
    };
}

/**
 * تحويل شكل بيضاوي لخط متعدد
 * @param {Object} ellipse - الشكل البيضاوي
 * @param {number} segments - عدد القطع
 * @returns {Object} الخط المتعدد
 */
ellipseToPolyline(ellipse, segments) {
    const points = [];
    const angleStep = (2 * Math.PI) / segments;
    
    for (let i = 0; i <= segments; i++) {
        const angle = i * angleStep;
        points.push({
            x: ellipse.center.x + ellipse.radiusX * Math.cos(angle),
            y: ellipse.center.y + ellipse.radiusY * Math.sin(angle)
        });
    }
    
    return {
        type: 'polyline',
        points: points,
        closed: true,
        id: this.cad ? this.cad.generateId() : Math.random().toString(36).substr(2, 9)
    };
}

/**
 * مصفوفة مستطيلة (تحديث للتوافق)
 * @param {Array} shapes - الأشكال المراد نسخها
 * @param {Object} options - خيارات المصفوفة
 * @returns {Array} الأشكال الجديدة
 */
rectangularArray(shapes, options) {
    const rows = options.rows || 1;
    const columns = options.columns || 1;
    const rowSpacing = options.rowSpacing || 10;
    const columnSpacing = options.columnSpacing || 10;
    
    const result = [];
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            if (row === 0 && col === 0) continue; // تخطي الأصل
            
            shapes.forEach(shape => {
                const copy = this.cloneShape(shape);
                const dx = col * columnSpacing;
                const dy = row * rowSpacing;
                
                this.translateShape(copy, dx, dy);
                copy.id = this.cad ? this.cad.generateId() : Math.random().toString(36).substr(2, 9);
                result.push(copy);
            });
        }
    }
    
    return result;
}

/**
 * مصفوفة قطبية (تحديث للتوافق)
 * @param {Array} shapes - الأشكال المراد نسخها
 * @param {Object} options - خيارات المصفوفة
 * @returns {Array} الأشكال الجديدة
 */
polarArray(shapes, options) {
    const center = options.center;
    const count = options.count || 6;
    const angle = (options.angle || 360) * Math.PI / 180;
    const rotateItems = options.rotateItems !== false;
    
    const result = [];
    const angleStep = angle / count;
    
    for (let i = 1; i < count; i++) { // البدء من 1 لتخطي الأصل
        const currentAngle = i * angleStep;
        
        shapes.forEach(shape => {
            const copy = this.cloneShape(shape);
            
            // تدوير حول المركز
            this.rotateShape(copy, center, currentAngle);
            
            // تدوير الشكل نفسه إذا مطلوب
            if (rotateItems) {
                const shapeBounds = this.getShapeBounds(copy);
                const shapeCenter = {
                    x: (shapeBounds.minX + shapeBounds.maxX) / 2,
                    y: (shapeBounds.minY + shapeBounds.maxY) / 2
                };
                this.rotateShape(copy, shapeCenter, currentAngle);
            }
            
            copy.id = this.cad ? this.cad.generateId() : Math.random().toString(36).substr(2, 9);
            result.push(copy);
        });
    }
    
    return result;
}

/**
 * مصفوفة على مسار (تحديث للتوافق)
 * @param {Array} shapes - الأشكال المراد نسخها
 * @param {Object} path - المسار
 * @param {Object} options - خيارات المصفوفة
 * @returns {Array} الأشكال الجديدة
 */
pathArray(shapes, path, options) {
    const count = options.count || 10;
    const alignToPath = options.alignToPath !== false;
    
    const result = [];
    const pathLength = this.calculatePathLength(path);
    const step = pathLength / (count - 1);
    
    for (let i = 0; i < count; i++) {
        const distance = i * step;
        const position = this.getPointAtDistance(path, distance);
        
        if (!position) continue;
        
        shapes.forEach(shape => {
            const copy = this.cloneShape(shape);
            
            // تحريك للموضع
            const bounds = this.getShapeBounds(shape);
            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;
            
            this.translateShape(
                copy, 
                position.point.x - centerX, 
                position.point.y - centerY
            );
            
            // محاذاة مع المسار إذا مطلوب
            if (alignToPath && position.angle !== undefined) {
                this.rotateShape(copy, position.point, position.angle);
            }
            
            copy.id = this.cad ? this.cad.generateId() : Math.random().toString(36).substr(2, 9);
            result.push(copy);
        });
    }
    
    return result;
}

/**
 * طرح شكل من آخر (Wrapper للتوافق مع الإصدارات القديمة)
 * @param {Object} subject - الشكل الأساسي
 * @param {Object|Array} clips - الشكل أو الأشكال المطروحة
 * @returns {Array} الأشكال الناتجة
 */
async differenceWrapper(subject, clips) {
    // تحويل لمصفوفة إذا لم تكن كذلك
    const clipsArray = Array.isArray(clips) ? clips : [clips];
    
    // استدعاء الدالة الأصلية
    return await this.difference(subject, clipsArray);
}

// ==================== دوال مساعدة ====================

/**
 * تحويل شكل لخط
 * @param {Object} shape - الشكل
 * @returns {Object|null} الخط أو null
 */
shapeToLine(shape) {
    if (shape.type === 'line') {
        return shape;
    }
    
    if (shape.type === 'polyline' && shape.points.length >= 2) {
        return {
            type: 'line',
            start: shape.points[0],
            end: shape.points[shape.points.length - 1]
        };
    }
    
    if (shape.type === 'rectangle') {
        // استخدم أول ضلع من المستطيل
        return {
            type: 'line',
            start: { x: shape.start.x, y: shape.start.y },
            end: { x: shape.end.x, y: shape.start.y }
        };
    }
    
    return null;
}

/**
 * الحصول على نقاط من الشكل
 * @param {Object} shape - الشكل
 * @returns {Array} مصفوفة النقاط
 */
getShapePoints(shape) {
    const points = [];
    
    switch (shape.type) {
        case 'line':
            points.push(shape.start, shape.end);
            break;
            
        case 'rectangle':
            points.push(
                { x: shape.start.x, y: shape.start.y },
                { x: shape.end.x, y: shape.start.y },
                { x: shape.end.x, y: shape.end.y },
                { x: shape.start.x, y: shape.end.y }
            );
            break;
            
        case 'circle':
            // نقاط على محيط الدائرة
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                points.push({
                    x: shape.center.x + shape.radius * Math.cos(angle),
                    y: shape.center.y + shape.radius * Math.sin(angle)
                });
            }
            break;
            
        case 'polyline':
        case 'polygon':
            points.push(...shape.points);
            break;
            
        case 'arc':
            // نقاط على القوس
            const angleRange = shape.endAngle - shape.startAngle;
            for (let i = 0; i <= 8; i++) {
                const angle = shape.startAngle + (i / 8) * angleRange;
                points.push({
                    x: shape.center.x + shape.radius * Math.cos(angle),
                    y: shape.center.y + shape.radius * Math.sin(angle)
                });
            }
            break;
            
        case 'ellipse':
            // نقاط على محيط الشكل البيضاوي
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                points.push({
                    x: shape.center.x + shape.radiusX * Math.cos(angle),
                    y: shape.center.y + shape.radiusY * Math.sin(angle)
                });
            }
            break;
    }
    
    return points;
}

}

// تصدير الكلاس
export { GeometryAdvanced };

// جعله متاح globally للتوافق مع الكود القديم
window.GeometryAdvanced = GeometryAdvanced;