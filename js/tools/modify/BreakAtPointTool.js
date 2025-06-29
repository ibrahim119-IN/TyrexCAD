// ==================== js/tools/modify/BreakAtPointTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة القطع عند نقطة (Break at Point)
 * تقسيم العنصر إلى جزئين عند نقطة واحدة بدون حذف - متوافقة مع معايير CAD
 */
export class BreakAtPointTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-crosshairs';
        this.cursor = 'crosshair';
        
        // حالة الأداة
        this.state = {
            phase: 'selectObject', // 'selectObject', 'selectPoint'
            targetShape: null,
            previewPoint: null
        };
        
        // إعدادات الأداة
        this.settings = {
            avoidEndpoints: true, // تجنب القطع قريباً من النهايات
            endpointTolerance: 0.05 // 5% من طول العنصر
        };
    }
    
    onActivate() {
        // دعم Post-selection: التحقق من وجود عنصر واحد محدد
        if (this.cad.selectedShapes.size === 1) {
            const selectedShape = Array.from(this.cad.selectedShapes)[0];
            if (this.canBreakShape(selectedShape)) {
                this.state.targetShape = selectedShape;
                this.state.phase = 'selectPoint';
                this.updateStatus('Specify break point on object');
                return true;
            }
        }
        
        // طلب اختيار العنصر
        this.state.phase = 'selectObject';
        this.updateStatus('Select object to break at point');
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
                
            case 'selectPoint':
                this.breakAtPoint(point);
                break;
        }
    }
    
    onMouseMove(point) {
        if (this.state.phase === 'selectPoint' && this.state.targetShape) {
            this.showPointPreview(point);
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
            this.state.phase = 'selectPoint';
            
            // مسح التحديد السابق وتحديد العنصر الجديد
            this.cad.selectedShapes.clear();
            this.cad.selectedShapes.add(shape);
            
            this.updateStatus('Specify break point on object');
            this.cad.render();
        } else {
            this.updateStatus('Select a breakable object (line, arc, circle, polyline)');
        }
    }
    
    /**
     * تطبيق القطع عند النقطة
     */
    breakAtPoint(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const breakPoint = this.getValidBreakPoint(this.state.targetShape, world);
        
        if (!breakPoint.valid) {
            this.updateStatus(breakPoint.reason || 'Invalid break point');
            return;
        }
        
        this.performBreakAtPoint(breakPoint);
    }
    
    /**
     * التحقق من إمكانية قطع الشكل
     */
    canBreakShape(shape) {
        return ['line', 'arc', 'circle', 'polyline'].includes(shape.type);
    }
    
    /**
     * الحصول على نقطة قطع صالحة
     */
    getValidBreakPoint(shape, point) {
        const breakPoint = this.getClosestPointOnShape(shape, point);
        
        // التحقق من صحة النقطة
        if (this.settings.avoidEndpoints && this.isTooCloseToEndpoint(shape, breakPoint)) {
            return {
                valid: false,
                reason: 'Break point too close to endpoint',
                point: breakPoint
            };
        }
        
        return {
            valid: true,
            point: breakPoint
        };
    }
    
    /**
     * التحقق من قرب النقطة من النهايات
     */
    isTooCloseToEndpoint(shape, point) {
        switch (shape.type) {
            case 'line':
                if (point.t !== undefined) {
                    return point.t < this.settings.endpointTolerance || 
                           point.t > (1 - this.settings.endpointTolerance);
                }
                break;
                
            case 'arc':
                if (point.angle !== undefined) {
                    const totalAngle = shape.endAngle - shape.startAngle;
                    const angleFromStart = point.angle - shape.startAngle;
                    const ratio = angleFromStart / totalAngle;
                    return ratio < this.settings.endpointTolerance || 
                           ratio > (1 - this.settings.endpointTolerance);
                }
                break;
                
            case 'circle':
                // الدوائر لا تحتاج فحص نهايات
                return false;
                
            case 'polyline':
                // فحص مبسط للـ polyline
                return false;
        }
        
        return false;
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
        
        const t = Math.max(0.01, Math.min(0.99, // تجنب النهايات تماماً
            ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / (length * length)
        ));
        
        return {
            x: line.start.x + t * dx,
            y: line.start.y + t * dy,
            t: t
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
        
        let startAngle = arc.startAngle;
        let endAngle = arc.endAngle;
        
        // تطبيع زوايا القوس
        while (startAngle < 0) startAngle += 2 * Math.PI;
        while (endAngle < 0) endAngle += 2 * Math.PI;
        
        // التأكد أن النقطة ضمن القوس
        if (endAngle > startAngle) {
            if (angle < startAngle || angle > endAngle) {
                // اختيار منتصف القوس كنقطة افتراضية
                angle = (startAngle + endAngle) / 2;
            }
        }
        
        // تجنب النهايات
        const minGap = (endAngle - startAngle) * this.settings.endpointTolerance;
        if (Math.abs(angle - startAngle) < minGap) {
            angle = startAngle + minGap;
        }
        if (Math.abs(angle - endAngle) < minGap) {
            angle = endAngle - minGap;
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
        
        let closestPoint = null;
        let minDistance = Infinity;
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
        
        if (closestPoint) {
            closestPoint.segmentIndex = segmentIndex;
        }
        
        return closestPoint || point;
    }
    
    /**
     * معاينة نقطة القطع
     */
    showPointPreview(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const breakPointInfo = this.getValidBreakPoint(this.state.targetShape, world);
        
        if (!breakPointInfo.valid) {
            // إظهار نقطة غير صالحة
            const indicator = {
                type: 'circle',
                center: breakPointInfo.point,
                radius: 4,
                color: '#ff4444',
                lineWidth: 2
            };
            
            this.cad.tempShapes = [indicator];
        } else {
            // إظهار نقطة صالحة مع معاينة النتيجة
            const breakPoint = breakPointInfo.point;
            const previewShapes = this.calculateBreakAtPointResult(this.state.targetShape, breakPoint, true);
            
            // إضافة مؤشر النقطة
            const indicator = {
                type: 'circle',
                center: breakPoint,
                radius: 3,
                color: '#00ff88',
                lineWidth: 2
            };
            
            previewShapes.push(indicator);
            this.cad.tempShapes = previewShapes;
        }
        
        this.cad.render();
    }
    
    /**
     * تطبيق القطع عند النقطة
     */
    performBreakAtPoint(breakPointInfo) {
        this.cad.recordState();
        
        const breakPoint = breakPointInfo.point;
        const resultShapes = this.calculateBreakAtPointResult(this.state.targetShape, breakPoint, false);
        
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
        
        this.updateStatus(`Object split into ${resultShapes.length} parts`);
        this.finishOperation();
    }
    
    /**
     * حساب نتيجة القطع عند النقطة
     */
    calculateBreakAtPointResult(shape, breakPoint, isPreview = false) {
        let results = [];
        
        switch (shape.type) {
            case 'line':
                results = this.breakLineAtPoint(shape, breakPoint);
                break;
                
            case 'arc':
                results = this.breakArcAtPoint(shape, breakPoint);
                break;
                
            case 'circle':
                results = this.breakCircleAtPoint(shape, breakPoint);
                break;
                
            case 'polyline':
                results = this.breakPolylineAtPoint(shape, breakPoint);
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
     * قطع خط عند نقطة
     */
    breakLineAtPoint(line, breakPoint) {
        const results = [];
        
        // الجزء الأول (من البداية إلى نقطة القطع)
        const firstPart = {
            ...line,
            end: { ...breakPoint }
        };
        
        // الجزء الثاني (من نقطة القطع إلى النهاية)
        const secondPart = {
            ...line,
            start: { ...breakPoint }
        };
        
        // التحقق من أن كل جزء له طول مفيد
        if (this.cad.distance(firstPart.start.x, firstPart.start.y, firstPart.end.x, firstPart.end.y) > 0.1) {
            results.push(firstPart);
        }
        
        if (this.cad.distance(secondPart.start.x, secondPart.start.y, secondPart.end.x, secondPart.end.y) > 0.1) {
            results.push(secondPart);
        }
        
        return results;
    }
    
    /**
     * قطع قوس عند نقطة
     */
    breakArcAtPoint(arc, breakPoint) {
        const breakAngle = breakPoint.angle;
        const results = [];
        
        // الجزء الأول (من البداية إلى نقطة القطع)
        const firstArc = {
            ...arc,
            endAngle: breakAngle
        };
        
        // الجزء الثاني (من نقطة القطع إلى النهاية)
        const secondArc = {
            ...arc,
            startAngle: breakAngle
        };
        
        // التحقق من أن كل جزء له زاوية مفيدة
        if (Math.abs(firstArc.endAngle - firstArc.startAngle) > 0.01) {
            results.push(firstArc);
        }
        
        if (Math.abs(secondArc.endAngle - secondArc.startAngle) > 0.01) {
            results.push(secondArc);
        }
        
        return results;
    }
    
    /**
     * قطع دائرة عند نقطة
     */
    breakCircleAtPoint(circle, breakPoint) {
        const breakAngle = breakPoint.angle;
        
        // تحويل الدائرة إلى قوس مفتوح عند نقطة القطع
        return [{
            type: 'arc',
            center: circle.center,
            radius: circle.radius,
            startAngle: breakAngle + 0.01, // فجوة صغيرة
            endAngle: breakAngle + 2 * Math.PI - 0.01,
            color: circle.color,
            lineWidth: circle.lineWidth,
            lineType: circle.lineType,
            layerId: circle.layerId
        }];
    }
    
    /**
     * قطع polyline عند نقطة
     */
    breakPolylineAtPoint(polyline, breakPoint) {
        if (!polyline.points || polyline.points.length < 2) return [polyline];
        
        const results = [];
        const segmentIndex = breakPoint.segmentIndex;
        
        if (segmentIndex >= 0 && segmentIndex < polyline.points.length - 1) {
            // الجزء الأول: من البداية إلى نقطة القطع
            const firstPoints = polyline.points.slice(0, segmentIndex + 1);
            firstPoints.push({ x: breakPoint.x, y: breakPoint.y });
            
            // الجزء الثاني: من نقطة القطع إلى النهاية
            const secondPoints = [{ x: breakPoint.x, y: breakPoint.y }];
            secondPoints.push(...polyline.points.slice(segmentIndex + 1));
            
            // إنشاء polylines جديدة
            if (firstPoints.length >= 2) {
                results.push({
                    ...polyline,
                    points: firstPoints
                });
            }
            
            if (secondPoints.length >= 2) {
                results.push({
                    ...polyline,
                    points: secondPoints
                });
            }
        } else {
            // إذا لم نتمكن من تحديد segment، أرجع الأصل
            results.push({ ...polyline });
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
            previewPoint: null
        };
        
        this.cad.tempShapes = null;
        this.cad.canvas.style.cursor = 'default';
    }
    
    /**
     * معلومات الأداة للمطورين
     */
    getInfo() {
        return {
            name: 'Break at Point',
            version: '1.0.0',
            phase: this.state.phase,
            targetShape: this.state.targetShape?.type || 'none',
            supportsPostSelection: true,
            supportedShapes: ['line', 'arc', 'circle', 'polyline'],
            keyboardShortcuts: ['Shift+B', 'BRP'],
            settings: this.settings
        };
    }
}