// ==================== js/tools/modify/MoveTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة التحريك مع الإدخال الديناميكي الذكي
 * Smart Move Tool with Dynamic Input
 */
export class MoveTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-arrows-alt';
        this.basePoint = null;
        this.constrainedDistance = null;
        this.lastDistance = 0;
        this.isUpdatingPreview = false; // منع الدورة اللانهائية
    }
    
    onActivate() {
        if (!super.onActivate()) return;
        
        this.updateStatus('Select base point for move');
        this.resetState();
    }
    
    onClick(point) {
        if (!this.basePoint) {
            // النقطة الأولى - نقطة الأساس
            this.basePoint = point;
            this.cad.isDrawing = true;
            this.updateStatus('Select second point or [Distance]');
            
            // عرض الإدخال الديناميكي
            this.showDynamicInput();
            
        } else {
            // النقطة الثانية - تطبيق الحركة
            const dx = point.x - this.basePoint.x;
            const dy = point.y - this.basePoint.y;
            this.applyMove(dx, dy);
        }
    }
    
    onMouseMove(point) {
        if (!this.basePoint) return;
        
        // حساب المسافة والاتجاه الحاليين
        const dx = point.x - this.basePoint.x;
        const dy = point.y - this.basePoint.y;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        const currentAngle = Math.atan2(dy, dx);
        
        // تحديد المسافة الفعلية (مقيدة أو حرة)
        let effectiveDistance = currentDistance;
        let effectiveDx = dx;
        let effectiveDy = dy;
        
        if (this.constrainedDistance !== null) {
            // استخدم المسافة المقيدة مع الاتجاه الحالي
            effectiveDistance = this.constrainedDistance;
            effectiveDx = effectiveDistance * Math.cos(currentAngle);
            effectiveDy = effectiveDistance * Math.sin(currentAngle);
        }
        
        // تحديث القيمة في صندوق الإدخال (المسافة الحالية)
        // فقط إذا لم نكن في دورة تحديث
        if (!this.isUpdatingPreview && this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            this.cad.dynamicInputManager.updateLiveValue(currentDistance);
        }
        
        // عرض المعاينة
        this.showMovePreview(effectiveDx, effectiveDy);
        
        // تحديث الحالة
        const angleDeg = currentAngle * 180 / Math.PI;
        this.updateStatus(
            `Distance: ${effectiveDistance.toFixed(2)} ${this.cad.currentUnit}, ` +
            `Angle: ${angleDeg.toFixed(1)}°`
        );
        
        this.lastDistance = currentDistance;
    }
    
    /**
     * عرض الإدخال الديناميكي
     */
    showDynamicInput() {
        if (!this.cad.dynamicInputManager) return;
        
        this.cad.dynamicInputManager.show({
            label: 'Distance',
            unit: this.cad.currentUnit,
            defaultValue: this.getLastMoveDistance(),
            decimals: 2,
            min: 0,
            liveUpdate: true,
            trackMouse: true,
            startMode: 'passive', // يبدأ في وضع العرض فقط
            
            onLiveUpdate: (value, isLocked) => {
                // تحديث القيمة المقيدة فقط
                if (value !== null && value > 0) {
                    this.constrainedDistance = value;
                } else if (value === null) {
                    this.constrainedDistance = null;
                }
                
                // تحديث المعاينة مباشرة بدون استدعاء onMouseMove
                if (this.basePoint && !this.isUpdatingPreview) {
                    this.isUpdatingPreview = true;
                    
                    // حساب الموضع الحالي
                    const angle = this.getCurrentAngle();
                    const effectiveDistance = this.constrainedDistance || this.lastDistance;
                    const dx = effectiveDistance * Math.cos(angle);
                    const dy = effectiveDistance * Math.sin(angle);
                    
                    // عرض المعاينة
                    this.showMovePreview(dx, dy);
                    
                    this.isUpdatingPreview = false;
                }
            },
            
            onConfirm: (value) => {
                if (value && value > 0) {
                    // تطبيق الحركة بالقيمة المؤكدة
                    const angle = this.getCurrentAngle();
                    const dx = value * Math.cos(angle);
                    const dy = value * Math.sin(angle);
                    this.applyMove(dx, dy);
                } else {
                    // إلغاء
                    this.cancel();
                }
            }
        });
    }
    
    /**
     * الحصول على الزاوية الحالية من موضع الماوس
     */
    getCurrentAngle() {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const dx = world.x - this.basePoint.x;
        const dy = world.y - this.basePoint.y;
        return Math.atan2(dy, dx);
    }
    
    /**
     * عرض معاينة الحركة
     */
    showMovePreview(dx, dy) {
        const tempShapes = [];
        
        // الأشكال المحركة
        this.originalShapes.forEach(shape => {
            const temp = this.cad.cloneShape(shape);
            this.cad.translateShape(temp, dx, dy);
            temp.tempStyle = {
                opacity: 0.5,
                lineType: 'dashed'
            };
            tempShapes.push(temp);
        });
        
        // خط الإرشاد
        const guideLine = {
            type: 'line',
            start: this.basePoint,
            end: {
                x: this.basePoint.x + dx,
                y: this.basePoint.y + dy
            },
            color: '#00d4aa',
            lineWidth: 1,
            lineType: 'dashed',
            isGuide: true
        };
        tempShapes.push(guideLine);
        
        // سهم الاتجاه
        const arrowSize = 10 / this.cad.zoom;
        const angle = Math.atan2(dy, dx);
        const arrowEnd = guideLine.end;
        
        const arrow1 = {
            type: 'line',
            start: arrowEnd,
            end: {
                x: arrowEnd.x - arrowSize * Math.cos(angle - Math.PI/6),
                y: arrowEnd.y - arrowSize * Math.sin(angle - Math.PI/6)
            },
            color: '#00d4aa',
            lineWidth: 1,
            isGuide: true
        };
        
        const arrow2 = {
            type: 'line',
            start: arrowEnd,
            end: {
                x: arrowEnd.x - arrowSize * Math.cos(angle + Math.PI/6),
                y: arrowEnd.y - arrowSize * Math.sin(angle + Math.PI/6)
            },
            color: '#00d4aa',
            lineWidth: 1,
            isGuide: true
        };
        
        tempShapes.push(arrow1, arrow2);
        
        this.showPreview(tempShapes);
    }
    
    /**
     * تطبيق الحركة
     */
    applyMove(dx, dy) {
        this.applyModification();
        
        // تحريك الأشكال
        this.selection.forEach((shape, index) => {
            const original = this.originalShapes[index];
            this.cad.copyShapeProperties(shape, original);
            this.cad.translateShape(shape, dx, dy);
        });
        
        // حفظ المسافة
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.saveLastMoveDistance(distance);
        
        this.finishOperation();
        this.updateStatus(`Moved ${this.selection.length} objects by ${distance.toFixed(2)} ${this.cad.currentUnit}`);
    }
    
    /**
     * إنهاء العملية
     */
    finishOperation() {
        // إخفاء الإدخال الديناميكي
        if (this.cad.dynamicInputManager) {
            this.cad.dynamicInputManager.hide();
        }
        
        // تنظيف
        this.clearPreview();
        this.cad.isDrawing = false;
        this.cad.finishDrawing();
        this.resetState();
    }
    
    /**
     * إلغاء العملية
     */
    cancel() {
        this.finishOperation();
        this.updateStatus('Move cancelled');
    }
    
    /**
     * معالجة المفاتيح
     */
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cancel();
        } else if (key === 'Enter' && this.basePoint) {
            // تطبيق بالقيمة الحالية
            if (this.constrainedDistance) {
                const angle = this.getCurrentAngle();
                const dx = this.constrainedDistance * Math.cos(angle);
                const dy = this.constrainedDistance * Math.sin(angle);
                this.applyMove(dx, dy);
            }
        }
    }
    
    /**
     * إعادة تعيين الحالة
     */
    resetState() {
        this.basePoint = null;
        this.constrainedDistance = null;
        this.lastDistance = 0;
        this.isUpdatingPreview = false;
    }
    
    /**
     * الحصول على آخر مسافة تحريك
     */
    getLastMoveDistance() {
        return this.toolsManager?.modifyState?.lastMoveDistance || 50;
    }
    
    /**
     * حفظ آخر مسافة تحريك
     */
    saveLastMoveDistance(distance) {
        if (this.toolsManager && this.toolsManager.modifyState) {
            this.toolsManager.modifyState.lastMoveDistance = distance;
        }
    }
}