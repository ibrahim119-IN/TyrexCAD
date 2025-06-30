// ==================== js/tools/modify/StretchTool.js ====================

import { ModifyToolBase, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة التمديد (Stretch) - محدثة بالإدخال الديناميكي والسلوك الصحيح
 * Stretch Tool with Dynamic Input and Correct Stretching Behavior
 */
export class StretchTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-expand-arrows-alt';
        this.cursor = 'crosshair';
        
        // حالة الأداة
        this.step = 'select'; // select, base-point, stretch
        this.selectionWindow = null;
        this.stretchablePoints = [];
        this.affectedShapes = new Map(); // shape -> vertices to stretch
        this.currentDistance = 0;
        this.currentAngle = 0;
    }
    
    onActivate() {
        // إذا كان هناك تحديد مسبق، ابدأ من base-point
        if (this.cad.selectedShapes.size > 0) {
            // في حالة التحديد المسبق، نحتاج لنافذة تحديد لتحديد النقاط
            this.step = 'select';
            this.updateStatus('Select stretch points with crossing window');
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
        this.hideDynamicInput();
        this.cleanup();
        super.onDeactivate();
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
                // تطبيق قيود Ortho/Polar
                const constrainedPoint = this.applyConstraints(this.basePoint, point);
                this.handleStretchEnd(constrainedPoint);
                break;
        }
    }
    
    /**
     * معالجة حركة الماوس المحدثة
     */
    processMouseMove(point) {
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
        } else if (key === 'Enter') {
            if (this.step === 'select' && this.selectionWindow) {
                this.processStretchSelection();
            } else if (this.step === 'stretch' && this.basePoint) {
                // تطبيق بالقيمة الحالية
                this.confirmStretch();
            }
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
        this.updateStatus('Specify stretch point or type distance');
        
        // عرض الإدخال الديناميكي
        this.showDynamicInput();
    }
    
    /**
     * عرض الإدخال الديناميكي
     */
    showDynamicInput() {
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.DISTANCE,
            label: 'Stretch Distance',
            defaultValue: this.getLastStretchDistance(),
            placeholder: 'Enter stretch distance',
            
            onInput: (value) => {
                if (value !== null && value > 0) {
                    this.constrainedMode = true;
                    this.constrainedValue = value;
                    this.updateConstrainedPreview();
                } else {
                    this.constrainedMode = false;
                    this.constrainedValue = null;
                }
            },
            
            onConfirm: (value) => {
                if (value && value > 0) {
                    // تطبيق بالقيمة المحددة
                    const dx = value * Math.cos(this.currentAngle);
                    const dy = value * Math.sin(this.currentAngle);
                    this.applyStretch({ x: dx, y: dy });
                    this.finishStretch();
                }
            }
        });
    }
    
    /**
     * تحديث المعاينة المقيدة
     */
    updateConstrainedPreview() {
        if (!this.basePoint || !this.constrainedValue) return;
        
        const dx = this.constrainedValue * Math.cos(this.currentAngle);
        const dy = this.constrainedValue * Math.sin(this.currentAngle);
        
        this.showStretchPreview({ x: dx, y: dy });
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
     * تأكيد التمديد (للاستخدام مع Enter)
     */
    confirmStretch() {
        if (this.constrainedMode && this.constrainedValue > 0) {
            const dx = this.constrainedValue * Math.cos(this.currentAngle);
            const dy = this.constrainedValue * Math.sin(this.currentAngle);
            this.applyStretch({ x: dx, y: dy });
        } else if (this.currentDistance > 0) {
            const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
            const constrainedPoint = this.applyConstraints(this.basePoint, world);
            const displacement = {
                x: constrainedPoint.x - this.basePoint.x,
                y: constrainedPoint.y - this.basePoint.y
            };
            this.applyStretch(displacement);
        }
        this.finishStretch();
    }
    
    /**
     * تحديث معاينة التحديد
     * 🔥 إصلاح رسم مستطيل التحديد
     */
    updateSelectionPreview(point) {
        if (this.selectionWindow) {
            this.selectionWindow.end = point;
            
            // رسم مستطيل التحديد كمستطيل عادي مع تنسيق خاص
            const selectionRect = {
                type: 'rectangle',
                start: this.selectionWindow.start,
                end: point,
                color: '#00ffcc',
                lineWidth: 1,
                lineType: 'dashed',
                filled: true,
                fillColor: 'rgba(0, 255, 204, 0.1)',
                tempStyle: {
                    opacity: 0.5,
                    dashArray: [5, 5]
                }
            };
            
            this.cad.tempShape = selectionRect;
            this.cad.render();
        }
    }
    
    /**
     * تحديث معاينة التمديد
     */
    updateStretchPreview(point) {
        if (!this.basePoint) return;
        
        // حساب المسافة والزاوية
        const dx = point.x - this.basePoint.x;
        const dy = point.y - this.basePoint.y;
        this.currentDistance = Math.sqrt(dx * dx + dy * dy);
        this.currentAngle = Math.atan2(dy, dx);
        
        let displacement;
        if (this.constrainedMode && this.constrainedValue > 0) {
            displacement = {
                x: this.constrainedValue * Math.cos(this.currentAngle),
                y: this.constrainedValue * Math.sin(this.currentAngle)
            };
        } else {
            displacement = { x: dx, y: dy };
        }
        
        // تحديث القيمة الحية في الإدخال الديناميكي
        if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            let displayDistance = this.currentDistance;
            if (this.cad.units && this.cad.currentUnit) {
                try {
                    displayDistance = this.cad.units.fromInternal(this.currentDistance, this.cad.currentUnit);
                } catch (e) {
                    // استخدام القيمة الأصلية
                }
            }
            this.cad.dynamicInputManager.updateLiveValue(displayDistance);
        }
        
        // إنشاء معاينة الأشكال
        this.showStretchPreview(displacement);
        
        // تحديث رسالة الحالة
        let displayDist = Math.sqrt(displacement.x * displacement.x + displacement.y * displacement.y);
        if (this.cad.units && this.cad.currentUnit) {
            try {
                displayDist = this.cad.units.fromInternal(displayDist, this.cad.currentUnit);
            } catch (e) {
                // استخدام القيمة الأصلية
            }
        }
        
        const angleDeg = this.currentAngle * 180 / Math.PI;
        this.updateStatus(
            `Stretch: ${displayDist.toFixed(2)} ${this.cad.currentUnit} at ${angleDeg.toFixed(1)}°` +
            (this.constrainedMode ? ' [CONSTRAINED]' : '') +
            (this.cad.orthoEnabled ? ' [ORTHO]' : '') +
            (this.cad.polarEnabled ? ' [POLAR]' : '')
        );
    }
    
    /**
     * عرض معاينة التمديد
     */
    showStretchPreview(displacement) {
        const previewShapes = [];
        
        // إضافة خط من نقطة الأساس
        const stretchLine = {
            type: 'line',
            start: this.basePoint,
            end: {
                x: this.basePoint.x + displacement.x,
                y: this.basePoint.y + displacement.y
            },
            color: '#00ffcc',
            lineWidth: 1,
            tempStyle: {
                opacity: 0.6,
                dashArray: [10, 5]
            }
        };
        previewShapes.push(stretchLine);
        
        // سهم الاتجاه
        const arrowSize = 10 / this.cad.zoom;
        const angle = Math.atan2(displacement.y, displacement.x);
        const arrowEnd = stretchLine.end;
        
        const arrow1 = {
            type: 'line',
            start: arrowEnd,
            end: {
                x: arrowEnd.x - arrowSize * Math.cos(angle - Math.PI/6),
                y: arrowEnd.y - arrowSize * Math.sin(angle - Math.PI/6)
            },
            color: '#00ffcc',
            lineWidth: 2,
            tempStyle: { opacity: 0.8 }
        };
        
        const arrow2 = {
            type: 'line',
            start: arrowEnd,
            end: {
                x: arrowEnd.x - arrowSize * Math.cos(angle + Math.PI/6),
                y: arrowEnd.y - arrowSize * Math.sin(angle + Math.PI/6)
            },
            color: '#00ffcc',
            lineWidth: 2,
            tempStyle: { opacity: 0.8 }
        };
        
        previewShapes.push(arrow1, arrow2);
        
        // معاينة الأشكال الممدودة
        this.affectedShapes.forEach((stretchPoints, shape) => {
            const previewShape = this.createStretchedShape(shape, stretchPoints, displacement);
            if (previewShape) {
                previewShape.color = '#00d4aa';
                previewShape.lineWidth = 1;
                previewShape.tempStyle = {
                    opacity: 0.8
                };
                previewShapes.push(previewShape);
            }
            
            // إضافة الشكل الأصلي باهت
            const originalClone = this.cloneShape(shape);
            originalClone.tempStyle = {
                opacity: 0.3,
                color: '#666'
            };
            previewShapes.push(originalClone);
        });
        
        // علامة نقطة الأساس
        const baseMarker = {
            type: 'circle',
            center: this.basePoint,
            radius: 3 / this.cad.zoom,
            color: '#ff9900',
            lineWidth: 2,
            filled: true,
            tempStyle: { opacity: 0.8 }
        };
        previewShapes.push(baseMarker);
        
        // إضافة علامات على النقاط المتأثرة
        this.affectedShapes.forEach((stretchPoints, shape) => {
            const pointMarkers = this.getAffectedPointMarkers(shape, stretchPoints);
            previewShapes.push(...pointMarkers);
        });
        
        this.cad.tempShapes = previewShapes;
        this.cad.render();
    }
    
    /**
     * الحصول على علامات النقاط المتأثرة
     */
    getAffectedPointMarkers(shape, stretchPoints) {
        const markers = [];
        const markerRadius = 3 / this.cad.zoom;
        
        switch (shape.type) {
            case 'line':
                if (stretchPoints.includes('start')) {
                    markers.push({
                        type: 'circle',
                        center: shape.start,
                        radius: markerRadius,
                        color: '#ff0000',
                        filled: true,
                        tempStyle: { opacity: 0.8 }
                    });
                }
                if (stretchPoints.includes('end')) {
                    markers.push({
                        type: 'circle',
                        center: shape.end,
                        radius: markerRadius,
                        color: '#ff0000',
                        filled: true,
                        tempStyle: { opacity: 0.8 }
                    });
                }
                break;
                
            case 'polyline':
            case 'polygon':
                stretchPoints.forEach(pointIndex => {
                    if (shape.points[pointIndex]) {
                        markers.push({
                            type: 'circle',
                            center: shape.points[pointIndex],
                            radius: markerRadius,
                            color: '#ff0000',
                            filled: true,
                            tempStyle: { opacity: 0.8 }
                        });
                    }
                });
                break;
                
            case 'rectangle':
                // معالجة خاصة للمستطيل
                const corners = {
                    bottomLeft: { x: shape.start.x, y: shape.start.y },
                    bottomRight: { x: shape.end.x, y: shape.start.y },
                    topRight: { x: shape.end.x, y: shape.end.y },
                    topLeft: { x: shape.start.x, y: shape.end.y }
                };
                
                stretchPoints.forEach(cornerId => {
                    if (corners[cornerId]) {
                        markers.push({
                            type: 'circle',
                            center: corners[cornerId],
                            radius: markerRadius,
                            color: '#ff0000',
                            filled: true,
                            tempStyle: { opacity: 0.8 }
                        });
                    }
                });
                break;
        }
        
        return markers;
    }
    
    /**
     * معالجة تحديد الكائنات للتمديد
     */
    processStretchSelection() {
        if (!this.selectionWindow) return;
        
        const rect = this.normalizeRect(this.selectionWindow);
        
        // الحصول على جميع الأشكال
        const allShapes = this.cad.selectedShapes.size > 0 ? 
            Array.from(this.cad.selectedShapes) : this.cad.shapes;
        
        // تحليل الأشكال لتحديد النقاط القابلة للتمديد
        this.analyzeShapesForStretching(allShapes, rect);
        
        if (this.affectedShapes.size === 0) {
            this.updateStatus('No stretchable points found in selection window');
            this.selectionWindow = null;
            this.cad.tempShape = null;
            this.cad.render();
            return;
        }
        
        // عرض عدد النقاط المحددة
        let totalPoints = 0;
        this.affectedShapes.forEach(points => totalPoints += points.length);
        
        this.step = 'base-point';
        this.updateStatus(`${totalPoints} points selected in ${this.affectedShapes.size} objects. Specify base point`);
        this.selectionWindow = null;
        this.cad.tempShape = null;
        this.cad.render();
    }
    
    /**
     * تحليل الأشكال لتحديد النقاط القابلة للتمديد
     * 🔥 هنا التعديل الأساسي - نحدد فقط النقاط داخل نافذة التحديد
     */
    analyzeShapesForStretching(shapes, rect) {
        this.affectedShapes.clear();
        
        shapes.forEach(shape => {
            if (!this.canModifyShape(shape)) return;
            
            // الحصول على النقاط التي تقع داخل نافذة التحديد فقط
            const stretchPoints = this.getStretchablePointsInWindow(shape, rect);
            
            // إضافة الشكل فقط إذا كان له نقاط داخل النافذة
            if (stretchPoints.length > 0) {
                this.affectedShapes.set(shape, stretchPoints);
            }
        });
    }
    
    /**
     * الحصول على النقاط القابلة للتمديد داخل نافذة التحديد
     */
    getStretchablePointsInWindow(shape, rect) {
        const points = [];
        
        switch (shape.type) {
            case 'line':
                // فحص نقطة البداية
                if (this.pointInRect(shape.start, rect)) {
                    points.push('start');
                }
                // فحص نقطة النهاية
                if (this.pointInRect(shape.end, rect)) {
                    points.push('end');
                }
                break;
                
            case 'polyline':
            case 'polygon':
                if (shape.points) {
                    shape.points.forEach((point, index) => {
                        if (this.pointInRect(point, rect)) {
                            points.push(index);
                        }
                    });
                }
                break;
                
            case 'rectangle':
                // للمستطيل، نتحقق من الأركان الأربعة
                const corners = [
                    { x: shape.start.x, y: shape.start.y, id: 'bottomLeft' },
                    { x: shape.end.x, y: shape.start.y, id: 'bottomRight' },
                    { x: shape.end.x, y: shape.end.y, id: 'topRight' },
                    { x: shape.start.x, y: shape.end.y, id: 'topLeft' }
                ];
                
                corners.forEach(corner => {
                    if (this.pointInRect(corner, rect)) {
                        points.push(corner.id);
                    }
                });
                break;
                
            case 'circle':
            case 'arc':
            case 'ellipse':
                // هذه الأشكال لا تدعم التمديد
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
                // معالجة خاصة للمستطيل للحفاظ على شكله
                const newCorners = {
                    bottomLeft: { x: stretchedShape.start.x, y: stretchedShape.start.y },
                    bottomRight: { x: stretchedShape.end.x, y: stretchedShape.start.y },
                    topRight: { x: stretchedShape.end.x, y: stretchedShape.end.y },
                    topLeft: { x: stretchedShape.start.x, y: stretchedShape.end.y }
                };
                
                // تحريك الأركان المحددة
                stretchPoints.forEach(cornerId => {
                    if (newCorners[cornerId]) {
                        newCorners[cornerId].x += displacement.x;
                        newCorners[cornerId].y += displacement.y;
                    }
                });
                
                // إعادة حساب start و end بناءً على الأركان الجديدة
                stretchedShape.start = {
                    x: Math.min(newCorners.bottomLeft.x, newCorners.topRight.x),
                    y: Math.min(newCorners.bottomLeft.y, newCorners.topRight.y)
                };
                stretchedShape.end = {
                    x: Math.max(newCorners.bottomLeft.x, newCorners.topRight.x),
                    y: Math.max(newCorners.bottomLeft.y, newCorners.topRight.y)
                };
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
        const cloned = JSON.parse(JSON.stringify(shape));
        
        // للتأكد من نسخ المصفوفات بشكل صحيح
        if (shape.type === 'polyline' || shape.type === 'polygon') {
            cloned.points = shape.points.map(p => ({ x: p.x, y: p.y }));
        }
        
        return cloned;
    }
    
    /**
     * تطبيق التمديد على الأشكال
     * 🔥 التعديل هنا - نحرك فقط النقاط المحددة
     */
    applyStretch(displacement) {
        this.applyModification();
        
        const distance = Math.sqrt(displacement.x * displacement.x + displacement.y * displacement.y);
        this.saveLastStretchDistance(distance);
        
        let stretchedPoints = 0;
        
        this.affectedShapes.forEach((stretchPoints, shape) => {
            switch (shape.type) {
                case 'line':
                    if (stretchPoints.includes('start')) {
                        shape.start.x += displacement.x;
                        shape.start.y += displacement.y;
                        stretchedPoints++;
                    }
                    if (stretchPoints.includes('end')) {
                        shape.end.x += displacement.x;
                        shape.end.y += displacement.y;
                        stretchedPoints++;
                    }
                    break;
                    
                case 'polyline':
                case 'polygon':
                    stretchPoints.forEach(pointIndex => {
                        if (shape.points[pointIndex]) {
                            shape.points[pointIndex].x += displacement.x;
                            shape.points[pointIndex].y += displacement.y;
                            stretchedPoints++;
                        }
                    });
                    break;
                    
                case 'rectangle':
                    // معالجة خاصة للمستطيل
                    const corners = {
                        bottomLeft: { x: shape.start.x, y: shape.start.y },
                        bottomRight: { x: shape.end.x, y: shape.start.y },
                        topRight: { x: shape.end.x, y: shape.end.y },
                        topLeft: { x: shape.start.x, y: shape.end.y }
                    };
                    
                    // تحريك الأركان المحددة
                    stretchPoints.forEach(cornerId => {
                        if (corners[cornerId]) {
                            corners[cornerId].x += displacement.x;
                            corners[cornerId].y += displacement.y;
                            stretchedPoints++;
                        }
                    });
                    
                    // إعادة حساب start و end
                    shape.start = {
                        x: Math.min(corners.bottomLeft.x, corners.topRight.x),
                        y: Math.min(corners.bottomLeft.y, corners.topRight.y)
                    };
                    shape.end = {
                        x: Math.max(corners.bottomLeft.x, corners.topRight.x),
                        y: Math.max(corners.bottomLeft.y, corners.topRight.y)
                    };
                    break;
            }
        });
        
        this.cad.render();
        
        // رسالة النجاح
        let displayDist = distance;
        if (this.cad.units && this.cad.currentUnit) {
            try {
                displayDist = this.cad.units.fromInternal(distance, this.cad.currentUnit);
            } catch (e) {
                // استخدام القيمة الأصلية
            }
        }
        
        const angleDeg = (Math.atan2(displacement.y, displacement.x) * 180 / Math.PI).toFixed(1);
        this.updateStatus(
            `Stretched ${stretchedPoints} point${stretchedPoints > 1 ? 's' : ''} in ${this.affectedShapes.size} object${this.affectedShapes.size > 1 ? 's' : ''} ` +
            `by ${displayDist.toFixed(2)} ${this.cad.currentUnit} at ${angleDeg}°`
        );
    }
    
    /**
     * تطبيع المستطيل
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
     * التحقق من وجود نقطة داخل مستطيل
     */
    pointInRect(point, rect) {
        return point.x >= rect.left && point.x <= rect.right &&
               point.y >= rect.top && point.y <= rect.bottom;
    }
    
    /**
     * إنهاء عملية التمديد
     */
    finishStretch() {
        this.hideDynamicInput();
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
        this.constrainedMode = false;
        this.constrainedValue = null;
        this.currentDistance = 0;
        this.currentAngle = 0;
        this.cad.render();
    }
    
    /**
     * الحصول على آخر مسافة تمديد
     */
    getLastStretchDistance() {
        const lastDist = this.toolsManager?.modifyState?.lastStretchDistance || 0;
        
        // تحويل من الوحدة الداخلية إلى الوحدة الحالية
        if (lastDist > 0 && this.cad.units && this.cad.currentUnit) {
            try {
                return this.cad.units.fromInternal(lastDist, this.cad.currentUnit);
            } catch (e) {
                return lastDist;
            }
        }
        
        return lastDist;
    }
    
    /**
     * حفظ آخر مسافة تمديد
     */
    saveLastStretchDistance(distance) {
        if (this.toolsManager && !this.toolsManager.modifyState) {
            this.toolsManager.modifyState = {};
        }
        if (this.toolsManager) {
            this.toolsManager.modifyState.lastStretchDistance = distance;
        }
    }
}