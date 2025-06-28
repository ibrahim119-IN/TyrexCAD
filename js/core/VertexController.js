
/**
 * نظام التحكم في رؤوس الأشكال
 * يدير عمليات التحديد والتعديل على الرؤوس
 */
class VertexController {
    constructor(cad) {
        this.cad = cad;
        this.activeVertex = null;
        this.hoveredVertex = null;
        this.vertexRadius = 6;
        this.spatialIndex = new VertexSpatialIndex();
    }
    
    /**
     * الحصول على جميع رؤوس الشكل
     */
    getShapeVertices(shape) {
        switch (shape.type) {
            case 'line':
                return [
                    { point: shape.start, index: 0, type: 'endpoint', id: 'start' },
                    { point: shape.end, index: 1, type: 'endpoint', id: 'end' }
                ];
                
            case 'rectangle':
                return this.getRectangleVertices(shape);
                
            case 'polyline':
                return shape.points.map((p, i) => ({
                    point: p,
                    index: i,
                    type: i === 0 || i === shape.points.length - 1 ? 'endpoint' : 'vertex',
                    id: `v${i}`
                }));
                
            case 'circle':
                // نقاط تحكم لتغيير نصف القطر (4 نقاط)
                return [
                    { point: { x: shape.center.x + shape.radius, y: shape.center.y }, index: 0, type: 'radius', id: 'e' },
                    { point: { x: shape.center.x, y: shape.center.y + shape.radius }, index: 1, type: 'radius', id: 's' },
                    { point: { x: shape.center.x - shape.radius, y: shape.center.y }, index: 2, type: 'radius', id: 'w' },
                    { point: { x: shape.center.x, y: shape.center.y - shape.radius }, index: 3, type: 'radius', id: 'n' }
                ];
                
            case 'arc':
                const startPoint = {
                    x: shape.center.x + shape.radius * Math.cos(shape.startAngle),
                    y: shape.center.y + shape.radius * Math.sin(shape.startAngle)
                };
                const endPoint = {
                    x: shape.center.x + shape.radius * Math.cos(shape.endAngle),
                    y: shape.center.y + shape.radius * Math.sin(shape.endAngle)
                };
                const midAngle = (shape.startAngle + shape.endAngle) / 2;
                const midPoint = {
                    x: shape.center.x + shape.radius * Math.cos(midAngle),
                    y: shape.center.y + shape.radius * Math.sin(midAngle)
                };
                
                return [
                    { point: startPoint, index: 0, type: 'endpoint', id: 'start' },
                    { point: midPoint, index: 1, type: 'radius', id: 'mid' },
                    { point: endPoint, index: 2, type: 'endpoint', id: 'end' }
                ];
                
            case 'ellipse':
                return [
                    { point: { x: shape.center.x + shape.radiusX, y: shape.center.y }, index: 0, type: 'radius', id: 'rx' },
                    { point: { x: shape.center.x, y: shape.center.y + shape.radiusY }, index: 1, type: 'radius', id: 'ry' }
                ];
                
            default:
                return [];
        }
    }
    
    /**
     * الحصول على رؤوس المستطيل
     */
    getRectangleVertices(rect) {
        const x1 = Math.min(rect.start.x, rect.end.x);
        const y1 = Math.min(rect.start.y, rect.end.y);
        const x2 = Math.max(rect.start.x, rect.end.x);
        const y2 = Math.max(rect.start.y, rect.end.y);
        
        return [
            { point: {x: x1, y: y1}, index: 0, type: 'corner', id: 'tl' },
            { point: {x: x2, y: y1}, index: 1, type: 'corner', id: 'tr' },
            { point: {x: x2, y: y2}, index: 2, type: 'corner', id: 'br' },
            { point: {x: x1, y: y2}, index: 3, type: 'corner', id: 'bl' }
        ];
    }
    
