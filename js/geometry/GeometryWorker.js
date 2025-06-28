/**
 * TyrexCAD GeometryWorker
 * Web Worker للعمليات الهندسية الثقيلة
 * 
 * يعمل في thread منفصل لتحسين الأداء
 * يدعم جميع العمليات المعقدة دون التأثير على واجهة المستخدم
 */

// حالة الـ Worker
const state = {
    initialized: false,
    libraries: {
        clipper: null,
        earcut: null
    },
    cache: new Map(),
    cacheMaxSize: 50,
    performance: {
        operationCount: 0,
        totalTime: 0,
        averageTime: 0
    }
};

// ==================== تحميل المكتبات ====================

/**
 * تحميل المكتبات المطلوبة ديناميكياً
 */
async function loadLibraries() {
    try {
        // تحميل ClipperLib
        const clipperResponse = await fetch('/js/lib/clipper.js');
        const clipperCode = await clipperResponse.text();
        
        // تنفيذ الكود في السياق الحالي
        const clipperFunc = new Function(clipperCode + '\n return ClipperLib;');
        state.libraries.clipper = clipperFunc();
        
        // تحميل Earcut
        const earcutResponse = await fetch('/js/lib/earcut.min.js');
        const earcutCode = await earcutResponse.text();
        
        // Earcut يصدر نفسه كـ module.exports أو window.earcut
        const earcutFunc = new Function('module', earcutCode + '\n return module.exports || earcut;');
        state.libraries.earcut = earcutFunc({ exports: {} });
        
        console.log('✅ Libraries loaded in worker');
        return true;
    } catch (error) {
        console.error('Failed to load libraries in worker:', error);
        return false;
    }
}

// ==================== التهيئة ====================

/**
 * تهيئة Worker
 */
async function initialize() {
    if (state.initialized) return;
    
    try {
        // تحميل المكتبات
        const librariesLoaded = await loadLibraries();
        
        if (!librariesLoaded) {
            throw new Error('Failed to load required libraries');
        }
        
        state.initialized = true;
        
        self.postMessage({
            type: 'ready',
            status: 'Worker initialized successfully',
            libraries: ['clipper', 'earcut']
        });
        
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message,
            status: 'initialization_failed'
        });
    }
}

// بدء التهيئة عند تحميل Worker
initialize();

// ==================== معالج الرسائل الرئيسي ====================

