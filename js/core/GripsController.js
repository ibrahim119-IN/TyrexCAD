// ============================================
//  js/core/GripsController.js
// ============================================

/**
 * نظام التحكم المتكامل في الرؤوس والحواف
 * Integrated Grips System for Vertices and Edges
 */

// تعريف GripsController في النطاق العام
(function(window) {
    'use strict';

    class GripsController {
        constructor(cad) {
            this.cad = cad;
            
            // حالة النظام
            this.hoveredGrip = null;
            this.draggedGrip = null;
            this.originalPosition = null;
            this.contextMenuGrip = null;
            
            // إعدادات مرئية
            this.vertexGripSize = 8;
            this.edgeGripSize = 6;
            this.hoverScale = 1.3;
            
            // ألوان
            this.colors = {
                vertex: {
                    normal: '#00d4aa',
                    hover: '#00ffcc',
                    active: '#ffffff',
                    radius: '#ff9999'
                },
                edge: {
                    normal: 'rgba(128, 128, 128, 0.6)',
                    hover: 'rgba(200, 200, 200, 0.8)',
                    active: '#00d4aa'
                }
            };
        }
        
        /**
         * معالجة النقرة اليمنى على grip
         */
        handleRightClick(point, e) {
            const grip = this.findGripAt(point, this.cad.selectedShapes);
            
            if (grip) {
                this.contextMenuGrip = grip;
                this.showGripContextMenu(e.clientX, e.clientY, grip);
                return true;
            }
            
            return false;
        }
        
        /**
         * عرض القائمة السياقية للـ grip
         */
        showGripContextMenu(x, y, grip) {
            // إزالة أي قائمة سابقة
            const existingMenu = document.querySelector('.grips-context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }
            
            // إنشاء القائمة
            const menu = document.createElement('div');
            menu.className = 'grips-context-menu';
            menu.style.position = 'fixed';
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.style.zIndex = '1000';
            
            // بناء عناصر القائمة حسب نوع grip
            if (grip.type === 'vertex') {
                menu.innerHTML = `
                    <div class="context-menu-item" data-action="stretch">
                        <i class="fas fa-arrows-alt"></i> Stretch Vertex
                    </div>
                    <div class="context-menu-item" data-action="remove">
                        <i class="fas fa-trash"></i> Remove Vertex
                    </div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="smooth">
                        <i class="fas fa-bezier-curve"></i> Convert to Smooth
                    </div>
                    <div class="context-menu-item" data-action="corner">
                        <i class="fas fa-square"></i> Convert to Corner
                    </div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="properties">
                        <i class="fas fa-cog"></i> Properties...
                    </div>
                `;
            } else if (grip.type === 'edge') {
                menu.innerHTML = `
                    <div class="context-menu-item" data-action="add-vertex">
                        <i class="fas fa-plus"></i> Add Vertex
                    </div>
                    <div class="context-menu-item" data-action="convert-arc">
                        <i class="fas fa-circle-notch"></i> Convert to Arc
                    </div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="divide">
                        <i class="fas fa-cut"></i> Divide Edge
                    </div>
                    <div class="context-menu-item" data-action="offset">
                        <i class="fas fa-expand-arrows-alt"></i> Offset Edge
                    </div>
                `;
            }
            
            // إضافة معالجات الأحداث
            menu.addEventListener('click', (e) => {
                const item = e.target.closest('.context-menu-item');
                if (item) {
                    const action = item.dataset.action;
                    this.executeGripAction(action, grip);
                    menu.remove();
                }
            });
            
            // إضافة القائمة للصفحة
            document.body.appendChild(menu);
            
            // إغلاق القائمة عند النقر خارجها
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                    document.removeEventListener('contextmenu', closeMenu);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
                document.addEventListener('contextmenu', closeMenu);
            }, 0);
        }
        
        /**
         * تنفيذ إجراء من القائمة السياقية
         */
        executeGripAction(action, grip) {
            this.cad.recordState();
            
            switch (action) {
                case 'stretch':
                    this.startDrag(grip, grip.point);
                    break;
                    
                case 'remove':
                    this.removeVertex(grip);
                    break;
                    
                case 'add-vertex':
                    this.addVertexAtEdge(grip, grip.point);
                    break;
                    
                case 'convert-arc':
                    this.convertEdgeToArc(grip);
                    break;
                    
                case 'smooth':
                    this.convertVertexType(grip, 'smooth');
                    break;
                    
                case 'corner':
                    this.convertVertexType(grip, 'corner');
                    break;
                    
                case 'divide':
                    this.divideEdge(grip);
                    break;
                    
                case 'offset':
                    this.offsetEdge(grip);
                    break;
                    
                case 'properties':
                    this.showGripProperties(grip);
                    break;
            }
            
            this.cad.render();
        }
        
        /**
         * معالجة double-click على grip
         */
        handleDoubleClick(point) {
            const grip = this.findGripAt(point, this.cad.selectedShapes);
            
            if (grip) {
                if (grip.type === 'edge') {
                    // Double-click على edge يحولها إلى قوس
                    this.convertEdgeToArc(grip);
                } else if (grip.type === 'vertex') {
                    // Double-click على vertex يفتح خصائصها
                    this.showGripProperties(grip);
                }
                return true;
            }
            
            return false;
        }
        
        /**
         * الحصول على جميع grips للشكل
         */
        getShapeGrips(shape) {
            const grips = {
                vertices: this.getVertexGrips(shape),
                edges: this.getEdgeGrips(shape)
            };
            return grips;
        }
        
        /**
         * الحصول على vertex grips
         */
        getVertexGrips(shape) {
            switch (shape.type) {
                case 'line':
                    return [
                        { 
                            type: 'vertex',
                            subtype: 'endpoint',
                            point: shape.start, 
                            index: 0, 
                            id: 'start',
                            shape: shape
                        },
                        { 
                            type: 'vertex',
                            subtype: 'endpoint',
                            point: shape.end, 
                            index: 1, 
                            id: 'end',
                            shape: shape
                        }
                    ];
                    
                case 'rectangle':
                    return this.getRectangleVertices(shape);
                    
                case 'polyline':
                    return shape.points.map((p, i) => ({
                        type: 'vertex',
                        subtype: i === 0 || i === shape.points.length - 1 ? 'endpoint' : 'vertex',
                        point: p,
                        index: i,
                        id: `v${i}`,
                        shape: shape
                    }));
                    
                case 'circle':
                    return [
                        { 
                            type: 'vertex',
                            subtype: 'radius',
                            point: { x: shape.center.x + shape.radius, y: shape.center.y }, 
                            index: 0,
                            id: 'e',
                            shape: shape
                        },
                        { 
                            type: 'vertex',
                            subtype: 'radius',
                            point: { x: shape.center.x, y: shape.center.y + shape.radius }, 
                            index: 1,
                            id: 's',
                            shape: shape
                        },
                        { 
                            type: 'vertex',
                            subtype: 'radius',
                            point: { x: shape.center.x - shape.radius, y: shape.center.y }, 
                            index: 2,
                            id: 'w',
                            shape: shape
                        },
                        { 
                            type: 'vertex',
                            subtype: 'radius',
                            point: { x: shape.center.x, y: shape.center.y - shape.radius }, 
                            index: 3,
                            id: 'n',
                            shape: shape
                        }
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
                        { 
                            type: 'vertex',
                            subtype: 'endpoint',
                            point: startPoint, 
                            index: 0,
                            id: 'start',
                            shape: shape
                        },
                        { 
                            type: 'vertex',
                            subtype: 'radius',
                            point: midPoint, 
                            index: 1,
                            id: 'mid',
                            shape: shape
                        },
                        { 
                            type: 'vertex',
                            subtype: 'endpoint',
                            point: endPoint, 
                            index: 2,
                            id: 'end',
                            shape: shape
                        }
                    ];
                    
                case 'ellipse':
                    return [
                        { 
                            type: 'vertex',
                            subtype: 'radius',
                            point: { x: shape.center.x + shape.radiusX, y: shape.center.y }, 
                            index: 0,
                            id: 'rx',
                            shape: shape
                        },
                        { 
                            type: 'vertex',
                            subtype: 'radius',
                            point: { x: shape.center.x, y: shape.center.y + shape.radiusY }, 
                            index: 1,
                            id: 'ry',
                            shape: shape
                        }
                    ];
                    
                default:
                    return [];
            }
        }
        
        /**
         * الحصول على edge grips
         */
        getEdgeGrips(shape) {
            const edges = [];
            
            switch (shape.type) {
                case 'line':
                    edges.push({
                        type: 'edge',
                        point: {
                            x: (shape.start.x + shape.end.x) / 2,
                            y: (shape.start.y + shape.end.y) / 2
                        },
                        startIndex: 0,
                        endIndex: 1,
                        start: shape.start,
                        end: shape.end,
                        id: 'edge0',
                        shape: shape
                    });
                    break;
                    
                case 'rectangle':
                    const vertices = this.getRectangleVertices(shape);
                    for (let i = 0; i < 4; i++) {
                        const v1 = vertices[i];
                        const v2 = vertices[(i + 1) % 4];
                        edges.push({
                            type: 'edge',
                            point: {
                                x: (v1.point.x + v2.point.x) / 2,
                                y: (v1.point.y + v2.point.y) / 2
                            },
                            startIndex: i,
                            endIndex: (i + 1) % 4,
                            start: v1.point,
                            end: v2.point,
                            id: `edge${i}`,
                            shape: shape
                        });
                    }
                    break;
                    
                case 'polyline':
                    const len = shape.closed ? shape.points.length : shape.points.length - 1;
                    for (let i = 0; i < len; i++) {
                        const p1 = shape.points[i];
                        const p2 = shape.points[(i + 1) % shape.points.length];
                        
                        // تخطي edge grip إذا كان القطعة قوس
                        if (shape.segments && shape.segments[i] && shape.segments[i].type === 'arc') {
                            continue;
                        }
                        
                        edges.push({
                            type: 'edge',
                            point: {
                                x: (p1.x + p2.x) / 2,
                                y: (p1.y + p2.y) / 2
                            },
                            startIndex: i,
                            endIndex: (i + 1) % shape.points.length,
                            start: p1,
                            end: p2,
                            id: `edge${i}`,
                            shape: shape
                        });
                    }
                    break;
                    
                case 'arc':
                    // لا نضع edge grips على الأقواس
                    break;
                    
                default:
                    break;
            }
            
            return edges;
        }
        
        /**
         * الحصول على رؤوس المستطيل
         */
        getRectangleVertices(shape) {
            const x1 = Math.min(shape.start.x, shape.end.x);
            const y1 = Math.min(shape.start.y, shape.end.y);
            const x2 = Math.max(shape.start.x, shape.end.x);
            const y2 = Math.max(shape.start.y, shape.end.y);
            
            return [
                { 
                    type: 'vertex',
                    subtype: 'corner',
                    point: {x: x1, y: y1}, 
                    index: 0,
                    id: 'tl',
                    shape: shape
                },
                { 
                    type: 'vertex',
                    subtype: 'corner',
                    point: {x: x2, y: y1}, 
                    index: 1,
                    id: 'tr',
                    shape: shape
                },
                { 
                    type: 'vertex',
                    subtype: 'corner',
                    point: {x: x2, y: y2}, 
                    index: 2,
                    id: 'br',
                    shape: shape
                },
                { 
                    type: 'vertex',
                    subtype: 'corner',
                    point: {x: x1, y: y2}, 
                    index: 3,
                    id: 'bl',
                    shape: shape
                }
            ];
        }
        
        /**
         * البحث عن grip عند نقطة معينة
         */
        findGripAt(point, selectedShapes) {
            const threshold = 12 / this.cad.zoom;
            let nearestGrip = null;
            let minDist = threshold;
            
            for (const shape of selectedShapes) {
                const grips = this.getShapeGrips(shape);
                
                // البحث في vertex grips أولاً (لها أولوية)
                for (const vertex of grips.vertices) {
                    const dist = this.cad.distance(
                        point.x, point.y,
                        vertex.point.x, vertex.point.y
                    );
                    
                    if (dist < minDist) {
                        minDist = dist;
                        nearestGrip = vertex;
                    }
                }
                
                // إذا لم نجد vertex، ابحث في edges
                if (!nearestGrip) {
                    for (const edge of grips.edges) {
                        const dist = this.cad.distance(
                            point.x, point.y,
                            edge.point.x, edge.point.y
                        );
                        
                        if (dist < minDist) {
                            minDist = dist;
                            nearestGrip = edge;
                        }
                    }
                }
            }
            
            return nearestGrip;
        }
        
        /**
         * تحديث hover state
         */
        updateHover(point, selectedShapes) {
            const newHover = this.findGripAt(point, selectedShapes);
            
            if (newHover !== this.hoveredGrip) {
                this.hoveredGrip = newHover;
                this.cad.render();
                
                // تحديث المؤشر
                if (newHover) {
                    this.cad.canvas.style.cursor = 'move';
                }
            }
        }
        
        /**
         * بدء سحب grip
         */
        startDrag(grip, point) {
            this.draggedGrip = grip;
            this.originalPosition = { ...grip.point };
            this.cad.recordState();
            
            if (grip.type === 'vertex') {
                this.cad.updateStatus('Move vertex to new position');
            } else {
                this.cad.updateStatus('Drag to add vertex at desired position');
            }
        }
        
        /**
         * تحديث موقع أثناء السحب
         */
        updateDrag(point) {
            if (!this.draggedGrip) return;
            
            // تطبيق Snap
            const snappedPoint = this.getSnappedPosition(point);
            
            // تطبيق القيود مع Shift
            let constrainedPoint = snappedPoint;
            if (this.cad.keys && this.cad.keys.shift && this.originalPosition) {
                const dx = Math.abs(snappedPoint.x - this.originalPosition.x);
                const dy = Math.abs(snappedPoint.y - this.originalPosition.y);
                
                if (dx > dy) {
                    constrainedPoint = {
                        x: snappedPoint.x,
                        y: this.originalPosition.y
                    };
                } else {
                    constrainedPoint = {
                        x: this.originalPosition.x,
                        y: snappedPoint.y
                    };
                }
            }
            
            if (this.draggedGrip.type === 'vertex') {
                // تحديث موقع vertex
                this.updateVertexPosition(this.draggedGrip, constrainedPoint);
            } else {
                // معاينة إضافة vertex جديد
                this.previewNewVertex(this.draggedGrip, constrainedPoint);
            }
            
            // إظهار معاينة حية
            this.showLivePreview(this.draggedGrip, constrainedPoint);
        }
        
        /**
         * إنهاء السحب
         */
        endDrag(point) {
            if (!this.draggedGrip) return;
            
            if (this.draggedGrip.type === 'edge') {
                // إضافة vertex جديد في موقع السحب
                this.addVertexAtEdge(this.draggedGrip, point);
            }
            
            // تسجيل التغيير
            this.recordGripChange('Grip operation completed');
            
            this.draggedGrip = null;
            this.originalPosition = null;
            this.cad.tempShape = null;
            this.cad.updateStatus('READY');
        }
        
        /**
         * تحديث موقع vertex
         */
        updateVertexPosition(grip, newPosition) {
            const shape = grip.shape;
            
            switch (shape.type) {
                case 'line':
                    if (grip.id === 'start') {
                        shape.start = { ...newPosition };
                    } else {
                        shape.end = { ...newPosition };
                    }
                    break;
                    
                case 'rectangle':
                    this.updateRectangleVertex(shape, grip, newPosition);
                    break;
                    
                case 'polyline':
                    shape.points[grip.index] = { ...newPosition };
                    break;
                    
                case 'circle':
                    shape.radius = this.cad.distance(
                        shape.center.x, shape.center.y,
                        newPosition.x, newPosition.y
                    );
                    break;
                    
                case 'arc':
                    if (grip.subtype === 'endpoint') {
                        this.updateArcEndpoint(shape, grip, newPosition);
                    } else if (grip.subtype === 'radius') {
                        shape.radius = this.cad.distance(
                            shape.center.x, shape.center.y,
                            newPosition.x, newPosition.y
                        );
                    }
                    break;
                    
                case 'ellipse':
                    if (grip.id === 'rx') {
                        shape.radiusX = Math.abs(newPosition.x - shape.center.x);
                    } else {
                        shape.radiusY = Math.abs(newPosition.y - shape.center.y);
                    }
                    break;
            }
            
            this.cad.render();
        }
        
        /**
         * تحديث رأس المستطيل
         */
        updateRectangleVertex(rect, grip, newPosition) {
            const vertices = this.getRectangleVertices(rect);
            const opposite = vertices[(grip.index + 2) % 4];
            
            rect.start = { ...newPosition };
            rect.end = { ...opposite.point };
        }
        
        /**
         * تحديث نقطة نهاية القوس
         */
        updateArcEndpoint(arc, grip, newPosition) {
            const angle = Math.atan2(
                newPosition.y - arc.center.y,
                newPosition.x - arc.center.x
            );
            
            if (grip.id === 'start') {
                arc.startAngle = angle;
            } else {
                arc.endAngle = angle;
            }
        }
        
        /**
         * معاينة إضافة vertex جديد
         */
        previewNewVertex(edgeGrip, position) {
            // إنشاء معاينة للشكل مع vertex جديد
            const shape = edgeGrip.shape;
            const preview = this.cad.cloneShape(shape);
            
            if (shape.type === 'polyline') {
                preview.points.splice(edgeGrip.endIndex, 0, position);
            } else if (shape.type === 'line') {
                preview.type = 'polyline';
                preview.points = [shape.start, position, shape.end];
            }
            
            preview.color = this.colors.edge.active;
            preview.lineType = 'dashed';
            
            this.cad.tempShape = preview;
            this.cad.render();
        }
        
        /**
         * إضافة vertex على edge
         */
        addVertexAtEdge(edgeGrip, position) {
            const shape = edgeGrip.shape;
            
            // تطبيق snap على الموقع النهائي
            const finalPos = this.getSnappedPosition(position);
            
            switch (shape.type) {
                case 'line':
                    // تحويل line إلى polyline
                    shape.type = 'polyline';
                    shape.points = [shape.start, finalPos, shape.end];
                    delete shape.start;
                    delete shape.end;
                    break;
                    
                case 'rectangle':
                    // تحويل rectangle إلى polyline
                    this.convertRectangleToPolyline(shape, edgeGrip, finalPos);
                    break;
                    
                case 'polyline':
                    // إضافة vertex في المكان الصحيح
                    shape.points.splice(edgeGrip.endIndex, 0, finalPos);
                    break;
            }
            
            this.cad.render();
        }
        
        /**
         * تحويل مستطيل إلى polyline
         */
        convertRectangleToPolyline(rect, edgeGrip, newVertex) {
            const vertices = this.getRectangleVertices(rect);
            
            rect.type = 'polyline';
            rect.points = vertices.map(v => v.point);
            rect.closed = true;
            
            // إضافة vertex الجديد
            rect.points.splice(edgeGrip.endIndex, 0, newVertex);
            
            // إضافة النقطة الأخيرة لإغلاق الشكل
            rect.points.push(rect.points[0]);
            
            delete rect.start;
            delete rect.end;
        }
        
        /**
         * حذف vertex
         */
        removeVertex(grip) {
            const shape = grip.shape;
            
            if (shape.type === 'polyline') {
                // لا يمكن حذف vertex إذا كان عدد النقاط أقل من 2
                if (shape.points.length <= 2) {
                    this.cad.updateStatus('Cannot remove vertex: minimum 2 points required');
                    return { success: false, message: 'Polyline must have at least 2 points' };
                }
                
                shape.points.splice(grip.index, 1);
                this.cad.updateStatus('Vertex removed');
                return { success: true };
            } else if (shape.type === 'rectangle') {
                // تحويل المستطيل إلى polyline ثم حذف النقطة
                const vertices = this.getRectangleVertices(shape);
                const points = vertices.map(v => ({ ...v.point }));
                points.splice(grip.index, 1);
                
                // استبدال المستطيل بـ polyline
                const index = this.cad.shapes.indexOf(shape);
                this.cad.shapes[index] = {
                    type: 'polyline',
                    points: points,
                    closed: true,
                    color: shape.color,
                    lineWidth: shape.lineWidth,
                    lineType: shape.lineType,
                    layerId: shape.layerId,
                    id: shape.id
                };
                
                // تحديث التحديد
                this.cad.selectedShapes.delete(shape);
                this.cad.selectedShapes.add(this.cad.shapes[index]);
                return { success: true };
            }
            
            return { success: false, message: 'Cannot remove vertex from this shape type' };
        }
        
        /**
         * تحويل edge إلى قوس
         */
        convertEdgeToArc(edgeGrip, bulge = 0.5) {
            const shape = edgeGrip.shape;
            
            if (shape.type !== 'polyline') {
                return { success: false, message: 'Can only convert polyline edges to arcs' };
            }
            
            if (!shape.segments) {
                shape.segments = new Array(shape.points.length - 1).fill(null);
            }
            
            const p1 = shape.points[edgeGrip.startIndex];
            const p2 = shape.points[edgeGrip.endIndex];
            
            const midPoint = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2
            };
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            const perpX = -dy / length;
            const perpY = dx / length;
            
            const arcPoint = {
                x: midPoint.x + perpX * length * bulge,
                y: midPoint.y + perpY * length * bulge
            };
            
            const arc = this.cad.geo.calculateArcFrom3Points(p1, arcPoint, p2);
            
            if (arc) {
                shape.segments[edgeGrip.startIndex] = {
                    type: 'arc',
                    center: arc.center,
                    radius: arc.radius,
                    startAngle: arc.startAngle,
                    endAngle: arc.endAngle,
                    bulge: bulge
                };
                
                return { success: true, arc: shape.segments[edgeGrip.startIndex] };
            }
            
            return { success: false, message: 'Could not calculate arc' };
        }
        
        /**
         * تقسيم edge إلى عدة أجزاء
         */
        divideEdge(edgeGrip) {
            const count = parseInt(prompt('Number of segments:', '2'));
            if (!count || count < 2) return;
            
            const shape = edgeGrip.shape;
            const p1 = edgeGrip.start;
            const p2 = edgeGrip.end;
            
            const newPoints = [];
            for (let i = 1; i < count; i++) {
                const t = i / count;
                newPoints.push({
                    x: p1.x + (p2.x - p1.x) * t,
                    y: p1.y + (p2.y - p1.y) * t
                });
            }
            
            if (shape.type === 'polyline') {
                // إدراج النقاط الجديدة
                shape.points.splice(edgeGrip.endIndex, 0, ...newPoints);
            } else if (shape.type === 'line') {
                // تحويل إلى polyline
                shape.type = 'polyline';
                shape.points = [p1, ...newPoints, p2];
                delete shape.start;
                delete shape.end;
            }
            
            this.cad.updateStatus(`Edge divided into ${count} segments`);
        }
        
        /**
         * offset للـ edge
         */
        offsetEdge(edgeGrip) {
            const distance = parseFloat(prompt('Offset distance:', '10'));
            if (!distance) return;
            
            const shape = edgeGrip.shape;
            const p1 = edgeGrip.start;
            const p2 = edgeGrip.end;
            
            // حساب الاتجاه العمودي
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const perpX = -dy / len * distance;
            const perpY = dx / len * distance;
            
            // إنشاء edge جديد
            const newShape = {
                type: 'line',
                start: { x: p1.x + perpX, y: p1.y + perpY },
                end: { x: p2.x + perpX, y: p2.y + perpY },
                color: shape.color,
                lineWidth: shape.lineWidth,
                lineType: shape.lineType,
                layerId: shape.layerId,
                id: this.cad.generateId()
            };
            
            this.cad.shapes.push(newShape);
            this.cad.updateStatus('Edge offset created');
        }
        
        /**
         * تحويل نوع vertex
         */
        convertVertexType(grip, type) {
            // حفظ نوع vertex (للاستخدام المستقبلي في الأشكال المنحنية)
            grip.vertexType = type;
            this.cad.updateStatus(`Vertex converted to ${type}`);
        }
        
        /**
         * عرض خصائص grip
         */
        showGripProperties(grip) {
            let content = '';
            
            if (grip.type === 'vertex') {
                content = `
                    <h3>Vertex Properties</h3>
                    <div class="property-row">
                        <label>X:</label>
                        <input type="number" id="grip-x" value="${grip.point.x.toFixed(2)}" />
                    </div>
                    <div class="property-row">
                        <label>Y:</label>
                        <input type="number" id="grip-y" value="${grip.point.y.toFixed(2)}" />
                    </div>
                    <div class="property-row">
                        <label>Type:</label>
                        <select id="grip-type">
                            <option value="corner" ${grip.vertexType === 'corner' ? 'selected' : ''}>Corner</option>
                            <option value="smooth" ${grip.vertexType === 'smooth' ? 'selected' : ''}>Smooth</option>
                        </select>
                    </div>
                `;
            } else if (grip.type === 'edge') {
                const length = this.cad.distance(grip.start.x, grip.start.y, grip.end.x, grip.end.y);
                const angle = Math.atan2(grip.end.y - grip.start.y, grip.end.x - grip.start.x) * 180 / Math.PI;
                
                content = `
                    <h3>Edge Properties</h3>
                    <div class="property-row">
                        <label>Length:</label>
                        <span>${length.toFixed(2)}</span>
                    </div>
                    <div class="property-row">
                        <label>Angle:</label>
                        <span>${angle.toFixed(2)}°</span>
                    </div>
                `;
            }
            
            // استخدام نظام UI الموجود لعرض الخصائص
            if (this.cad.ui) {
                this.cad.ui.showGripPropertiesDialog(content, (result) => {
                    if (result && grip.type === 'vertex') {
                        // تطبيق التغييرات
                        const newX = parseFloat(document.getElementById('grip-x').value);
                        const newY = parseFloat(document.getElementById('grip-y').value);
                        
                        if (!isNaN(newX) && !isNaN(newY)) {
                            this.updateVertexPosition(grip, { x: newX, y: newY });
                            this.cad.render();
                        }
                    }
                });
            }
        }
        
        /**
         * إضافة ميزة snap للـ grips
         */
        getSnappedPosition(point) {
            if (this.cad.snapEnabled) {
                return this.cad.getSnapPoint(point.x, point.y);
            }
            return point;
        }
        
        /**
         * معاينة التغييرات بشكل حي
         */
        showLivePreview(grip, newPosition) {
            // إنشاء نسخة مؤقتة من الشكل
            const tempShape = this.cad.cloneShape(grip.shape);
            
            // تطبيق التغيير على النسخة المؤقتة
            if (grip.type === 'vertex') {
                this.applyVertexChange(tempShape, grip, newPosition);
            }
            
            // عرض المعاينة
            this.cad.tempShape = tempShape;
            this.cad.tempShape.color = this.colors.edge.active;
            this.cad.tempShape.lineType = 'dashed';
        }
        
        /**
         * دعم Undo/Redo للتغييرات
         */
        recordGripChange(description) {
            this.cad.recordState();
            this.cad.updateStatus(description);
        }
        
        /**
         * رسم جميع grips للشكل
         */
        drawGrips(shape) {
            const grips = this.getShapeGrips(shape);
            
            // رسم edge grips أولاً (خلف vertex grips)
            for (const edge of grips.edges) {
                this.drawEdgeGrip(edge);
            }
            
            // رسم vertex grips
            for (const vertex of grips.vertices) {
                this.drawVertexGrip(vertex);
            }
        }
        
        /**
         * رسم vertex grip
         */
        drawVertexGrip(grip) {
            const ctx = this.cad.ctx;
            const isHovered = grip === this.hoveredGrip;
            const isDragged = grip === this.draggedGrip;
            const scale = isHovered || isDragged ? this.hoverScale : 1;
            const size = (this.vertexGripSize * scale) / this.cad.zoom;
            
            ctx.save();
            
            // اختيار اللون
            let fillColor, strokeColor;
            if (isDragged) {
                fillColor = this.colors.vertex.active;
                strokeColor = this.colors.vertex.hover;
            } else if (isHovered) {
                fillColor = this.colors.vertex.hover;
                strokeColor = this.colors.vertex.active;
            } else if (grip.subtype === 'radius') {
                fillColor = this.colors.vertex.radius;
                strokeColor = this.colors.vertex.active;
            } else {
                fillColor = this.colors.vertex.normal;
                strokeColor = this.colors.vertex.active;
            }
            
            // رسم المربع
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2 / this.cad.zoom;
            
            ctx.beginPath();
            ctx.rect(
                grip.point.x - size/2,
                grip.point.y - size/2,
                size,
                size
            );
            ctx.fill();
            ctx.stroke();
            
            // إضافة توهج للـ hover
            if (isHovered) {
                ctx.shadowColor = this.colors.vertex.hover;
                ctx.shadowBlur = 10 / this.cad.zoom;
                ctx.fill();
            }
            
            // رسم دائرة صغيرة للتحكم في نصف القطر
            if (grip.subtype === 'radius') {
                ctx.beginPath();
                ctx.arc(grip.point.x, grip.point.y, size/3, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }
            
            ctx.restore();
        }
        
        /**
         * رسم edge grip
         */
        drawEdgeGrip(grip) {
            const ctx = this.cad.ctx;
            const isHovered = grip === this.hoveredGrip;
            const isDragged = grip === this.draggedGrip;
            const scale = isHovered || isDragged ? this.hoverScale : 1;
            const size = (this.edgeGripSize * scale) / this.cad.zoom;
            
            ctx.save();
            
            // اختيار اللون
            let fillColor, strokeColor;
            if (isDragged) {
                fillColor = this.colors.edge.active;
                strokeColor = this.colors.vertex.active;
            } else if (isHovered) {
                fillColor = this.colors.edge.hover;
                strokeColor = this.colors.edge.active;
            } else {
                fillColor = this.colors.edge.normal;
                strokeColor = this.colors.edge.hover;
            }
            
            // رسم مستطيل صغير
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1 / this.cad.zoom;
            
            const width = size * 1.5;
            const height = size;
            
            // حساب زاوية الدوران بناءً على اتجاه الخط
            const angle = Math.atan2(
                grip.end.y - grip.start.y,
                grip.end.x - grip.start.x
            );
            
            ctx.translate(grip.point.x, grip.point.y);
            ctx.rotate(angle);
            
            ctx.beginPath();
            ctx.rect(-width/2, -height/2, width, height);
            ctx.fill();
            ctx.stroke();
            
            // إضافة توهج للـ hover
            if (isHovered) {
                ctx.shadowColor = this.colors.edge.active;
                ctx.shadowBlur = 8 / this.cad.zoom;
                ctx.fill();
            }
            
            ctx.restore();
        }
    }
    
    window.GripsController = GripsController;
    
})(window);