    /**
     * العثور على أقرب رأس
     */
    findNearestVertex(point, maxDistance = null) {
        const searchRadius = maxDistance || (this.vertexRadius * 2 / this.cad.zoom);
        let nearest = null;
        let minDist = searchRadius;
        
        // البحث في الأشكال المحددة أولاً
        for (const shape of this.cad.selectedShapes) {
            const vertices = this.getShapeVertices(shape);
            for (const vertex of vertices) {
                const dist = this.cad.distance(point.x, point.y, vertex.point.x, vertex.point.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = { vertex, shape };
                }
            }
        }
        
        return nearest;
    }
    
    /**
     * تحديث موقع الرأس
     */
    updateVertexPosition(vertex, shape, newPosition) {
        switch (shape.type) {
            case 'line':
                if (vertex.id === 'start') {
                    shape.start = { ...newPosition };
                } else {
                    shape.end = { ...newPosition };
                }
                break;
                
            case 'rectangle':
                this.updateRectangleVertex(shape, vertex, newPosition);
                break;
                
            case 'polyline':
                shape.points[vertex.index] = { ...newPosition };
                break;
                
            case 'circle':
                // تحديث نصف القطر بناءً على المسافة
                shape.radius = this.cad.distance(
                    shape.center.x, shape.center.y,
                    newPosition.x, newPosition.y
                );
                break;
                
            case 'arc':
                if (vertex.type === 'endpoint') {
                    this.updateArcEndpoint(shape, vertex, newPosition);
                } else if (vertex.type === 'radius') {
                    shape.radius = this.cad.distance(
                        shape.center.x, shape.center.y,
                        newPosition.x, newPosition.y
                    );
                }
                break;
                
            case 'ellipse':
                if (vertex.id === 'rx') {
                    shape.radiusX = Math.abs(newPosition.x - shape.center.x);
                } else {
                    shape.radiusY = Math.abs(newPosition.y - shape.center.y);
                }
                break;
        }
    }
    
    /**
     * تحديث رأس المستطيل
     */
    updateRectangleVertex(rect, vertex, newPosition) {
        const vertices = this.getRectangleVertices(rect);
        const opposite = vertices[(vertex.index + 2) % 4];
        
        rect.start = { ...newPosition };
        rect.end = { ...opposite.point };
    }
    
    /**
     * تحديث نقطة نهاية القوس
     */
    updateArcEndpoint(arc, vertex, newPosition) {
        const angle = Math.atan2(
            newPosition.y - arc.center.y,
            newPosition.x - arc.center.x
        );
        
        if (vertex.id === 'start') {
            arc.startAngle = angle;
        } else {
            arc.endAngle = angle;
        }
    }
    
    /**
     * إضافة رأس جديد
     */
    addVertex(shape, nearPoint) {
        switch (shape.type) {
            case 'polyline':
                return this.addPolylineVertex(shape, nearPoint);
                
            case 'rectangle':
                return this.convertRectangleToPolyline(shape, nearPoint);
                
            default:
                return { success: false, message: 'Cannot add vertex to this shape type' };
        }
    }
    
    /**
     * إضافة رأس لخط متعدد
     */
    addPolylineVertex(polyline, nearPoint) {
        // إيجاد أقرب قطعة
        let closestSegment = null;
        let minDist = Infinity;
        
        for (let i = 0; i < polyline.points.length - 1; i++) {
            const p1 = polyline.points[i];
            const p2 = polyline.points[i + 1];
            
            const dist = this.cad.geo.pointToLineDistance(nearPoint, p1, p2);
            if (dist < minDist) {
                minDist = dist;
                closestSegment = { index: i, p1, p2 };
            }
        }
        
        if (closestSegment) {
            // حساب نقطة الإسقاط على الخط
            const projection = this.cad.geo.projectPointToLine(
                nearPoint,
                closestSegment.p1,
                closestSegment.p2
            );
            
            // إدراج الرأس الجديد
            polyline.points.splice(closestSegment.index + 1, 0, projection);
            
            return { success: true, vertex: projection };
        }
        
        return { success: false };
    }
    
