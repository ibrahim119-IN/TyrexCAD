// ==================== js/tools/modify/BreakAtPointTool.js ====================

import { BaseTool } from '../BaseTool.js';

/**
 * أداة التقسيم عند نقطة (Break at Point)
 * تُستخدم لتقسيم عنصر عند نقطة واحدة دون حذف أي جزء
 */
export class BreakAtPointTool extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-scissors';
        this.cursor = 'crosshair';
        
        // حالة الأداة
        this.step = 'select-object'; // select-object, break-point
        this.targetShape = null;
        this.breakPoint = null;
    }
    
    onActivate() {
        // إذا كان هناك تحديد مسبق، ابدأ من نقطة الكسر
        if (this.cad.selectedShapes.size === 1) {
            this.targetShape = Array.from(this.cad.selectedShapes)[0];
            if (this.canBreakShape(this.targetShape)) {
                this.step = 'break-point';
                this.updateStatus('Specify break point');
            } else {
                this.updateStatus('Selected object cannot be broken');
                this.deactivate();
            }
        } else {
            this.step = 'select-object';
            this.updateStatus('Select object to break');
        }
        
        this.breakPoint = null;
    }
    
    onDeactivate() {
        this.cleanup();
    }
    
    onClick(point) {
        switch (this.step) {
            case 'select-object':
                this.handleObjectSelection(point);
                break;
                
            case 'break-point':
                this.handleBreakPoint(point);
                break;
        }
    }
    
    onMouseMove(point) {
        if (this.step === 'break-point' && this.targetShape) {
            this.updateBreakPreview(point);
        }
    }
    
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cleanup();
            this.deactivate();
        }
    }
    
    /**
 * معالجة اختيار الكائن
 */
handleObjectSelection(point) {
    // استخدم الإحداثيات الدقيقة
    const coords = this.cad.getMouseCoordinates();
    const shape = this.cad.getShapeAtScreen(coords.screenX, coords.screenY);
    
    if (!shape) {
        this.updateStatus('No object found - try clicking directly on an object');
        return;
    }
    
    if (!this.canBreakShape(shape)) {
        this.updateStatus('Object cannot be broken - only open objects supported');
        return;
    }
    
    this.targetShape = shape;
    this.step = 'first-point';
    this.updateStatus('Specify first break point');
    
    // إضافة الشكل للتحديد لأغراض البصرية
    this.cad.selectedShapes.clear();
    this.cad.selectedShapes.add(shape);
    this.cad.render();
}
    
    /**
     * معالجة نقطة الكسر
     */
    handleBreakPoint(point) {
        // إسقاط النقطة على الشكل
        this.breakPoint = this.projectPointOnShape(point, this.targetShape);
        
        if (!this.breakPoint) {
            this.updateStatus('Point not on object - click closer to the object');
            return;
        }
        
        // تطبيق التقسيم
        this.applyBreakAtPoint();
        this.finishBreak();
    }
    
    /**
 * معالجة اختيار الكائن
 */
