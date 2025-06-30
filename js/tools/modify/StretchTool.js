// ==================== js/tools/modify/StretchTool.js ====================

import { ModifyToolBase, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة التمديد (Stretch) - محدثة بالإدخال الديناميكي والسلوك الصحيح
 * Stretch Tool with Dynamic Input and Proper AutoCAD-like Behavior
 */
export class StretchTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-expand-arrows-alt';
        this.cursor = 'crosshair';
        
        // حالة الأداة
        this.step = 'select'; // select, base-point, stretch
        this.selectionWindow = null;
        this.affectedShapes = new Map(); // shape -> vertices to stretch
        this.currentDistance = 0;
        this.currentAngle = 0;
    }
    
    onActivate() {
        this.step = 'select';
        this.updateStatus('Select objects with crossing window');
        
        this.selectionWindow = null;
        this.basePoint = null;
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
     */
    updateSelectionPreview(point) {
        if (this.selectionWindow) {
            this.selectionWindow.end = point;
            
            // إنشاء خطوط منفصلة لرسم مستطيل التحديد
            const rect = this.normalizeRect(this.selectionWindow);
            const selectionLines = [
                // الخط العلوي
                {
                    type: 'line',
                    start: { x: rect.left, y: rect.top },
                    end: { x: rect.right, y: rect.top },
                    color: '#00ffcc',
                    lineWidth: 1,
                    tempStyle: { opacity: 0.6, dashArray: [5, 5] }
                },
                // الخط الأيمن
                {
                    type: 'line',
                    start: { x: rect.right, y: rect.top },
                    end: { x: rect.right, y: rect.bottom },
                    color: '#00ffcc',
                    lineWidth: 1,
                    tempStyle: { opacity: 0.6, dashArray: [5, 5] }
                },
                // الخط السفلي
                {
                    type: 'line',
                    start: { x: rect.right, y: rect.bottom },
                    end: { x: rect.left, y: rect.bottom },
                    color: '#00ffcc',
                    lineWidth: 1,
                    tempStyle: { opacity: 0.6, dashArray: [5, 5] }
                },
                // الخط الأيسر
                {
                    type: 'line',
                    start: { x: rect.left, y: rect.bottom },
                    end: { x: rect.left, y: rect.top },
                    color: '#00ffcc',
                    lineWidth: 1,
                    tempStyle: { opacity: 0.6, dashArray: [5, 5] }
                }
            ];
            
            this.cad.tempShapes = selectionLines;
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
        this.affectedShapes.forEach((stretchInfo, shape) => {
            const previewShape = this.createStretchedShape(shape, stretchInfo, displacement);
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
        this.affectedShapes.forEach((stretchInfo, shape) => {
            if (stretchInfo.type !== 'move-all') {
                const pointMarkers = this.getAffectedPointMarkers(shape, stretchInfo);
                previewShapes.push(...pointMarkers);
            }
        });
        
        this.cad.tempShapes = previewShapes;
        this.cad.render();
    }
    
    /**
     * الحصول على علامات النقاط المتأثرة
     */
    getAffectedPointMarkers(shape, stretchInfo) {
        const markers = [];
        const markerRadius = 3 / this.cad.zoom;
        
        if (stretchInfo.type === 'vertices' && stretchInfo.points) {
            stretchInfo.points.forEach(point => {
                markers.push({
                    type: 'circle',
                    center: point,
                    radius: markerRadius,
                    color: '#ff0000',
                    filled: true,
                    tempStyle: { opacity: 0.8 }
                });
            });
        }
        
        return markers;
    }
    
    /**
     * معالجة تحديد الكائنات للتمديد
     */
    processStretchSelection() {
        if (!this.selectionWindow) return;
        
        const rect = this.normalizeRect(this.selectionWindow);
        
        // تحليل الأشكال لتحديد النقاط القابلة للتمديد
        this.analyzeShapesForStretching(rect);
        
        if (this.affectedShapes.size === 0) {
            this.updateStatus('No stretchable points found in selection window');
            this.selectionWindow = null;
            this.cad.tempShape = null;
            this.cad.tempShapes = null;
            this.cad.render();
            return;
        }
        
        // عرض عدد النقاط المحددة
        let totalPoints = 0;
        let movingShapes = 0;
        this.affectedShapes.forEach(stretchInfo => {
            if (stretchInfo.type === 'move-all') {
                movingShapes++;
            } else if (stretchInfo.points) {
                totalPoints += stretchInfo.points.length;
            }
        });
        
        let statusMsg = '';
        if (totalPoints > 0 && movingShapes > 0) {
            statusMsg = `${totalPoints} points + ${movingShapes} objects to move`;
        } else if (totalPoints > 0) {
            statusMsg = `${totalPoints} points selected`;
        } else {
            statusMsg = `${movingShapes} objects will be moved`;
        }
        
        this.step = 'base-point';
        this.updateStatus(`${statusMsg}. Specify base point`);
        this.selectionWindow = null;
        this.cad.tempShape = null;
        this.cad.tempShapes = null;
        this.cad.render();
    }
    
    /**
     * تحليل الأشكال لتحديد النقاط القابلة للتمديد
     * النهج الجديد: نحدد النقاط الفعلية التي سيتم تحريكها
     */
    analyzeShapesForStretching(rect) {
        this.affectedShapes.clear();
        
        this.cad.shapes.forEach(shape => {
            if (!this.canModifyShape(shape)) return;
            
            const stretchInfo = this.analyzeShapeForStretching(shape, rect);
            if (stretchInfo) {
                this.affectedShapes.set(shape, stretchInfo);
            }
        });
    }
    
    /**
     * تحليل شكل واحد لتحديد كيفية تمديده
     */
    analyzeShapeForStretching(shape, rect) {
        // التحقق أولاً من الشكل بالكامل
        const fullyInside = this.isShapeFullyInside(shape, rect);
        const crossingWindow = this.doesShapeCrossWindow(shape, rect);
        
        // إذا كان الشكل بالكامل داخل النافذة، نحركه كله
        if (fullyInside) {
            return { type: 'move-all' };
        }
        
        // إذا كان الشكل يتقاطع مع النافذة، نحدد النقاط
        if (crossingWindow) {
            const stretchablePoints = this.getStretchablePoints(shape, rect);
            if (stretchablePoints.length > 0) {
                return {
                    type: 'vertices',
                    points: stretchablePoints
                };
            }
        }
        
        return null;
    }
    
    /**
     * التحقق من أن الشكل بالكامل داخل النافذة
     */
    isShapeFullyInside(shape, rect) {
        switch (shape.type) {
            case 'line':
                return this.pointInRect(shape.start, rect) && 
                       this.pointInRect(shape.end, rect);
                
            case 'circle':
                // الدائرة داخل النافذة إذا كان المركز + نصف القطر داخلها
                const c = shape.center;
                const r = shape.radius;
                return c.x - r >= rect.left && c.x + r <= rect.right &&
                       c.y - r >= rect.top && c.y + r <= rect.bottom;
                
            case 'rectangle':
                return this.pointInRect(shape.start, rect) && 
                       this.pointInRect(shape.end, rect);
                
            case 'polyline':
            case 'polygon':
                return shape.points.every(p => this.pointInRect(p, rect));
                
            case 'arc':
                // تبسيط: نتحقق من المركز ونقاط البداية والنهاية
                const arcStart = {
                    x: shape.center.x + shape.radius * Math.cos(shape.startAngle),
                    y: shape.center.y + shape.radius * Math.sin(shape.startAngle)
                };
                const arcEnd = {
                    x: shape.center.x + shape.radius * Math.cos(shape.endAngle),
                    y: shape.center.y + shape.radius * Math.sin(shape.endAngle)
                };
                return this.pointInRect(shape.center, rect) &&
                       this.pointInRect(arcStart, rect) &&
                       this.pointInRect(arcEnd, rect);
                
            case 'ellipse':
                // تبسيط: نتحقق من المركز
                return this.pointInRect(shape.center, rect);
                
            default:
                return false;
        }
    }
    
    /**
     * التحقق من تقاطع الشكل مع النافذة
     */
    doesShapeCrossWindow(shape, rect) {
        // إذا كان بعض النقاط داخل وبعضها خارج، فهو يتقاطع
        switch (shape.type) {
            case 'line':
                const startIn = this.pointInRect(shape.start, rect);
                const endIn = this.pointInRect(shape.end, rect);
                return startIn !== endIn || 
                       this.lineIntersectsRect(shape.start, shape.end, rect);
                
            case 'circle':
                // الدائرة تتقاطع إذا كان المركز خارج ولكن تتقاطع مع النافذة
                return !this.isShapeFullyInside(shape, rect) && 
                       this.circleIntersectsRect(shape.center, shape.radius, rect);
                
            case 'rectangle':
                // المستطيل يتقاطع إذا كان بعض الأركان داخل وبعضها خارج
                const corners = this.getRectangleCorners(shape);
                const cornersInside = corners.filter(c => this.pointInRect(c, rect));
                return cornersInside.length > 0 && cornersInside.length < 4;
                
            case 'polyline':
            case 'polygon':
                const pointsInside = shape.points.filter(p => this.pointInRect(p, rect));
                return pointsInside.length > 0 && pointsInside.length < shape.points.length;
                
            default:
                return false;
        }
    }
    
    /**
     * الحصول على النقاط القابلة للتمديد
     */
    getStretchablePoints(shape, rect) {
        const points = [];
        
        switch (shape.type) {
            case 'line':
                if (this.pointInRect(shape.start, rect)) {
                    points.push({ ...shape.start, id: 'start' });
                }
                if (this.pointInRect(shape.end, rect)) {
                    points.push({ ...shape.end, id: 'end' });
                }
                break;
                
            case 'rectangle':
                // للمستطيل، نحتاج للحفاظ على الشكل المستطيل
                // نحصل على الأركان ونرى أيها داخل النافذة
                const corners = this.getRectangleCorners(shape);
                const selectedCorners = [];
                
                corners.forEach((corner, index) => {
                    if (this.pointInRect(corner, rect)) {
                        selectedCorners.push({
                            ...corner,
                            id: ['bottomLeft', 'bottomRight', 'topRight', 'topLeft'][index],
                            index: index
                        });
                    }
                });
                
                // نحتاج لتحديد النقاط الفعلية التي ستتحرك
                // هذا يعتمد على الأركان المحددة
                points.push(...this.getRectangleStretchPoints(shape, selectedCorners));
                break;
                
            case 'polyline':
            case 'polygon':
                shape.points.forEach((point, index) => {
                    if (this.pointInRect(point, rect)) {
                        points.push({ ...point, id: index });
                    }
                });
                break;
                
            case 'arc':
                const arcStart = {
                    x: shape.center.x + shape.radius * Math.cos(shape.startAngle),
                    y: shape.center.y + shape.radius * Math.sin(shape.startAngle)
                };
                const arcEnd = {
                    x: shape.center.x + shape.radius * Math.cos(shape.endAngle),
                    y: shape.center.y + shape.radius * Math.sin(shape.endAngle)
                };
                
                if (this.pointInRect(arcStart, rect)) {
                    points.push({ ...arcStart, id: 'start' });
                }
                if (this.pointInRect(arcEnd, rect)) {
                    points.push({ ...arcEnd, id: 'end' });
                }
                break;
        }
        
        return points;
    }
    
    /**
     * الحصول على نقاط التمديد للمستطيل
     * هذا يحتاج منطق خاص للحفاظ على الشكل المستطيل
     */
    getRectangleStretchPoints(shape, selectedCorners) {
        if (selectedCorners.length === 0) return [];
        if (selectedCorners.length === 4) return selectedCorners; // كل الأركان محددة
        
        // نحتاج لتحديد النقاط الفعلية بناءً على الأركان المحددة
        const points = [];
        
        if (selectedCorners.length === 1) {
            // ركن واحد فقط - نحرك هذا الركن فقط
            points.push(selectedCorners[0]);
        } else if (selectedCorners.length === 2) {
            // ركنان - نحدد ما إذا كانا متجاورين أم متقابلين
            const indices = selectedCorners.map(c => c.index);
            const diff = Math.abs(indices[0] - indices[1]);
            
            if (diff === 1 || diff === 3) {
                // متجاوران - نحرك الضلع بالكامل
                points.push(...selectedCorners);
            } else {
                // متقابلان - نحرك كلاهما
                points.push(...selectedCorners);
            }
        } else if (selectedCorners.length === 3) {
            // ثلاثة أركان - نحرك الثلاثة
            points.push(...selectedCorners);
        }
        
        return points;
    }
    
    /**
     * الحصول على أركان المستطيل
     */
    getRectangleCorners(shape) {
        return [
            { x: shape.start.x, y: shape.start.y },    // bottomLeft
            { x: shape.end.x, y: shape.start.y },      // bottomRight
            { x: shape.end.x, y: shape.end.y },        // topRight
            { x: shape.start.x, y: shape.end.y }       // topLeft
        ];
    }
    
    /**
     * إنشاء شكل ممدد للمعاينة
     */
    createStretchedShape(shape, stretchInfo, displacement) {
        const stretchedShape = this.cloneShape(shape);
        
        if (stretchInfo.type === 'move-all') {
            // تحريك الشكل بالكامل
            this.translateShape(stretchedShape, displacement);
            return stretchedShape;
        }
        
        // تطبيق التمديد على النقاط المحددة
        switch (shape.type) {
            case 'line':
                stretchInfo.points.forEach(point => {
                    if (point.id === 'start') {
                        stretchedShape.start.x += displacement.x;
                        stretchedShape.start.y += displacement.y;
                    } else if (point.id === 'end') {
                        stretchedShape.end.x += displacement.x;
                        stretchedShape.end.y += displacement.y;
                    }
                });
                break;
                
            case 'rectangle':
                // معالجة خاصة للمستطيل
                this.stretchRectangle(stretchedShape, stretchInfo.points, displacement);
                break;
                
            case 'polyline':
            case 'polygon':
                stretchInfo.points.forEach(point => {
                    const index = point.id;
                    if (stretchedShape.points[index]) {
                        stretchedShape.points[index].x += displacement.x;
                        stretchedShape.points[index].y += displacement.y;
                    }
                });
                break;
                
            case 'arc':
                stretchInfo.points.forEach(point => {
                    if (point.id === 'start') {
                        // حساب الموضع الجديد لنقطة البداية
                        const newStart = {
                            x: point.x + displacement.x,
                            y: point.y + displacement.y
                        };
                        const dx = newStart.x - shape.center.x;
                        const dy = newStart.y - shape.center.y;
                        stretchedShape.startAngle = Math.atan2(dy, dx);
                        stretchedShape.radius = Math.sqrt(dx * dx + dy * dy);
                    } else if (point.id === 'end') {
                        // حساب الموضع الجديد لنقطة النهاية
                        const newEnd = {
                            x: point.x + displacement.x,
                            y: point.y + displacement.y
                        };
                        const dx = newEnd.x - shape.center.x;
                        const dy = newEnd.y - shape.center.y;
                        stretchedShape.endAngle = Math.atan2(dy, dx);
                        if (stretchInfo.points.length === 1) {
                            // إذا كانت نقطة النهاية فقط، نحدث نصف القطر أيضاً
                            stretchedShape.radius = Math.sqrt(dx * dx + dy * dy);
                        }
                    }
                });
                break;
        }
        
        return stretchedShape;
    }
    
    /**
     * تمديد المستطيل مع الحفاظ على شكله
     */
    stretchRectangle(rectangle, stretchPoints, displacement) {
        // الحصول على الأركان الحالية
        const corners = this.getRectangleCorners(rectangle);
        const modifiedCorners = [...corners];
        
        // تطبيق الإزاحة على الأركان المحددة
        stretchPoints.forEach(point => {
            const cornerIndex = ['bottomLeft', 'bottomRight', 'topRight', 'topLeft'].indexOf(point.id);
            if (cornerIndex !== -1) {
                modifiedCorners[cornerIndex] = {
                    x: corners[cornerIndex].x + displacement.x,
                    y: corners[cornerIndex].y + displacement.y
                };
            }
        });
        
        // تحديد كيفية تحديث المستطيل بناءً على الأركان المحددة
        if (stretchPoints.length === 1) {
            // ركن واحد - نحدث النقطتين اللتين تحددان هذا الركن
            const corner = stretchPoints[0];
            const cornerIndex = ['bottomLeft', 'bottomRight', 'topRight', 'topLeft'].indexOf(corner.id);
            
            switch (cornerIndex) {
                case 0: // bottomLeft
                    rectangle.start.x = modifiedCorners[0].x;
                    rectangle.start.y = modifiedCorners[0].y;
                    break;
                case 1: // bottomRight
                    rectangle.end.x = modifiedCorners[1].x;
                    rectangle.start.y = modifiedCorners[1].y;
                    break;
                case 2: // topRight
                    rectangle.end.x = modifiedCorners[2].x;
                    rectangle.end.y = modifiedCorners[2].y;
                    break;
                case 3: // topLeft
                    rectangle.start.x = modifiedCorners[3].x;
                    rectangle.end.y = modifiedCorners[3].y;
                    break;
            }
        } else if (stretchPoints.length === 2) {
            // ركنان - نحدث الضلع المناسب
            const indices = stretchPoints.map(p => 
                ['bottomLeft', 'bottomRight', 'topRight', 'topLeft'].indexOf(p.id)
            );
            
            // تحديد الضلع المشترك
            if (indices.includes(0) && indices.includes(1)) {
                // الضلع السفلي
                rectangle.start.y = modifiedCorners[0].y;
            } else if (indices.includes(1) && indices.includes(2)) {
                // الضلع الأيمن
                rectangle.end.x = modifiedCorners[1].x;
            } else if (indices.includes(2) && indices.includes(3)) {
                // الضلع العلوي
                rectangle.end.y = modifiedCorners[2].y;
            } else if (indices.includes(3) && indices.includes(0)) {
                // الضلع الأيسر
                rectangle.start.x = modifiedCorners[0].x;
            } else {
                // أركان متقابلة
                rectangle.start = { x: modifiedCorners[0].x, y: modifiedCorners[0].y };
                rectangle.end = { x: modifiedCorners[2].x, y: modifiedCorners[2].y };
            }
        } else {
            // أكثر من ركنين - نحدث المستطيل بالكامل
            const xs = modifiedCorners.map(c => c.x);
            const ys = modifiedCorners.map(c => c.y);
            rectangle.start = { x: Math.min(...xs), y: Math.min(...ys) };
            rectangle.end = { x: Math.max(...xs), y: Math.max(...ys) };
        }
    }
    
    /**
     * تحريك شكل بالكامل
     */
    translateShape(shape, displacement) {
        switch (shape.type) {
            case 'line':
                shape.start.x += displacement.x;
                shape.start.y += displacement.y;
                shape.end.x += displacement.x;
                shape.end.y += displacement.y;
                break;
                
            case 'circle':
            case 'ellipse':
            case 'arc':
                shape.center.x += displacement.x;
                shape.center.y += displacement.y;
                break;
                
            case 'rectangle':
                shape.start.x += displacement.x;
                shape.start.y += displacement.y;
                shape.end.x += displacement.x;
                shape.end.y += displacement.y;
                break;
                
            case 'polyline':
            case 'polygon':
                shape.points.forEach(point => {
                    point.x += displacement.x;
                    point.y += displacement.y;
                });
                break;
        }
    }
    
    /**
     * نسخ شكل
     */
    cloneShape(shape) {
        if (this.cad.cloneShape) {
            return this.cad.cloneShape(shape);
        }
        
        // نسخ عميق
        const cloned = JSON.parse(JSON.stringify(shape));
        
        // التأكد من نسخ المصفوفات بشكل صحيح
        if (shape.type === 'polyline' || shape.type === 'polygon') {
            cloned.points = shape.points.map(p => ({ x: p.x, y: p.y }));
        }
        
        return cloned;
    }
    
    /**
     * تطبيق التمديد على الأشكال
     */
    applyStretch(displacement) {
        this.applyModification();
        
        const distance = Math.sqrt(displacement.x * displacement.x + displacement.y * displacement.y);
        this.saveLastStretchDistance(distance);
        
        let stretchedPoints = 0;
        let movedShapes = 0;
        
        this.affectedShapes.forEach((stretchInfo, shape) => {
            if (stretchInfo.type === 'move-all') {
                // تحريك الشكل بالكامل
                this.translateShape(shape, displacement);
                movedShapes++;
            } else {
                // تطبيق التمديد على النقاط المحددة
                const tempShape = this.createStretchedShape(shape, stretchInfo, displacement);
                
                // نسخ القيم المحدثة إلى الشكل الأصلي
                Object.assign(shape, tempShape);
                
                stretchedPoints += stretchInfo.points.length;
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
        
        let statusMsg = '';
        if (stretchedPoints > 0 && movedShapes > 0) {
            statusMsg = `Stretched ${stretchedPoints} point${stretchedPoints > 1 ? 's' : ''} and moved ${movedShapes} object${movedShapes > 1 ? 's' : ''}`;
        } else if (stretchedPoints > 0) {
            statusMsg = `Stretched ${stretchedPoints} point${stretchedPoints > 1 ? 's' : ''}`;
        } else {
            statusMsg = `Moved ${movedShapes} object${movedShapes > 1 ? 's' : ''}`;
        }
        
        this.updateStatus(
            `${statusMsg} by ${displayDist.toFixed(2)} ${this.cad.currentUnit} at ${angleDeg}°`
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
     * التحقق من تقاطع خط مع مستطيل
     */
    lineIntersectsRect(p1, p2, rect) {
        // خطوط المستطيل
        const lines = [
            { start: { x: rect.left, y: rect.top }, end: { x: rect.right, y: rect.top } },
            { start: { x: rect.right, y: rect.top }, end: { x: rect.right, y: rect.bottom } },
            { start: { x: rect.right, y: rect.bottom }, end: { x: rect.left, y: rect.bottom } },
            { start: { x: rect.left, y: rect.bottom }, end: { x: rect.left, y: rect.top } }
        ];
        
        return lines.some(line => this.linesIntersect(p1, p2, line.start, line.end));
    }
    
    /**
     * التحقق من تقاطع خطين
     */
    linesIntersect(p1, p2, p3, p4) {
        const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
        if (Math.abs(det) < 0.0001) return false;
        
        const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / det;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / det;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
    
    /**
     * التحقق من تقاطع دائرة مع مستطيل
     */
    circleIntersectsRect(center, radius, rect) {
        // أقرب نقطة على المستطيل من مركز الدائرة
        const closestX = Math.max(rect.left, Math.min(center.x, rect.right));
        const closestY = Math.max(rect.top, Math.min(center.y, rect.bottom));
        
        // المسافة من المركز إلى أقرب نقطة
        const dx = center.x - closestX;
        const dy = center.y - closestY;
        const distSquared = dx * dx + dy * dy;
        
        return distSquared <= radius * radius;
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