    /**
     * تحويل مستطيل إلى خط متعدد
     */
    convertRectangleToPolyline(rect, nearPoint) {
        const vertices = this.getRectangleVertices(rect);
        
        // إنشاء polyline جديد
        const polyline = {
            type: 'polyline',
            points: vertices.map(v => v.point),
            closed: true,
            color: rect.color,
            lineWidth: rect.lineWidth,
            lineType: rect.lineType,
            layerId: rect.layerId,
            id: rect.id
        };
        
        // إضافة النقطة الأخيرة لإغلاق الشكل
        polyline.points.push(polyline.points[0]);
        
        // استبدال الشكل
        const index = this.cad.shapes.indexOf(rect);
        if (index !== -1) {
            this.cad.shapes[index] = polyline;
            
            // تحديث التحديد
            if (this.cad.selectedShapes.has(rect)) {
                this.cad.selectedShapes.delete(rect);
                this.cad.selectedShapes.add(polyline);
            }
            
            // إضافة الرأس الجديد
            return this.addPolylineVertex(polyline, nearPoint);
        }
        
        return { success: false };
    }
    
    /**
     * حذف رأس
     */
    removeVertex(shape, vertex) {
        switch (shape.type) {
            case 'polyline':
                if (shape.points.length > 3) {
                    shape.points.splice(vertex.index, 1);
                    return { success: true };
                }
                return { success: false, message: 'Polyline must have at least 3 points' };
                
            default:
                return { success: false, message: 'Cannot remove vertex from this shape type' };
        }
    }
    
    /**
     * تحويل قطعة إلى قوس
     */
    convertSegmentToArc(shape, segmentIndex, bulge = 0.5) {
        if (shape.type !== 'polyline') {
            return { success: false, message: 'Can only convert polyline segments' };
        }
        
        // تهيئة مصفوفة segments إذا لم تكن موجودة
        if (!shape.segments) {
            shape.segments = new Array(shape.points.length - 1).fill(null);
        }
        
        const p1 = shape.points[segmentIndex];
        const p2 = shape.points[segmentIndex + 1];
        
        // حساب نقطة المنتصف
        const midPoint = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
        
        // حساب نقطة القوس (perpendicular offset)
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // النقطة العمودية على منتصف الخط
        const perpX = -dy / length;
        const perpY = dx / length;
        
        const arcPoint = {
            x: midPoint.x + perpX * length * bulge,
            y: midPoint.y + perpY * length * bulge
        };
        
        // حساب القوس من ثلاث نقاط
        const arc = this.cad.geo.calculateArcFrom3Points(p1, arcPoint, p2);
        
        if (arc) {
            shape.segments[segmentIndex] = {
                type: 'arc',
                center: arc.center,
                radius: arc.radius,
                startAngle: arc.startAngle,
                endAngle: arc.endAngle,
                bulge: bulge
            };
            
            return { success: true, arc: shape.segments[segmentIndex] };
        }
        
        return { success: false, message: 'Could not calculate arc' };
    }
    
    /**
     * تحويل قوس إلى خط
     */
    convertArcToLine(shape, segmentIndex) {
        if (shape.type !== 'polyline' || !shape.segments) {
            return { success: false };
        }
        
        shape.segments[segmentIndex] = null;
        return { success: true };
    }
}

/**
 * فهرس مكاني لتحسين أداء البحث عن الرؤوس
 */
class VertexSpatialIndex {
    constructor(cellSize = 50) {
        this.grid = new Map();
        this.cellSize = cellSize;
    }
    
    getCellKey(point) {
        const x = Math.floor(point.x / this.cellSize);
        const y = Math.floor(point.y / this.cellSize);
        return `${x},${y}`;
    }
    
    addVertex(vertex, shape) {
        const key = this.getCellKey(vertex.point);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push({ vertex, shape });
    }
    
    clear() {
        this.grid.clear();
    }
}