self.addEventListener('message', async (event) => {
    const { id, operation, data } = event.data;
    
    if (!state.initialized) {
        initialize();
    }
    
    const startTime = performance.now();
    
    try {
        let result;
        
        // تحقق من الـ cache أولاً
        const cacheKey = generateCacheKey(operation, data);
        if (state.cache.has(cacheKey)) {
            result = state.cache.get(cacheKey);
            
            self.postMessage({
                type: 'result',
                id: id,
                result: result,
                cached: true,
                executionTime: 0
            });
            return;
        }
        
        // تنفيذ العملية المطلوبة
        switch (operation) {
            // العمليات البوليانية
            case 'union':
                result = performUnion(data.shapes, data.scale || 100000);
                break;
                
            case 'difference':
                result = performDifference(data.subject, data.clips, data.scale || 100000);
                break;
                
            case 'intersection':
                result = performIntersection(data.shapes, data.scale || 100000);
                break;
                
            case 'xor':
                result = performXor(data.shape1, data.shape2, data.scale || 100000);
                break;
                
            // عمليات Offset
            case 'offsetPolygon':
                result = performOffsetPolygon(data.polygon, data.distance, data.scale || 100000);
                break;
                
            case 'offsetPolyline':
                result = performOffsetPolyline(data.polyline, data.distance, data.scale || 100000);
                break;
                
            case 'offsetMultiple':
                result = performOffsetMultiple(data.shapes, data.distance, data.scale || 100000);
                break;
                
            // التثليث
            case 'triangulate':
                result = performTriangulation(data.polygon);
                break;
                
            case 'triangulateMultiple':
                result = performTriangulationMultiple(data.polygons);
                break;
                
            // التبسيط
            case 'simplify':
                result = performSimplify(data.points, data.tolerance);
                break;
                
            case 'simplifyMultiple':
                result = performSimplifyMultiple(data.shapes, data.tolerance);
                break;
                
            // العمليات المعقدة
            case 'convexHull':
                result = performConvexHull(data.points);
                break;
                
            case 'delaunay':
                result = performDelaunayTriangulation(data.points);
                break;
                
            case 'voronoi':
                result = performVoronoi(data.points, data.bounds);
                break;
                
            // Pattern operations
            case 'rectangularArray':
                result = performRectangularArray(data.shape, data.rows, data.cols, data.spacing);
                break;
                
            case 'polarArray':
                result = performPolarArray(data.shape, data.center, data.count, data.angle);
                break;
                
            // Batch operations
            case 'batchUnion':
                result = performBatchUnion(data.groups, data.scale || 100000);
                break;
                
            case 'batchOffset':
                result = performBatchOffset(data.shapes, data.distances, data.scale || 100000);
                break;
                
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
        
        // حفظ في الـ cache
        state.cache.set(cacheKey, result);
        cleanCache();
        
        const executionTime = performance.now() - startTime;
        updatePerformanceStats(executionTime);
        
        self.postMessage({
            type: 'result',
            id: id,
            result: result,
            cached: false,
            executionTime: executionTime,
            performance: state.performance
        });
        
    } catch (error) {
        self.postMessage({
            type: 'error',
            id: id,
            error: error.message,
            stack: error.stack
        });
    }
});

// ==================== العمليات البوليانية ====================

/**
 * دمج الأشكال (Union)
 */
function performUnion(shapes, scale) {
    const ClipperLib = state.libraries.clipper;
    if (!ClipperLib) {
        throw new Error('Clipper library not loaded');
    }
    
    const clipper = new ClipperLib.Clipper();
    
    // تحويل كل الأشكال لمسارات Clipper
    shapes.forEach(shape => {
        const paths = shapeToClipperPaths(shape, scale);
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
    return clipperPathsToShapes(solution, scale);
}

/**
 * طرح الأشكال (Difference)
 */
function performDifference(subject, clips, scale) {
    const ClipperLib = state.libraries.clipper;
    if (!ClipperLib) {
        throw new Error('Clipper library not loaded');
    }
    
    const clipper = new ClipperLib.Clipper();
    
    // إضافة الشكل الأساسي
    const subjectPaths = shapeToClipperPaths(subject, scale);
    subjectPaths.forEach(path => {
        clipper.AddPath(
            path,
            ClipperLib.PolyType.ptSubject,
            true
        );
    });
    
    // إضافة الأشكال المطروحة
    clips.forEach(clip => {
        const clipPaths = shapeToClipperPaths(clip, scale);
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
    
    return clipperPathsToShapes(solution, scale);
}

/**
 * تقاطع الأشكال (Intersection)
 */
function performIntersection(shapes, scale) {
    if (shapes.length < 2) return [];
    
    const ClipperLib = state.libraries.clipper;
    if (!ClipperLib) {
        throw new Error('Clipper library not loaded');
    }
    
    // البدء بأول شكلين
    let result = intersectPair(shapes[0], shapes[1], scale);
    
    // تقاطع تدريجي مع باقي الأشكال
    for (let i = 2; i < shapes.length; i++) {
        if (result.length === 0) break;
        result = intersectPair(result[0], shapes[i], scale);
    }
    
    return result;
}

/**
 * تقاطع شكلين
 */
function intersectPair(shape1, shape2, scale) {
    const ClipperLib = state.libraries.clipper;
    const clipper = new ClipperLib.Clipper();
    
    // إضافة الشكل الأول
    const paths1 = shapeToClipperPaths(shape1, scale);
    paths1.forEach(path => {
        clipper.AddPath(
            path,
            ClipperLib.PolyType.ptSubject,
            true
        );
    });
    
    // إضافة الشكل الثاني
    const paths2 = shapeToClipperPaths(shape2, scale);
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
    
    return clipperPathsToShapes(solution, scale);
}

/**
 * الفرق المتماثل (XOR)
 */
function performXor(shape1, shape2, scale) {
    const ClipperLib = state.libraries.clipper;
    if (!ClipperLib) {
        throw new Error('Clipper library not loaded');
    }
    
    const clipper = new ClipperLib.Clipper();
    
    // إضافة الأشكال
    const paths1 = shapeToClipperPaths(shape1, scale);
    paths1.forEach(path => {
        clipper.AddPath(
            path,
            ClipperLib.PolyType.ptSubject,
            true
        );
    });
    
    const paths2 = shapeToClipperPaths(shape2, scale);
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
    
    return clipperPathsToShapes(solution, scale);
}

// ==================== عمليات Offset ====================

/**
 * إزاحة مضلع
 */
function performOffsetPolygon(polygon, distance, scale) {
    const ClipperLib = state.libraries.clipper;
    if (!ClipperLib) {
        throw new Error('Clipper library not loaded');
    }
    
    const offset = new ClipperLib.ClipperOffset();
    
    // تحويل المضلع
    const path = polygonToClipperPath(polygon, scale);
    
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
    
    return solution.map(path => clipperPathToPolygon(path, scale));
}

/**
 * إزاحة خط متعدد
 */
function performOffsetPolyline(polyline, distance, scale) {
    const ClipperLib = state.libraries.clipper;
    if (!ClipperLib) {
        throw new Error('Clipper library not loaded');
    }
    
    const offset = new ClipperLib.ClipperOffset();
    
    // تحويل الخط المتعدد
    const path = polylineToClipperPath(polyline, scale);
    
    // إضافة المسار كخط مفتوح
    offset.AddPath(
        path,
        ClipperLib.JoinType.jtRound,
        ClipperLib.EndType.etOpenRound
    );
    
    // تنفيذ الإزاحة
    const solution = new ClipperLib.Paths();
    offset.Execute(solution, distance * scale);
    
    return solution.map(path => clipperPathToPolyline(path, scale));
}

/**
 * إزاحة متعددة للأشكال
 */
function performOffsetMultiple(shapes, distance, scale) {
    const results = [];
    
    shapes.forEach(shape => {
        if (shape.type === 'polygon' || shape.type === 'rectangle') {
            const offset = performOffsetPolygon(shape, distance, scale);
            results.push(...offset);
        } else if (shape.type === 'polyline') {
            const offset = performOffsetPolyline(shape, distance, scale);
            results.push(...offset);
        } else if (shape.type === 'circle') {
            // دائرة بسيطة - زيادة/نقص نصف القطر
            results.push({
                ...shape,
                radius: shape.radius + distance,
                id: generateId()
            });
        }
    });
    
    return results;
}

// ==================== التثليث ====================

/**
 * تثليث مضلع
 */
function performTriangulation(polygon) {
    const earcut = state.libraries.earcut;
    if (!earcut) {
        throw new Error('Earcut library not loaded');
    }
    
    // تحضير البيانات لـ earcut
    const vertices = [];
    const points = polygon.points || polygonToPoints(polygon);
    
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
            id: generateId()
        };
        result.push(triangle);
    }
    
    return result;
}

/**
 * تثليث مضلعات متعددة
 */
function performTriangulationMultiple(polygons) {
    const results = [];
    
    polygons.forEach(polygon => {
        const triangles = performTriangulation(polygon);
        results.push(...triangles);
    });
    
    return results;
}

// ==================== التبسيط ====================

/**
 * تبسيط مضلع (Douglas-Peucker)
 */
function performSimplify(points, tolerance) {
    if (points.length <= 2) return points;
    
    return douglasPeucker(points, tolerance);
}

/**
 * خوارزمية Douglas-Peucker
 */
function douglasPeucker(points, tolerance) {
    if (points.length <= 2) return points;
    
    // إيجاد النقطة الأبعد
    let maxDistance = 0;
    let maxIndex = 0;
    
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    
    for (let i = 1; i < points.length - 1; i++) {
        const distance = perpendicularDistance(
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
        const firstHalf = douglasPeucker(
            points.slice(0, maxIndex + 1),
            tolerance
        );
        
        const secondHalf = douglasPeucker(
            points.slice(maxIndex),
            tolerance
        );
        
        return firstHalf.slice(0, -1).concat(secondHalf);
    } else {
        return [firstPoint, lastPoint];
    }
}

/**
 * تبسيط أشكال متعددة
 */
function performSimplifyMultiple(shapes, tolerance) {
    const results = [];
    
    shapes.forEach(shape => {
        if (shape.type === 'polygon' || shape.type === 'polyline') {
            const simplified = performSimplify(shape.points, tolerance);
            results.push({
                ...shape,
                points: simplified,
                id: generateId()
            });
        } else {
            results.push(shape);
        }
    });
    
    return results;
}

// ==================== العمليات المعقدة ====================

/**
 * الغلاف المحدب (Graham Scan)
 */
function performConvexHull(points) {
    if (points.length < 3) return points;
    
    // إيجاد أدنى نقطة
    let lowest = points[0];
    for (const point of points) {
        if (point.y < lowest.y || 
            (point.y === lowest.y && point.x < lowest.x)) {
            lowest = point;
        }
    }
    
    // ترتيب النقاط حسب الزاوية
    const sorted = points.slice().sort((a, b) => {
        if (a === lowest) return -1;
        if (b === lowest) return 1;
        
        const angleA = Math.atan2(a.y - lowest.y, a.x - lowest.x);
        const angleB = Math.atan2(b.y - lowest.y, b.x - lowest.x);
        
        if (angleA !== angleB) return angleA - angleB;
        
        // نفس الزاوية، الأقرب أولاً
        const distA = distance(a, lowest);
        const distB = distance(b, lowest);
        return distA - distB;
    });
    
    // بناء الغلاف
    const hull = [];
    
    for (const point of sorted) {
        while (hull.length > 1) {
            const last = hull[hull.length - 1];
            const secondLast = hull[hull.length - 2];
            
            if (crossProduct(secondLast, last, point) <= 0) {
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
        id: generateId()
    };
}

/**
 * تثليث Delaunay
 */
function performDelaunayTriangulation(points) {
    // Bowyer-Watson algorithm
    const triangles = [];
    
    // مثلث كبير يحتوي كل النقاط
    const superTriangle = createSuperTriangle(points);
    triangles.push(superTriangle);
    
    // إضافة نقطة تلو الأخرى
    for (const point of points) {
        const badTriangles = [];
        
        // إيجاد المثلثات التي تنتهك شرط Delaunay
        for (const triangle of triangles) {
            if (isPointInCircumcircle(point, triangle)) {
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
                    if (triangleHasEdge(other, edge)) {
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
                id: generateId()
            };
            triangles.push(newTriangle);
        }
    }
    
    // إزالة المثلثات المتصلة بالمثلث الكبير
    return triangles.filter(triangle => {
        return !triangle.points.some(p => 
            superTriangle.points.some(sp => 
                sp.x === p.x && sp.y === p.y
            )
        );
    });
}

/**
 * مخطط Voronoi
 */
function performVoronoi(points, bounds) {
    // الحصول على تثليث Delaunay أولاً
    const triangulation = performDelaunayTriangulation(points);
    
    // حساب مراكز الدوائر المحيطة
    const circumcenters = new Map();
    triangulation.forEach((triangle, index) => {
        const center = circumcenter(triangle.points);
        circumcenters.set(index, center);
    });
    
    // بناء خلايا Voronoi
    const cells = [];
    
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
            const sorted = sortPointsClockwise(cell);
            
            // قص الخلية بالحدود إذا وُجدت
            let finalCell = {
                type: 'polygon',
                points: sorted,
                id: generateId()
            };
            
            if (bounds) {
                const clipped = clipPolygonByBounds(finalCell, bounds);
                if (clipped) {
                    cells.push(clipped);
                }
            } else {
                cells.push(finalCell);
            }
        }
    });
    
    return cells;
}

// ==================== Pattern Operations ====================

/**
 * مصفوفة مستطيلة
 */
function performRectangularArray(shape, rows, cols, spacing) {
    const result = [];
    const { rowSpacing, colSpacing } = spacing;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const copy = cloneShape(shape);
            
            // تحريك النسخة
            const dx = col * colSpacing;
            const dy = row * rowSpacing;
            
            translateShape(copy, dx, dy);
            copy.id = generateId();
            result.push(copy);
        }
    }
    
    return result;
}

/**
 * مصفوفة قطبية
 */
function performPolarArray(shape, center, count, totalAngle) {
    const result = [];
    const angleStep = totalAngle / count;
    
    for (let i = 0; i < count; i++) {
        const copy = cloneShape(shape);
        const angle = i * angleStep;
        
        // تدوير حول المركز
        rotateShape(copy, center, angle);
        copy.id = generateId();
        result.push(copy);
    }
    
    return result;
}

// ==================== Batch Operations ====================

/**
 * دمج مجموعات متعددة
 */
function performBatchUnion(groups, scale) {
    const results = [];
    
    groups.forEach(group => {
        const union = performUnion(group.shapes, scale);
        results.push({
            groupId: group.id,
            result: union
        });
    });
    
    return results;
}

/**
 * إزاحة متعددة لأشكال متعددة
 */
function performBatchOffset(shapes, distances, scale) {
    const results = [];
    
    shapes.forEach((shape, shapeIndex) => {
        const shapeResults = [];
        
        distances.forEach(distance => {
            let offset;
            
            if (shape.type === 'polygon' || shape.type === 'rectangle') {
                offset = performOffsetPolygon(shape, distance, scale);
            } else if (shape.type === 'polyline') {
                offset = performOffsetPolyline(shape, distance, scale);
            } else if (shape.type === 'circle') {
                offset = [{
                    ...shape,
                    radius: shape.radius + distance,
                    id: generateId()
                }];
            }
            
            shapeResults.push(...(offset || []));
        });
        
        results.push({
            shapeIndex: shapeIndex,
            offsets: shapeResults
        });
    });
    
    return results;
}

// ==================== دوال مساعدة للتحويل ====================

/**
 * تحويل شكل لمسارات Clipper
 */
function shapeToClipperPaths(shape, scale) {
    switch (shape.type) {
        case 'line':
            return [lineToClipperPath(shape, scale)];
            
        case 'rectangle':
            return [rectangleToClipperPath(shape, scale)];
            
        case 'circle':
            return [circleToClipperPath(shape, scale)];
            
        case 'arc':
            return [arcToClipperPath(shape, scale)];
            
        case 'ellipse':
            return [ellipseToClipperPath(shape, scale)];
            
        case 'polyline':
            if (shape.closed) {
                return [polylineToClipperPath(shape, scale)];
            } else {
                return [openPolylineToClipperPath(shape, scale)];
            }
            
        case 'polygon':
            return [polygonToClipperPath(shape, scale)];
            
        default:
            console.warn(`Unknown shape type: ${shape.type}`);
            return [];
    }
}

/**
 * تحويل خط لمسار Clipper
 */
function lineToClipperPath(line, scale, thickness = 0.01) {
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
function rectangleToClipperPath(rect, scale) {
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
function circleToClipperPath(circle, scale, segments = 32) {
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
function arcToClipperPath(arc, scale, segments = 16) {
    const path = [];
    let angle = arc.startAngle;
    const angleStep = (arc.endAngle - arc.startAngle) / segments;
    
    // نقاط القوس
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
function ellipseToClipperPath(ellipse, scale, segments = 32) {
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
function polylineToClipperPath(polyline, scale) {
    return polyline.points.map(point => ({
        X: Math.round(point.x * scale),
        Y: Math.round(point.y * scale)
    }));
}

/**
 * تحويل خط متعدد مفتوح لمسار Clipper
 */
function openPolylineToClipperPath(polyline, scale, thickness = 0.01) {
    const ClipperLib = state.libraries.clipper;
    const offset = new ClipperLib.ClipperOffset();
    
    const path = polylineToClipperPath(polyline, scale);
    offset.AddPath(
        path,
        ClipperLib.JoinType.jtRound,
        ClipperLib.EndType.etOpenRound
    );
    
    const solution = new ClipperLib.Paths();
    offset.Execute(solution, thickness * scale);
    
    return solution[0] || [];
}

/**
 * تحويل مضلع لمسار Clipper
 */
function polygonToClipperPath(polygon, scale) {
    const points = polygon.points || polygonToPoints(polygon);
    return points.map(point => ({
        X: Math.round(point.x * scale),
        Y: Math.round(point.y * scale)
    }));
}

/**
 * تحويل مسارات Clipper لأشكال
 */
function clipperPathsToShapes(paths, scale) {
    return paths.map(path => {
        const points = path.map(p => ({
            x: p.X / scale,
            y: p.Y / scale
        }));
        
        return {
            type: 'polygon',
            points: points,
            id: generateId()
        };
    });
}

/**
 * تحويل مسار Clipper لمضلع
 */
function clipperPathToPolygon(path, scale) {
    return {
        type: 'polygon',
        points: path.map(p => ({
            x: p.X / scale,
            y: p.Y / scale
        })),
        id: generateId()
    };
}

/**
 * تحويل مسار Clipper لخط متعدد
 */
function clipperPathToPolyline(path, scale) {
    return {
        type: 'polyline',
        points: path.map(p => ({
            x: p.X / scale,
            y: p.Y / scale
        })),
        id: generateId()
    };
}

// ==================== دوال مساعدة هندسية ====================

/**
 * حساب المسافة العمودية من نقطة لخط
 */
function perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    if (dx === 0 && dy === 0) {
        return distance(point, lineStart);
    }
    
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
    const t_clamped = Math.max(0, Math.min(1, t));
    
    const closest = {
        x: lineStart.x + t_clamped * dx,
        y: lineStart.y + t_clamped * dy
    };
    
    return distance(point, closest);
}

/**
 * حساب المسافة بين نقطتين
 */
function distance(p1, p2) {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * حساب حاصل الضرب الاتجاهي
 */
function crossProduct(p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

/**
 * نسخ شكل
 */
function cloneShape(shape) {
    return JSON.parse(JSON.stringify(shape));
}

/**
 * تحريك شكل
 */
function translateShape(shape, dx, dy) {
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
function rotateShape(shape, center, angle) {
    const rotatePoint = (point) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        
        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos
        };
    };
    
    switch (shape.type) {
        case 'line':
            shape.start = rotatePoint(shape.start);
            shape.end = rotatePoint(shape.end);
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
            shape.points = corners.map(rotatePoint);
            delete shape.start;
            delete shape.end;
            break;
        case 'circle':
        case 'ellipse':
            shape.center = rotatePoint(shape.center);
            break;
        case 'arc':
            shape.center = rotatePoint(shape.center);
            shape.startAngle += angle;
            shape.endAngle += angle;
            break;
        case 'polyline':
        case 'polygon':
            shape.points = shape.points.map(rotatePoint);
            break;
    }
}

/**
 * تحويل مضلع لنقاط
 */
function polygonToPoints(polygon) {
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
 * إنشاء مثلث كبير للـ Delaunay
 */
function createSuperTriangle(points) {
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
function isPointInCircumcircle(point, triangle) {
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
function triangleHasEdge(triangle, edge) {
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
function circumcenter(points) {
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
 * ترتيب النقاط باتجاه عقارب الساعة
 */
function sortPointsClockwise(points) {
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
 * قص مضلع بحدود
 */
function clipPolygonByBounds(polygon, bounds) {
    // Sutherland-Hodgman algorithm
    let outputList = polygon.points;
    
    // قص بكل حافة من الحدود
    const edges = [
        { // Left
            inside: (p) => p.x >= bounds.minX,
            computeIntersection: (p1, p2) => {
                const t = (bounds.minX - p1.x) / (p2.x - p1.x);
                return {
                    x: bounds.minX,
                    y: p1.y + t * (p2.y - p1.y)
                };
            }
        },
        { // Right
            inside: (p) => p.x <= bounds.maxX,
            computeIntersection: (p1, p2) => {
                const t = (bounds.maxX - p1.x) / (p2.x - p1.x);
                return {
                    x: bounds.maxX,
                    y: p1.y + t * (p2.y - p1.y)
                };
            }
        },
        { // Bottom
            inside: (p) => p.y >= bounds.minY,
            computeIntersection: (p1, p2) => {
                const t = (bounds.minY - p1.y) / (p2.y - p1.y);
                return {
                    x: p1.x + t * (p2.x - p1.x),
                    y: bounds.minY
                };
            }
        },
        { // Top
            inside: (p) => p.y <= bounds.maxY,
            computeIntersection: (p1, p2) => {
                const t = (bounds.maxY - p1.y) / (p2.y - p1.y);
                return {
                    x: p1.x + t * (p2.x - p1.x),
                    y: bounds.maxY
                };
            }
        }
    ];
    
    for (const edge of edges) {
        const inputList = outputList;
        outputList = [];
        
        if (inputList.length === 0) break;
        
        let s = inputList[inputList.length - 1];
        
        for (const e of inputList) {
            if (edge.inside(e)) {
                if (!edge.inside(s)) {
                    outputList.push(edge.computeIntersection(s, e));
                }
                outputList.push(e);
            } else if (edge.inside(s)) {
                outputList.push(edge.computeIntersection(s, e));
            }
            s = e;
        }
    }
    
    if (outputList.length > 0) {
        return {
            type: 'polygon',
            points: outputList,
            id: generateId()
        };
    }
    
    return null;
}

// ==================== دوال مساعدة عامة ====================

/**
 * توليد معرف فريد
 */
function generateId() {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * توليد مفتاح للـ cache
 */
function generateCacheKey(operation, data) {
    const simplified = JSON.stringify({ operation, data });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < simplified.length; i++) {
        const char = simplified.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `${operation}_${hash}`;
}

/**
 * تنظيف الـ cache
 */
function cleanCache() {
    if (state.cache.size > state.cacheMaxSize) {
        const toDelete = state.cache.size - state.cacheMaxSize + 10;
        const keys = Array.from(state.cache.keys());
        
        for (let i = 0; i < toDelete; i++) {
            state.cache.delete(keys[i]);
        }
    }
}

/**
 * تحديث إحصائيات الأداء
 */
function updatePerformanceStats(executionTime) {
    state.performance.operationCount++;
    state.performance.totalTime += executionTime;
    state.performance.averageTime = state.performance.totalTime / state.performance.operationCount;
}