// ============================================
//  js/core/GripsController.js - النسخة المُصلحة
// ============================================

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
                        subtype: i === 0 || i === shape.points.length - 1 ? 'endpoint' : 'middle',
                        point: p,
                        index: i,
                        id: `point${i}`,
                        shape: shape
                    }));
                    
                case 'circle':
                    return [
                        { 
                            type: 'vertex',
                            subtype: 'radius',
                            point: { x: shape.center.x + shape.radius, y: shape.center.y }, 
                            index: 0,
                            id: 'radius',
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
            
            // تحويل إلى polyline
            rect.type = 'polyline';
            rect.points = vertices.map(v => ({ ...v.point }));
            rect.closed = true;
            
            // إضافة vertex الجديد
            rect.points.splice(edgeGrip.endIndex, 0, newVertex);
            
            // حذف خصائص المستطيل
            delete rect.start;
            delete rect.end;
        }
        
        /**
         * تحويل edge إلى قوس
         */
        convertEdgeToArc(edgeGrip) {
            const shape = edgeGrip.shape;
            
            if (shape.type === 'line') {
                // تحويل خط مستقيم إلى قوس
                const start = shape.start;
                const end = shape.end;
                const midPoint = {
                    x: (start.x + end.x) / 2,
                    y: (start.y + end.y) / 2
                };
                
                // حساب نقطة القوس (ارتفاع = ربع المسافة)
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const perpX = -dy / distance * distance / 4;
                const perpY = dx / distance * distance / 4;
                
                const arcPoint = {
                    x: midPoint.x + perpX,
                    y: midPoint.y + perpY
                };
                
                // حساب القوس من 3 نقاط
                const arc = this.calculateArcFrom3Points(start, arcPoint, end);
                if (arc) {
                    // تحويل الشكل إلى قوس
                    shape.type = 'arc';
                    shape.center = arc.center;
                    shape.radius = arc.radius;
                    shape.startAngle = arc.startAngle;
                    shape.endAngle = arc.endAngle;
                    delete shape.start;
                    delete shape.end;
                }
            } else if (shape.type === 'polyline') {
                // تحويل segment في polyline إلى قوس
                this.cad.updateStatus('Arc conversion for polylines coming soon');
            }
        }
        
        /**
         * حساب قوس من 3 نقاط
         */
        calculateArcFrom3Points(p1, p2, p3) {
            // حساب مركز الدائرة المارة بالنقاط الثلاث
            const ax = p1.x, ay = p1.y;
            const bx = p2.x, by = p2.y;
            const cx = p3.x, cy = p3.y;
            
            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
            if (Math.abs(d) < 0.0001) return null; // النقاط على خط مستقيم
            
            const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
            const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
            
            const center = { x: ux, y: uy };
            const radius = Math.sqrt((ax - ux) * (ax - ux) + (ay - uy) * (ay - uy));
            
            // حساب الزوايا
            const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
            const endAngle = Math.atan2(p3.y - center.y, p3.x - center.x);
            
            return { center, radius, startAngle, endAngle };
        }
        
        /**
         * معالجة النقرة اليمنى
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
         * عرض القائمة السياقية
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
                    <div class="context-menu-item" data-action="remove">
                        <i class="fas fa-trash"></i> Remove Vertex
                    </div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="properties">
                        <i class="fas fa-cog"></i> Properties...
                    </div>
                `;
            } else if (grip.type === 'edge') {
                menu.innerHTML = `
                    <div class="context-menu-item" data-action="add-vertex">
                        <i class="fas fa-plus"></i> Add Vertex Here
                    </div>
                    <div class="context-menu-item" data-action="convert-arc">
                        <i class="fas fa-circle-notch"></i> Convert to Arc
                    </div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="divide">
                        <i class="fas fa-cut"></i> Divide Edge
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
         * تنفيذ إجراء من القائمة
         */
        executeGripAction(action, grip) {
            this.cad.recordState();
            
            switch (action) {
                case 'remove':
                    this.removeVertex(grip);
                    break;
                    
                case 'add-vertex':
                    this.addVertexAtEdge(grip, grip.point);
                    break;
                    
                case 'convert-arc':
                    this.convertEdgeToArc(grip);
                    break;
                    
                case 'divide':
                    this.divideEdge(grip);
                    break;
                    
                case 'properties':
                    this.showGripProperties(grip);
                    break;
            }
            
            this.cad.render();
        }
        
        /**
         * معالجة double-click
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
         * حذف vertex
         */
        removeVertex(grip) {
            const shape = grip.shape;
            
            if (shape.type === 'polyline') {
                if (shape.points.length <= 2) {
                    this.cad.updateStatus('Cannot remove vertex: minimum 2 points required');
                    return;
                }
                
                shape.points.splice(grip.index, 1);
                this.cad.updateStatus('Vertex removed');
            }
        }
        
        /**
         * تقسيم edge
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
                shape.points.splice(edgeGrip.endIndex, 0, ...newPoints);
            } else if (shape.type === 'line') {
                shape.type = 'polyline';
                shape.points = [p1, ...newPoints, p2];
                delete shape.start;
                delete shape.end;
            }
            
            this.cad.updateStatus(`Edge divided into ${count} segments`);
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
            
            if (this.cad.ui) {
                this.cad.ui.showGripPropertiesDialog(content, (result) => {
                    if (result && grip.type === 'vertex') {
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
         * إضافة ميزة snap
         */
        getSnappedPosition(point) {
            if (this.cad.snapEnabled) {
                return this.cad.getSnapPoint(point.x, point.y);
            }
            return point;
        }
        
        /**
         * رسم جميع grips
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
            
            // حساب زاوية الدوران
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