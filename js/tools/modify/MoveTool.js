// ==================== js/tools/modify/MoveTool.js ====================

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة التحريك - النسخة النهائية المتكاملة
 * Move Tool with Complete Dynamic Input Integration
 */
export class MoveTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-arrows-alt';
        this.basePoint = null;
        this.constrainedDistance = null;
        this.lastDistance = 0;
        this.currentAngle = 0;
        this.isConstrainedMode = false;
    }
    
    onActivate() {
        // إعادة تعيين الحالة
        this.resetState();
        
        // استدعاء الأصل
        if (!super.onActivate()) return;
        
        this.updateStatus('Select base point for move');
    }
    
    onDeactivate() {
        // إخفاء Dynamic Input
        if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            this.cad.dynamicInputManager.hide();
        }
        
        // تنظيف
        this.clearPreview();
        super.onDeactivate();
    }
    
    onClick(point) {
        if (!this.basePoint) {
            // النقطة الأولى - نقطة الأساس
            this.basePoint = point;
            this.cad.isDrawing = true;
            this.updateStatus('Select second point or type distance');
            
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
        
        // حساب المسافة والاتجاه
        const dx = point.x - this.basePoint.x;
        const dy = point.y - this.basePoint.y;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        this.currentAngle = Math.atan2(dy, dx);
        
        // تحديد المسافة الفعلية
        let effectiveDistance, effectiveDx, effectiveDy;
        
        if (this.isConstrainedMode && this.constrainedDistance !== null && this.constrainedDistance > 0) {
            // وضع مقيد: استخدم المسافة المحددة في اتجاه المؤشر
            effectiveDistance = this.constrainedDistance;
            effectiveDx = effectiveDistance * Math.cos(this.currentAngle);
            effectiveDy = effectiveDistance * Math.sin(this.currentAngle);
        } else {
            // وضع حر: تتبع المؤشر
            effectiveDistance = currentDistance;
            effectiveDx = dx;
            effectiveDy = dy;
        }
        
        // تحديث القيمة في Dynamic Input
        if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            this.cad.dynamicInputManager.updateLiveValue(currentDistance);
        }
        
        // عرض المعاينة
        this.showMovePreview(effectiveDx, effectiveDy);
        
        // تحديث الحالة
        const angleDeg = this.currentAngle * 180 / Math.PI;
        this.updateStatus(
            `Distance: ${effectiveDistance.toFixed(2)} ${this.cad.currentUnit}, ` +
            `Angle: ${angleDeg.toFixed(1)}°` +
            (this.isConstrainedMode ? ' [CONSTRAINED]' : '')
        );
        
        this.lastDistance = currentDistance;
    }
    
    /**
     * عرض الإدخال الديناميكي
     */
    showDynamicInput() {
        if (!this.cad.dynamicInputManager) {
            console.error('❌ DynamicInputManager not available!');
            return;
        }
        
        this.cad.dynamicInputManager.show({
            label: 'Distance',
            unit: this.cad.currentUnit || 'mm',
            defaultValue: '',
            placeholder: 'Type distance or move freely',
            decimals: 2,
            min: 0,
            liveUpdate: true,
            trackMouse: true, // ⭐ مهم جداً
            startMode: 'passive',
            autoFocus: false, // لا نريد التركيز التلقائي حتى يمكن الحركة الحرة
            
            onInput: (value) => {
                // المستخدم بدأ الكتابة
                if (value !== null && value !== '') {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.isConstrainedMode = true;
                        this.constrainedDistance = numValue;
                        
                        // تحديث المعاينة فوراً
                        this.updateConstrainedPreview();
                    }
                } else {
                    // مسح القيمة = العودة للوضع الحر
                    this.isConstrainedMode = false;
                    this.constrainedDistance = null;
                }
            },
            
            onLiveUpdate: (value, isLocked) => {
                // تحديث حي من حركة الماوس
                // لا نحتاج لفعل شيء هنا لأن onMouseMove يتولى التحديث
            },
            
            onConfirm: (value) => {
                if (value && value > 0) {
                    // تطبيق بالقيمة المحددة
                    const dx = value * Math.cos(this.currentAngle);
                    const dy = value * Math.sin(this.currentAngle);
                    this.applyMove(dx, dy);
                } else if (!this.isConstrainedMode && this.lastDistance > 0) {
                    // تطبيق بالموضع الحالي
                    const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
                    const dx = world.x - this.basePoint.x;
                    const dy = world.y - this.basePoint.y;
                    this.applyMove(dx, dy);
                } else {
                    // إلغاء
                    this.cancel();
                }
            },
            
            onCancel: () => {
                this.cancel();
            },
            
            onTab: () => {
                // Tab يبدل بين الوضع المقيد والحر
                if (this.isConstrainedMode) {
                    this.isConstrainedMode = false;
                    this.constrainedDistance = null;
                } else if (this.lastDistance > 0) {
                    this.isConstrainedMode = true;
                    this.constrainedDistance = this.lastDistance;
                }
            }
        });
    }
    
    /**
     * تحديث المعاينة للوضع المقيد
     */
    updateConstrainedPreview() {
        if (!this.basePoint || !this.constrainedDistance) return;
        
        // استخدم الاتجاه الحالي مع المسافة المقيدة
        const dx = this.constrainedDistance * Math.cos(this.currentAngle);
        const dy = this.constrainedDistance * Math.sin(this.currentAngle);
        
        this.showMovePreview(dx, dy);
    }
    
    /**
     * عرض معاينة الحركة المحسنة
     */
    showMovePreview(dx, dy) {
        const tempShapes = [];
        
        // 1. الأشكال الأصلية (باهتة)
        this.originalShapes.forEach(shape => {
            const ghost = this.cad.cloneShape(shape);
            ghost.tempStyle = {
                opacity: 0.3,
                lineType: 'solid',
                color: '#666'
            };
            tempShapes.push(ghost);
        });
        
        // 2. الأشكال في الموضع الجديد
        this.originalShapes.forEach(shape => {
            const preview = this.cad.cloneShape(shape);
            this.cad.translateShape(preview, dx, dy);
            preview.tempStyle = {
                opacity: 0.8,
                lineType: this.isConstrainedMode ? 'solid' : 'dashed',
                color: this.cad.previewColor || '#00d4aa'
            };
            tempShapes.push(preview);
        });
        
        // 3. خط الحركة
        const moveLine = {
            type: 'line',
            start: this.basePoint,
            end: {
                x: this.basePoint.x + dx,
                y: this.basePoint.y + dy
            },
            color: this.cad.previewColor || '#00d4aa',
            lineWidth: 1,
            lineType: 'dashed',
            tempStyle: { opacity: 0.6 }
        };
        tempShapes.push(moveLine);
        
        // 4. سهم الاتجاه
        const arrowSize = Math.min(15, this.lastDistance * 0.1) / this.cad.zoom;
        const angle = Math.atan2(dy, dx);
        const arrowEnd = moveLine.end;
        
        const arrow1 = {
            type: 'line',
            start: arrowEnd,
            end: {
                x: arrowEnd.x - arrowSize * Math.cos(angle - Math.PI/6),
                y: arrowEnd.y - arrowSize * Math.sin(angle - Math.PI/6)
            },
            color: this.cad.previewColor || '#00d4aa',
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
            color: this.cad.previewColor || '#00d4aa',
            lineWidth: 2,
            tempStyle: { opacity: 0.8 }
        };
        
        tempShapes.push(arrow1, arrow2);
        
        // 5. نقطة البداية
        const startMarker = {
            type: 'circle',
            center: this.basePoint,
            radius: 3 / this.cad.zoom,
            color: '#ff9900',
            lineWidth: 2,
            filled: true,
            tempStyle: { opacity: 0.8 }
        };
        tempShapes.push(startMarker);
        
        this.clearPreview();
        this.showPreview(tempShapes);
    }
    
    /**
     * تطبيق الحركة
     */
    applyMove(dx, dy) {
        // تسجيل للـ undo
        this.applyModification();
        
        // تحريك الأشكال
        this.selection.forEach((shape, index) => {
            const original = this.originalShapes[index];
            this.cad.copyShapeProperties(shape, original);
            this.cad.translateShape(shape, dx, dy);
        });
        
        // حساب وحفظ المسافة
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.saveLastMoveDistance(distance);
        
        // إنهاء العملية
        this.finishOperation();
        
        // رسالة النجاح
        const angleDeg = (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1);
        this.updateStatus(
            `Moved ${this.selection.length} object${this.selection.length > 1 ? 's' : ''} ` +
            `by ${distance.toFixed(2)} ${this.cad.currentUnit} at ${angleDeg}°`
        );
    }
    
    /**
     * إنهاء العملية
     */
    finishOperation() {
        // إخفاء Dynamic Input
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
            if (this.isConstrainedMode && this.constrainedDistance > 0) {
                // تطبيق بالقيمة المقيدة
                const dx = this.constrainedDistance * Math.cos(this.currentAngle);
                const dy = this.constrainedDistance * Math.sin(this.currentAngle);
                this.applyMove(dx, dy);
            } else if (this.lastDistance > 0) {
                // تطبيق بالموضع الحالي
                const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
                const dx = world.x - this.basePoint.x;
                const dy = world.y - this.basePoint.y;
                this.applyMove(dx, dy);
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
        this.constrainedDistance = null;
        this.lastDistance = 0;
        this.currentAngle = 0;
        this.isConstrainedMode = false;
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