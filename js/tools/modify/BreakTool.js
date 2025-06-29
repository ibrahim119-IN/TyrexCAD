// ==================== js/tools/modify/BreakTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة القطع بين نقطتين (Break)
 * قطع الأشكال وحذف الجزء بين النقطتين - متوافقة مع معايير CAD
 */
export class BreakTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-cut';
        this.cursor = 'crosshair';
        
        // حالة الأداة
        this.state = {
            phase: 'selectObject', // 'selectObject', 'firstPoint', 'secondPoint'
            targetShape: null,
            firstBreakPoint: null,
            previewShapes: []
        };
    }
    
    onActivate() {
        // دعم Post-selection: التحقق من وجود عنصر واحد محدد
        if (this.cad.selectedShapes.size === 1) {
            const selectedShape = Array.from(this.cad.selectedShapes)[0];
            if (this.canBreakShape(selectedShape)) {
                this.state.targetShape = selectedShape;
                this.state.phase = 'firstPoint';
                this.updateStatus('Specify first break point on object');
                return true;
            }
        }
        
        // طلب اختيار العنصر
        this.state.phase = 'selectObject';
        this.updateStatus('Select object to break');
        return true;
    }
    
    onDeactivate() {
        this.cleanup();
        super.onDeactivate();
    }
    
    onClick(point) {
        switch (this.state.phase) {
            case 'selectObject':
                this.selectObject(point);
                break;
                
            case 'firstPoint':
                this.setFirstBreakPoint(point);
                break;
                
            case 'secondPoint':
                this.setSecondBreakPoint(point);
                break;
        }
    }
    
    onMouseMove(point) {
        if (this.state.phase === 'secondPoint' && this.state.firstBreakPoint) {
            this.showBreakPreview(point);
        } else if (this.state.phase === 'firstPoint' && this.state.targetShape) {
            this.showFirstPointPreview(point);
        }
    }
    
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cancelOperation();
        }
    }
    
    /**
     * اختيار العنصر المراد قطعه
     */
    selectObject(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (shape && this.canBreakShape(shape) && this.canModifyShape(shape)) {
            this.state.targetShape = shape;
            this.state.phase = 'firstPoint';
            
            // مسح التحديد السابق وتحديد العنصر الجديد
            this.cad.selectedShapes.clear();
            this.cad.selectedShapes.add(shape);
            
            this.updateStatus('Specify first break point on object');
            this.cad.render();
        } else {
            this.updateStatus('Select a breakable object (line, arc, circle, polyline)');
        }
    }
    
    /**
     * تحديد النقطة الأولى للقطع
     */
    setFirstBreakPoint(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        this.state.firstBreakPoint = this.getClosestPointOnShape(this.state.targetShape, world);
        this.state.phase = 'secondPoint';
        this.updateStatus('Specify second break point');
    }
    
    /**
     * تحديد النقطة الثانية وتطبيق القطع
     */
    setSecondBreakPoint(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const secondBreakPoint = this.getClosestPointOnShape(this.state.targetShape, world);
        
        this.performBreak(this.state.firstBreakPoint, secondBreakPoint);
    }
    
    /**
     * التحقق من إمكانية قطع الشكل
     */
    canBreakShape(shape) {
        return ['line', 'arc', 'circle', 'polyline'].includes(shape.type);
    }
    
    /**
     * الحصول على أقرب نقطة على الشكل
     */
    getClosestPointOnShape(shape, point) {
        switch (shape.type) {
            case 'line':
                return this.getClosestPointOnLine(shape, point);
            case 'arc':
                return this.getClosestPointOnArc(shape, point);
            case 'circle':
                return this.getClosestPointOnCircle(shape, point);
            case 'polyline':
                return this.getClosestPointOnPolyline(shape, point);
            default:
                return point;
        }
    }
    
    /**
     * أقرب نقطة على خط
     */
    getClosestPointOnLine(line, point) {
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return line.start;
        
        const t = Math.max(0, Math.min(1, 
            ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / (length * length)
        ));
        
        return {
            x: line.start.x + t * dx,
            y: line.start.y + t * dy,
            t: t // معامل الموقع على الخط
        };
    }
    
    /**
     * أقرب نقطة على قوس
     */
    getClosestPointOnArc(arc, point) {
        const dx = point.x - arc.center.x;
        const dy = point.y - arc.center.y;
        let angle = Math.atan2(dy, dx);
        
        // تطبيع الزاوية
        while (angle < 0) angle += 2 * Math.PI;
        while (angle > 2 * Math.PI) angle -= 2 * Math.PI;
        
        // التأكد أن الزاوية ضمن نطاق القوس
        let startAngle = arc.startAngle;
        let endAngle = arc.endAngle;
        
        while (startAngle < 0) startAngle += 2 * Math.PI;
        while (endAngle < 0) endAngle += 2 * Math.PI;
        
        // تحديد أقرب زاوية ضمن القوس
        if (endAngle > startAngle) {
            if (angle < startAngle || angle > endAngle) {
                const distToStart = Math.abs(angle - startAngle);
                const distToEnd = Math.abs(angle - endAngle);
                angle = distToStart < distToEnd ? startAngle : endAngle;
            }
        }
        
        return {
            x: arc.center.x + arc.radius * Math.cos(angle),
            y: arc.center.y + arc.radius * Math.sin(angle),
            angle: angle
        };
    }
    
    /**
     * أقرب نقطة على دائرة
     */
    getClosestPointOnCircle(circle, point) {
        const dx = point.x - circle.center.x;
        const dy = point.y - circle.center.y;
        const angle = Math.atan2(dy, dx);
        
        return {
            x: circle.center.x + circle.radius * Math.cos(angle),
            y: circle.center.y + circle.radius * Math.sin(angle),
            angle: angle
        };
    }
    
    /**
     * أقرب نقطة على polyline
     */
    getClosestPointOnPolyline(polyline, point) {
        if (!polyline.points || polyline.points.length < 2) return point;
        
        let closestPoint = polyline.points[0];
        let minDistance = this.cad.distance(point.x, point.y, closestPoint.x, closestPoint.y);
        let segmentIndex = -1;
        
        // البحث في كل segment
        for (let i = 0; i < polyline.points.length - 1; i++) {
            const segmentStart = polyline.points[i];
            const segmentEnd = polyline.points[i + 1];
            
            const segmentPoint = this.getClosestPointOnLine(
                { start: segmentStart, end: segmentEnd },
                point
            );
            
            const distance = this.cad.distance(point.x, point.y, segmentPoint.x, segmentPoint.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = segmentPoint;
                segmentIndex = i;
            }
        }
        
        closestPoint.segmentIndex = segmentIndex;
        return closestPoint;
    }
    
    /**
     * معاينة النقطة الأولى
     */
    showFirstPointPreview(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const breakPoint = this.getClosestPointOnShape(this.state.targetShape, world);
        
        // إظهار نقطة القطع
        const indicator = {
            type: 'circle',
            center: breakPoint,
            radius: 3,
            color: '#ff6b6b',
            lineWidth: 2
        };
        
        this.cad.tempShapes = [indicator];
        this.cad.render();
    }
    
    /**
     * معاينة القطع بين النقطتين
     */
    showBreakPreview(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const secondPoint = this.getClosestPointOnShape(this.state.targetShape, world);
        
        // حساب النتائج المتوقعة
        const previewShapes = this.calculateBreakResult(
            this.state.targetShape, 
            this.state.firstBreakPoint, 
            secondPoint, 
            true
        );
        
        // إضافة مؤشرات النقاط
        previewShapes.push(
            {
                type: 'circle',
                center: this.state.firstBreakPoint,
                radius: 3,
                color: '#ff6b6b',
                lineWidth: 2
            },
            {
                type: 'circle',
                center: secondPoint,
                radius: 3,
                color: '#ff6b6b',
                lineWidth: 2
            }
        );
        
        this.cad.tempShapes = previewShapes;
        this.cad.render();
    }
    
    /**
     * تطبيق القطع
     */
    performBreak(firstPoint, secondPoint) {
        // التحقق من صحة النقاط
        const distance = this.cad.distance(firstPoint.x, firstPoint.y, secondPoint.x, secondPoint.y);
        if (distance < 0.1) {
            this.updateStatus('Break points too close together');
            return;
        }
        
        this.cad.recordState();
        
        // حساب النتائج
        const resultShapes = this.calculateBreakResult(this.state.targetShape, firstPoint, secondPoint, false);
        
        // حذف الشكل الأصلي
        const shapeIndex = this.cad.shapes.indexOf(this.state.targetShape);
        if (shapeIndex !== -1) {
            this.cad.shapes.splice(shapeIndex, 1);
        }
        
        // إضافة الأشكال الجديدة
        resultShapes.forEach(newShape => {
            newShape.id = this.cad.generateId();
            this.cad.shapes.push(newShape);
        });
        
        // مسح التحديد
        this.cad.selectedShapes.clear();
        
        this.updateStatus(`Break completed - created ${resultShapes.length} objects`);
        this.finishOperation();
    }
    
    /**
     * حساب نتيجة القطع
     */
    calculateBreakResult(shape, firstPoint, secondPoint, isPreview = false) {
        let results = [];
        
        switch (shape.type) {
            case 'line':
                results = this.breakLine(shape, firstPoint, secondPoint);
                break;
                
            case 'arc':
                results = this.breakArc(shape, firstPoint, secondPoint);
                break;
                
            case 'circle':
                results = this.breakCircle(shape, firstPoint, secondPoint);
                break;
                
            case 'polyline':
                results = this.breakPolyline(shape, firstPoint, secondPoint);
                break;
        }
        
        // تطبيق خصائص المعاينة
        if (isPreview) {
            results.forEach(result => {
                result.color = '#4ecdc4';
                result.lineWidth = (result.lineWidth || 1) + 1;
            });
        }
        
        return results;
    }
    
    /**
     * قطع خط
     */
    breakLine(line, firstPoint, secondPoint) {
        const results = [];
        
        // ترتيب النقاط حسب موقعها على الخط
        const t1 = firstPoint.t !== undefined ? firstPoint.t : 0;
        const t2 = secondPoint.t !== undefined ? secondPoint.t : 1;
        
        const [nearT, farT] = t1 < t2 ? [t1, t2] : [t2, t1];
        const [nearPoint, farPoint] = t1 < t2 ? [firstPoint, secondPoint] : [secondPoint, firstPoint];
        
        // الجزء الأول (من البداية إلى النقطة الأولى)
        if (nearT > 0.01) {
            results.push({
                ...line,
                end: { ...nearPoint }
            });
        }
        
        // الجزء الثالث (من النقطة الثانية إلى النهاية)
        if (farT < 0.99) {
            results.push({
                ...line,
                start: { ...farPoint }
            });
        }
        
        return results;
    }
    
    /**
     * قطع قوس
     */
    breakArc(arc, firstPoint, secondPoint) {
        const results = [];
        
        const angle1 = firstPoint.angle !== undefined ? firstPoint.angle : arc.startAngle;
        const angle2 = secondPoint.angle !== undefined ? secondPoint.angle : arc.endAngle;
        
        // ترتيب الزوايا
        const [startBreak, endBreak] = angle1 < angle2 ? [angle1, angle2] : [angle2, angle1];
        
        // الجزء الأول
        if (Math.abs(arc.startAngle - startBreak) > 0.01) {
            results.push({
                ...arc,
                endAngle: startBreak
            });
        }
        
        // الجزء الثاني
        if (Math.abs(endBreak - arc.endAngle) > 0.01) {
            results.push({
                ...arc,
                startAngle: endBreak
            });
        }
        
        return results;
    }
    
    /**
     * قطع دائرة
     */
    breakCircle(circle, firstPoint, secondPoint) {
        const angle1 = firstPoint.angle !== undefined ? firstPoint.angle : 0;
        const angle2 = secondPoint.angle !== undefined ? secondPoint.angle : Math.PI;
        
        // تحويل الدائرة إلى قوس
        const [startAngle, endAngle] = angle1 < angle2 ? [angle2, angle1 + 2 * Math.PI] : [angle1, angle2 + 2 * Math.PI];
        
        return [{
            type: 'arc',
            center: circle.center,
            radius: circle.radius,
            startAngle: startAngle,
            endAngle: endAngle,
            color: circle.color,
            lineWidth: circle.lineWidth,
            lineType: circle.lineType,
            layerId: circle.layerId
        }];
    }
    
    /**
     * قطع polyline
     */
    breakPolyline(polyline, firstPoint, secondPoint) {
        // تبسيط: تقسيم الـ polyline عند النقاط
        const results = [];
        
        if (!polyline.points || polyline.points.length < 2) {
            return [polyline];
        }
        
        // إنشاء نسخة مبسطة - يمكن تطوير هذا لاحقاً
        const midIndex = Math.floor(polyline.points.length / 2);
        
        if (midIndex > 0) {
            results.push({
                ...polyline,
                points: polyline.points.slice(0, midIndex + 1)
            });
        }
        
        if (midIndex < polyline.points.length - 1) {
            results.push({
                ...polyline,
                points: polyline.points.slice(midIndex)
            });
        }
        
        return results;
    }
    
    /**
     * إلغاء العملية
     */
    cancelOperation() {
        this.finishOperation();
    }
    
    /**
     * إنهاء العملية
     */
    finishOperation() {
        this.cleanup();
        this.deactivate();
    }
    
    /**
     * تنظيف الحالة
     */
    cleanup() {
        this.state = {
            phase: 'selectObject',
            targetShape: null,
            firstBreakPoint: null,
            previewShapes: []
        };
        
        this.cad.tempShapes = null;
        this.cad.canvas.style.cursor = 'default';
    }
    
    /**
     * معلومات الأداة للمطورين
     */
    getInfo() {
        return {
            name: 'Break',
            version: '1.0.0',
            phase: this.state.phase,
            targetShape: this.state.targetShape?.type || 'none',
            supportsPostSelection: true,
            supportedShapes: ['line', 'arc', 'circle', 'polyline'],
            keyboardShortcuts: ['B', 'BR']
        };
    }
}