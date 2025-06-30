// ==================== js/tools/modify/OffsetTool.js ====================

import { BaseTool, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة الإزاحة - محدثة بالإدخال الديناميكي والقيمة الثابتة
 * Offset Tool with Complete Dynamic Input and Fixed Value Support
 */
export class OffsetTool extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-clone';
        
        // الحالة الأساسية
        this.selectedShape = null;
        this.offsetCount = 0;
        this.currentMousePoint = null;
        
        // أوضاع العمل
        this.mode = 'free'; // 'free', 'dynamic', 'fixed'
        this.fixedDistance = null;
        this.isFixedMode = false;
        
        // للمعاينة والاتجاه
        this.offsetSide = 1;
        this.previewDistance = 0;
    }
    
    onActivate() {
        this.resetState();
        this.cad.isDrawing = false;
        this.updateStatus('Select object to offset or press F to set fixed distance');
    }
    
    onDeactivate() {
        this.hideDynamicInput();
        this.clearPreview();
    }
    
    onClick(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        
        if (this.isFixedMode && this.fixedDistance) {
            // وضع القيمة الثابتة - اختيار شكل وتطبيق مباشرة
            const coords = this.cad.getMouseCoordinates();
const shape = this.cad.getShapeAtScreen(coords.screenX, coords.screenY);
            
            if (shape && this.canOffsetShape(shape)) {
                // تحديد الاتجاه بناءً على موضع النقرة
                this.offsetSide = this.determineOffsetSide(shape, world);
                
                // تطبيق الإزاحة مباشرة
                this.applyOffsetToShape(shape, this.fixedDistance, this.offsetSide);
                
                // البقاء في وضع القيمة الثابتة لاختيار أشكال أخرى
                this.updateStatus(
                    `Fixed offset: ${this.getDisplayDistance(this.fixedDistance)} ${this.cad.currentUnit} ` +
                    `(${this.offsetCount} created) - Select next object or ESC to finish`
                );
            }
            
        } else if (!this.selectedShape) {
            // الوضع العادي - اختيار الشكل الأول
            const coords = this.cad.getMouseCoordinates();
const shape = this.cad.getShapeAtScreen(coords.screenX, coords.screenY);
            
            if (shape && this.canOffsetShape(shape)) {
                this.selectedShape = shape;
                this.cad.isDrawing = true;
                
                // تحديد الشكل المختار
                this.cad.selectedShapes.clear();
                this.cad.selectedShapes.add(shape);
                
                // حساب الجانب الافتراضي
                this.offsetSide = this.determineOffsetSide(shape, world);
                
                this.updateStatus('Specify offset distance or side');
                
                // عرض الإدخال الديناميكي
                this.showDynamicInput();
                this.mode = 'dynamic';
                
            } else {
                this.updateStatus('No valid object selected for offset');
            }
            
        } else {
            // النقرة الثانية في الوضع العادي - تطبيق الإزاحة
            this.offsetSide = this.determineOffsetSide(this.selectedShape, world);
            
            let distance = this.previewDistance;
            
            if (this.constrainedMode && this.constrainedValue > 0) {
                distance = this.constrainedValue;
            } else if (this.mode === 'free') {
                distance = this.calculateDistanceFromShape(this.selectedShape, world);
            }
            
            if (distance > 0) {
                this.applyOffsetToShape(this.selectedShape, distance, this.offsetSide);
                this.finishSingleOffset();
            }
        }
    }
    
    onMouseMove(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        this.currentMousePoint = world;
        
        if (this.isFixedMode && this.fixedDistance) {
            // في وضع القيمة الثابتة - عرض معاينة عند المرور على الأشكال
            const coords = this.cad.getMouseCoordinates();
const shape = this.cad.getShapeAtScreen(coords.screenX, coords.screenY);
            
            if (shape && this.canOffsetShape(shape)) {
                this.offsetSide = this.determineOffsetSide(shape, world);
                this.showFixedPreview(shape, this.fixedDistance, this.offsetSide);
                
                const sideText = this.offsetSide > 0 ? 'Outside' : 'Inside';
                this.updateStatus(
                    `Fixed offset: ${this.getDisplayDistance(this.fixedDistance)} ${this.cad.currentUnit} ` +
                    `[${sideText}] - Click to apply`
                );
            } else {
                this.clearPreview();
            }
            
        } else if (this.selectedShape) {
            // الوضع العادي - تحديث المعاينة
            const constrainedPoint = this.applyConstraints(
                this.selectedShape.type === 'line' ? this.selectedShape.start : 
                this.selectedShape.center || this.selectedShape.start,
                world
            );
            
            // تحديد جانب الإزاحة
            this.offsetSide = this.determineOffsetSide(this.selectedShape, constrainedPoint);
            
            // حساب المسافة
            let distance;
            
            if (this.constrainedMode && this.constrainedValue > 0) {
                // وضع مقيد بقيمة مدخلة
                distance = this.constrainedValue;
            } else {
                // وضع حر
                distance = this.calculateDistanceFromShape(this.selectedShape, constrainedPoint);
                this.mode = 'free';
            }
            
            this.previewDistance = distance;
            
            // تحديث القيمة في Dynamic Input
            if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active && this.mode !== 'free') {
                let displayDistance = this.getDisplayDistance(distance);
                this.cad.dynamicInputManager.updateLiveValue(displayDistance);
            }
            
            // عرض المعاينة
            this.showOffsetPreview(this.selectedShape, distance, this.offsetSide);
            
            // تحديث الحالة
            const displayDist = this.getDisplayDistance(distance);
            const sideText = this.offsetSide > 0 ? 'Outside' : 'Inside';
            const modeText = this.mode === 'free' ? 'FREE' : 
                           this.constrainedMode ? 'CONSTRAINED' : 'DYNAMIC';
            
            this.updateStatus(
                `Offset: ${displayDist.toFixed(2)} ${this.cad.currentUnit} ` +
                `[${sideText}] [${modeText}]` +
                (this.cad.orthoEnabled ? ' [ORTHO]' : '') +
                (this.cad.polarEnabled ? ' [POLAR]' : '')
            );
        }
    }
    
    /**
     * عرض الإدخال الديناميكي
     */
    showDynamicInput() {
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.DISTANCE,
            label: 'Offset',
            defaultValue: this.getLastOffsetDistance(),
            placeholder: 'Offset distance',
            
            onInput: (value) => {
                if (value !== null && value !== '') {
                    this.constrainedMode = true;
                    this.constrainedValue = value;
                    this.mode = 'dynamic';
                    
                    // تحديث المعاينة
                    if (this.selectedShape) {
                        this.showOffsetPreview(this.selectedShape, value, this.offsetSide);
                    }
                } else {
                    this.constrainedMode = false;
                    this.constrainedValue = null;
                }
            },
            
            onConfirm: (value) => {
                if (value > 0 && this.selectedShape) {
                    this.applyOffsetToShape(this.selectedShape, value, this.offsetSide);
                    this.finishSingleOffset();
                }
            }
        });
    }
    
    /**
     * عرض معاينة الإزاحة
     */
    showOffsetPreview(shape, distance, side) {
        const tempShapes = [];
        
        // الشكل الأصلي (محدد)
        const originalHighlight = this.cad.cloneShape(shape);
        originalHighlight.tempStyle = {
            opacity: 0.8,
            color: '#ff9900',
            lineWidth: (originalHighlight.lineWidth || 1) + 1
        };
        tempShapes.push(originalHighlight);
        
        // الشكل المزاح
        const offsetShape = this.createOffsetShape(shape, distance * side);
        if (offsetShape) {
            offsetShape.tempStyle = {
                opacity: 0.7,
                dashArray: [5, 5],
                color: '#00ffcc'
            };
            tempShapes.push(offsetShape);
            
            // خطوط إرشادية
            this.addGuideLines(tempShapes, shape, offsetShape);
        }
        
        // مؤشر الاتجاه
        if (this.currentMousePoint) {
            const directionMarker = {
                type: 'circle',
                center: this.currentMousePoint,
                radius: 3 / this.cad.zoom,
                color: side > 0 ? '#00ff00' : '#ff0000',
                filled: true,
                tempStyle: { opacity: 0.6 }
            };
            tempShapes.push(directionMarker);
        }
        
        this.clearPreview();
        this.cad.tempShapes = tempShapes;
        this.cad.render();
    }
    
    /**
     * عرض معاينة للقيمة الثابتة
     */
    showFixedPreview(shape, distance, side) {
        const tempShapes = [];
        
        // الشكل الأصلي
        const originalHighlight = this.cad.cloneShape(shape);
        originalHighlight.tempStyle = {
            opacity: 0.6,
            color: '#ffaa00',
            lineWidth: (originalHighlight.lineWidth || 1) + 2
        };
        tempShapes.push(originalHighlight);
        
        // الشكل المزاح
        const offsetShape = this.createOffsetShape(shape, distance * side);
        if (offsetShape) {
            offsetShape.tempStyle = {
                opacity: 0.8,
                dashArray: [10, 5],
                color: '#00ff00'
            };
            tempShapes.push(offsetShape);
        }
        
        this.clearPreview();
        this.cad.tempShapes = tempShapes;
        this.cad.render();
    }
    
    /**
     * إضافة خطوط إرشادية
     */
    addGuideLines(tempShapes, originalShape, offsetShape) {
        if (originalShape.type === 'line') {
            // خطوط عمودية في البداية والنهاية
            tempShapes.push({
                type: 'line',
                start: originalShape.start,
                end: offsetShape.start,
                color: '#666',
                lineWidth: 1,
                tempStyle: { opacity: 0.5, dashArray: [2, 2] }
            });
            tempShapes.push({
                type: 'line',
                start: originalShape.end,
                end: offsetShape.end,
                color: '#666',
                lineWidth: 1,
                tempStyle: { opacity: 0.5, dashArray: [2, 2] }
            });
        }
    }
    
    /**
     * إنشاء شكل مزاح محسّن
     */
    createOffsetShape(shape, distance) {
        const offsetShape = this.cad.cloneShape(shape);
        offsetShape.id = this.cad.generateId();
        
        switch (shape.type) {
            case 'line':
                return this.offsetLine(offsetShape, distance);
                
            case 'circle':
                offsetShape.radius += distance;
                return offsetShape.radius > 0 ? offsetShape : null;
                
            case 'arc':
                offsetShape.radius += distance;
                return offsetShape.radius > 0 ? offsetShape : null;
                
            case 'ellipse':
                // إزاحة متناسبة للقطرين
                const ratio = offsetShape.radiusY / offsetShape.radiusX;
                offsetShape.radiusX += distance;
                offsetShape.radiusY += distance * ratio;
                return (offsetShape.radiusX > 0 && offsetShape.radiusY > 0) ? offsetShape : null;
                
            case 'rectangle':
                return this.offsetRectangle(offsetShape, distance);
                
            case 'polyline':
                return this.offsetPolyline(offsetShape, distance);
                
            case 'polygon':
                return this.offsetPolygon(offsetShape, distance);
                
            default:
                return null;
        }
    }
    
    /**
     * إزاحة خط
     */
    offsetLine(line, distance) {
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            
            line.start.x += nx * distance;
            line.start.y += ny * distance;
            line.end.x += nx * distance;
            line.end.y += ny * distance;
            
            return line;
        }
        return null;
    }
    
    /**
     * إزاحة مستطيل محسّنة
     */
    offsetRectangle(rect, distance) {
        const minX = Math.min(rect.start.x, rect.end.x);
        const maxX = Math.max(rect.start.x, rect.end.x);
        const minY = Math.min(rect.start.y, rect.end.y);
        const maxY = Math.max(rect.start.y, rect.end.y);
        
        if (distance > 0) {
            // إزاحة للخارج
            rect.start.x = minX - distance;
            rect.start.y = minY - distance;
            rect.end.x = maxX + distance;
            rect.end.y = maxY + distance;
        } else {
            // إزاحة للداخل
            const width = maxX - minX;
            const height = maxY - minY;
            const maxInset = Math.min(width, height) / 2;
            
            if (Math.abs(distance) < maxInset) {
                rect.start.x = minX - distance;
                rect.start.y = minY - distance;
                rect.end.x = maxX + distance;
                rect.end.y = maxY + distance;
            } else {
                return null;
            }
        }
        
        return rect;
    }
    
    /**
     * إزاحة خط متعدد محسّنة
     */
    offsetPolyline(polyline, distance) {
        const points = polyline.points;
        if (points.length < 2) return null;
        
        const offsetPoints = [];
        const segments = [];
        
        // حساب الإزاحة لكل segment
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            if (len > 0) {
                const nx = -dy / len * distance;
                const ny = dx / len * distance;
                
                segments.push({
                    start: { x: p1.x + nx, y: p1.y + ny },
                    end: { x: p2.x + nx, y: p2.y + ny },
                    normal: { x: nx, y: ny }
                });
            }
        }
        
        if (segments.length === 0) return null;
        
        // الربط بين الـ segments
        offsetPoints.push(segments[0].start);
        
        for (let i = 0; i < segments.length - 1; i++) {
            const seg1 = segments[i];
            const seg2 = segments[i + 1];
            
            // نقطة التقاطع بين الـ segments المتتالية
            const intersection = this.lineIntersection(
                seg1.start, seg1.end,
                seg2.start, seg2.end
            );
            
            if (intersection) {
                offsetPoints.push(intersection);
            } else {
                // إذا لم يكن هناك تقاطع، استخدم نهاية الأول وبداية الثاني
                offsetPoints.push(seg1.end);
                offsetPoints.push(seg2.start);
            }
        }
        
        offsetPoints.push(segments[segments.length - 1].end);
        
        polyline.points = offsetPoints;
        return polyline;
    }
    
    /**
     * إزاحة مضلع
     */
    offsetPolygon(polygon, distance) {
        // نفس منطق polyline لكن مع إغلاق الشكل
        const polyline = this.offsetPolyline(polygon, distance);
        
        if (polyline && polyline.points.length > 2) {
            // التأكد من إغلاق المضلع
            const first = polyline.points[0];
            const last = polyline.points[polyline.points.length - 1];
            
            if (Math.abs(first.x - last.x) > 0.001 || Math.abs(first.y - last.y) > 0.001) {
                polyline.points.push({ ...first });
            }
            
            return polyline;
        }
        
        return null;
    }
    
    /**
     * حساب نقطة تقاطع خطين
     */
    lineIntersection(p1, p2, p3, p4) {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        
        if (Math.abs(denom) < 0.001) return null;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }
    
    /**
     * تحديد جانب الإزاحة
     */
    determineOffsetSide(shape, point) {
        switch (shape.type) {
            case 'line':
                const dx = shape.end.x - shape.start.x;
                const dy = shape.end.y - shape.start.y;
                const cross = (point.x - shape.start.x) * dy - (point.y - shape.start.y) * dx;
                return cross > 0 ? 1 : -1;
                
            case 'circle':
            case 'arc':
            case 'ellipse':
                const center = shape.center;
                const dist = this.cad.distance(point.x, point.y, center.x, center.y);
                const refRadius = shape.radius || shape.radiusX;
                return dist > refRadius ? 1 : -1;
                
            case 'rectangle':
                const minX = Math.min(shape.start.x, shape.end.x);
                const maxX = Math.max(shape.start.x, shape.end.x);
                const minY = Math.min(shape.start.y, shape.end.y);
                const maxY = Math.max(shape.start.y, shape.end.y);
                
                const inside = point.x > minX && point.x < maxX && 
                              point.y > minY && point.y < maxY;
                return inside ? -1 : 1;
                
            case 'polyline':
            case 'polygon':
                // استخدام ray casting للمضلعات
                return this.isPointInsidePolygon(point, shape.points) ? -1 : 1;
                
            default:
                return 1;
        }
    }
    
    /**
     * التحقق من وجود نقطة داخل مضلع
     */
    isPointInsidePolygon(point, vertices) {
        let inside = false;
        
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            
            if (intersect) inside = !inside;
        }
        
        return inside;
    }
    
    /**
     * حساب المسافة من الشكل
     */
    calculateDistanceFromShape(shape, point) {
        switch (shape.type) {
            case 'line':
                return this.distanceToLine(point, shape.start, shape.end);
                
            case 'circle':
            case 'arc':
                const dist = this.cad.distance(point.x, point.y, shape.center.x, shape.center.y);
                return Math.abs(dist - shape.radius);
                
            case 'ellipse':
                // تقريب بسيط للمسافة من القطع الناقص
                const dx = point.x - shape.center.x;
                const dy = point.y - shape.center.y;
                const angle = Math.atan2(dy, dx);
                const r = (shape.radiusX * shape.radiusY) / 
                    Math.sqrt(Math.pow(shape.radiusY * Math.cos(angle), 2) + 
                             Math.pow(shape.radiusX * Math.sin(angle), 2));
                const currentDist = Math.sqrt(dx * dx + dy * dy);
                return Math.abs(currentDist - r);
                
            case 'rectangle':
                return this.distanceToRectangle(point, shape);
                
            case 'polyline':
            case 'polygon':
                return this.distanceToPolyline(point, shape.points, shape.type === 'polygon');
                
            default:
                return 10;
        }
    }
    
    /**
     * المسافة من نقطة إلى خط
     */
    distanceToLine(point, start, end) {
        const A = point.x - start.x;
        const B = point.y - start.y;
        const C = end.x - start.x;
        const D = end.y - start.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = start.x;
            yy = start.y;
        } else if (param > 1) {
            xx = end.x;
            yy = end.y;
        } else {
            xx = start.x + param * C;
            yy = start.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * المسافة من نقطة إلى مستطيل
     */
    distanceToRectangle(point, rect) {
        const minX = Math.min(rect.start.x, rect.end.x);
        const maxX = Math.max(rect.start.x, rect.end.x);
        const minY = Math.min(rect.start.y, rect.end.y);
        const maxY = Math.max(rect.start.y, rect.end.y);
        
        if (point.x >= minX && point.x <= maxX && 
            point.y >= minY && point.y <= maxY) {
            const distances = [
                point.x - minX, maxX - point.x,
                point.y - minY, maxY - point.y
            ];
            return Math.min(...distances);
        }
        
        let dx = 0, dy = 0;
        
        if (point.x < minX) dx = minX - point.x;
        else if (point.x > maxX) dx = point.x - maxX;
        
        if (point.y < minY) dy = minY - point.y;
        else if (point.y > maxY) dy = point.y - maxY;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * المسافة من نقطة إلى خط متعدد
     */
    distanceToPolyline(point, vertices, isClosed) {
        let minDist = Infinity;
        
        for (let i = 0; i < vertices.length - 1; i++) {
            const dist = this.distanceToLine(point, vertices[i], vertices[i + 1]);
            minDist = Math.min(minDist, dist);
        }
        
        if (isClosed && vertices.length > 2) {
            const dist = this.distanceToLine(
                point, 
                vertices[vertices.length - 1], 
                vertices[0]
            );
            minDist = Math.min(minDist, dist);
        }
        
        return minDist;
    }
    
    /**
     * تطبيق الإزاحة على شكل
     */
    applyOffsetToShape(shape, distance, side) {
        if (this.offsetCount === 0) {
            this.cad.recordState();
        }
        
        const offsetShape = this.createOffsetShape(shape, distance * side);
        
        if (offsetShape) {
            // تطبيق خصائص الطبقة الحالية
            offsetShape.layerId = this.cad.getCurrentLayerId ? 
                this.cad.getCurrentLayerId() : this.cad.currentLayerId;
            offsetShape.color = this.cad.currentColor;
            offsetShape.lineWidth = this.cad.currentLineWidth;
            offsetShape.lineType = this.cad.currentLineType;
            
            this.cad.shapes.push(offsetShape);
            
            // تحديد الشكل الجديد
            this.cad.selectedShapes.clear();
            this.cad.selectedShapes.add(offsetShape);
            
            this.offsetCount++;
            this.saveLastOffsetDistance(distance);
            
            // تحديث الحالة
            const displayDist = this.getDisplayDistance(distance);
            const sideText = side > 0 ? 'outside' : 'inside';
            
            this.updateStatus(
                `Offset ${this.offsetCount}: ${displayDist.toFixed(2)} ${this.cad.currentUnit} ${sideText}`
            );
            
            this.cad.render();
        }
    }
    
    /**
     * إنهاء إزاحة واحدة
     */
    finishSingleOffset() {
        this.hideDynamicInput();
        this.clearPreview();
        this.cad.isDrawing = false;
        this.selectedShape = null;
        this.mode = 'free';
        
        this.updateStatus(
            `Offset created. Select next object or press F for fixed distance mode`
        );
    }
    
    /**
     * معالجة المفاتيح
     */
    onKeyPress(key) {
        if (key === 'Escape') {
            this.finishOperation();
            
        } else if (key.toUpperCase() === 'F') {
            // تبديل وضع القيمة الثابتة
            if (this.isFixedMode) {
                // إلغاء الوضع الثابت
                this.isFixedMode = false;
                this.fixedDistance = null;
                this.updateStatus('Fixed distance mode OFF');
            } else {
                // تفعيل الوضع الثابت
                this.promptForFixedDistance();
            }
            
        } else if (key === 'Enter') {
            if (this.selectedShape && this.constrainedMode && this.constrainedValue > 0) {
                this.applyOffsetToShape(this.selectedShape, this.constrainedValue, this.offsetSide);
                this.finishSingleOffset();
            }
            
        } else if (key === 'Tab' && this.selectedShape) {
            if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
                this.cad.dynamicInputManager.handleTab();
            }
        }
    }
    
    /**
     * طلب قيمة ثابتة
     */
    promptForFixedDistance() {
        // إخفاء أي إدخال سابق
        this.hideDynamicInput();
        
        // عرض إدخال للقيمة الثابتة
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.DISTANCE,
            label: 'Fixed Offset',
            defaultValue: this.getLastOffsetDistance(),
            placeholder: 'Enter fixed distance',
            
            onConfirm: (value) => {
                if (value > 0) {
                    this.isFixedMode = true;
                    this.fixedDistance = value;
                    this.hideDynamicInput();
                    
                    const displayDist = this.getDisplayDistance(value);
                    this.updateStatus(
                        `Fixed offset mode ON: ${displayDist.toFixed(2)} ${this.cad.currentUnit} - ` +
                        `Select objects to offset`
                    );
                } else {
                    this.hideDynamicInput();
                    this.updateStatus('Invalid distance');
                }
            },
            
            onCancel: () => {
                this.hideDynamicInput();
                this.updateStatus('Fixed distance mode cancelled');
            }
        });
    }
    
    /**
     * إنهاء العملية
     */
    finishOperation() {
        this.hideDynamicInput();
        this.clearPreview();
        this.cad.isDrawing = false;
        this.cad.finishDrawing();
        
        if (this.offsetCount > 0) {
            this.updateStatus(
                `Offset completed: ${this.offsetCount} offset${this.offsetCount > 1 ? 's' : ''} created`
            );
        } else {
            this.updateStatus('Offset cancelled');
        }
        
        this.resetState();
    }
    
    /**
     * مسح المعاينة
     */
    clearPreview() {
        this.cad.tempShapes = null;
        this.cad.render();
    }
    
    /**
     * إعادة تعيين الحالة
     */
    resetState() {
        this.selectedShape = null;
        this.offsetCount = 0;
        this.currentMousePoint = null;
        this.mode = 'free';
        this.fixedDistance = null;
        this.isFixedMode = false;
        this.offsetSide = 1;
        this.previewDistance = 0;
        this.constrainedMode = false;
        this.constrainedValue = null;
    }
    
    /**
     * التحقق من إمكانية إزاحة الشكل
     */
    canOffsetShape(shape) {
        const supportedTypes = [
            'line', 'circle', 'arc', 'ellipse', 
            'rectangle', 'polyline', 'polygon'
        ];
        return supportedTypes.includes(shape.type);
    }
    
    /**
     * الحصول على آخر مسافة إزاحة
     */
    getLastOffsetDistance() {
        const lastDist = this.toolsManager?.modifyState?.lastOffsetDistance || 10;
        
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
     * حفظ آخر مسافة إزاحة
     */
    saveLastOffsetDistance(distance) {
        if (this.toolsManager && !this.toolsManager.modifyState) {
            this.toolsManager.modifyState = {};
        }
        if (this.toolsManager) {
            this.toolsManager.modifyState.lastOffsetDistance = distance;
        }
    }
    
    /**
     * تحويل المسافة للعرض
     */
    getDisplayDistance(distance) {
        if (this.cad.units && this.cad.currentUnit) {
            try {
                return this.cad.units.fromInternal(distance, this.cad.currentUnit);
            } catch (e) {
                return distance;
            }
        }
        return distance;
    }
}