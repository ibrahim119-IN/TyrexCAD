// ==================== js/tools/modify/RotateTool.js ====================

import { ModifyToolBase, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة التدوير - محدثة بالإدخال الديناميكي الكامل
 * Rotate Tool with Complete Dynamic Input Support
 */
export class RotateTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-sync-alt';
        this.centerPoint = null;
        this.referenceAngle = 0;
        this.currentAngle = 0;
        this.rotationAngle = 0;
        this.hasReference = false;
    }
    
    onActivate() {
        if (!super.onActivate()) return;
        
        this.resetState();
        this.updateStatus('Specify center point of rotation');
    }
    
    onDeactivate() {
        this.hideDynamicInput();
        this.clearPreview();
        super.onDeactivate();
    }
    
    onClick(point) {
        if (!this.centerPoint) {
            // النقطة الأولى - مركز الدوران
            this.centerPoint = point;
            this.cad.isDrawing = true;
            this.updateStatus('Specify reference angle or type rotation angle');
            
            // عرض الإدخال الديناميكي
            this.showDynamicInput();
            
        } else if (!this.hasReference) {
            // النقطة الثانية - الزاوية المرجعية
            this.referenceAngle = Math.atan2(
                point.y - this.centerPoint.y,
                point.x - this.centerPoint.x
            );
            this.hasReference = true;
            this.updateStatus('Specify new angle');
            
        } else {
            // النقطة الثالثة - الزاوية الجديدة
            const newAngle = Math.atan2(
                point.y - this.centerPoint.y,
                point.x - this.centerPoint.x
            );
            const rotation = newAngle - this.referenceAngle;
            this.applyRotation(rotation);
        }
    }
    
    /**
     * معالجة حركة الماوس المحدثة
     */
    processMouseMove(point) {
        if (!this.centerPoint) return;
        
        // حساب الزاوية الحالية
        this.currentAngle = Math.atan2(
            point.y - this.centerPoint.y,
            point.x - this.centerPoint.x
        );
        
        let effectiveRotation;
        
        if (this.constrainedMode && this.constrainedValue !== null) {
            // وضع مقيد: استخدم الزاوية المحددة
            effectiveRotation = this.constrainedValue * Math.PI / 180;
        } else if (this.hasReference) {
            // حساب الدوران من الزاوية المرجعية
            effectiveRotation = this.currentAngle - this.referenceAngle;
        } else {
            // عرض الزاوية المطلقة
            effectiveRotation = this.currentAngle;
        }
        
        this.rotationAngle = effectiveRotation;
        
        // تحديث القيمة في Dynamic Input (بالدرجات)
        if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            const degrees = effectiveRotation * 180 / Math.PI;
            this.cad.dynamicInputManager.updateLiveValue(degrees);
        }
        
        // عرض المعاينة
        this.showRotationPreview(effectiveRotation);
        
        // تحديث الحالة
        const degrees = effectiveRotation * 180 / Math.PI;
        this.updateStatus(
            `Rotation: ${degrees.toFixed(1)}°` +
            (this.constrainedMode ? ' [CONSTRAINED]' : '') +
            (this.hasReference ? ' from reference' : ' absolute')
        );
    }
    
    /**
     * عرض الإدخال الديناميكي
     */
    showDynamicInput() {
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.ANGLE,
            label: 'Angle',
            defaultValue: this.getLastRotationAngle(),
            placeholder: 'Rotation angle',
            
            onInput: (value) => {
                if (value !== null && value !== '') {
                    // القيمة بالدرجات، نحولها لراديان للاستخدام الداخلي
                    this.constrainedMode = true;
                    this.constrainedValue = value; // حفظ بالدرجات
                    this.rotationAngle = value * Math.PI / 180;
                    
                    // تحديث المعاينة فوراً
                    this.updateConstrainedPreview();
                } else {
                    // العودة للوضع الحر
                    this.constrainedMode = false;
                    this.constrainedValue = null;
                }
            },
            
            onConfirm: (value) => {
                if (value !== null) {
                    // تطبيق الدوران بالزاوية المحددة
                    const angleRad = value * Math.PI / 180;
                    this.applyRotation(angleRad);
                }
            },
            
            onCancel: () => {
                this.cancel();
            }
        });
    }
    
    /**
     * تحديث المعاينة المقيدة
     */
    updateConstrainedPreview() {
        if (!this.centerPoint || this.constrainedValue === null) return;
        
        const angleRad = this.constrainedValue * Math.PI / 180;
        this.showRotationPreview(angleRad);
    }
    
    /**
     * عرض معاينة الدوران
     */
    showRotationPreview(angle) {
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
        
        // 2. الأشكال المدورة
        this.originalShapes.forEach(shape => {
            const rotated = this.cad.cloneShape(shape);
            this.cad.rotateShape(rotated, this.centerPoint, angle);
            rotated.tempStyle = {
                opacity: 0.8,
                lineType: this.constrainedMode ? 'solid' : 'dashed',
                color: this.cad.previewColor || '#00d4aa'
            };
            tempShapes.push(rotated);
        });
        
        // 3. مركز الدوران
        const centerMarker = {
            type: 'circle',
            center: this.centerPoint,
            radius: 4 / this.cad.zoom,
            color: '#ff9900',
            lineWidth: 2,
            filled: true,
            tempStyle: { opacity: 0.9 }
        };
        tempShapes.push(centerMarker);
        
        // 4. خطوط شعاعية لإظهار الزاوية
        const radius = Math.min(100, this.getMaxDistance()) / this.cad.zoom;
        
        // خط الزاوية المرجعية (إن وجد)
        if (this.hasReference) {
            const refLine = {
                type: 'line',
                start: this.centerPoint,
                end: {
                    x: this.centerPoint.x + radius * Math.cos(this.referenceAngle),
                    y: this.centerPoint.y + radius * Math.sin(this.referenceAngle)
                },
                color: '#888',
                lineWidth: 1,
                lineType: 'dashed',
                tempStyle: { opacity: 0.5 }
            };
            tempShapes.push(refLine);
        }
        
        // خط الزاوية الحالية
        const currentLine = {
            type: 'line',
            start: this.centerPoint,
            end: {
                x: this.centerPoint.x + radius * Math.cos(this.referenceAngle + angle),
                y: this.centerPoint.y + radius * Math.sin(this.referenceAngle + angle)
            },
            color: '#00ffcc',
            lineWidth: 2,
            tempStyle: { opacity: 0.8 }
        };
        tempShapes.push(currentLine);
        
        // 5. قوس يظهر الزاوية
        if (Math.abs(angle) > 0.01) {
            const arc = {
                type: 'arc',
                center: this.centerPoint,
                radius: radius * 0.3,
                startAngle: this.hasReference ? this.referenceAngle : 0,
                endAngle: (this.hasReference ? this.referenceAngle : 0) + angle,
                color: '#00ffcc',
                lineWidth: 2,
                tempStyle: { opacity: 0.6 }
            };
            tempShapes.push(arc);
        }
        
        this.clearPreview();
        this.showPreview(tempShapes);
    }
    
    /**
     * الحصول على أقصى مسافة من المركز
     */
    getMaxDistance() {
        let maxDist = 100;
        
        this.originalShapes.forEach(shape => {
            const bounds = this.cad.getShapeBounds(shape);
            if (bounds) {
                const corners = [
                    { x: bounds.minX, y: bounds.minY },
                    { x: bounds.maxX, y: bounds.minY },
                    { x: bounds.maxX, y: bounds.maxY },
                    { x: bounds.minX, y: bounds.maxY }
                ];
                
                corners.forEach(corner => {
                    const dist = Math.sqrt(
                        Math.pow(corner.x - this.centerPoint.x, 2) +
                        Math.pow(corner.y - this.centerPoint.y, 2)
                    );
                    maxDist = Math.max(maxDist, dist);
                });
            }
        });
        
        return maxDist;
    }
    
    /**
     * تطبيق الدوران
     */
    applyRotation(angle) {
        // تسجيل للـ undo
        this.applyModification();
        
        // تدوير الأشكال
        this.selection.forEach((shape, index) => {
            const original = this.originalShapes[index];
            this.cad.copyShapeProperties(shape, original);
            this.cad.rotateShape(shape, this.centerPoint, angle);
        });
        
        // حفظ الزاوية
        this.saveLastRotationAngle(angle * 180 / Math.PI);
        
        // إنهاء العملية
        this.finishOperation();
        
        // رسالة النجاح
        const degrees = (angle * 180 / Math.PI).toFixed(1);
        this.updateStatus(
            `Rotated ${this.selection.length} object${this.selection.length > 1 ? 's' : ''} ` +
            `by ${degrees}°`
        );
    }
    
    /**
     * معالجة المفاتيح
     */
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cancel();
        } else if (key === 'Enter' && this.centerPoint) {
            if (this.constrainedMode && this.constrainedValue !== null) {
                // تطبيق بالزاوية المقيدة
                const angleRad = this.constrainedValue * Math.PI / 180;
                this.applyRotation(angleRad);
            } else if (this.hasReference) {
                // تطبيق بالزاوية الحالية
                this.applyRotation(this.rotationAngle);
            }
        }
    }
    
    /**
     * إعادة تعيين الحالة
     */
    resetState() {
        this.centerPoint = null;
        this.referenceAngle = 0;
        this.currentAngle = 0;
        this.rotationAngle = 0;
        this.hasReference = false;
        this.constrainedValue = null;
        this.constrainedMode = false;
    }
    
    /**
     * الحصول على آخر زاوية دوران
     */
    getLastRotationAngle() {
        return this.toolsManager?.modifyState?.lastRotationAngle || 0;
    }
    
    /**
     * حفظ آخر زاوية دوران
     */
    saveLastRotationAngle(degrees) {
        if (this.toolsManager && !this.toolsManager.modifyState) {
            this.toolsManager.modifyState = {};
        }
        if (this.toolsManager) {
            this.toolsManager.modifyState.lastRotationAngle = degrees;
        }
    }
}