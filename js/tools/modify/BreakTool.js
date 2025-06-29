// ==================== js/tools/modify/BreakTool.js ====================

import { BaseTool } from '../BaseTool.js';

/**
 * أداة القطع (Break)
 * تُستخدم لتقسيم عنصر إلى جزئين مع حذف الجزء بين نقطتين
 */
export class BreakTool extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-cut';
        this.cursor = 'crosshair';
        
        // حالة الأداة
        this.step = 'select-object'; // select-object, first-point, second-point
        this.targetShape = null;
        this.firstBreakPoint = null;
        this.secondBreakPoint = null;
    }
    
    onActivate() {
        // إذا كان هناك تحديد مسبق، ابدأ من النقطة الأولى
        if (this.cad.selectedShapes.size === 1) {
            this.targetShape = Array.from(this.cad.selectedShapes)[0];
            if (this.canBreakShape(this.targetShape)) {
                this.step = 'first-point';
                this.updateStatus('Specify first break point');
            } else {
                this.updateStatus('Selected object cannot be broken');
                this.deactivate();
            }
        } else {
            this.step = 'select-object';
            this.updateStatus('Select object to break');
        }
        
        this.firstBreakPoint = null;
        this.secondBreakPoint = null;
    }
    
    onDeactivate() {
        this.cleanup();
    }
    
    onClick(point) {
        switch (this.step) {
            case 'select-object':
                this.handleObjectSelection(point);
                break;
                
            case 'first-point':
                this.handleFirstBreakPoint(point);
                break;
                
            case 'second-point':
                this.handleSecondBreakPoint(point);
                break;
        }
    }
    
    onMouseMove(point) {
        if (this.step === 'second-point' && this.firstBreakPoint) {
            this.updateBreakPreview(point);
        }
    }
    
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cleanup();
            this.deactivate();
        } else if (key === 'Enter' && this.step === 'first-point') {
            // إذا ضغط Enter على النقطة الأولى، استخدمها كنقطة واحدة للكسر
            this.handleSinglePointBreak();
        }
    }
    
    /**
     * معالجة اختيار الكائن
     */
    handleObjectSelection(point) {
        // استخدم النقطة المرسلة مباشرة
        const shape = this.findShapeAtPoint(point);
        
        if (!shape) {
            this.updateStatus('No object found - try clicking directly on an object');
            return;
        }
        
        if (!this.canBreakShape(shape)) {
            this.updateStatus('Object cannot be broken - only lines, arcs, circles, and polylines supported');
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
     * معالجة النقطة الأولى للكسر
     */
    handleFirstBreakPoint(point) {
        // إسقاط النقطة على الشكل
        this.firstBreakPoint = this.projectPointOnShape(point, this.targetShape);
        
        if (!this.firstBreakPoint) {
            this.updateStatus('Point not on object - click closer to the object');
            return;
        }
        
        this.step = 'second-point';
        this.updateStatus('Specify second break point');
        
        // إظهار dynamic input للمسافة
        if (this.cad.ui && this.cad.ui.showDynamicInput) {
            this.cad.ui.showDynamicInput('Break distance:', point);
        }
    }
    
    /**
     * معالجة النقطة الثانية للكسر
     */
    handleSecondBreakPoint(point) {
        // إسقاط النقطة على الشكل
        this.secondBreakPoint = this.projectPointOnShape(point, this.targetShape);
        
        if (!this.secondBreakPoint) {
            this.updateStatus('Point not on object - click closer to the object');
            return;
        }
        
        // تطبيق الكسر
        this.applyBreak();
        this.finishBreak();
    }
    
    /**
     * معالجة الكسر عند نقطة واحدة
     */
    handleSinglePointBreak() {
        if (!this.firstBreakPoint) return;
        
        this.secondBreakPoint = { ...this.firstBreakPoint };
        this.applyBreak();
        this.finishBreak();
    }
    
    /**
     * البحث عن شكل في نقطة معينة
     */
    findShapeAtPoint(point) {
        // استخدم الدالة الموجودة في CAD أو اكتب دالة بديلة
        if (this.cad.getShapeAt) {
            return this.cad.getShapeAt(point.x, point.y);
        }
        
        // دالة بديلة للبحث عن الأشكال
        const tolerance = 5 / this.cad.zoom; // tolerance متكيف مع التكبير
        
        for (const shape of this.cad.shapes) {
            if (this.isPointNearShape(point, shape, tolerance)) {
                return shape;
            }
        }
        
        return null;
    }
    
    /**
     * التحقق من قرب النقطة من الشكل
     */
    isPointNearShape(point, shape, tolerance) {
        switch (shape.type) {
            case 'line':
                return this.distanceToLine(point, shape.start, shape.end) <= tolerance;
            case 'circle':
                const distToCenter = this.distance(point, shape.center);
                return Math.abs(distToCenter - shape.radius) <= tolerance;
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
        
        // الأشكال المدعومة للكسر
        const breakableTypes = ['line', 'polyline', 'arc', 'circle'];
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
            case 'circle':
                return this.projectPointOnCircle(point, shape);
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
        
        // التأكد من أن النقطة على الخط وليس على امتداده
        if (t < 0 || t > 1) return null;
        
        return {
            x: A.x + t * AB_x,
            y: A.y + t * AB_y,
            t: t // نسبة الموقع على الخط
        };
    }
    
    /**
     * إسقاط نقطة على دائرة
     */
    projectPointOnCircle(point, circle) {
        const dx = point.x - circle.center.x;
        const dy = point.y - circle.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return null;
        
        // إسقاط النقطة على محيط الدائرة
        const angle = Math.atan2(dy, dx);
        
        return {
            x: circle.center.x + circle.radius * Math.cos(angle),
            y: circle.center.y + circle.radius * Math.sin(angle),
            angle: angle
        };
    }
    
    /**
     * إسقاط نقطة على قوس
     */
    projectPointOnArc(point, arc) {
        const circleProjection = this.projectPointOnCircle(point, arc);
        if (!circleProjection) return null;
        
        // التحقق من أن النقطة داخل نطاق القوس
        let angle = circleProjection.angle;
        
        // تطبيع الزوايا
        while (angle < 0) angle += 2 * Math.PI;
        while (angle > 2 * Math.PI) angle -= 2 * Math.PI;
        
        let startAngle = arc.startAngle;
        let endAngle = arc.endAngle;
        
        while (startAngle < 0) startAngle += 2 * Math.PI;
        while (endAngle < 0) endAngle += 2 * Math.PI;
        
        // التحقق من وجود الزاوية داخل نطاق القوس
        if (startAngle <= endAngle) {
            if (angle >= startAngle && angle <= endAngle) {
                return circleProjection;
            }
        } else {
            if (angle >= startAngle || angle <= endAngle) {
                return circleProjection;
            }
        }
        
        return null;
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
     * تحديث معاينة الكسر
     */
    updateBreakPreview(point) {
        if (!this.targetShape || !this.firstBreakPoint) return;
        
        const secondPoint = this.projectPointOnShape(point, this.targetShape);
        if (!secondPoint) return;
        
        // إنشاء أشكال المعاينة
        const previewShapes = this.createBreakPreview(
            this.targetShape, 
            this.firstBreakPoint, 
            secondPoint
        );
        
        this.cad.tempShapes = previewShapes;
        this.cad.render();
    }
    
    /**
     * إنشاء معاينة الكسر
     */
    createBreakPreview(shape, point1, point2) {
        const previewShapes = [];
        
        switch (shape.type) {
            case 'line':
                previewShapes.push(...this.createLineBreakPreview(shape, point1, point2));
                break;
            case 'circle':
                previewShapes.push(...this.createCircleBreakPreview(shape, point1, point2));
                break;
            case 'arc':
                previewShapes.push(...this.createArcBreakPreview(shape, point1, point2));
                break;
            case 'polyline':
                previewShapes.push(...this.createPolylineBreakPreview(shape, point1, point2));
                break;
        }
        
        // تطبيق ستايل المعاينة
        previewShapes.forEach(shape => {
            shape.color = '#00d4aa';
            shape.lineWidth = 1;
        });
        
        return previewShapes;
    }
    
    /**
     * إنشاء معاينة كسر الخط
     */
    createLineBreakPreview(line, point1, point2) {
        // ترتيب النقاط حسب موقعها على الخط
        const t1 = point1.t || 0;
        const t2 = point2.t || 0;
        
        const firstT = Math.min(t1, t2);
        const secondT = Math.max(t1, t2);
        
        const shapes = [];
        
        // الجزء الأول (من البداية إلى النقطة الأولى)
        if (firstT > 0) {
            shapes.push({
                type: 'line',
                start: { ...line.start },
                end: {
                    x: line.start.x + firstT * (line.end.x - line.start.x),
                    y: line.start.y + firstT * (line.end.y - line.start.y)
                }
            });
        }
        
        // الجزء الثاني (من النقطة الثانية إلى النهاية)
        if (secondT < 1) {
            shapes.push({
                type: 'line',
                start: {
                    x: line.start.x + secondT * (line.end.x - line.start.x),
                    y: line.start.y + secondT * (line.end.y - line.start.y)
                },
                end: { ...line.end }
            });
        }
        
        return shapes;
    }
    
    /**
     * إنشاء معاينة كسر الدائرة
     */
    createCircleBreakPreview(circle, point1, point2) {
        // الدائرة تتحول إلى قوس
        const angle1 = point1.angle;
        const angle2 = point2.angle;
        
        // تحديد الاتجاه الأقصر للحذف
        let startAngle, endAngle;
        const angleDiff = Math.abs(angle2 - angle1);
        
        if (angleDiff <= Math.PI) {
            startAngle = Math.max(angle1, angle2);
            endAngle = Math.min(angle1, angle2) + 2 * Math.PI;
        } else {
            startAngle = Math.min(angle1, angle2);
            endAngle = Math.max(angle1, angle2);
        }
        
        return [{
            type: 'arc',
            center: { ...circle.center },
            radius: circle.radius,
            startAngle: startAngle,
            endAngle: endAngle
        }];
    }
    
    /**
     * إنشاء معاينة كسر القوس
     */
    createArcBreakPreview(arc, point1, point2) {
        const angle1 = point1.angle;
        const angle2 = point2.angle;
        
        // ترتيب الزوايا حسب موقعها على القوس
        const firstAngle = Math.min(angle1, angle2);
        const secondAngle = Math.max(angle1, angle2);
        
        const shapes = [];
        
        // الجزء الأول
        if (firstAngle > arc.startAngle) {
            shapes.push({
                type: 'arc',
                center: { ...arc.center },
                radius: arc.radius,
                startAngle: arc.startAngle,
                endAngle: firstAngle
            });
        }
        
        // الجزء الثاني
        if (secondAngle < arc.endAngle) {
            shapes.push({
                type: 'arc',
                center: { ...arc.center },
                radius: arc.radius,
                startAngle: secondAngle,
                endAngle: arc.endAngle
            });
        }
        
        return shapes;
    }
    
    /**
     * إنشاء معاينة كسر البوليلاين
     */
    createPolylineBreakPreview(polyline, point1, point2) {
        // تبسيط: إنشاء بوليلاين جديد بدون الجزء المحذوف
        return [{ ...polyline }]; // مؤقتاً
    }
    
    /**
     * تطبيق الكسر
     */
    applyBreak() {
        if (!this.targetShape || !this.firstBreakPoint || !this.secondBreakPoint) return;
        
        this.cad.recordState();
        
        // إزالة الشكل الأصلي
        const shapeIndex = this.cad.shapes.indexOf(this.targetShape);
        if (shapeIndex >= 0) {
            this.cad.shapes.splice(shapeIndex, 1);
        }
        
        // إضافة الأجزاء الجديدة
        const newShapes = this.createBrokenShapes(
            this.targetShape, 
            this.firstBreakPoint, 
            this.secondBreakPoint
        );
        
        newShapes.forEach(shape => {
            shape.id = this.cad.generateId();
            this.cad.shapes.push(shape);
        });
        
        this.cad.render();
    }
    
    /**
     * إنشاء الأشكال الجديدة بعد الكسر
     */
    createBrokenShapes(shape, point1, point2) {
        const newShapes = this.createBreakPreview(shape, point1, point2);
        
        // نسخ خصائص الشكل الأصلي
        newShapes.forEach(newShape => {
            newShape.color = shape.color;
            newShape.lineWidth = shape.lineWidth;
            newShape.lineType = shape.lineType;
            newShape.layerId = shape.layerId;
        });
        
        return newShapes;
    }
    
    /**
     * إنهاء عملية الكسر
     */
    finishBreak() {
        this.updateStatus('Break completed');
        this.cleanup();
        this.deactivate();
    }
    
    /**
     * تنظيف البيانات
     */
    cleanup() {
        this.step = 'select-object';
        this.targetShape = null;
        this.firstBreakPoint = null;
        this.secondBreakPoint = null;
        this.cad.tempShapes = null;
        this.cad.selectedShapes.clear();
        this.cad.render();
        
        // إخفاء dynamic input
        if (this.cad.ui && this.cad.ui.hideDynamicInput) {
            this.cad.ui.hideDynamicInput();
        }
    }
}