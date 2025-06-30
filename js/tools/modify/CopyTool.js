// ==================== js/tools/modify/CopyTool.js ====================

import { ModifyToolBase, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة النسخ - محدثة بالإدخال الديناميكي الكامل
 * Copy Tool with Complete Dynamic Input Support
 */
export class CopyTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-copy';
        this.copyCount = 0;
        this.totalCopies = [];
        this.currentAngle = 0;
        this.currentDistance = 0;
    }
    
    onActivate() {
        if (!super.onActivate()) return;
        
        this.resetState();
        this.updateStatus('Specify base point for copy');
    }
    
    onDeactivate() {
        // إخفاء Dynamic Input
        this.hideDynamicInput();
        
        // تنظيف
        this.clearPreview();
        super.onDeactivate();
    }
    
    onClick(point) {
        if (!this.basePoint) {
            // النقطة الأولى - نقطة الأساس
            this.basePoint = point;
            this.cad.isDrawing = true;
            this.updateStatus('Specify second point or type distance (ESC to finish)');
            
            // عرض الإدخال الديناميكي
            this.showDynamicInput();
            
        } else {
            // نقاط النسخ المتعددة - تطبيق قيود Ortho/Polar
            const constrainedPoint = this.applyConstraints(this.basePoint, point);
            const dx = constrainedPoint.x - this.basePoint.x;
            const dy = constrainedPoint.y - this.basePoint.y;
            this.createCopy(dx, dy);
        }
    }
    
    /**
     * معالجة حركة الماوس المحدثة
     * 🆕 تستخدم processMouseMove من الفئة الأساسية
     */
    processMouseMove(point) {
        if (!this.basePoint) return;
        
        // حساب المسافة والاتجاه
        const dx = point.x - this.basePoint.x;
        const dy = point.y - this.basePoint.y;
        this.currentDistance = Math.sqrt(dx * dx + dy * dy);
        this.currentAngle = Math.atan2(dy, dx);
        
        // تحديد الموضع الفعلي للمعاينة
        let effectiveDx, effectiveDy;
        
        if (this.constrainedMode && this.constrainedValue > 0) {
            // وضع مقيد: استخدم المسافة المحددة في اتجاه المؤشر
            effectiveDx = this.constrainedValue * Math.cos(this.currentAngle);
            effectiveDy = this.constrainedValue * Math.sin(this.currentAngle);
        } else {
            // وضع حر: تتبع المؤشر (مع قيود Ortho/Polar من النقطة المقيدة)
            effectiveDx = dx;
            effectiveDy = dy;
        }
        
        // تحديث القيمة في Dynamic Input (بالوحدة الحالية)
        if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            let displayDistance = this.currentDistance;
            if (this.cad.units && this.cad.currentUnit) {
                try {
                    displayDistance = this.cad.units.fromInternal(this.currentDistance, this.cad.currentUnit);
                } catch (e) {
                    // استخدام القيمة الأصلية في حالة الفشل
                }
            }
            this.cad.dynamicInputManager.updateLiveValue(displayDistance);
        }
        
        // عرض المعاينة
        this.showCopyPreview(effectiveDx, effectiveDy);
        
        // تحديث الحالة
        const angleDeg = this.currentAngle * 180 / Math.PI;
        let displayDist = effectiveDx * effectiveDx + effectiveDy * effectiveDy;
        displayDist = Math.sqrt(displayDist);
        
        if (this.cad.units && this.cad.currentUnit) {
            try {
                displayDist = this.cad.units.fromInternal(displayDist, this.cad.currentUnit);
            } catch (e) {
                // استخدام القيمة الأصلية
            }
        }
        
        this.updateStatus(
            `Copy ${this.copyCount + 1}: Distance: ${displayDist.toFixed(2)} ${this.cad.currentUnit}, ` +
            `Angle: ${angleDeg.toFixed(1)}°` +
            (this.constrainedMode ? ' [CONSTRAINED]' : '') +
            (this.cad.orthoEnabled ? ' [ORTHO]' : '') +
            (this.cad.polarEnabled ? ' [POLAR]' : '') +
            ' (ESC to finish)'
        );
    }
    
    /**
     * عرض الإدخال الديناميكي
     */
    showDynamicInput() {
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.DISTANCE,
            label: 'Distance',
            defaultValue: this.getLastCopyDistance(),
            placeholder: 'Copy distance',
            
            onInput: (value) => {
                // المستخدم بدأ الكتابة
                if (value !== null && value !== '') {
                    // القيمة ستكون محولة بالفعل للوحدة الداخلية
                    this.constrainedMode = true;
                    this.constrainedValue = value;
                    
                    // تحديث المعاينة فوراً
                    this.updateConstrainedPreview();
                } else {
                    // مسح القيمة = العودة للوضع الحر
                    this.constrainedMode = false;
                    this.constrainedValue = null;
                }
            },
            
            onConfirm: (value) => {
                // تطبيق النسخ بالقيمة المدخلة
                if (value > 0) {
                    const dx = value * Math.cos(this.currentAngle);
                    const dy = value * Math.sin(this.currentAngle);
                    this.createCopy(dx, dy);
                    
                    // إعادة تعيين للقيمة التالية
                    this.constrainedMode = false;
                    this.constrainedValue = null;
                    
                    // 🆕 مسح حقل الإدخال للسماح بإدخال قيمة جديدة
                    if (this.cad.dynamicInputManager) {
                        this.cad.dynamicInputManager.clearInput();
                    }
                }
            }
        });
    }
    
    /**
     * تحديث المعاينة المقيدة
     */
    updateConstrainedPreview() {
        if (!this.basePoint || !this.constrainedValue || this.constrainedValue <= 0) return;
        
        // استخدم الاتجاه الحالي مع المسافة المقيدة
        const dx = this.constrainedValue * Math.cos(this.currentAngle);
        const dy = this.constrainedValue * Math.sin(this.currentAngle);
        this.showCopyPreview(dx, dy);
    }
    
    /**
     * عرض معاينة النسخ
     */
    showCopyPreview(dx, dy) {
        const tempShapes = [];
        
        // معاينة الأشكال المنسوخة
        this.originalShapes.forEach(shape => {
            const temp = this.cad.cloneShape(shape);
            this.cad.translateShape(temp, dx, dy);
            
            // تمييز المعاينة
            temp.tempStyle = {
                opacity: 0.6,
                dashArray: [5, 5]
            };
            
            tempShapes.push(temp);
        });
        
        // خط من نقطة الأساس إلى موضع النسخة
        const guideLine = {
            type: 'line',
            start: this.basePoint,
            end: {
                x: this.basePoint.x + dx,
                y: this.basePoint.y + dy
            },
            color: '#00ffcc',
            lineWidth: 1,
            tempStyle: {
                opacity: 0.5,
                dashArray: [10, 5]
            }
        };
        tempShapes.push(guideLine);
        
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
        tempShapes.push(baseMarker);
        
        // إضافة مؤشر الموضع المستهدف
        const targetMarker = {
            type: 'circle',
            center: {
                x: this.basePoint.x + dx,
                y: this.basePoint.y + dy
            },
            radius: 4 / this.cad.zoom,
            color: '#00ffcc',
            lineWidth: 2,
            filled: false,
            tempStyle: { opacity: 0.8 }
        };
        tempShapes.push(targetMarker);
        
        this.clearPreview();
        this.showPreview(tempShapes);
    }
    
    /**
     * إنشاء نسخة
     */
    createCopy(dx, dy) {
        // تسجيل للـ undo (مرة واحدة فقط للنسخة الأولى)
        if (this.copyCount === 0) {
            this.applyModification();
        }
        
        const newShapes = [];
        this.originalShapes.forEach(shape => {
            const newShape = this.cad.cloneShape(shape);
            newShape.id = this.cad.generateId();
            this.cad.translateShape(newShape, dx, dy);
            this.cad.shapes.push(newShape);
            newShapes.push(newShape);
        });
        
        // حفظ النسخة
        this.totalCopies.push(...newShapes);
        this.copyCount++;
        
        // حساب وحفظ المسافة
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.saveLastCopyDistance(distance);
        
        // تحديث الحالة (بالوحدة الحالية)
        let displayDist = distance;
        if (this.cad.units && this.cad.currentUnit) {
            try {
                displayDist = this.cad.units.fromInternal(distance, this.cad.currentUnit);
            } catch (e) {
                // استخدام القيمة الأصلية
            }
        }
        
        const angleDeg = (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1);
        this.updateStatus(
            `Copied ${this.copyCount} object${this.copyCount > 1 ? 's' : ''} ` +
            `at ${displayDist.toFixed(2)} ${this.cad.currentUnit} angle ${angleDeg}° ` +
            `(Total: ${this.copyCount} copies) - Continue or ESC to finish`
        );
        
        // تحديد الأشكال الجديدة
        this.cad.selectedShapes.clear();
        newShapes.forEach(shape => this.cad.selectedShapes.add(shape));
        
        // تحديث المعاينة
        this.cad.render();
    }
    
    /**
     * إنهاء العملية
     */
    finishOperation() {
        // إخفاء Dynamic Input
        this.hideDynamicInput();
        
        // تحديد جميع النسخ
        if (this.totalCopies.length > 0) {
            this.cad.selectedShapes.clear();
            this.totalCopies.forEach(shape => this.cad.selectedShapes.add(shape));
        }
        
        // تنظيف
        this.clearPreview();
        this.cad.isDrawing = false;
        this.cad.finishDrawing();
        
        // رسالة النهاية
        if (this.copyCount > 0) {
            this.updateStatus(
                `Copy completed: ${this.copyCount} cop${this.copyCount > 1 ? 'ies' : 'y'} created`
            );
        }
        
        this.resetState();
    }
    
    /**
     * معالجة المفاتيح
     */
    onKeyPress(key) {
        if (key === 'Escape') {
            this.finishOperation();
        } else if (key === 'Enter' && this.basePoint) {
            if (this.constrainedMode && this.constrainedValue > 0) {
                // تطبيق بالقيمة المقيدة
                const dx = this.constrainedValue * Math.cos(this.currentAngle);
                const dy = this.constrainedValue * Math.sin(this.currentAngle);
                this.createCopy(dx, dy);
                
                // إعادة تعيين وإبقاء الإدخال مفتوح
                this.constrainedMode = false;
                this.constrainedValue = null;
                
                if (this.cad.dynamicInputManager) {
                    this.cad.dynamicInputManager.clearInput();
                }
            } else if (this.currentDistance > 0) {
                // تطبيق بالموضع الحالي
                const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
                const constrainedPoint = this.applyConstraints(this.basePoint, world);
                const dx = constrainedPoint.x - this.basePoint.x;
                const dy = constrainedPoint.y - this.basePoint.y;
                this.createCopy(dx, dy);
            }
        } else if (key === 'Tab' && this.basePoint) {
            // Tab لتبديل الوضع
            if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
                this.cad.dynamicInputManager.handleTab();
            }
        }
    }
    
    /**
     * إعادة تعيين الحالة
     */
    resetState() {
        this.basePoint = null;
        this.constrainedValue = null;
        this.currentAngle = 0;
        this.currentDistance = 0;
        this.constrainedMode = false;
        this.copyCount = 0;
        this.totalCopies = [];
    }
    
    /**
     * الحصول على آخر مسافة نسخ
     */
    getLastCopyDistance() {
        const lastDist = this.toolsManager?.modifyState?.lastCopyDistance || 0;
        
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
     * حفظ آخر مسافة نسخ
     */
    saveLastCopyDistance(distance) {
        if (this.toolsManager && !this.toolsManager.modifyState) {
            this.toolsManager.modifyState = {};
        }
        if (this.toolsManager) {
            this.toolsManager.modifyState.lastCopyDistance = distance;
        }
    }
}