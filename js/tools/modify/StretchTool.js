// ==================== js/tools/modify/StretchTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة التمديد (Stretch)
 * تمديد جزء من العنصر وليس الكل - متوافقة مع معايير CAD
 */
export class StretchTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-arrows-alt-h';
        this.cursor = 'crosshair';
        
        // حالة الأداة
        this.state = {
            phase: 'select', // 'select', 'basePoint', 'stretch'
            basePoint: null,
            selectionWindow: null,
            affectedShapes: [],
            originalShapes: []
        };
        
        // إعدادات التمديد
        this.settings = {
            tolerance: 5, // نصف قطر التأثير بالبكسل
            showPreview: true
        };
    }
    
    onActivate() {
        // دعم Post-selection: التحقق من وجود عناصر محددة مسبقاً
        if (this.cad.selectedShapes.size > 0) {
            // استخدام العناصر المحددة مسبقاً
            this.setupStretchableShapes();
            this.state.phase = 'basePoint';
            this.updateStatus('Specify base point for stretch');
        } else {
            // طلب اختيار العناصر
            this.state.phase = 'select';
            this.updateStatus('Select objects to stretch (use crossing selection)');
        }
        
        return true;
    }
    
    onDeactivate() {
        this.cleanup();
        super.onDeactivate();
    }
    
    onClick(point) {
        switch (this.state.phase) {
            case 'select':
                this.handleSelection(point);
                break;
                
            case 'basePoint':
                this.setBasePoint(point);
                break;
                
            case 'stretch':
                this.performStretch(point);
                break;
        }
    }
    
    onMouseMove(point) {
        if (this.state.phase === 'stretch' && this.state.basePoint) {
            this.showStretchPreview(point);
        }
    }
    
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cancelOperation();
        } else if (key === 'Enter' && this.state.phase === 'select') {
            this.finishSelection();
        }
    }
    
    /**
     * معالجة اختيار العناصر
     */
    handleSelection(point) {
        // في CAD الحقيقي، Stretch يستخدم عادة crossing selection
        // هنا نختار العنصر تحت المؤشر
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (shape && this.canModifyShape(shape)) {
            // إضافة أو إزالة من التحديد
            if (this.cad.selectedShapes.has(shape)) {
                this.cad.selectedShapes.delete(shape);
            } else {
                this.cad.selectedShapes.add(shape);
            }
            
            this.cad.render();
            this.updateStatus(`${this.cad.selectedShapes.size} objects selected. Press Enter to continue or select more`);
        } else {
            this.updateStatus('Select stretchable objects (lines, polylines, rectangles)');
        }
    }
    
    /**
     * إنهاء اختيار العناصر
     */
    finishSelection() {
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('No objects selected');
            return;
        }
        
        this.setupStretchableShapes();
        
        if (this.state.affectedShapes.length === 0) {
            this.updateStatus('No stretchable objects in selection');
            this.cancelOperation();
            return;
        }
        
        this.state.phase = 'basePoint';
        this.updateStatus('Specify base point for stretch');
    }
    
    /**
     * إعداد الأشكال القابلة للتمديد
     */
    setupStretchableShapes() {
        this.state.affectedShapes = [];
        
        this.cad.selectedShapes.forEach(shape => {
            if (this.isStretchable(shape) && this.canModifyShape(shape)) {
                this.state.affectedShapes.push(shape);
            }
        });
        
        // حفظ النسخ الأصلية
        this.state.originalShapes = this.state.affectedShapes.map(shape => 
            JSON.parse(JSON.stringify(shape))
        );
    }
    
    /**
     * التحقق من إمكانية تمديد الشكل
     */
    isStretchable(shape) {
        return ['line', 'polyline', 'rectangle'].includes(shape.type);
    }
    
    /**
     * تحديد نقطة البداية
     */
    setBasePoint(point) {
        this.state.basePoint = point;
        this.state.phase = 'stretch';
        this.updateStatus('Specify stretch point (or enter distance)');
        
        // إمكانية إدخال المسافة
        if (this.cad.showDynamicInput) {
            this.cad.showDynamicInput('Stretch distance:', point);
        }
    }
    
    /**
     * تطبيق التمديد
     */
    performStretch(point) {
        const deltaX = point.x - this.state.basePoint.x;
        const deltaY = point.y - this.state.basePoint.y;
        
        if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) {
            this.updateStatus('Invalid stretch distance');
            return;
        }
        
        // تسجيل العملية للـ Undo
        this.cad.recordState();
        
        // تطبيق التمديد على كل شكل
        this.state.affectedShapes.forEach((shape, index) => {
            this.applyStretchToShape(shape, deltaX, deltaY);
        });
        
        this.cad.render();
        this.updateStatus(`Stretched ${this.state.affectedShapes.length} objects`);
        this.finishOperation();
    }
    
    /**
     * تطبيق التمديد على شكل واحد
     */
    applyStretchToShape(shape, deltaX, deltaY) {
        switch (shape.type) {
            case 'line':
                this.stretchLine(shape, deltaX, deltaY);
                break;
                
            case 'polyline':
                this.stretchPolyline(shape, deltaX, deltaY);
                break;
                
            case 'rectangle':
                this.stretchRectangle(shape, deltaX, deltaY);
                break;
        }
    }
    
    /**
     * تمديد خط
     */
    stretchLine(line, deltaX, deltaY) {
        // تمديد النقطة الأقرب لنقطة البداية
        const distToStart = this.cad.distance(
            this.state.basePoint.x, this.state.basePoint.y,
            line.start.x, line.start.y
        );
        const distToEnd = this.cad.distance(
            this.state.basePoint.x, this.state.basePoint.y,
            line.end.x, line.end.y
        );
        
        if (distToStart < distToEnd) {
            line.start.x += deltaX;
            line.start.y += deltaY;
        } else {
            line.end.x += deltaX;
            line.end.y += deltaY;
        }
    }
    
    /**
     * تمديد polyline
     */
    stretchPolyline(polyline, deltaX, deltaY) {
        if (!polyline.points || polyline.points.length === 0) return;
        
        // تمديد النقاط القريبة من نقطة البداية
        polyline.points.forEach(point => {
            const distance = this.cad.distance(
                this.state.basePoint.x, this.state.basePoint.y,
                point.x, point.y
            );
            
            // تمديد النقاط ضمن نطاق التأثير
            if (distance < this.settings.tolerance * 3) {
                point.x += deltaX;
                point.y += deltaY;
            }
        });
    }
    
    /**
     * تمديد مستطيل
     */
    stretchRectangle(rect, deltaX, deltaY) {
        const centerX = (rect.start.x + rect.end.x) / 2;
        const centerY = (rect.start.y + rect.end.y) / 2;
        
        // تحديد الجانب الأقرب لنقطة البداية
        const distToLeft = Math.abs(this.state.basePoint.x - rect.start.x);
        const distToRight = Math.abs(this.state.basePoint.x - rect.end.x);
        const distToTop = Math.abs(this.state.basePoint.y - rect.start.y);
        const distToBottom = Math.abs(this.state.basePoint.y - rect.end.y);
        
        // تمديد الجانب الأقرب
        if (distToLeft < distToRight) {
            rect.start.x += deltaX;
        } else {
            rect.end.x += deltaX;
        }
        
        if (distToTop < distToBottom) {
            rect.start.y += deltaY;
        } else {
            rect.end.y += deltaY;
        }
    }
    
    /**
     * معاينة التمديد
     */
    showStretchPreview(point) {
        if (!this.settings.showPreview) return;
        
        const deltaX = point.x - this.state.basePoint.x;
        const deltaY = point.y - this.state.basePoint.y;
        
        // استعادة الأشكال الأصلية
        this.state.affectedShapes.forEach((shape, index) => {
            const original = this.state.originalShapes[index];
            this.restoreShapeFromBackup(shape, original);
        });
        
        // تطبيق التمديد المؤقت
        this.state.affectedShapes.forEach(shape => {
            this.applyStretchToShape(shape, deltaX, deltaY);
        });
        
        this.cad.render();
    }
    
    /**
     * استعادة شكل من النسخة الاحتياطية
     */
    restoreShapeFromBackup(current, backup) {
        Object.keys(backup).forEach(key => {
            if (typeof backup[key] === 'object' && backup[key] !== null) {
                if (Array.isArray(backup[key])) {
                    current[key] = backup[key].map(item => 
                        typeof item === 'object' ? { ...item } : item
                    );
                } else {
                    current[key] = { ...backup[key] };
                }
            } else {
                current[key] = backup[key];
            }
        });
    }
    
    /**
     * إلغاء العملية
     */
    cancelOperation() {
        // استعادة الأشكال الأصلية إذا لزم الأمر
        if (this.state.originalShapes.length > 0) {
            this.state.affectedShapes.forEach((shape, index) => {
                if (this.state.originalShapes[index]) {
                    this.restoreShapeFromBackup(shape, this.state.originalShapes[index]);
                }
            });
            this.cad.render();
        }
        
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
            phase: 'select',
            basePoint: null,
            selectionWindow: null,
            affectedShapes: [],
            originalShapes: []
        };
        
        // إخفاء dynamic input
        if (this.cad.ui && this.cad.ui.hideDynamicInput) {
            this.cad.ui.hideDynamicInput();
        }
        
        this.cad.canvas.style.cursor = 'default';
    }
    
    /**
     * دعم Dynamic Input
     */
    handleDynamicInput(value) {
        if (this.state.phase === 'stretch' && this.state.basePoint) {
            // تفسير القيمة المدخلة كمسافة
            const distance = parseFloat(value);
            if (!isNaN(distance) && distance > 0) {
                // تطبيق المسافة في الاتجاه الحالي للماوس
                const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
                const deltaX = world.x - this.state.basePoint.x;
                const deltaY = world.y - this.state.basePoint.y;
                const currentDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (currentDistance > 0.1) {
                    const scale = distance / currentDistance;
                    const newPoint = {
                        x: this.state.basePoint.x + deltaX * scale,
                        y: this.state.basePoint.y + deltaY * scale
                    };
                    
                    this.performStretch(newPoint);
                }
            }
        }
    }
    
    /**
     * معلومات الأداة للمطورين
     */
    getInfo() {
        return {
            name: 'Stretch',
            version: '1.0.0',
            phase: this.state.phase,
            affectedShapes: this.state.affectedShapes.length,
            supportsPostSelection: true,
            supportsDynamicInput: true,
            keyboardShortcuts: ['Shift+S', 'STR']
        };
    }
}