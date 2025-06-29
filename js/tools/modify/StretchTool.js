// ==================== js/tools/modify/StretchTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة التمديد (Stretch)
 * تُستخدم لتمديد جزء من العنصر عن طريق تحريك رؤوسه أو نقاطه الطرفية
 */
export class StretchTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-expand-arrows-alt';
        this.cursor = 'crosshair';
        
        // حالة الأداة
        this.step = 'select'; // select, base-point, stretch
        this.selectionWindow = null;
        this.basePoint = null;
        this.stretchablePoints = [];
        this.affectedShapes = new Map(); // shape -> vertices to stretch
    }
    
    onActivate() {
        // إذا كان هناك تحديد مسبق، ابدأ من base-point
        if (this.cad.selectedShapes.size > 0) {
            this.prepareStretchFromSelection();
            this.step = 'base-point';
            this.updateStatus('Specify base point');
        } else {
            this.step = 'select';
            this.updateStatus('Select objects with crossing window');
        }
        
        this.selectionWindow = null;
        this.basePoint = null;
        this.stretchablePoints = [];
        this.affectedShapes.clear();
    }
    
    onDeactivate() {
        this.cleanup();
    }
    
    onClick(point) {
        switch (this.step) {
            case 'select':
                this.handleSelectionStart(point);
                break;
                
            case 'base-point':
                this.handleBasePoint(point);
                break;
                
            case 'stretch':
                this.handleStretchEnd(point);
                break;
        }
    }
    
    onMouseMove(point) {
        switch (this.step) {
            case 'select':
                this.updateSelectionPreview(point);
                break;
                
            case 'stretch':
                this.updateStretchPreview(point);
                break;
        }
    }
    
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cleanup();
            this.deactivate();
        } else if (key === 'Enter' && this.step === 'select') {
            this.finalizeSelection();
        }
    }
    
    /**
     * بدء اختيار الكائنات
     */
    handleSelectionStart(point) {
        if (!this.selectionWindow) {
            this.selectionWindow = { start: point, end: point };
            this.updateStatus('Specify opposite corner');
        } else {
            this.selectionWindow.end = point;
            this.processStretchSelection();
        }
    }
    
    /**
     * تحديد النقطة الأساسية للتمديد
     */
    handleBasePoint(point) {
        this.basePoint = point;
        this.step = 'stretch';
        this.updateStatus('Specify stretch point');
        
        // إظهار dynamic input للمسافة
        if (this.cad.ui && this.cad.ui.showDynamicInput) {
            this.cad.ui.showDynamicInput('Stretch distance:', point);
        }
    }
    
    /**
     * إنهاء عملية التمديد
     */
    handleStretchEnd(point) {
        const displacement = {
            x: point.x - this.basePoint.x,
            y: point.y - this.basePoint.y
        };
        
        this.applyStretch(displacement);
        this.finishStretch();
    }
    
    /**
     * تحديث معاينة التحديد
     */
    updateSelectionPreview(point) {
        if (this.selectionWindow) {
            this.selectionWindow.end = point;
            
            // رسم مستطيل التحديد
            this.cad.tempShape = {
                type: 'selection-box',
                start: this.selectionWindow.start,
                end: point,
                style: 'crossing' // crossing window
            };
            this.cad.render();
        }
    }
    
    /**
     * تحديث معاينة التمديد
     */
    updateStretchPreview(point) {
        if (!this.basePoint) return;
        
        const displacement = {
            x: point.x - this.basePoint.x,
            y: point.y - this.basePoint.y
        };
        
        // إنشاء أشكال المعاينة
        const previewShapes = [];
        
        this.affectedShapes.forEach((stretchPoints, shape) => {
            const previewShape = this.createStretchedShape(shape, stretchPoints, displacement);
            if (previewShape) {
                previewShape.color = '#00d4aa'; // لون المعاينة
                previewShape.lineWidth = 1;
                previewShapes.push(previewShape);
            }
        });
        
        this.cad.tempShapes = previewShapes;
        this.cad.render();
    }
    
    /**
     * معالجة تحديد الكائنات للتمديد
     */
    processStretchSelection() {
        if (!this.selectionWindow) return;
        
        const selectedShapes = this.getShapesInCrossingWindow(this.selectionWindow);
        
        if (selectedShapes.length === 0) {
            this.updateStatus('No objects selected');
            this.selectionWindow = null;
            return;
        }
        
        // تحليل الكائنات لتحديد النقاط القابلة للتمديد
        this.analyzeShapesForStretching(selectedShapes);
        
        if (this.affectedShapes.size === 0) {
            this.updateStatus('No stretchable objects found');
            this.selectionWindow = null;
            return;
        }
        
        this.step = 'base-point';
        this.updateStatus('Specify base point');
        this.selectionWindow = null;
    }
    
    /**
     * إعداد التمديد من التحديد المسبق
     */
    prepareStretchFromSelection() {
        const selectedShapes = Array.from(this.cad.selectedShapes);
        this.analyzeShapesForStretching(selectedShapes);
        
        if (this.affectedShapes.size === 0) {
            this.updateStatus('No stretchable objects in selection');
            this.deactivate();
        }
    }
    
    /**
     * تحليل الأشكال لتحديد النقاط القابلة للتمديد
     */
    analyzeShapesForStretching(shapes) {
        this.affectedShapes.clear();
        
        shapes.forEach(shape => {
            if (!this.canModifyShape(shape)) return;
            
            const stretchPoints = this.getStretchablePoints(shape);
            if (stretchPoints.length > 0) {
                this.affectedShapes.set(shape, stretchPoints);
            }
        });
    }
    
    /**
     * الحصول على النقاط القابلة للتمديد في الشكل
     */
    getStretchablePoints(shape) {
        const points = [];
        
        switch (shape.type) {
            case 'line':
                // في الخط، كلا النقطتين قابلتان للتمديد
                points.push('start', 'end');
                break;
                
            case 'polyline':
                // في البوليلاين، جميع النقاط قابلة للتمديد
                if (shape.points) {
                    for (let i = 0; i < shape.points.length; i++) {
                        points.push(i);
                    }
                }
                break;
                
            case 'rectangle':
                // في المستطيل، يمكن تمديد الأركان
                points.push('start', 'end');
                break;
                
            case 'polygon':
                // في المضلع، جميع الرؤوس قابلة للتمديد
                if (shape.points) {
                    for (let i = 0; i < shape.points.length; i++) {
                        points.push(i);
                    }
                }
                break;
                
            // الدوائر والأقواس والإهليجيات غير مدعومة للتمديد
            case 'circle':
            case 'arc':
            case 'ellipse':
                // لا يمكن تمديدها
                break;
        }
        
        return points;
    }
    
    /**
     * إنشاء شكل ممدد للمعاينة
     */
    createStretchedShape(shape, stretchPoints, displacement) {
        const stretchedShape = this.cloneShape(shape);
        
        switch (shape.type) {
            case 'line':
                if (stretchPoints.includes('start')) {
                    stretchedShape.start.x += displacement.x;
                    stretchedShape.start.y += displacement.y;
                }
                if (stretchPoints.includes('end')) {
                    stretchedShape.end.x += displacement.x;
                    stretchedShape.end.y += displacement.y;
                }
                break;
                
            case 'polyline':
            case 'polygon':
                stretchPoints.forEach(pointIndex => {
                    if (stretchedShape.points[pointIndex]) {
                        stretchedShape.points[pointIndex].x += displacement.x;
                        stretchedShape.points[pointIndex].y += displacement.y;
                    }
                });
                break;
                
            case 'rectangle':
                if (stretchPoints.includes('start')) {
                    stretchedShape.start.x += displacement.x;
                    stretchedShape.start.y += displacement.y;
                }
                if (stretchPoints.includes('end')) {
                    stretchedShape.end.x += displacement.x;
                    stretchedShape.end.y += displacement.y;
                }
                break;
        }
        
        return stretchedShape;
    }
    
    /**
     * نسخ شكل (دالة مساعدة)
     */
    cloneShape(shape) {
        if (this.cad.cloneShape) {
            return this.cad.cloneShape(shape);
        }
        
        // دالة نسخ بسيطة
        return JSON.parse(JSON.stringify(shape));
    }
    
    /**
     * تطبيق التمديد على الأشكال
     */
    applyStretch(displacement) {
        this.cad.recordState();
        
        this.affectedShapes.forEach((stretchPoints, shape) => {
            switch (shape.type) {
                case 'line':
                    if (stretchPoints.includes('start')) {
                        shape.start.x += displacement.x;
                        shape.start.y += displacement.y;
                    }
                    if (stretchPoints.includes('end')) {
                        shape.end.x += displacement.x;
                        shape.end.y += displacement.y;
                    }
                    break;
                    
                case 'polyline':
                case 'polygon':
                    stretchPoints.forEach(pointIndex => {
                        if (shape.points[pointIndex]) {
                            shape.points[pointIndex].x += displacement.x;
                            shape.points[pointIndex].y += displacement.y;
                        }
                    });
                    break;
                    
                case 'rectangle':
                    if (stretchPoints.includes('start')) {
                        shape.start.x += displacement.x;
                        shape.start.y += displacement.y;
                    }
                    if (stretchPoints.includes('end')) {
                        shape.end.x += displacement.x;
                        shape.end.y += displacement.y;
                    }
                    break;
            }
        });
        
        this.cad.render();
    }
    
    /**
     * الحصول على الأشكال داخل نافذة التحديد المتقاطعة
     */
    getShapesInCrossingWindow(window) {
        const shapes = [];
        const rect = this.normalizeRect(window);
        
        this.cad.shapes.forEach(shape => {
            if (this.shapeIntersectsRect(shape, rect)) {
                shapes.push(shape);
            }
        });
        
        return shapes;
    }
    
    /**
     * تطبيع المستطيل (للتأكد من أن start أصغر من end)
     */
    normalizeRect(window) {
        return {
            left: Math.min(window.start.x, window.end.x),
            right: Math.max(window.start.x, window.end.x),
            top: Math.min(window.start.y, window.end.y),
            bottom: Math.max(window.start.y, window.end.y)
        };
    }
    
    /**
     * التحقق من تقاطع الشكل مع المستطيل
     */
    shapeIntersectsRect(shape, rect) {
        switch (shape.type) {
            case 'line':
                return this.lineIntersectsRect(shape, rect);
            case 'circle':
                return this.circleIntersectsRect(shape, rect);
            case 'rectangle':
                return this.rectangleIntersectsRect(shape, rect);
            case 'polyline':
            case 'polygon':
                return this.polylineIntersectsRect(shape, rect);
            default:
                return false;
        }
    }
    
    /**
     * التحقق من تقاطع خط مع مستطيل
     */
    lineIntersectsRect(line, rect) {
        // التحقق من وجود النقطتين داخل المستطيل
        const startInside = this.pointInRect(line.start, rect);
        const endInside = this.pointInRect(line.end, rect);
        
        if (startInside || endInside) return true;
        
        // التحقق من تقاطع الخط مع حدود المستطيل
        return this.lineIntersectsRectBounds(line, rect);
    }
    
    /**
     * التحقق من وجود نقطة داخل مستطيل
     */
    pointInRect(point, rect) {
        return point.x >= rect.left && point.x <= rect.right &&
               point.y >= rect.top && point.y <= rect.bottom;
    }
    
    /**
     * التحقق من تقاطع خط مع حدود مستطيل
     */
    lineIntersectsRectBounds(line, rect) {
        // تبسيط: التحقق من التقاطع مع كل ضلع من أضلاع المستطيل
        const rectLines = [
            { start: { x: rect.left, y: rect.top }, end: { x: rect.right, y: rect.top } },
            { start: { x: rect.right, y: rect.top }, end: { x: rect.right, y: rect.bottom } },
            { start: { x: rect.right, y: rect.bottom }, end: { x: rect.left, y: rect.bottom } },
            { start: { x: rect.left, y: rect.bottom }, end: { x: rect.left, y: rect.top } }
        ];
        
        return rectLines.some(rectLine => 
            this.lineLineIntersection(line.start, line.end, rectLine.start, rectLine.end)
        );
    }
    
    /**
     * حساب تقاطع خطين
     */
    lineLineIntersection(p1, p2, p3, p4) {
        if (this.cad.geo && this.cad.geo.lineLineIntersection) {
            return this.cad.geo.lineLineIntersection(p1, p2, p3, p4);
        }
        
        // دالة بسيطة لحساب التقاطع
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return null;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }
        
        return null;
    }
    
    /**
     * التحقق من تقاطع دائرة مع مستطيل
     */
    circleIntersectsRect(circle, rect) {
        // التحقق من وجود مركز الدائرة داخل المستطيل
        if (this.pointInRect(circle.center, rect)) return true;
        
        // التحقق من المسافة من مركز الدائرة إلى أقرب نقطة في المستطيل
        const closestX = Math.max(rect.left, Math.min(circle.center.x, rect.right));
        const closestY = Math.max(rect.top, Math.min(circle.center.y, rect.bottom));
        
        const distance = Math.sqrt(
            Math.pow(circle.center.x - closestX, 2) + 
            Math.pow(circle.center.y - closestY, 2)
        );
        
        return distance <= circle.radius;
    }
    
    /**
     * التحقق من تقاطع مستطيل مع مستطيل
     */
    rectangleIntersectsRect(rectangle, rect) {
        const shapeRect = this.normalizeRect(rectangle);
        
        return !(shapeRect.right < rect.left || 
                shapeRect.left > rect.right || 
                shapeRect.bottom < rect.top || 
                shapeRect.top > rect.bottom);
    }
    
    /**
     * التحقق من تقاطع بوليلاين مع مستطيل
     */
    polylineIntersectsRect(polyline, rect) {
        if (!polyline.points || polyline.points.length === 0) return false;
        
        // التحقق من وجود أي نقطة داخل المستطيل
        if (polyline.points.some(point => this.pointInRect(point, rect))) {
            return true;
        }
        
        // التحقق من تقاطع أي ضلع مع المستطيل
        for (let i = 0; i < polyline.points.length - 1; i++) {
            const line = {
                start: polyline.points[i],
                end: polyline.points[i + 1]
            };
            
            if (this.lineIntersectsRectBounds(line, rect)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * إنهاء عملية التمديد
     */
    finishStretch() {
        this.updateStatus('Stretch completed');
        this.cleanup();
        this.deactivate();
    }
    
    /**
     * تنظيف البيانات
     */
    cleanup() {
        this.step = 'select';
        this.selectionWindow = null;
        this.basePoint = null;
        this.stretchablePoints = [];
        this.affectedShapes.clear();
        this.cad.tempShape = null;
        this.cad.tempShapes = null;
        this.cad.render();
        
        // إخفاء dynamic input
        if (this.cad.ui && this.cad.ui.hideDynamicInput) {
            this.cad.ui.hideDynamicInput();
        }
    }
}