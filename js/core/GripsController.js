// ============================================
//  js/core/GripsController.js - النسخة المُصلحة بالكامل
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
            this.gripMode = 'vertex'; // 'vertex' أو 'stretch' أو 'arc'
            
            // إعدادات مرئية محسنة - مع زيادة الأحجام
            this.vertexGripSize = 12; // زيادة من 10 إلى 12
            this.edgeGripSize = 10;   // زيادة من 8 إلى 10
            this.hoverScale = 1.5;    // زيادة من 1.4 إلى 1.5
            this.cornerRadius = 2;
            this.showLabels = false;
            
            // إعدادات منطقة الكشف المحسنة
            this.screenDetectionThreshold = 20; // threshold ثابت في screen pixels
            this.detectionThreshold = 20;      // زيادة من 15 إلى 20
            this.precisionMode = false;
            
            // تتبع موقع الماوس في screen coordinates
            // إضافة خاصية dragOffset لحفظ الفرق بين موقع الماوس والنقطة
            this.dragOffset = { x: 0, y: 0 };
            this.lastMouseScreen = { x: 0, y: 0 };
            this.lastMouseWorld = { x: 0, y: 0 };
            
            // Debug mode
            this.debugMode = false;
            
            // ألوان محسنة
            this.colors = {
                vertex: {
                    normal: '#00d4aa',
                    hover: '#00ffcc',
                    active: '#ffffff',
                    radius: '#ff9999',
                    corner: '#4da6ff'
                },
                edge: {
                    normal: 'rgba(128, 128, 128, 0.6)',
                    hover: 'rgba(200, 200, 200, 0.8)',
                    active: '#00d4aa',
                    stretch: '#ffaa00',
                    arc: '#ff6600'
                }
            };
            
            // إعدادات القوس
            this.arcPreview = null;
            this.arcCenter = null;
            this.arcRadius = 0;
            
            // Cache محسن
            this.gripsCache = new Map();
            this.screenGripsCache = new Map();
            this.lastCacheUpdate = 0;
            this.cacheTimeout = 50; // تقليل من 100 إلى 50ms
        }
        
        /**
         * البحث عن grip في screen coordinates - دالة جديدة محسنة
         */
        findGripAtScreen(screenPoint, selectedShapes) {
            let nearestGrip = null;
            let minDist = this.screenDetectionThreshold;
            
            // Check cache first
            const cacheKey = `${screenPoint.x.toFixed(0)},${screenPoint.y.toFixed(0)}`;
            const now = Date.now();
            
            if (this.screenGripsCache.has(cacheKey) && (now - this.lastCacheUpdate) < this.cacheTimeout) {
                return this.screenGripsCache.get(cacheKey);
            }
            
            for (const shape of selectedShapes) {
                const grips = this.getShapeGrips(shape);
                
                // Check vertices
                for (const vertex of grips.vertices) {
                    const gripScreen = this.cad.worldToScreen(vertex.point.x, vertex.point.y);
                    const dist = Math.sqrt(
                        Math.pow(gripScreen.x - screenPoint.x, 2) +
                        Math.pow(gripScreen.y - screenPoint.y, 2)
                    );
                    
                    // Dynamic threshold based on grip type
                    const threshold = vertex.subtype === 'center' ? 
                        this.screenDetectionThreshold * 1.2 : 
                        this.screenDetectionThreshold;
                    
                    if (dist < threshold && dist < minDist) {
                        minDist = dist;
                        nearestGrip = vertex;
                    }
                }
                
                // Check edges with smaller threshold
                const edgeThreshold = this.screenDetectionThreshold * 0.8;
                for (const edge of grips.edges) {
                    const edgeScreen = this.cad.worldToScreen(edge.point.x, edge.point.y);
                    const dist = Math.sqrt(
                        Math.pow(edgeScreen.x - screenPoint.x, 2) +
                        Math.pow(edgeScreen.y - screenPoint.y, 2)
                    );
                    
                    if (dist < edgeThreshold && dist < minDist) {
                        minDist = dist;
                        nearestGrip = edge;
                    }
                }
            }
            
            // Update cache
            this.screenGripsCache.set(cacheKey, nearestGrip);
            this.lastCacheUpdate = now;
            
            return nearestGrip;
        }
        
        /**
         * البحث عن grip عند نقطة معينة - محدث ليستخدم screen coordinates
         */
        findGripAt(worldPoint, selectedShapes) {
            // تحويل world point إلى screen point
            const screenPoint = this.cad.worldToScreen(worldPoint.x, worldPoint.y);
            return this.findGripAtScreen(screenPoint, selectedShapes);
        }
        
        /**
         * تحديث hover state - محسن
         */
        updateHover(worldPoint, selectedShapes) {
            // استخدام screen coordinates للدقة
            const screenPoint = {
                x: this.cad.mouseX,
                y: this.cad.mouseY
            };
            
            const newHover = this.findGripAtScreen(screenPoint, selectedShapes);
            
            if (newHover !== this.hoveredGrip) {
                this.hoveredGrip = newHover;
                
                // Clear caches on hover change
                if (newHover || this.hoveredGrip) {
                    this.gripsCache.clear();
                    this.screenGripsCache.clear();
                }
                
                this.cad.render();
                
                // Update cursor with visual feedback
                if (newHover) {
                    this.cad.canvas.style.cursor = 'pointer';
                    this.showHoverFeedback(newHover);
                } else {
                    this.cad.canvas.style.cursor = 'default';
                    this.hideHoverFeedback();
                }
            }
        }
        
        /**
         * حساب المسافة بدقة عالية
         */
        calculateDistance(p1, p2) {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        /**
         * إظهار تأثير بصري عند الـ hover
         */
        showHoverFeedback(grip) {
            // يمكن إضافة tooltip أو تأثيرات إضافية
            if (this.showLabels && grip.label) {
                const screenPos = this.cad.worldToScreen(grip.point.x, grip.point.y);
                this.cad.ui?.showTooltip(screenPos, grip.label);
            }
        }
        
        /**
         * إخفاء تأثير الـ hover
         */
        hideHoverFeedback() {
            if (this.cad.ui?.hideTooltip) {
                this.cad.ui.hideTooltip();
            }
        }
        
        /**
         * بدء سحب grip - محسن
         */
        startDrag(grip, worldPoint) {
            this.draggedGrip = grip;
            
            // حفظ الموقع الأصلي للنقطة (وليس موقع الماوس)
            this.originalPosition = { ...grip.point };
            
            // حفظ الفرق بين موقع النقطة وموقع الماوس
            this.dragOffset = {
                x: grip.point.x - worldPoint.x,
                y: grip.point.y - worldPoint.y
            };
            
            // تسجيل الحالة للـ undo
            this.cad.recordState();
            
            // تحديد الوضع
            if (grip.type === 'vertex') {
                this.cad.updateStatus(`Dragging ${grip.label || 'vertex'}`);
                this.cad.canvas.style.cursor = 'move';
            } else {
                if (this.cad.keys && this.cad.keys.ctrl) {
                    this.gripMode = 'stretch';
                    this.cad.updateStatus('Stretching edge');
                } else {
                    this.gripMode = 'vertex';
                    this.cad.updateStatus('Click to add vertex');
                }
            }
            
            // مسح الـ cache
            this.gripsCache.clear();
            this.screenGripsCache.clear();
        }
        
        /**
         * تحديث موقع أثناء السحب - محسن مع استخدام dragOffset
         * هذا هو الإصلاح الأساسي للمشكلة
         */
        updateDrag(worldPoint) {
            if (!this.draggedGrip) return;
            
            // الإصلاح المهم: تطبيق dragOffset على موقع الماوس
            const adjustedPoint = {
                x: worldPoint.x + this.dragOffset.x,
                y: worldPoint.y + this.dragOffset.y
            };
            
            // تطبيق Snap على الموقع المُعدل
            const snappedPoint = this.getSnappedPosition(adjustedPoint);
            
            // تطبيق القيود مع Shift
            let constrainedPoint = this.applyConstraints(snappedPoint);
            
            if (this.draggedGrip.type === 'vertex') {
                this.updateVertexPosition(this.draggedGrip, constrainedPoint);
            } else if (this.draggedGrip.type === 'edge') {
                if (this.gripMode === 'stretch') {
                    this.previewEdgeStretch(this.draggedGrip, constrainedPoint);
                } else {
                    // استخدام النقطة المُعدلة للمعاينة أيضاً
                    this.previewNewVertex(this.draggedGrip, constrainedPoint);
                }
            }
            
            // عرض الإحداثيات الحالية
            this.showDragFeedback(constrainedPoint);
        }
        
        /**
         * معاينة إضافة vertex جديد - محدث
         */
        previewNewVertex(edgeGrip, mousePoint) {
            if (!edgeGrip || !mousePoint) return;
            
            const shape = edgeGrip.shape;
            
            // إنشاء معاينة للشكل مع النقطة الجديدة
            let preview = null;
            
            switch (shape.type) {
                case 'line':
                    // تحويل الخط إلى polyline مع النقطة الجديدة في موقع الماوس
                    preview = {
                        type: 'polyline',
                        points: [
                            edgeGrip.start,
                            mousePoint,  // استخدم موقع الماوس المُعدل
                            edgeGrip.end
                        ],
                        color: shape.color,
                        lineWidth: shape.lineWidth,
                        lineType: 'dashed'
                    };
                    break;
                    
                case 'polyline':
                case 'polygon':
                    // إضافة النقطة في الموقع الصحيح
                    const points = [...shape.points];
                    points.splice(edgeGrip.endIndex, 0, mousePoint);
                    
                    preview = {
                        type: shape.type,
                        points: points,
                        closed: shape.closed,
                        color: shape.color,
                        lineWidth: shape.lineWidth,
                        lineType: 'dashed'
                    };
                    break;
                    
                case 'rectangle':
                    // للمستطيل، نحوله إلى polygon مع النقطة الجديدة
                    const corners = this.getRectangleCorners(shape);
                    const newPoints = [...corners];
                    
                    // إدراج النقطة الجديدة في الموقع الصحيح
                    newPoints.splice(edgeGrip.endIndex, 0, mousePoint);
                    
                    preview = {
                        type: 'polygon',
                        points: newPoints,
                        closed: true,
                        color: shape.color,
                        lineWidth: shape.lineWidth,
                        lineType: 'dashed'
                    };
                    break;
            }
            
            // تعيين المعاينة
            if (preview) {
                this.cad.tempShape = preview;
            }
        }
        
        /**
         * الحصول على زوايا المستطيل
         */
        getRectangleCorners(shape) {
            const x1 = Math.min(shape.start.x, shape.end.x);
            const y1 = Math.min(shape.start.y, shape.end.y);
            const x2 = Math.max(shape.start.x, shape.end.x);
            const y2 = Math.max(shape.start.y, shape.end.y);
            
            return [
                { x: x1, y: y1 }, // Top Left
                { x: x2, y: y1 }, // Top Right
                { x: x2, y: y2 }, // Bottom Right
                { x: x1, y: y2 }  // Bottom Left
            ];
        }
        
        /**
         * إضافة vertex عند edge - محدث
         */
            
        addVertexAtEdge(edgeGrip, clickPoint) {
    if (!edgeGrip) return;
    
    const shape = edgeGrip.shape;
    this.cad.recordState();
    
    // استخدم النقطة المنقرة مباشرة بدلاً من نقطة منتصف الـ edge
    const newPoint = this.getSnappedPosition(clickPoint);
    
    switch (shape.type) {
        case 'line':
            // تحويل الخط إلى polyline
            shape.type = 'polyline';
            shape.points = [
                shape.start,
                newPoint,
                shape.end
            ];
            delete shape.start;
            delete shape.end;
            break;
            
        case 'rectangle':
            // حفظ الخصائص المهمة قبل التحويل
            const preservedProps = {
                filled: shape.filled,
                fillColor: shape.fillColor,
                color: shape.color,
                lineWidth: shape.lineWidth,
                lineType: shape.lineType,
                layerId: shape.layerId
            };
            
            // تحويل المستطيل إلى polygon
            const corners = this.getRectangleCorners(shape);
            const points = [...corners];
            
            // إدراج النقطة في الموقع الصحيح
            points.splice(edgeGrip.endIndex, 0, newPoint);
            
            shape.type = 'polygon';
            shape.points = points;
            shape.closed = true;
            
            // استعادة الخصائص المحفوظة
            Object.assign(shape, preservedProps);
            
            // حذف الخصائص القديمة للمستطيل
            delete shape.start;
            delete shape.end;
            delete shape.x;
            delete shape.y;
            delete shape.width;
            delete shape.height;
            break;
            
        case 'polyline':
        case 'polygon':
            // إدراج النقطة في المكان الصحيح
            shape.points.splice(edgeGrip.endIndex, 0, newPoint);
            break;
    }
    
    this.cad.updateStatus('Vertex added');
    this.cad.render();
}
        
        /**
         * تطبيق القيود على الحركة
         */
        applyConstraints(point) {
            if (!this.cad.keys || !this.cad.keys.shift || !this.originalPosition) {
                return point;
            }
            
            const dx = Math.abs(point.x - this.originalPosition.x);
            const dy = Math.abs(point.y - this.originalPosition.y);
            
            // قيد أفقي/رأسي
            if (dx > dy) {
                return {
                    x: point.x,
                    y: this.originalPosition.y
                };
            } else {
                return {
                    x: this.originalPosition.x,
                    y: point.y
                };
            }
        }
        
        /**
         * عرض معلومات السحب
         */
        showDragFeedback(point) {
            if (this.originalPosition) {
                const dx = point.x - this.originalPosition.x;
                const dy = point.y - this.originalPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                
                this.cad.updateStatus(
                    `Distance: ${distance.toFixed(2)}, Angle: ${angle.toFixed(1)}°`
                );
            }
        }
        
        /**
         * إنهاء السحب
         */
        endDrag(point) {
            if (!this.draggedGrip) return;
            
            if (this.draggedGrip.type === 'edge') {
                if (this.gripMode === 'stretch') {
                    // تطبيق stretch
                    this.applyEdgeStretch(this.draggedGrip, point);
                } else {
                    // إضافة vertex جديد في موقع السحب
                    // تطبيق dragOffset هنا أيضاً
                    const adjustedPoint = {
                        x: point.x + this.dragOffset.x,
                        y: point.y + this.dragOffset.y
                    };
                    this.addVertexAtEdge(this.draggedGrip, adjustedPoint);
                }
            }
            
            this.draggedGrip = null;
            this.originalPosition = null;
            this.dragOffset = { x: 0, y: 0 };
            this.cad.tempShape = null;
            this.gripMode = 'vertex';
            this.cad.updateStatus('READY');
        }
        
        /**
         * رسم vertex grip محسن مع منطقة كشف أكبر
         */
        drawVertexGrip(grip) {
            const ctx = this.cad.ctx;
            const isHovered = grip === this.hoveredGrip;
            const isDragged = grip === this.draggedGrip;
            
            // حساب الحجم مع تأثير الـ hover
            const scale = isHovered || isDragged ? this.hoverScale : 1;
            const size = (this.vertexGripSize * scale) / this.cad.zoom;
            
            ctx.save();
            
            // رسم منطقة الكشف الشفافة (للـ hover)
            if (isHovered && !isDragged) {
                ctx.fillStyle = 'rgba(0, 212, 170, 0.1)';
                ctx.beginPath();
                ctx.arc(grip.point.x, grip.point.y, (this.screenDetectionThreshold / this.cad.zoom), 0, Math.PI * 2);
                ctx.fill();
            }
            
            // تحديد الألوان
            let fillColor, strokeColor;
            
            if (isDragged) {
                fillColor = this.colors.vertex.active;
                strokeColor = this.colors.vertex.hover;
                ctx.shadowColor = this.colors.vertex.hover;
                ctx.shadowBlur = 15 / this.cad.zoom;
            } else if (isHovered) {
                fillColor = this.colors.vertex.hover;
                strokeColor = this.colors.vertex.active;
                ctx.shadowColor = this.colors.vertex.hover;
                ctx.shadowBlur = 10 / this.cad.zoom;
            } else {
                // ألوان مختلفة حسب النوع
                switch (grip.subtype) {
                    case 'center':
                        fillColor = '#4da6ff';
                        break;
                    case 'radius':
                        fillColor = '#ff9999';
                        break;
                    case 'curve':
                        fillColor = '#ffaa00';
                        break;
                    default:
                        fillColor = this.colors.vertex.normal;
                }
                strokeColor = this.colors.vertex.active;
            }
            
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2 / this.cad.zoom;
            
            // رسم الشكل المناسب
            if (grip.subtype === 'corner' || grip.subtype === 'endpoint') {
                // مربع للزوايا والنهايات
                const halfSize = size / 2;
                const x = grip.point.x - halfSize;
                const y = grip.point.y - halfSize;
                
                // رسم مربع مع زوايا مدورة
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, size, size, this.cornerRadius / this.cad.zoom);
                } else {
                    // Fallback for browsers without roundRect
                    ctx.rect(x, y, size, size);
                }
                ctx.fill();
                ctx.stroke();
            } else {
                // دائرة للأنواع الأخرى
                ctx.beginPath();
                ctx.arc(grip.point.x, grip.point.y, size/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            
            // إضافة رمز داخلي للأنواع الخاصة
            if (isHovered || isDragged) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1.5 / this.cad.zoom;
                
                switch (grip.subtype) {
                    case 'center':
                        // رسم علامة +
                        const crossSize = size / 4;
                        ctx.beginPath();
                        ctx.moveTo(grip.point.x - crossSize, grip.point.y);
                        ctx.lineTo(grip.point.x + crossSize, grip.point.y);
                        ctx.moveTo(grip.point.x, grip.point.y - crossSize);
                        ctx.lineTo(grip.point.x, grip.point.y + crossSize);
                        ctx.stroke();
                        break;
                }
            }
            
            // Debug mode - رسم منطقة الكشف
            if (this.debugMode) {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.lineWidth = 1 / this.cad.zoom;
                ctx.setLineDash([5 / this.cad.zoom, 5 / this.cad.zoom]);
                ctx.beginPath();
                ctx.arc(grip.point.x, grip.point.y, this.screenDetectionThreshold / this.cad.zoom, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            
            ctx.restore();
        }
        
        /**
         * رسم edge grip محسن
         */
        drawEdgeGrip(grip) {
            const ctx = this.cad.ctx;
            const isHovered = grip === this.hoveredGrip;
            const isDragged = grip === this.draggedGrip;
            
            // حساب الحجم
            const scale = isHovered || isDragged ? this.hoverScale : 1;
            const size = (this.edgeGripSize * scale) / this.cad.zoom;
            
            ctx.save();
            
            // رسم منطقة الكشف للـ hover
            if (isHovered && !isDragged) {
                ctx.fillStyle = 'rgba(0, 212, 170, 0.05)';
                ctx.beginPath();
                ctx.arc(grip.point.x, grip.point.y, (this.screenDetectionThreshold * 0.8) / this.cad.zoom, 0, Math.PI * 2);
                ctx.fill();
            }
            
            let fillColor, strokeColor;
            
            if (isDragged) {
                fillColor = this.colors.edge.active;
                strokeColor = this.colors.vertex.active;
            } else if (isHovered) {
                fillColor = this.colors.edge.hover;
                strokeColor = this.colors.edge.active;
            } else {
                fillColor = this.colors.edge.normal;
                strokeColor = 'transparent';
            }
            
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1 / this.cad.zoom;
            
            // رسم دائرة صغيرة
            ctx.beginPath();
            ctx.arc(grip.point.x, grip.point.y, size/2, 0, Math.PI * 2);
            ctx.fill();
            if (strokeColor !== 'transparent') {
                ctx.stroke();
            }
            
            // إضافة رمز + عند hover
            if (isHovered) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2 / this.cad.zoom;
                const plusSize = size / 3;
                
                ctx.beginPath();
                ctx.moveTo(grip.point.x - plusSize, grip.point.y);
                ctx.lineTo(grip.point.x + plusSize, grip.point.y);
                ctx.moveTo(grip.point.x, grip.point.y - plusSize);
                ctx.lineTo(grip.point.x, grip.point.y + plusSize);
                ctx.stroke();
                
                // إضافة توهج
                ctx.shadowColor = this.colors.edge.active;
                ctx.shadowBlur = 8 / this.cad.zoom;
                ctx.stroke();
            }
            
            ctx.restore();
        }
        
        /**
         * Toggle debug mode
         */
        toggleDebugMode() {
            this.debugMode = !this.debugMode;
            this.cad.render();
            console.log('Grips Debug Mode:', this.debugMode ? 'ON' : 'OFF');
        }
        
        /**
         * رسم معلومات debug
         */
        drawDebugInfo() {
            if (!this.debugMode) return;
            
            const ctx = this.cad.ctx;
            ctx.save();
            
            // رسم دوائر detection حول كل grip
            for (const shape of this.cad.selectedShapes) {
                const grips = this.getShapeGrips(shape);
                
                for (const vertex of grips.vertices) {
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.lineWidth = 1 / this.cad.zoom;
                    ctx.setLineDash([5 / this.cad.zoom, 5 / this.cad.zoom]);
                    ctx.beginPath();
                    ctx.arc(vertex.point.x, vertex.point.y, this.screenDetectionThreshold / this.cad.zoom, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                for (const edge of grips.edges) {
                    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
                    ctx.lineWidth = 1 / this.cad.zoom;
                    ctx.setLineDash([3 / this.cad.zoom, 3 / this.cad.zoom]);
                    ctx.beginPath();
                    ctx.arc(edge.point.x, edge.point.y, (this.screenDetectionThreshold * 0.8) / this.cad.zoom, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            
            ctx.setLineDash([]);
            ctx.restore();
        }
        
        // ==================== باقي الدوال الأصلية ====================
        
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
         * الحصول على vertex grips - محدث حسب المواصفات الجديدة
         */
        getVertexGrips(shape) {
            switch (shape.type) {
                case 'line':
                    // خط مستقيم: 2 نقطة (البداية والنهاية)
                    return [
                        { 
                            type: 'vertex',
                            subtype: 'endpoint',
                            point: shape.start, 
                            index: 0, 
                            id: 'start',
                            shape: shape,
                            label: 'Start Point'
                        },
                        { 
                            type: 'vertex',
                            subtype: 'endpoint',
                            point: shape.end, 
                            index: 1, 
                            id: 'end',
                            shape: shape,
                            label: 'End Point'
                        }
                    ];
                    
                case 'rectangle':
                    // مربع/مستطيل: 4 نقاط عند كل زاوية
                    return this.getRectangleVertices(shape);
                    
                case 'polygon':
                case 'polyline':
                    // مضلع: حسب عدد الأضلاع (عند كل زاوية)
                    return shape.points.map((p, i) => ({
                        type: 'vertex',
                        subtype: 'corner',
                        point: p,
                        index: i,
                        id: `vertex${i}`,
                        shape: shape,
                        label: `Vertex ${i + 1}`
                    }));
                    
                case 'circle':
                    // دائرة: 1 مركز + 4 نقاط محيطية
                    const circleGrips = [];
                    
                    // نقطة المركز
                    circleGrips.push({
                        type: 'vertex',
                        subtype: 'center',
                        point: shape.center,
                        id: 'center',
                        shape: shape,
                        label: 'Center',
                        movable: true // يمكن تحريك المركز
                    });
                    
                    // 4 نقاط محيطية عند 0°, 90°, 180°, 270°
                    const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
                    const labels = ['East', 'North', 'West', 'South'];
                    
                    angles.forEach((angle, i) => {
                        circleGrips.push({
                            type: 'vertex',
                            subtype: 'radius',
                            point: {
                                x: shape.center.x + shape.radius * Math.cos(angle),
                                y: shape.center.y + shape.radius * Math.sin(angle)
                            },
                            id: `radius${i}`,
                            shape: shape,
                            angle: angle,
                            label: labels[i] + ' Radius',
                            radiusControl: true
                        });
                    });
                    
                    return circleGrips;
                    
                case 'ellipse':
                    // قطع ناقص: 1 مركز + 4 نقاط محاور
                    const ellipseGrips = [];
                    
                    // نقطة المركز
                    ellipseGrips.push({
                        type: 'vertex',
                        subtype: 'center',
                        point: shape.center,
                        id: 'center',
                        shape: shape,
                        label: 'Center',
                        movable: true
                    });
                    
                    // نقاط نهايات المحاور
                    ellipseGrips.push(
                        {
                            type: 'vertex',
                            subtype: 'radius',
                            point: {
                                x: shape.center.x + shape.radiusX,
                                y: shape.center.y
                            },
                            id: 'rx_positive',
                            shape: shape,
                            label: 'Horizontal Radius +',
                            axis: 'x',
                            direction: 'positive'
                        },
                        {
                            type: 'vertex',
                            subtype: 'radius',
                            point: {
                                x: shape.center.x - shape.radiusX,
                                y: shape.center.y
                            },
                            id: 'rx_negative',
                            shape: shape,
                            label: 'Horizontal Radius -',
                            axis: 'x',
                            direction: 'negative'
                        },
                        {
                            type: 'vertex',
                            subtype: 'radius',
                            point: {
                                x: shape.center.x,
                                y: shape.center.y + shape.radiusY
                            },
                            id: 'ry_positive',
                            shape: shape,
                            label: 'Vertical Radius +',
                            axis: 'y',
                            direction: 'positive'
                        },
                        {
                            type: 'vertex',
                            subtype: 'radius',
                            point: {
                                x: shape.center.x,
                                y: shape.center.y - shape.radiusY
                            },
                            id: 'ry_negative',
                            shape: shape,
                            label: 'Vertical Radius -',
                            axis: 'y',
                            direction: 'negative'
                        }
                    );
                    
                    return ellipseGrips;
                    
                case 'arc':
                    // قوس: 3 نقاط (بداية + نهاية + نقطة انحناء)
                    const startPoint = {
                        x: shape.center.x + shape.radius * Math.cos(shape.startAngle),
                        y: shape.center.y + shape.radius * Math.sin(shape.startAngle)
                    };
                    const endPoint = {
                        x: shape.center.x + shape.radius * Math.cos(shape.endAngle),
                        y: shape.center.y + shape.radius * Math.sin(shape.endAngle)
                    };
                    
                    // نقطة الانحناء في منتصف القوس
                    const midAngle = (shape.startAngle + shape.endAngle) / 2;
                    // معالجة الحالة عندما يكون القوس أكبر من 180 درجة
                    let adjustedMidAngle = midAngle;
                    if (Math.abs(shape.endAngle - shape.startAngle) > Math.PI) {
                        adjustedMidAngle = midAngle + Math.PI;
                    }
                    
                    const curvePoint = {
                        x: shape.center.x + shape.radius * Math.cos(adjustedMidAngle),
                        y: shape.center.y + shape.radius * Math.sin(adjustedMidAngle)
                    };
                    
                    return [
                        {
                            type: 'vertex',
                            subtype: 'endpoint',
                            point: startPoint,
                            id: 'start',
                            shape: shape,
                            label: 'Start Point',
                            angleControl: true
                        },
                        {
                            type: 'vertex',
                            subtype: 'endpoint',
                            point: endPoint,
                            id: 'end',
                            shape: shape,
                            label: 'End Point',
                            angleControl: true
                        },
                        {
                            type: 'vertex',
                            subtype: 'curve',
                            point: curvePoint,
                            id: 'curve',
                            shape: shape,
                            label: 'Curve Control',
                            radiusControl: true
                        }
                    ];
                    
                default:
                    return [];
            }
        }
        
        /**
         * الحصول على edge grips - محدث للمقابض بين الرؤوس
         */
        getEdgeGrips(shape) {
            const edges = [];
            
            switch (shape.type) {
                case 'line':
                    // خط واحد = مقبض واحد في المنتصف
                    edges.push({
                        type: 'edge',
                        subtype: 'midpoint',
                        point: {
                            x: (shape.start.x + shape.end.x) / 2,
                            y: (shape.start.y + shape.end.y) / 2
                        },
                        startIndex: 0,
                        endIndex: 1,
                        start: shape.start,
                        end: shape.end,
                        id: 'edge0',
                        shape: shape,
                        label: 'Midpoint',
                        canConvertToArc: true // يمكن تحويله لقوس
                    });
                    break;
                    
                case 'rectangle':
                    // 4 أضلاع = 4 مقابض منتصف
                    const vertices = this.getRectangleVertices(shape);
                    const edgeLabels = ['Top', 'Right', 'Bottom', 'Left'];
                    
                    for (let i = 0; i < 4; i++) {
                        const v1 = vertices[i];
                        const v2 = vertices[(i + 1) % 4];
                        edges.push({
                            type: 'edge',
                            subtype: 'midpoint',
                            point: {
                                x: (v1.point.x + v2.point.x) / 2,
                                y: (v1.point.y + v2.point.y) / 2
                            },
                            startIndex: i,
                            endIndex: (i + 1) % 4,
                            start: v1.point,
                            end: v2.point,
                            id: `edge${i}`,
                            shape: shape,
                            label: edgeLabels[i] + ' Edge',
                            canConvertToArc: false // المستطيل لا يحول أضلاعه لأقواس
                        });
                    }
                    break;
                    
                case 'polygon':
                case 'polyline':
                    // مقبض لكل ضلع
                    const len = shape.closed ? shape.points.length : shape.points.length - 1;
                    for (let i = 0; i < len; i++) {
                        const p1 = shape.points[i];
                        const p2 = shape.points[(i + 1) % shape.points.length];
                        edges.push({
                            type: 'edge',
                            subtype: 'midpoint',
                            point: {
                                x: (p1.x + p2.x) / 2,
                                y: (p1.y + p2.y) / 2
                            },
                            startIndex: i,
                            endIndex: (i + 1) % shape.points.length,
                            start: p1,
                            end: p2,
                            id: `edge${i}`,
                            shape: shape,
                            label: `Edge ${i + 1}`,
                            canConvertToArc: true
                        });
                    }
                    break;
                    
                case 'circle':
                    // الدائرة لا تحتاج edge grips
                    break;
                    
                case 'ellipse':
                    // القطع الناقص لا يحتاج edge grips
                    break;
                    
                case 'arc':
                    // القوس لا يحتاج edge grips إضافية
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
                    shape: shape,
                    label: 'Top Left'
                },
                { 
                    type: 'vertex',
                    subtype: 'corner',
                    point: {x: x2, y: y1}, 
                    index: 1,
                    id: 'tr',
                    shape: shape,
                    label: 'Top Right'
                },
                { 
                    type: 'vertex',
                    subtype: 'corner',
                    point: {x: x2, y: y2}, 
                    index: 2,
                    id: 'br',
                    shape: shape,
                    label: 'Bottom Right'
                },
                { 
                    type: 'vertex',
                    subtype: 'corner',
                    point: {x: x1, y: y2}, 
                    index: 3,
                    id: 'bl',
                    shape: shape,
                    label: 'Bottom Left'
                }
            ];
        }
        
        /**
         * تحديث موقع vertex محسن
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
                case 'polygon':
                    shape.points[grip.index] = { ...newPosition };
                    break;
                    
                case 'circle':
                    if (grip.subtype === 'center') {
                        // تحريك مركز الدائرة
                        shape.center = { ...newPosition };
                    } else if (grip.subtype === 'radius') {
                        // تغيير نصف القطر
                        shape.radius = this.cad.distance(
                            shape.center.x, shape.center.y,
                            newPosition.x, newPosition.y
                        );
                    }
                    break;
                    
                case 'ellipse':
                    if (grip.subtype === 'center') {
                        // تحريك مركز القطع الناقص
                        shape.center = { ...newPosition };
                    } else if (grip.subtype === 'radius') {
                        // تغيير نصف القطر حسب المحور
                        if (grip.axis === 'x') {
                            shape.radiusX = Math.abs(newPosition.x - shape.center.x);
                        } else if (grip.axis === 'y') {
                            shape.radiusY = Math.abs(newPosition.y - shape.center.y);
                        }
                    }
                    break;
                    
                case 'arc':
                    if (grip.id === 'curve') {
                        // تحديث نصف القطر من نقطة الانحناء
                        shape.radius = this.cad.distance(
                            shape.center.x, shape.center.y,
                            newPosition.x, newPosition.y
                        );
                    } else if (grip.subtype === 'endpoint') {
                        // تحديث زوايا البداية/النهاية
                        const angle = Math.atan2(
                            newPosition.y - shape.center.y,
                            newPosition.x - shape.center.x
                        );
                        
                        if (grip.id === 'start') {
                            shape.startAngle = angle;
                        } else {
                            shape.endAngle = angle;
                        }
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
         * معاينة stretch للحافة
         */
        previewEdgeStretch(edgeGrip, position) {
            const shape = edgeGrip.shape;
            const preview = this.cad.cloneShape(shape);
            
            // حساب الإزاحة
            const dx = position.x - edgeGrip.point.x;
            const dy = position.y - edgeGrip.point.y;
            
            switch (shape.type) {
                case 'line':
                    preview.start = { 
                        x: shape.start.x + dx, 
                        y: shape.start.y + dy 
                    };
                    preview.end = { 
                        x: shape.end.x + dx, 
                        y: shape.end.y + dy 
                    };
                    break;
                    
                case 'polyline':
                case 'polygon':
                    // تحريك النقطتين المتصلتين بالحافة
                    preview.points[edgeGrip.startIndex] = {
                        x: shape.points[edgeGrip.startIndex].x + dx,
                        y: shape.points[edgeGrip.startIndex].y + dy
                    };
                    preview.points[edgeGrip.endIndex] = {
                        x: shape.points[edgeGrip.endIndex].x + dx,
                        y: shape.points[edgeGrip.endIndex].y + dy
                    };
                    break;
                    
                case 'rectangle':
                    // stretch جانب من المستطيل
                    const vertices = this.getRectangleVertices(shape);
                    const v1 = vertices[edgeGrip.startIndex];
                    const v2 = vertices[edgeGrip.endIndex];
                    
                    // تحديد الاتجاه (أفقي أو رأسي)
                    if (Math.abs(v1.point.x - v2.point.x) < 0.01) {
                        // حافة رأسية
                        if (v1.point.x < shape.center.x) {
                            preview.start.x += dx;
                        } else {
                            preview.end.x += dx;
                        }
                    } else {
                        // حافة أفقية
                        if (v1.point.y < shape.center.y) {
                            preview.start.y += dy;
                        } else {
                            preview.end.y += dy;
                        }
                    }
                    break;
            }
            
            preview.color = this.colors.edge.stretch;
            preview.lineType = 'dashed';
            
            this.cad.tempShape = preview;
            this.cad.render();
        }
        
        /**
         * تطبيق stretch على الحافة
         */
        applyEdgeStretch(edgeGrip, position) {
            const shape = edgeGrip.shape;
            
            // حساب الإزاحة
            const dx = position.x - edgeGrip.point.x;
            const dy = position.y - edgeGrip.point.y;
            
            switch (shape.type) {
                case 'line':
                    shape.start.x += dx;
                    shape.start.y += dy;
                    shape.end.x += dx;
                    shape.end.y += dy;
                    break;
                    
                case 'polyline':
                case 'polygon':
                    shape.points[edgeGrip.startIndex].x += dx;
                    shape.points[edgeGrip.startIndex].y += dy;
                    shape.points[edgeGrip.endIndex].x += dx;
                    shape.points[edgeGrip.endIndex].y += dy;
                    break;
                    
                case 'rectangle':
                    const vertices = this.getRectangleVertices(shape);
                    const v1 = vertices[edgeGrip.startIndex];
                    const v2 = vertices[edgeGrip.endIndex];
                    
                    if (Math.abs(v1.point.x - v2.point.x) < 0.01) {
                        // حافة رأسية
                        if (v1.point.x < shape.center.x) {
                            shape.start.x += dx;
                        } else {
                            shape.end.x += dx;
                        }
                    } else {
                        // حافة أفقية
                        if (v1.point.y < shape.center.y) {
                            shape.start.y += dy;
                        } else {
                            shape.end.y += dy;
                        }
                    }
                    break;
            }
            
            this.cad.render();
        }
        
        /**
         * تحويل edge إلى قوس محسن
         */
        convertEdgeToArc(edgeGrip) {
            const shape = edgeGrip.shape;
            
            // حساب نقطة المنتصف والمعلومات الأساسية
            const p1 = edgeGrip.start;
            const p2 = edgeGrip.end;
            const midPoint = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2
            };
            
            // حساب المسافة بين النقطتين
            const distance = this.cad.distance(p1.x, p1.y, p2.x, p2.y);
            
            // حساب الزاوية
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            
            // حساب نقطة ثالثة للقوس (عمودي على الخط)
            const perpAngle = angle + Math.PI / 2;
            const arcHeight = distance / 4; // ارتفاع القوس الافتراضي
            
            const arcPoint = {
                x: midPoint.x + Math.cos(perpAngle) * arcHeight,
                y: midPoint.y + Math.sin(perpAngle) * arcHeight
            };
            
            // حساب مركز ونصف قطر القوس من ثلاث نقاط
            const arcData = this.calculateArcFromThreePoints(p1, arcPoint, p2);
            
            if (arcData) {
                // إنشاء شكل قوس جديد
                const newArc = {
                    id: this.cad.generateId(),
                    type: 'arc',
                    center: arcData.center,
                    radius: arcData.radius,
                    startAngle: arcData.startAngle,
                    endAngle: arcData.endAngle,
                    color: shape.color || this.cad.currentColor,
                    lineWidth: shape.lineWidth || this.cad.currentLineWidth,
                    lineType: shape.lineType || this.cad.currentLineType,
                    layerId: shape.layerId || this.cad.currentLayerId
                };
                
                // استبدال الشكل القديم بالقوس الجديد
                if (shape.type === 'line') {
                    const index = this.cad.shapes.indexOf(shape);
                    if (index > -1) {
                        this.cad.shapes[index] = newArc;
                        
                        // تحديث التحديد
                        if (this.cad.selectedShapes.has(shape)) {
                            this.cad.selectedShapes.delete(shape);
                            this.cad.selectedShapes.add(newArc);
                        }
                    }
                } else if (shape.type === 'polyline' || shape.type === 'polygon') {
                    // تحويل segment من polyline إلى قوس
                    this.convertPolylineSegmentToArc(shape, edgeGrip, arcData);
                }
                
                this.cad.recordState();
                this.cad.updateStatus('Edge converted to arc');
                this.cad.render();
            }
        }
        
        /**
         * حساب القوس من ثلاث نقاط
         */
        calculateArcFromThreePoints(p1, p2, p3) {
            // حساب مركز الدائرة المارة بثلاث نقاط
            const ax = p1.x, ay = p1.y;
            const bx = p2.x, by = p2.y;
            const cx = p3.x, cy = p3.y;
            
            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
            
            if (Math.abs(d) < 1e-10) {
                // النقاط على خط مستقيم
                return null;
            }
            
            const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
            const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
            
            const center = { x: ux, y: uy };
            const radius = this.cad.distance(center.x, center.y, ax, ay);
            
            // حساب الزوايا
            let startAngle = Math.atan2(ay - center.y, ax - center.x);
            let midAngle = Math.atan2(by - center.y, bx - center.x);
            let endAngle = Math.atan2(cy - center.y, cx - center.x);
            
            // التأكد من أن القوس يمر عبر النقطة الوسطى
            if (!this.isAngleBetween(midAngle, startAngle, endAngle)) {
                // عكس الاتجاه
                [startAngle, endAngle] = [endAngle, startAngle];
            }
            
            return {
                center,
                radius,
                startAngle,
                endAngle
            };
        }
        
        /**
         * فحص إذا كانت زاوية بين زاويتين
         */
        isAngleBetween(angle, start, end) {
            // تطبيع الزوايا إلى [0, 2π]
            const normalize = (a) => {
                while (a < 0) a += 2 * Math.PI;
                while (a >= 2 * Math.PI) a -= 2 * Math.PI;
                return a;
            };
            
            angle = normalize(angle);
            start = normalize(start);
            end = normalize(end);
            
            if (start <= end) {
                return angle >= start && angle <= end;
            } else {
                return angle >= start || angle <= end;
            }
        }
        
        /**
         * تحويل segment من polyline إلى قوس
         */
        convertPolylineSegmentToArc(polyline, edgeGrip, arcData) {
            // إنشاء polyline جديد مع قوس
            const newPoints = [];
            const arcSegment = {
                type: 'arc',
                center: arcData.center,
                radius: arcData.radius,
                startAngle: arcData.startAngle,
                endAngle: arcData.endAngle
            };
            
            for (let i = 0; i < polyline.points.length; i++) {
                if (i === edgeGrip.startIndex) {
                    newPoints.push(polyline.points[i]);
                    newPoints.push(arcSegment); // إضافة القوس
                } else if (i !== edgeGrip.endIndex) {
                    newPoints.push(polyline.points[i]);
                }
            }
            
            // تحديث polyline ليدعم الأقواس
            polyline.segments = newPoints;
            polyline.type = 'complex-polyline'; // نوع جديد يدعم الأقواس
        }
        
        /**
         * حساب قوس من 3 نقاط (النسخة الأصلية للتوافق)
         */
        calculateArcFrom3Points(p1, p2, p3) {
            return this.calculateArcFromThreePoints(p1, p2, p3);
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
         * عرض القائمة السياقية - محدث
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
                // قائمة للرؤوس
                let menuItems = '';
                
                // خيارات عامة للرؤوس
                menuItems += `
                    <div class="context-menu-item" data-action="properties">
                        <i class="fas fa-cog"></i> Properties
                    </div>
                `;
                
                // خيارات خاصة حسب نوع الرأس
                if (grip.subtype === 'endpoint' || grip.subtype === 'corner') {
                    menuItems += `
                        <div class="context-menu-item" data-action="lock-position">
                            <i class="fas fa-lock"></i> Lock Position
                        </div>
                    `;
                }
                
                if (grip.shape.type === 'polyline' && grip.shape.points.length > 2) {
                    menuItems += `
                        <div class="context-menu-item" data-action="remove">
                            <i class="fas fa-trash"></i> Remove Vertex
                        </div>
                    `;
                }
                
                if (grip.subtype === 'corner') {
                    menuItems += `
                        <div class="context-menu-separator"></div>
                        <div class="context-menu-item" data-action="convert-to-curve">
                            <i class="fas fa-bezier-curve"></i> Convert to Curve
                        </div>
                    `;
                }
                
                menu.innerHTML = menuItems;
                
            } else if (grip.type === 'edge') {
                // قائمة للحواف
                menu.innerHTML = `
                    <div class="context-menu-item" data-action="add-vertex">
                        <i class="fas fa-plus"></i> Add Vertex Here
                    </div>
                    ${grip.canConvertToArc ? `
                    <div class="context-menu-item" data-action="convert-arc">
                        <i class="fas fa-circle-notch"></i> Convert to Arc
                    </div>
                    ` : ''}
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item" data-action="edge-properties">
                        <i class="fas fa-ruler"></i> Edge Properties
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
                    
                case 'stretch':
                    // تفعيل وضع stretch
                    this.gripMode = 'stretch';
                    this.startDrag(grip, grip.point);
                    break;
                    
                case 'divide':
                    this.divideEdge(grip);
                    break;
                    
                case 'properties':
                    this.showVertexPropertiesDialog(grip);
                    break;
                    
                case 'edge-properties':
                    this.showEdgeProperties(grip);
                    break;
                    
                case 'lock-position':
                    this.toggleVertexLock(grip);
                    break;
                    
                case 'convert-to-curve':
                    this.convertToCurve(grip);
                    break;
            }
            
            this.cad.render();
        }
        
        /**
         * معالجة double-click محسن للأنواع الجديدة
         */
        handleDoubleClick(point) {
            const grip = this.findGripAt(point, this.cad.selectedShapes);
            
            if (grip) {
                if (grip.type === 'edge') {
                    // Double-click على edge
                    if (grip.canConvertToArc) {
                        // تحويل مباشر لقوس
                        this.convertEdgeToArc(grip);
                    } else {
                        // إضافة vertex
                        this.addVertexAtEdge(grip, point);
                    }
                    return true;
                } else if (grip.type === 'vertex') {
                    // Double-click على vertex - فتح خصائص متقدمة
                    this.showVertexPropertiesDialog(grip);
                    return true;
                }
            }
            
            return false;
        }
        
        /**
         * dialog خصائص Vertex محسن
         */
        showVertexPropertiesDialog(grip) {
            let content = '';
            const shape = grip.shape;
            
            // العنوان
            content += `<h3>${grip.label || 'Vertex'} Properties</h3>`;
            
            // الموقع
            content += `
                <div class="property-section">
                    <h4>Position</h4>
                    <div class="property-row">
                        <label>X:</label>
                        <input type="number" id="grip-x" value="${grip.point.x.toFixed(2)}" step="0.1" />
                    </div>
                    <div class="property-row">
                        <label>Y:</label>
                        <input type="number" id="grip-y" value="${grip.point.y.toFixed(2)}" step="0.1" />
                    </div>
                </div>
            `;
            
            // خصائص خاصة حسب النوع
            if (grip.subtype === 'radius' && shape.type === 'circle') {
                content += `
                    <div class="property-section">
                        <h4>Circle Properties</h4>
                        <div class="property-row">
                            <label>Radius:</label>
                            <input type="number" id="grip-radius" value="${shape.radius.toFixed(2)}" step="0.1" />
                        </div>
                    </div>
                `;
            } else if (grip.subtype === 'radius' && shape.type === 'ellipse') {
                content += `
                    <div class="property-section">
                        <h4>Ellipse Properties</h4>
                        <div class="property-row">
                            <label>Radius X:</label>
                            <input type="number" id="grip-rx" value="${shape.radiusX.toFixed(2)}" step="0.1" />
                        </div>
                        <div class="property-row">
                            <label>Radius Y:</label>
                            <input type="number" id="grip-ry" value="${shape.radiusY.toFixed(2)}" step="0.1" />
                        </div>
                    </div>
                `;
            } else if (grip.subtype === 'curve' && shape.type === 'arc') {
                content += `
                    <div class="property-section">
                        <h4>Arc Properties</h4>
                        <div class="property-row">
                            <label>Radius:</label>
                            <input type="number" id="grip-arc-radius" value="${shape.radius.toFixed(2)}" step="0.1" />
                        </div>
                        <div class="property-row">
                            <label>Start Angle:</label>
                            <input type="number" id="grip-start-angle" value="${(shape.startAngle * 180 / Math.PI).toFixed(2)}" step="1" />°
                        </div>
                        <div class="property-row">
                            <label>End Angle:</label>
                            <input type="number" id="grip-end-angle" value="${(shape.endAngle * 180 / Math.PI).toFixed(2)}" step="1" />°
                        </div>
                    </div>
                `;
            }
            
            // قيود
            content += `
                <div class="property-section">
                    <h4>Constraints</h4>
                    <div class="property-row">
                        <label>
                            <input type="checkbox" id="grip-lock-x" ${grip.lockX ? 'checked' : ''} />
                            Lock X
                        </label>
                    </div>
                    <div class="property-row">
                        <label>
                            <input type="checkbox" id="grip-lock-y" ${grip.lockY ? 'checked' : ''} />
                            Lock Y
                        </label>
                    </div>
                </div>
            `;
            
            // النوع (للأشكال التي تدعم التحويل)
            if (grip.subtype === 'corner') {
                content += `
                    <div class="property-section">
                        <h4>Type</h4>
                        <div class="property-row">
                            <label>Vertex Type:</label>
                            <select id="grip-type">
                                <option value="sharp" ${grip.vertexType === 'sharp' ? 'selected' : ''}>Sharp Corner</option>
                                <option value="smooth" ${grip.vertexType === 'smooth' ? 'selected' : ''}>Smooth Curve</option>
                                <option value="bezier" ${grip.vertexType === 'bezier' ? 'selected' : ''}>Bezier Curve</option>
                            </select>
                        </div>
                    </div>
                `;
            }
            
            if (this.cad.ui) {
                this.cad.ui.showGripPropertiesDialog(content, (result) => {
                    if (result) {
                        this.applyVertexProperties(grip);
                    }
                });
            }
        }
        
        /**
         * تطبيق خصائص vertex من dialog
         */
        applyVertexProperties(grip) {
            const shape = grip.shape;
            
            // تحديث الموقع
            const newX = parseFloat(document.getElementById('grip-x').value);
            const newY = parseFloat(document.getElementById('grip-y').value);
            
            if (!isNaN(newX) && !isNaN(newY)) {
                this.updateVertexPosition(grip, { x: newX, y: newY });
            }
            
            // تحديث خصائص خاصة
            if (grip.subtype === 'radius' && shape.type === 'circle') {
                const newRadius = parseFloat(document.getElementById('grip-radius').value);
                if (!isNaN(newRadius) && newRadius > 0) {
                    shape.radius = newRadius;
                }
            } else if (grip.subtype === 'radius' && shape.type === 'ellipse') {
                const newRX = parseFloat(document.getElementById('grip-rx').value);
                const newRY = parseFloat(document.getElementById('grip-ry').value);
                if (!isNaN(newRX) && newRX > 0) shape.radiusX = newRX;
                if (!isNaN(newRY) && newRY > 0) shape.radiusY = newRY;
            } else if (grip.subtype === 'curve' && shape.type === 'arc') {
                const newRadius = parseFloat(document.getElementById('grip-arc-radius').value);
                const newStartAngle = parseFloat(document.getElementById('grip-start-angle').value) * Math.PI / 180;
                const newEndAngle = parseFloat(document.getElementById('grip-end-angle').value) * Math.PI / 180;
                
                if (!isNaN(newRadius) && newRadius > 0) shape.radius = newRadius;
                if (!isNaN(newStartAngle)) shape.startAngle = newStartAngle;
                if (!isNaN(newEndAngle)) shape.endAngle = newEndAngle;
            }
            
            // تحديث القيود
            grip.lockX = document.getElementById('grip-lock-x').checked;
            grip.lockY = document.getElementById('grip-lock-y').checked;
            
            // تحديث النوع
            const typeSelect = document.getElementById('grip-type');
            if (typeSelect) {
                grip.vertexType = typeSelect.value;
                // يمكن هنا تطبيق تحويل الشكل حسب النوع
            }
            
            this.cad.recordState();
            this.cad.render();
        }
        
        /**
         * معالجة Click & Hold على Edge
         */
        handleEdgeHold(grip, point) {
            // عرض قائمة عائمة صغيرة
            const menu = document.createElement('div');
            menu.className = 'edge-hold-menu';
            menu.style.position = 'fixed';
            
            const screenPos = this.cad.worldToScreen(point.x, point.y);
            menu.style.left = (screenPos.x - 50) + 'px';
            menu.style.top = (screenPos.y - 60) + 'px';
            
            menu.innerHTML = `
                <button class="edge-action" data-action="add-vertex" title="Add Vertex">
                    <i class="fas fa-plus"></i>
                </button>
                ${grip.canConvertToArc ? `
                <button class="edge-action" data-action="convert-arc" title="Convert to Arc">
                    <i class="fas fa-bezier-curve"></i>
                </button>
                ` : ''}
                <button class="edge-action" data-action="properties" title="Properties">
                    <i class="fas fa-info"></i>
                </button>
            `;
            
            menu.addEventListener('click', (e) => {
                const btn = e.target.closest('.edge-action');
                if (btn) {
                    const action = btn.dataset.action;
                    this.executeGripAction(action, grip);
                    menu.remove();
                }
            });
            
            document.body.appendChild(menu);
            
            // إزالة القائمة عند تحريك الماوس
            const removeMenu = () => {
                menu.remove();
                document.removeEventListener('mousemove', removeMenu);
            };
            
            setTimeout(() => {
                document.addEventListener('mousemove', removeMenu);
            }, 100);
        }
        
        /**
         * عرض خيارات edge متقدمة
         */
        showEdgeOptions(grip, point) {
            const items = [
                {
                    icon: 'fas fa-bezier-curve',
                    label: 'Convert to Arc',
                    action: () => this.convertEdgeToArc(grip)
                },
                {
                    icon: 'fas fa-plus',
                    label: 'Add Vertex',
                    action: () => this.addVertexAtEdge(grip, grip.point)
                },
                {
                    icon: 'fas fa-cut',
                    label: 'Divide Edge',
                    action: () => this.showDivideDialog(grip)
                },
                {
                    icon: 'fas fa-arrows-alt-h',
                    label: 'Stretch Edge',
                    action: () => this.startStretchMode(grip)
                },
                { separator: true },
                {
                    icon: 'fas fa-ruler',
                    label: 'Measure Length',
                    action: () => this.measureEdge(grip)
                }
            ];
            
            // تحويل إحداثيات العالم إلى الشاشة
            const screenPoint = this.cad.worldToScreen(point.x, point.y);
            this.cad.ui.showContextMenu(screenPoint.x, screenPoint.y, items);
        }
        
        /**
         * عرض خصائص edge
         */
        showEdgeProperties(grip) {
            const length = this.cad.distance(grip.start.x, grip.start.y, grip.end.x, grip.end.y);
            const angle = Math.atan2(grip.end.y - grip.start.y, grip.end.x - grip.start.x) * 180 / Math.PI;
            
            const content = `
                <h3>Edge Properties</h3>
                <div class="property-row">
                    <label>Length:</label>
                    <span>${length.toFixed(2)}</span>
                </div>
                <div class="property-row">
                    <label>Angle:</label>
                    <span>${angle.toFixed(2)}°</span>
                </div>
                <div class="property-row">
                    <label>Start Point:</label>
                    <span>(${grip.start.x.toFixed(2)}, ${grip.start.y.toFixed(2)})</span>
                </div>
                <div class="property-row">
                    <label>End Point:</label>
                    <span>(${grip.end.x.toFixed(2)}, ${grip.end.y.toFixed(2)})</span>
                </div>
            `;
            
            if (this.cad.ui) {
                this.cad.ui.showGripPropertiesDialog(content);
            }
        }
        
        /**
         * قفل/فتح موقع vertex
         */
        toggleVertexLock(grip) {
            grip.locked = !grip.locked;
            this.cad.updateStatus(grip.locked ? 'Vertex locked' : 'Vertex unlocked');
        }
        
        /**
         * تحويل إلى منحنى
         */
        convertToCurve(grip) {
            // TODO: تنفيذ تحويل الزاوية إلى منحنى
            this.cad.updateStatus('Convert to curve feature coming soon');
        }
        
        /**
         * عرض dialog للتقسيم
         */
        showDivideDialog(grip) {
            const content = `
                <h3>Divide Edge</h3>
                <div class="property-row">
                    <label>Number of segments:</label>
                    <input type="number" id="divide-count" value="2" min="2" max="100" />
                </div>
                <div class="property-row">
                    <label>
                        <input type="checkbox" id="divide-equal" checked />
                        Equal spacing
                    </label>
                </div>
            `;
            
            this.cad.ui.showGripPropertiesDialog(content, (result) => {
                if (result) {
                    const count = parseInt(document.getElementById('divide-count').value);
                    if (count >= 2) {
                        this.divideEdge(grip, count);
                    }
                }
            });
        }
        
        /**
         * قياس طول edge
         */
        measureEdge(grip) {
            const length = this.cad.distance(
                grip.start.x, grip.start.y,
                grip.end.x, grip.end.y
            );
            
            const angle = Math.atan2(
                grip.end.y - grip.start.y,
                grip.end.x - grip.start.x
            ) * 180 / Math.PI;
            
            this.cad.updateStatus(
                `Edge length: ${length.toFixed(2)} units, Angle: ${angle.toFixed(2)}°`
            );
        }
        
        /**
         * تطبيق fillet على vertex
         */
        applyFilletToVertex(grip, radius) {
            // TODO: تنفيذ fillet للزوايا
            this.cad.updateStatus(`Fillet with radius ${radius} will be applied`);
        }
        
        /**
         * بدء وضع stretch
         */
        startStretchMode(grip) {
            this.gripMode = 'stretch';
            this.draggedGrip = grip;
            this.originalPosition = { ...grip.point };
            this.cad.updateStatus('Drag to stretch edge');
        }
        
        /**
         * حذف vertex
         */
        removeVertex(grip) {
            const shape = grip.shape;
            
            if (shape.type === 'polyline' || shape.type === 'polygon') {
                if (shape.points.length <= 2) {
                    this.cad.updateStatus('Cannot remove vertex: minimum 2 points required');
                    return;
                }
                
                shape.points.splice(grip.index, 1);
                this.cad.updateStatus('Vertex removed');
            }
        }
        
        /**
         * تقسيم edge محسن
         */
        divideEdge(edgeGrip, count) {
            if (!count) {
                count = parseInt(prompt('Number of segments:', '2'));
                if (!count || count < 2) return;
            }
            
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
            
            if (shape.type === 'polyline' || shape.type === 'polygon') {
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
         * إضافة ميزة snap محسنة
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
            
            // حفظ حالة الـ context
            this.cad.ctx.save();
            
            // رسم edge grips أولاً (خلف vertex grips)
            for (const edge of grips.edges) {
                this.drawEdgeGrip(edge);
            }
            
            // رسم vertex grips
            for (const vertex of grips.vertices) {
                this.drawVertexGrip(vertex);
            }
            
            // استعادة حالة الـ context
            this.cad.ctx.restore();
            
            // رسم debug info إذا كان مفعلاً
            if (this.debugMode) {
                this.drawDebugInfo();
            }
        }
    }
    
    // إضافة polyfill لـ roundRect إذا لم يكن موجوداً
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.beginPath();
            this.moveTo(x + r, y);
            this.arcTo(x + w, y, x + w, y + h, r);
            this.arcTo(x + w, y + h, x, y + h, r);
            this.arcTo(x, y + h, x, y, r);
            this.arcTo(x, y, x + w, y, r);
            this.closePath();
        };
    }
    
    window.GripsController = GripsController;
    
})(window);