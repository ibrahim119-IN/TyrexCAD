// ==================== js/tools/drawing/LineTool.js ====================

import { DrawingToolBase, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة رسم الخط - محدثة بالإدخال المتعدد (طول/زاوية)
 * Line Tool with Multi-Input Support (Length/Angle)
 */
export class LineTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-slash';
        this.lastEndPoint = null;
        this.lineCount = 0;
        this.currentDistance = 0;
        this.currentAngle = 0;
        
        // القيم المدخلة
        this.inputLength = null;
        this.inputAngle = null;
        this.activeField = 'length'; // 'length' أو 'angle'
    }
    
    onActivate() {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return false;
        }
        
        super.onActivate();
        this.resetState();
        this.updateStatus('Specify first point');
        
        // إضافة معالج للكليك اليمين
        this.contextMenuHandler = (e) => {
            if (this.cad.isDrawing) {
                e.preventDefault();
                this.finishDrawing();
            }
        };
        
        if (this.cad.canvas) {
            this.cad.canvas.addEventListener('contextmenu', this.contextMenuHandler);
        }
    }
    
    onDeactivate() {
        // إزالة معالج الكليك اليمين
        if (this.cad.canvas && this.contextMenuHandler) {
            this.cad.canvas.removeEventListener('contextmenu', this.contextMenuHandler);
        }
        
        // إخفاء Dynamic Input
        this.hideDynamicInput();
        
        // تنظيف
        this.finishDrawing();
        super.onDeactivate();
    }
    
    /**
     * معالجة النقر بالماوس
     * @param {Object} point - نقطة النقر
     */
    onClick(point) {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return;
        }
        
        if (!this.cad.isDrawing) {
            // بداية رسم خط جديد أو سلسلة جديدة
            this.cad.isDrawing = true;
            
            // استخدام آخر نقطة نهاية إن وجدت للرسم المستمر
            const startPoint = this.lastEndPoint || point;
            this.addPoint(startPoint);
            
            // إذا كانت هناك خصائص معلقة (من أمر مباشر)
            if (this.cad.pendingShapeProperties && this.cad.pendingShapeProperties.lineLength > 0) {
                const length = this.cad.pendingShapeProperties.lineLength;
                const angle = (this.cad.pendingShapeProperties.lineAngle || 0) * Math.PI / 180;
                
                const endPoint = {
                    x: startPoint.x + length * Math.cos(angle),
                    y: startPoint.y + length * Math.sin(angle)
                };
                
                this.createLine(startPoint, endPoint);
                this.lastEndPoint = endPoint;
                this.lineCount++;
                
                // إعادة تعيين للاستمرار
                this.drawingPoints = [];
                this.cad.isDrawing = false;
                this.cad.pendingShapeProperties = null;
                
                this.updateStatus(`Line ${this.lineCount} created. Specify next point or ESC/Space to finish`);
            } else {
                this.updateStatus('Specify second point or type length/angle (Tab to switch)');
                
                // عرض الإدخال الديناميكي المتعدد
                this.showDynamicInput();
            }
        } else {
            // نقطة النهاية - تطبيق قيود Ortho/Polar
            const constrainedPoint = this.applyConstraints(this.drawingPoints[0], point);
            this.createLine(this.drawingPoints[0], constrainedPoint);
            this.lastEndPoint = constrainedPoint;
            this.lineCount++;
            
            // الاستمرار من نقطة النهاية
            this.drawingPoints = [constrainedPoint];
            this.updateStatus(`Line ${this.lineCount} created. Specify next point or ESC/Space to finish`);
            
            // إعادة تعيين القيم المدخلة
            this.inputLength = null;
            this.inputAngle = null;
            this.activeField = 'length';
            
            // إعادة عرض الإدخال الديناميكي للخط التالي
            this.showDynamicInput();
        }
    }
    
    /**
     * معالجة حركة الماوس
     */
    onMouseMove(point) {
        if (this.cad.isDrawing && this.drawingPoints.length > 0) {
            // تطبيق قيود Ortho/Polar
            const constrainedPoint = this.applyConstraints(this.drawingPoints[0], point);
            
            // حساب المسافة والزاوية
            const dx = constrainedPoint.x - this.drawingPoints[0].x;
            const dy = constrainedPoint.y - this.drawingPoints[0].y;
            this.currentDistance = Math.sqrt(dx * dx + dy * dy);
            this.currentAngle = Math.atan2(dy, dx);
            
            // تحديد النقطة النهائية الفعلية
            let endPoint = constrainedPoint;
            
            // تطبيق القيم المدخلة
            if (this.inputLength !== null || this.inputAngle !== null) {
                endPoint = this.calculateEndPoint();
            }
            
            // عرض المعاينة
            this.showLinePreview(this.drawingPoints[0], endPoint);
            
            // تحديث القيمة في Dynamic Input (بالوحدة الحالية)
            this.updateDynamicInputValues();
            
            // تحديث الحالة
            this.updateStatusMessage();
        }
    }
    
    /**
     * حساب نقطة النهاية بناءً على القيم المدخلة
     */
    calculateEndPoint() {
        const start = this.drawingPoints[0];
        
        // تحديد الطول
        let length = this.inputLength !== null ? this.inputLength : this.currentDistance;
        
        // تحديد الزاوية
        let angle = this.inputAngle !== null ? (this.inputAngle * Math.PI / 180) : this.currentAngle;
        
        return {
            x: start.x + length * Math.cos(angle),
            y: start.y + length * Math.sin(angle)
        };
    }
    
    /**
     * عرض الإدخال الديناميكي المتعدد
     */
    showDynamicInput() {
        // نحتاج لتعديل DynamicInputManager لدعم حقول متعددة
        // حالياً سنستخدم حقل واحد ونتبدل بينهما
        this.updateDynamicInputField();
    }
    
    /**
     * تحديث حقل الإدخال الديناميكي
     */
    updateDynamicInputField() {
        const isLengthField = this.activeField === 'length';
        
        this.showDynamicInputForValue({
            inputType: isLengthField ? INPUT_TYPES.DISTANCE : INPUT_TYPES.ANGLE,
            label: isLengthField ? 'Length' : 'Angle',
            defaultValue: isLengthField ? this.getLastLineLength() : this.getLastLineAngle(),
            placeholder: isLengthField ? 'Line length' : 'Line angle',
            
            onInput: (value) => {
                if (value !== null && value !== '') {
                    if (isLengthField) {
                        this.inputLength = value;
                    } else {
                        this.inputAngle = value;
                    }
                    
                    // تحديث المعاينة فوراً
                    this.updateConstrainedPreview();
                } else {
                    if (isLengthField) {
                        this.inputLength = null;
                    } else {
                        this.inputAngle = null;
                    }
                }
            },
            
            onConfirm: (value) => {
                if (this.drawingPoints.length > 0) {
                    // تأكد من أن لدينا القيم المطلوبة
                    if (this.inputLength === null && this.inputAngle === null) {
                        // لا توجد قيم مدخلة
                        return;
                    }
                    
                    const endPoint = this.calculateEndPoint();
                    
                    this.createLine(this.drawingPoints[0], endPoint);
                    this.lastEndPoint = endPoint;
                    this.lineCount++;
                    
                    // الاستمرار من نقطة النهاية
                    this.drawingPoints = [endPoint];
                    this.inputLength = null;
                    this.inputAngle = null;
                    this.activeField = 'length';
                    
                    // مسح الإدخال والاستمرار
                    if (this.cad.dynamicInputManager) {
                        this.cad.dynamicInputManager.clearInput();
                    }
                    
                    this.updateStatus(`Line ${this.lineCount} created. Specify next point or ESC/Space to finish`);
                    
                    // إعادة عرض للخط التالي
                    this.updateDynamicInputField();
                }
            },
            
            onTab: () => {
                // التبديل بين حقل الطول والزاوية
                const wasLength = this.activeField === 'length';
                this.activeField = wasLength ? 'angle' : 'length';
                
                // حفظ القيمة الحالية قبل التبديل
                const currentInputValue = this.cad.dynamicInputManager?.inputElement?.value || '';
                
                // تحديث الحقل مباشرة بدون إخفاء
                if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
                    // تحديث الإعدادات
                    const isLengthField = this.activeField === 'length';
                    
                    // تحديث التسمية
                    this.cad.dynamicInputManager.labelElement.textContent = 
                        isLengthField ? 'Length:' : 'Angle:';
                    
                    // تحديث الوحدة
                    this.cad.dynamicInputManager.unitElement.textContent = 
                        isLengthField ? (this.cad.currentUnit || 'mm') : '°';
                    
                    // تحديث placeholder
                    this.cad.dynamicInputManager.inputElement.placeholder = 
                        isLengthField ? 'Line length' : 'Line angle';
                    
                    // تحديث نوع الإدخال في التكوين
                    this.dynamicInputConfig.inputType = 
                        isLengthField ? INPUT_TYPES.DISTANCE : INPUT_TYPES.ANGLE;
                    
                    // مسح الحقل وإعطاء التركيز
                    this.cad.dynamicInputManager.inputElement.value = '';
                    this.cad.dynamicInputManager.inputElement.focus();
                    this.cad.dynamicInputManager.inputElement.select();
                    
                    // إذا كان هناك قيمة مدخلة سابقاً، اعرضها
                    if (isLengthField && this.inputLength !== null) {
                        let displayValue = this.inputLength;
                        if (this.cad.units && this.cad.currentUnit) {
                            try {
                                displayValue = this.cad.units.fromInternal(this.inputLength, this.cad.currentUnit);
                            } catch (e) {}
                        }
                        this.cad.dynamicInputManager.inputElement.value = displayValue.toFixed(2);
                    } else if (!isLengthField && this.inputAngle !== null) {
                        this.cad.dynamicInputManager.inputElement.value = this.inputAngle.toFixed(1);
                    }
                    
                    // تحديث رسالة الحالة
                    this.updateStatusMessage();
                }
            }
        });
    }
    
    /**
     * تحديث قيم الإدخال الديناميكي
     */
    updateDynamicInputValues() {
        if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            if (this.activeField === 'length') {
                let displayDistance = this.currentDistance;
                if (this.cad.units && this.cad.currentUnit) {
                    try {
                        displayDistance = this.cad.units.fromInternal(this.currentDistance, this.cad.currentUnit);
                    } catch (e) {
                        // استخدام القيمة الأصلية
                    }
                }
                this.cad.dynamicInputManager.updateLiveValue(displayDistance);
            } else {
                const angleDeg = this.currentAngle * 180 / Math.PI;
                this.cad.dynamicInputManager.updateLiveValue(angleDeg);
            }
        }
    }
    
    /**
     * تحديث رسالة الحالة
     */
    updateStatusMessage() {
        const angleDeg = this.currentAngle * 180 / Math.PI;
        let displayDist = this.currentDistance;
        
        if (this.cad.units && this.cad.currentUnit) {
            try {
                displayDist = this.cad.units.fromInternal(this.currentDistance, this.cad.currentUnit);
            } catch (e) {
                // استخدام القيمة الأصلية
            }
        }
        
        let status = `Length: ${displayDist.toFixed(2)} ${this.cad.currentUnit}, ` +
                    `Angle: ${angleDeg.toFixed(1)}°`;
        
        // إضافة حالة القيم المدخلة
        if (this.inputLength !== null) {
            let inputLengthDisplay = this.inputLength;
            if (this.cad.units && this.cad.currentUnit) {
                try {
                    inputLengthDisplay = this.cad.units.fromInternal(this.inputLength, this.cad.currentUnit);
                } catch (e) {}
            }
            status += ` [L: ${inputLengthDisplay.toFixed(2)}]`;
        }
        
        if (this.inputAngle !== null) {
            status += ` [A: ${this.inputAngle.toFixed(1)}°]`;
        }
        
        status += ` [${this.activeField.toUpperCase()}]`;
        
        if (this.cad.orthoEnabled) status += ' [ORTHO]';
        if (this.cad.polarEnabled) status += ' [POLAR]';
        
        this.updateStatus(status);
    }
    
    /**
     * تحديث المعاينة المقيدة
     */
    updateConstrainedPreview() {
        if (!this.drawingPoints.length) return;
        
        const endPoint = this.calculateEndPoint();
        this.showLinePreview(this.drawingPoints[0], endPoint);
    }
    
    /**
     * عرض معاينة الخط
     */
    showLinePreview(start, end) {
        // استخدام خصائص الطبقة الحالية للمعاينة
        const currentLayer = this.cad.layerManager?.getCurrentLayer();
        
        this.tempShape = {
            type: 'line',
            start: start,
            end: end,
            color: currentLayer?.color || this.cad.currentColor,
            lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
            lineType: currentLayer?.lineType || this.cad.currentLineType,
            tempStyle: {
                opacity: 0.8,
                dashArray: (this.inputLength !== null || this.inputAngle !== null) ? null : [5, 5]
            }
        };
        
        this.cad.tempShape = this.tempShape;
        this.cad.render();
    }
    
    /**
     * إنشاء الخط
     */
    createLine(start, end) {
        const shape = this.createShape({
            type: 'line',
            start: start,
            end: end
        });
        
        this.cad.addShape(shape);
        
        // حفظ طول وزاوية الخط
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        this.saveLastLineLength(length);
        this.saveLastLineAngle(angle);
        
        // لا نعيد تعيين isDrawing للسماح بالرسم المستمر
    }
    
    /**
     * إنهاء الرسم
     */
    finishDrawing() {
        this.hideDynamicInput();
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.tempShape = null;
        this.cad.tempShape = null;
        this.constrainedValue = null;
        this.lastPoint = null;
        
        if (this.lineCount > 0) {
            this.updateStatus(`Drawing finished: ${this.lineCount} line${this.lineCount > 1 ? 's' : ''} created`);
        }
        
        // إعادة تعيين للرسم الجديد
        this.lastEndPoint = null;
        this.lineCount = 0;
        this.inputLength = null;
        this.inputAngle = null;
        this.activeField = 'length';
    }
    
    /**
     * معالجة المفاتيح
     */
    onKeyPress(key) {
        if (key === 'Escape' || key === ' ') {
            // إنهاء بـ ESC أو Space
            this.finishDrawing();
        } else if (key === 'Enter' && this.cad.isDrawing && this.drawingPoints.length > 0) {
            // رسم الخط بالقيم الحالية
            const endPoint = this.calculateEndPoint();
            
            this.createLine(this.drawingPoints[0], endPoint);
            this.lastEndPoint = endPoint;
            this.lineCount++;
            
            // الاستمرار من نقطة النهاية
            this.drawingPoints = [endPoint];
            this.inputLength = null;
            this.inputAngle = null;
            this.activeField = 'length';
            
            if (this.cad.dynamicInputManager) {
                this.cad.dynamicInputManager.clearInput();
            }
            
            // إعادة عرض للخط التالي
            this.updateDynamicInputField();
        } else if (key === 'Tab' && this.cad.isDrawing) {
            // Tab يتم معالجته في onTab callback
            // لا نحتاج لفعل شيء هنا
        }
    }
    
    /**
     * إعادة تعيين الحالة
     */
    resetState() {
        this.lastEndPoint = null;
        this.lineCount = 0;
        this.currentDistance = 0;
        this.currentAngle = 0;
        this.constrainedMode = false;
        this.constrainedValue = null;
        this.inputLength = null;
        this.inputAngle = null;
        this.activeField = 'length';
    }
    
    /**
     * الحصول على آخر طول خط
     */
    getLastLineLength() {
        const lastLength = this.toolsManager?.drawingState?.lastLineLength || 0;
        
        // تحويل من الوحدة الداخلية إلى الوحدة الحالية
        if (lastLength > 0 && this.cad.units && this.cad.currentUnit) {
            try {
                return this.cad.units.fromInternal(lastLength, this.cad.currentUnit);
            } catch (e) {
                return lastLength;
            }
        }
        
        return lastLength;
    }
    
    /**
     * حفظ آخر طول خط
     */
    saveLastLineLength(length) {
        if (this.toolsManager && !this.toolsManager.drawingState) {
            this.toolsManager.drawingState = {};
        }
        if (this.toolsManager) {
            this.toolsManager.drawingState.lastLineLength = length;
        }
    }
    
    /**
     * الحصول على آخر زاوية خط
     */
    getLastLineAngle() {
        return this.toolsManager?.drawingState?.lastLineAngle || 0;
    }
    
    /**
     * حفظ آخر زاوية خط
     */
    saveLastLineAngle(angle) {
        if (this.toolsManager && !this.toolsManager.drawingState) {
            this.toolsManager.drawingState = {};
        }
        if (this.toolsManager) {
            this.toolsManager.drawingState.lastLineAngle = angle;
        }
    }
}