handleObjectSelection(point) {
    // البحث عن الشكل باستخدام الدالة المحسنة
    const shape = this.findShapeAtPoint(point);
    
    if (!shape) {
        this.updateStatus('No object found - try clicking directly on an object');
        return;
    }
    
    if (!this.canBreakShape(shape)) {
        this.updateStatus('Object cannot be broken - only open objects supported');
        return;
    }
    
    this.targetShape = shape;
    this.step = 'first-point';  // للـ BreakTool
    // this.step = 'break-point';  // للـ BreakAtPointTool
    this.updateStatus('Specify first break point'); // للـ BreakTool
    // this.updateStatus('Specify break point'); // للـ BreakAtPointTool
    
    // إضافة الشكل للتحديد لأغراض البصرية
    this.cad.selectedShapes.clear();
    this.cad.selectedShapes.add(shape);
    this.cad.render();
}
    
    /**
     * التحقق من قرب النقطة من الشكل
     */
    isPointNearShape(point, shape, tolerance) {
        switch (shape.type) {
            case 'line':
                return this.distanceToLine(point, shape.start, shape.end) <= tolerance;
            case 'arc':
                return this.isPointNearArc(point, shape, tolerance);
            case 'polyline':
                return this.isPointNearPolyline(point, shape, tolerance);
            default:
                return false;
        }
    }
    
    /**
     * حساب المسافة بين نقطتين
     */
    distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * حساب المسافة من نقطة إلى خط
     */
    distanceToLine(point, lineStart, lineEnd) {
        const A = lineStart;
        const B = lineEnd;
        const P = point;
        
        const AP_x = P.x - A.x;
        const AP_y = P.y - A.y;
        const AB_x = B.x - A.x;
        const AB_y = B.y - A.y;
        
        const AB_squared = AB_x * AB_x + AB_y * AB_y;
        if (AB_squared === 0) {
            return this.distance(P, A);
        }
        
        const t = Math.max(0, Math.min(1, (AP_x * AB_x + AP_y * AB_y) / AB_squared));
        
        const projection = {
            x: A.x + t * AB_x,
            y: A.y + t * AB_y
        };
        
        return this.distance(P, projection);
    }
    
    /**
     * التحقق من قرب النقطة من قوس
     */
    isPointNearArc(point, arc, tolerance) {
        const distToCenter = this.distance(point, arc.center);
        if (Math.abs(distToCenter - arc.radius) > tolerance) {
            return false;
        }
        
        // التحقق من أن النقطة داخل نطاق القوس
        const angle = Math.atan2(point.y - arc.center.y, point.x - arc.center.x);
        // تبسيط: لنفترض أن النقطة داخل نطاق القوس
        return true;
    }
    
    /**
     * التحقق من قرب النقطة من بوليلاين
     */
    isPointNearPolyline(point, polyline, tolerance) {
        if (!polyline.points || polyline.points.length < 2) return false;
        
        for (let i = 0; i < polyline.points.length - 1; i++) {
            if (this.distanceToLine(point, polyline.points[i], polyline.points[i + 1]) <= tolerance) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * التحقق من إمكانية كسر الشكل
     */
    canBreakShape(shape) {
        if (!shape) return false;
        
        // التحقق من صلاحيات الطبقة
        if (this.cad.layerManager) {
            const layer = this.cad.layerManager.layers.get(shape.layerId);
            if (!layer || layer.locked || layer.frozen) {
                return false;
            }
        }
        
        // الأشكال المدعومة للتقسيم عند نقطة (العناصر المفتوحة فقط)
        const breakableTypes = ['line', 'polyline', 'arc'];
        return breakableTypes.includes(shape.type);
    }
    
    /**
     * إسقاط نقطة على الشكل
     */
    projectPointOnShape(point, shape) {
        if (!shape) return null;
        
        switch (shape.type) {
            case 'line':
                return this.projectPointOnLine(point, shape);
            case 'arc':
                return this.projectPointOnArc(point, shape);
            case 'polyline':
                return this.projectPointOnPolyline(point, shape);
            default:
                return null;
        }
    }
    
    /**
     * إسقاط نقطة على خط
     */
    projectPointOnLine(point, line) {
        const A = line.start;
        const B = line.end;
        const P = point;
        
        // حساب المسقط
        const AP_x = P.x - A.x;
        const AP_y = P.y - A.y;
        const AB_x = B.x - A.x;
        const AB_y = B.y - A.y;
        
        const AB_squared = AB_x * AB_x + AB_y * AB_y;
        if (AB_squared === 0) return A; // النقطتان متطابقتان
        
        const t = (AP_x * AB_x + AP_y * AB_y) / AB_squared;
        
        // التأكد من أن النقطة على الخط وليس على امتداده (ليس في النهايات)
        if (t <= 0.01 || t >= 0.99) return null; // تجنب التقسيم قريباً من النهايات
        
        return {
            x: A.x + t * AB_x,
            y: A.y + t * AB_y,
            t: t // نسبة الموقع على الخط
        };
    }
    
    /**
     * إسقاط نقطة على قوس
     */
    projectPointOnArc(point, arc) {
        const dx = point.x - arc.center.x;
        const dy = point.y - arc.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return null;
        
        // إسقاط النقطة على محيط الدائرة
        let angle = Math.atan2(dy, dx);
        
        // تطبيع الزوايا
        while (angle < 0) angle += 2 * Math.PI;
        while (angle > 2 * Math.PI) angle -= 2 * Math.PI;
        
        let startAngle = arc.startAngle;
        let endAngle = arc.endAngle;
        
        while (startAngle < 0) startAngle += 2 * Math.PI;
        while (endAngle < 0) endAngle += 2 * Math.PI;
        
        // التحقق من وجود الزاوية داخل نطاق القوس (ليس في النهايات)
        const tolerance = 0.05; // tolerance أكبر لتجنب النهايات
        
        let isInRange = false;
        if (startAngle <= endAngle) {
            isInRange = angle > (startAngle + tolerance) && angle < (endAngle - tolerance);
        } else {
            isInRange = angle > (startAngle + tolerance) || angle < (endAngle - tolerance);
        }
        
        if (!isInRange) return null;
        
        return {
            x: arc.center.x + arc.radius * Math.cos(angle),
            y: arc.center.y + arc.radius * Math.sin(angle),
            angle: angle
        };
    }
    
    /**
     * إسقاط نقطة على بوليلاين
     */
    projectPointOnPolyline(point, polyline) {
        if (!polyline.points || polyline.points.length < 2) return null;
        
        let closestProjection = null;
        let minDistance = Infinity;
        
        // البحث في كل ضلع من البوليلاين
        for (let i = 0; i < polyline.points.length - 1; i++) {
            const line = {
                start: polyline.points[i],
                end: polyline.points[i + 1]
            };
            
            const projection = this.projectPointOnLine(point, line);
            if (projection) {
                const distance = Math.sqrt(
                    Math.pow(point.x - projection.x, 2) + 
                    Math.pow(point.y - projection.y, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestProjection = {
                        ...projection,
                        segmentIndex: i
                    };
                }
            }
        }
        
        return closestProjection;
    }
    
    /**
     * تحديث معاينة التقسيم
     */
    updateBreakPreview(point) {
        if (!this.targetShape) return;
        
        const breakPoint = this.projectPointOnShape(point, this.targetShape);
        if (!breakPoint) {
            this.cad.tempShapes = null;
            this.cad.render();
            return;
        }
        
        // إنشاء أشكال المعاينة
        const previewShapes = this.createBreakAtPointPreview(this.targetShape, breakPoint);
        
        // تطبيق ستايل المعاينة
        previewShapes.forEach(shape => {
            shape.color = '#00d4aa';
            shape.lineWidth = 1;
        });
        
        this.cad.tempShapes = previewShapes;
        this.cad.render();
    }
    
    /**
     * إنشاء معاينة التقسيم عند نقطة
     */
    createBreakAtPointPreview(shape, breakPoint) {
        const previewShapes = [];
        
        switch (shape.type) {
            case 'line':
                previewShapes.push(...this.createLineBreakAtPointPreview(shape, breakPoint));
                break;
            case 'arc':
                previewShapes.push(...this.createArcBreakAtPointPreview(shape, breakPoint));
                break;
            case 'polyline':
                previewShapes.push(...this.createPolylineBreakAtPointPreview(shape, breakPoint));
                break;
        }
        
        return previewShapes;
    }
    
    /**
     * إنشاء معاينة تقسيم الخط عند نقطة
     */
    createLineBreakAtPointPreview(line, breakPoint) {
        const shapes = [];
        
        // الجزء الأول (من البداية إلى نقطة الكسر)
        shapes.push({
            type: 'line',
            start: { ...line.start },
            end: { x: breakPoint.x, y: breakPoint.y }
        });
        
        // الجزء الثاني (من نقطة الكسر إلى النهاية)
        shapes.push({
            type: 'line',
            start: { x: breakPoint.x, y: breakPoint.y },
            end: { ...line.end }
        });
        
        return shapes;
    }
    
    /**
     * إنشاء معاينة تقسيم القوس عند نقطة
     */
    createArcBreakAtPointPreview(arc, breakPoint) {
        const shapes = [];
        
        // الجزء الأول (من بداية القوس إلى نقطة الكسر)
        shapes.push({
            type: 'arc',
            center: { ...arc.center },
            radius: arc.radius,
            startAngle: arc.startAngle,
            endAngle: breakPoint.angle
        });
        
        // الجزء الثاني (من نقطة الكسر إلى نهاية القوس)
        shapes.push({
            type: 'arc',
            center: { ...arc.center },
            radius: arc.radius,
            startAngle: breakPoint.angle,
            endAngle: arc.endAngle
        });
        
        return shapes;
    }
    
    /**
     * إنشاء معاينة تقسيم البوليلاين عند نقطة
     */
    createPolylineBreakAtPointPreview(polyline, breakPoint) {
        if (breakPoint.segmentIndex === undefined) return [polyline];
        
        const shapes = [];
        const segmentIndex = breakPoint.segmentIndex;
        
        // الجزء الأول: من بداية البوليلاين إلى نقطة الكسر
        if (segmentIndex > 0 || breakPoint.t > 0) {
            const firstPart = {
                type: 'polyline',
                points: []
            };
            
            // إضافة النقاط من البداية حتى نقطة الكسر
            for (let i = 0; i <= segmentIndex; i++) {
                firstPart.points.push({ ...polyline.points[i] });
            }
            
            // إضافة نقطة الكسر
            firstPart.points.push({ x: breakPoint.x, y: breakPoint.y });
            
            shapes.push(firstPart);
        }
        
        // الجزء الثاني: من نقطة الكسر إلى نهاية البوليلاين
        if (segmentIndex < polyline.points.length - 2 || breakPoint.t < 1) {
            const secondPart = {
                type: 'polyline',
                points: []
            };
            
            // إضافة نقطة الكسر
            secondPart.points.push({ x: breakPoint.x, y: breakPoint.y });
            
            // إضافة النقاط من نقطة الكسر حتى النهاية
            for (let i = segmentIndex + 1; i < polyline.points.length; i++) {
                secondPart.points.push({ ...polyline.points[i] });
            }
            
            shapes.push(secondPart);
        }
        
        return shapes;
    }
    
    /**
     * تطبيق التقسيم عند نقطة
     */
    applyBreakAtPoint() {
        if (!this.targetShape || !this.breakPoint) return;
        
        this.cad.recordState();
        
        // إزالة الشكل الأصلي
        const shapeIndex = this.cad.shapes.indexOf(this.targetShape);
        if (shapeIndex >= 0) {
            this.cad.shapes.splice(shapeIndex, 1);
        }
        
        // إضافة الأجزاء الجديدة
        const newShapes = this.createBrokenAtPointShapes(this.targetShape, this.breakPoint);
        
        newShapes.forEach(shape => {
            // نسخ خصائص الشكل الأصلي
            shape.color = this.targetShape.color;
            shape.lineWidth = this.targetShape.lineWidth;
            shape.lineType = this.targetShape.lineType;
            shape.layerId = this.targetShape.layerId;
            shape.id = this.cad.generateId();
            
            this.cad.shapes.push(shape);
        });
        
        this.cad.render();
    }
    
    /**
     * إنشاء الأشكال الجديدة بعد التقسيم
     */
    createBrokenAtPointShapes(shape, breakPoint) {
        return this.createBreakAtPointPreview(shape, breakPoint);
    }
    
    /**
     * إنهاء عملية التقسيم
     */
    finishBreak() {
        this.updateStatus('Break at point completed');
        this.cleanup();
        this.deactivate();
    }
    
    /**
     * تنظيف البيانات
     */
    cleanup() {
        this.step = 'select-object';
        this.targetShape = null;
        this.breakPoint = null;
        this.cad.tempShapes = null;
        this.cad.selectedShapes.clear();
        this.cad.render();
        
        // إخفاء dynamic input
        if (this.cad.ui && this.cad.ui.hideDynamicInput) {
            this.cad.ui.hideDynamicInput();
        }
    }
}