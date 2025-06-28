
//  js/tools/modify/StretchTool.js
// ============================================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة Stretch للتحكم في الرؤوس
 */
export class StretchTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-expand-arrows-alt';
        this.vertexController = null;
        this.selectedVertex = null;
        this.originalPosition = null;
        this.dragStartPosition = null;
    }
    
    onActivate() {
        super.onActivate();
        
        // إنشاء vertex controller إذا لم يكن موجوداً
        if (!this.cad.vertexController) {
            this.cad.vertexController = new VertexController(this.cad);
        }
        this.vertexController = this.cad.vertexController;
        
        this.updateStatus('Select vertex to stretch (Right-click for options)');
        this.cad.render();
    }
    
    onDeactivate() {
        super.onDeactivate();
        this.selectedVertex = null;
        this.vertexController.hoveredVertex = null;
        this.cad.render();
    }
    
    onMouseMove(point) {
        if (!this.selectedVertex) {
            // البحث عن أقرب رأس للإبراز
            const nearest = this.vertexController.findNearestVertex(point);
            
            if (nearest) {
                this.vertexController.hoveredVertex = nearest.vertex;
                this.cad.canvas.style.cursor = 'move';
            } else {
                this.vertexController.hoveredVertex = null;
                this.cad.canvas.style.cursor = 'crosshair';
            }
            
            this.cad.render();
        } else {
            // تحديث موقع الرأس المحدد
            const snappedPoint = this.cad.snapEnabled ? 
                this.cad.getSnapPoint(point.x, point.y) : point;
            
            this.vertexController.updateVertexPosition(
                this.selectedVertex.vertex,
                this.selectedVertex.shape,
                snappedPoint
            );
            
            this.cad.render();
        }
    }
    
    onClick(point) {
        if (!this.selectedVertex) {
            // تحديد رأس
            const nearest = this.vertexController.findNearestVertex(point);
            
            if (nearest) {
                this.selectedVertex = nearest;
                this.originalPosition = { ...nearest.vertex.point };
                this.dragStartPosition = point;
                
                // بدء عملية السحب
                this.cad.recordState();
                this.updateStatus('Move vertex to new position');
            }
        } else {
            // تأكيد الموقع الجديد
            this.selectedVertex = null;
            this.updateStatus('Select vertex to stretch (Right-click for options)');
        }
    }
    
    onRightClick(point) {
        const nearest = this.vertexController.findNearestVertex(point);
        
        if (nearest) {
            this.showVertexContextMenu(nearest, point);
        } else {
            // البحث عن نقطة على خط للإضافة
            const shape = this.findShapeForNewVertex(point);
            if (shape) {
                this.showAddVertexMenu(shape, point);
            }
        }
    }
    
    onKeyPress(key) {
        if (key === 'Escape' && this.selectedVertex) {
            // إلغاء العملية
            this.vertexController.updateVertexPosition(
                this.selectedVertex.vertex,
                this.selectedVertex.shape,
                this.originalPosition
            );
            
            this.selectedVertex = null;
            this.cad.render();
            this.updateStatus('Vertex stretch cancelled');
        }
    }
    
    /**
     * عرض قائمة السياق للرأس
     */
    showVertexContextMenu(vertexInfo, position) {
        const screenPos = this.cad.worldToScreen(position.x, position.y);
        
        const menuItems = [
            {
                label: 'Stretch Vertex',
                icon: 'fa-arrows-alt',
                action: () => {
                    this.selectedVertex = vertexInfo;
                    this.originalPosition = { ...vertexInfo.vertex.point };
                    this.updateStatus('Move vertex to new position');
                }
            }
        ];
        
        // إضافة خيار الحذف للأشكال المناسبة
        if (vertexInfo.shape.type === 'polyline' && 
            vertexInfo.shape.points.length > 3) {
            menuItems.push({
                label: 'Remove Vertex',
                icon: 'fa-minus',
                action: () => this.removeVertex(vertexInfo)
            });
        }
        
        // إضافة خيار التحويل لقوس
        if (vertexInfo.shape.type === 'polyline' && 
            vertexInfo.vertex.index < vertexInfo.shape.points.length - 1) {
            
            const segmentIndex = vertexInfo.vertex.index;
            const segment = vertexInfo.shape.segments?.[segmentIndex];
            
            if (!segment || segment.type !== 'arc') {
                menuItems.push({
                    label: 'Convert to Arc',
                    icon: 'fa-bezier-curve',
                    action: () => this.convertToArc(vertexInfo, segmentIndex)
                });
            } else {
                menuItems.push({
                    label: 'Convert to Line',
                    icon: 'fa-minus',
                    action: () => this.convertToLine(vertexInfo, segmentIndex)
                });
            }
        }
        
        // عرض القائمة
        this.cad.ui.showContextMenu(menuItems, screenPos.x, screenPos.y);
    }
    
    /**
     * عرض قائمة إضافة رأس
     */
    showAddVertexMenu(shape, position) {
        const screenPos = this.cad.worldToScreen(position.x, position.y);
        
        const menuItems = [{
            label: 'Add Vertex',
            icon: 'fa-plus',
            action: () => this.addVertex(shape, position)
        }];
        
        this.cad.ui.showContextMenu(menuItems, screenPos.x, screenPos.y);
    }
    
    /**
     * البحث عن شكل لإضافة رأس جديد
     */
    findShapeForNewVertex(point) {
        const tolerance = 10 / this.cad.zoom;
        
        for (const shape of this.cad.selectedShapes) {
            if (shape.type === 'polyline' || shape.type === 'rectangle') {
                const vertices = this.vertexController.getShapeVertices(shape);
                
                // التحقق من القرب من الخطوط
                if (shape.type === 'polyline') {
                    for (let i = 0; i < shape.points.length - 1; i++) {
                        const dist = this.cad.geo.pointToLineDistance(
                            point,
                            shape.points[i],
                            shape.points[i + 1]
                        );
                        
                        if (dist < tolerance) {
                            return shape;
                        }
                    }
                } else if (shape.type === 'rectangle') {
                    // التحقق من القرب من حواف المستطيل
                    const rect = this.vertexController.getRectangleVertices(shape);
                    for (let i = 0; i < 4; i++) {
                        const p1 = rect[i].point;
                        const p2 = rect[(i + 1) % 4].point;
                        
                        const dist = this.cad.geo.pointToLineDistance(point, p1, p2);
                        if (dist < tolerance) {
                            return shape;
                        }
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * إضافة رأس جديد
     */
    addVertex(shape, position) {
        this.cad.recordState();
        
        const result = this.vertexController.addVertex(shape, position);
        
        if (result.success) {
            this.cad.render();
            this.updateStatus('Vertex added');
        } else {
            this.updateStatus(result.message || 'Failed to add vertex');
        }
    }
    
    /**
     * حذف رأس
     */
    removeVertex(vertexInfo) {
        this.cad.recordState();
        
        const result = this.vertexController.removeVertex(
            vertexInfo.shape,
            vertexInfo.vertex
        );
        
        if (result.success) {
            this.cad.render();
            this.updateStatus('Vertex removed');
        } else {
            this.updateStatus(result.message || 'Failed to remove vertex');
        }
    }
    
    /**
     * تحويل قطعة إلى قوس
     */
    convertToArc(vertexInfo, segmentIndex) {
        this.cad.recordState();
        
        const result = this.vertexController.convertSegmentToArc(
            vertexInfo.shape,
            segmentIndex,
            0.5 // bulge افتراضي
        );
        
        if (result.success) {
            this.cad.render();
            this.updateStatus('Converted to arc');
        } else {
            this.updateStatus(result.message || 'Failed to convert to arc');
        }
    }
    
    /**
     * تحويل قوس إلى خط
     */
    convertToLine(vertexInfo, segmentIndex) {
        this.cad.recordState();
        
        const result = this.vertexController.convertArcToLine(
            vertexInfo.shape,
            segmentIndex
        );
        
        if (result.success) {
            this.cad.render();
            this.updateStatus('Converted to line');
        } else {
            this.updateStatus('Failed to convert to line');
        }
    }
}