// ==================== js/tools/BaseTool.js ====================

/**
 * Base Tool Classes with Enhanced Dynamic Input Support
 * الفئات الأساسية للأدوات مع دعم محسّن للإدخال الديناميكي
 */

/**
 * أنواع الإدخال المدعومة
 */
export const INPUT_TYPES = {
    DISTANCE: 'distance',
    ANGLE: 'angle',
    SCALE: 'scale',
    COUNT: 'count',
    TEXT: 'text',
    DIMENSION: 'dimension',
    COORDINATE: 'coordinate'
};

/**
 * الفئة الأساسية لجميع الأدوات
 */
export class BaseTool {
    constructor(toolsManager, name) {
        this.toolsManager = toolsManager;
        this.cad = toolsManager.cad;
        this.name = name;
        this.active = false;
        this.icon = '';
        this.cursor = 'crosshair';
        
        // حالة الأداة
        this.state = {};
        this.errors = [];
        
        // دعم الإدخال الديناميكي المحسّن
        this.waitingForInput = false;
        this.inputCallback = null;
        this.dynamicInputConfig = null;
        this.constrainedMode = false;
        this.constrainedValue = null;
        this.liveValue = null;
    }
    
    /**
     * تفعيل الأداة
     */
    activate() {
        this.active = true;
        this.onActivate();
        this.updateCursor();
    }
    
    /**
     * إلغاء تفعيل الأداة
     */
    deactivate() {
        this.active = false;
        
        // إلغاء أي إدخال ديناميكي نشط
        this.hideDynamicInput();
        
        this.onDeactivate();
        this.cleanup();
    }
    
    /**
     * تحديث شكل المؤشر
     */
    updateCursor() {
        if (this.cad.canvas) {
            this.cad.canvas.style.cursor = this.cursor;
        }
    }
    
    /**
     * تحديث رسالة الحالة
     */
    updateStatus(message) {
        if (this.cad.updateStatus) {
            this.cad.updateStatus(`${this.name.toUpperCase()}: ${message}`);
        }
    }
    
    /**
     * 🆕 تطبيق قيود Ortho/Polar على نقطة
     * @param {Object} basePoint - النقطة المرجعية
     * @param {Object} currentPoint - النقطة الحالية
     * @returns {Object} النقطة بعد تطبيق القيود
     */
    applyConstraints(basePoint, currentPoint) {
        // التحقق من وجود الأوضاع
        const orthoMode = this.cad.orthoEnabled || false;
        const polarMode = this.cad.polarEnabled || false;
        
        if (orthoMode) {
            return this.applyOrthoConstraint(basePoint, currentPoint);
        } else if (polarMode) {
            return this.applyPolarConstraint(basePoint, currentPoint);
        }
        
        return currentPoint;
    }
    
    /**
     * 🆕 تطبيق قيد Ortho (محاور أفقية/رأسية فقط)
     */
    applyOrthoConstraint(basePoint, currentPoint) {
        const dx = currentPoint.x - basePoint.x;
        const dy = currentPoint.y - basePoint.y;
        
        // تحديد أقرب محور
        if (Math.abs(dx) > Math.abs(dy)) {
            // المحور الأفقي
            return {
                x: currentPoint.x,
                y: basePoint.y
            };
        } else {
            // المحور الرأسي
            return {
                x: basePoint.x,
                y: currentPoint.y
            };
        }
    }
    
    /**
     * 🆕 تطبيق قيد Polar (زوايا محددة)
     */
    applyPolarConstraint(basePoint, currentPoint) {
        const dx = currentPoint.x - basePoint.x;
        const dy = currentPoint.y - basePoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // الحصول على الزاوية الحالية
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        
        // الحصول على زاوية Polar (افتراضياً كل 15 درجة مثل AutoCAD)
        const polarIncrement = this.cad.polarIncrement || 15;
        
        // العثور على أقرب زاوية polar
        const snappedAngle = Math.round(angle / polarIncrement) * polarIncrement;
        const snappedAngleRad = snappedAngle * Math.PI / 180;
        
        // حساب النقطة الجديدة
        return {
            x: basePoint.x + distance * Math.cos(snappedAngleRad),
            y: basePoint.y + distance * Math.sin(snappedAngleRad)
        };
    }
    
    /**
     * 🆕 تحويل القيمة من الوحدة الحالية إلى الوحدة الداخلية
     */
    convertToInternalUnit(value, inputType) {
        // فقط للمسافات والأبعاد
        if (inputType !== INPUT_TYPES.DISTANCE && 
            inputType !== INPUT_TYPES.DIMENSION && 
            inputType !== INPUT_TYPES.COORDINATE) {
            return value;
        }
        
        // إذا كان لدينا نظام وحدات
        if (this.cad.units && this.cad.currentUnit) {
            try {
                // التحويل من الوحدة الحالية إلى mm (الوحدة الداخلية)
                return this.cad.units.toInternal(value, this.cad.currentUnit);
            } catch (e) {
                console.warn('Unit conversion failed:', e);
                return value;
            }
        }
        
        return value;
    }
    
    /**
     * عرض الإدخال الديناميكي للقيمة - الدالة الموحدة الجديدة
     * @param {Object} options - خيارات الإدخال
     */
    showDynamicInputForValue(options) {
        if (!this.cad.dynamicInputManager) {
            console.warn('Dynamic input not available');
            return;
        }
        
        // الإعدادات الافتراضية الذكية حسب نوع الإدخال
        const typeDefaults = this.getInputTypeDefaults(options.inputType || INPUT_TYPES.DISTANCE);
        
        // دمج الإعدادات
        const config = {
            // الإعدادات الافتراضية العامة
            trackMouse: true,
            startMode: 'passive',
            autoFocus: false,
            liveUpdate: true,
            
            // إعدادات النوع المحدد
            ...typeDefaults,
            
            // إعدادات مخصصة من المستخدم
            ...options,
            
            // Callbacks محسّنة
            onInput: (value) => {
            this.handleDynamicInput(value, options.inputType);
            // تمرير القيمة المحولة (constrainedValue) بدلاً من القيمة الأصلية
            if (options.onInput) {
                options.onInput(this.constrainedValue);
            }
        },
            onLiveUpdate: (value, isLocked) => {
                this.liveValue = value;
                if (options.onLiveUpdate) options.onLiveUpdate(value, isLocked);
            },
            
            onConfirm: (value) => {
            // التأكد من استخدام القيمة المحولة
            let finalValue = value;
            
            if (this.constrainedMode && this.constrainedValue !== null) {
                // استخدام القيمة المحولة المحفوظة
                finalValue = this.constrainedValue;
            } else if (value !== null) {
                // تحويل القيمة إذا لم تكن محولة
                finalValue = this.convertToInternalUnit(value, options.inputType || INPUT_TYPES.DISTANCE);
            }
            
            this.applyConstrainedValue(finalValue, options.inputType);
            if (options.onConfirm) options.onConfirm(finalValue);
        },
            
            onCancel: () => {
                this.cancelDynamicInput();
                if (options.onCancel) options.onCancel();
            },
            
            onTab: () => {
                this.toggleConstrainedMode();
                if (options.onTab) options.onTab();
            }
        };
        
        // حفظ التكوين
        this.dynamicInputConfig = config;
        this.waitingForInput = true;
        
        // عرض الإدخال
        this.cad.dynamicInputManager.show(config);
    }
    
    /**
     * الحصول على الإعدادات الافتراضية حسب نوع الإدخال
     */
    getInputTypeDefaults(inputType) {
        switch (inputType) {
            case INPUT_TYPES.DISTANCE:
                return {
                    label: 'Distance',
                    unit: this.cad.currentUnit || 'mm',
                    placeholder: 'Enter distance',
                    decimals: 2,
                    min: 0
                };
                
            case INPUT_TYPES.ANGLE:
                return {
                    label: 'Angle',
                    unit: '°',
                    placeholder: 'Enter angle',
                    decimals: 1,
                    min: -360,
                    max: 360
                };
                
            case INPUT_TYPES.SCALE:
                return {
                    label: 'Scale',
                    unit: '',
                    placeholder: 'Scale factor',
                    decimals: 3,
                    min: 0.001,
                    defaultValue: 1
                };
                
            case INPUT_TYPES.COUNT:
                return {
                    label: 'Count',
                    unit: '',
                    placeholder: 'Number',
                    decimals: 0,
                    min: 1
                };
                
            case INPUT_TYPES.TEXT:
                return {
                    label: 'Text',
                    unit: '',
                    placeholder: 'Enter text',
                    trackMouse: false,
                    autoFocus: true
                };
                
            case INPUT_TYPES.DIMENSION:
                return {
                    label: 'Size',
                    unit: this.cad.currentUnit || 'mm',
                    placeholder: 'width,height',
                    decimals: 2
                };
                
            case INPUT_TYPES.COORDINATE:
                return {
                    label: 'Point',
                    unit: this.cad.currentUnit || 'mm',
                    placeholder: 'x,y',
                    decimals: 2
                };
                
            default:
                return {};
        }
    }
    
    /**
     * معالجة الإدخال الديناميكي
     */
    handleDynamicInput(value, inputType) {
        if (value === null || value === '') {
            // العودة للوضع الحر
            this.constrainedMode = false;
            this.constrainedValue = null;
        } else {
            // التحقق من صحة القيمة
            const validatedValue = this.validateInput(value, inputType);
            if (validatedValue !== null) {
                this.constrainedMode = true;
                this.constrainedValue = validatedValue;
                
                // تحديث المعاينة
                this.updateConstrainedPreview(validatedValue, inputType);
            }
        }
    }
    
    /**
     * التحقق من صحة الإدخال حسب النوع
     * 🆕 محدث لتحويل الوحدات
     */
    validateInput(value, inputType) {
        switch (inputType) {
            case INPUT_TYPES.DISTANCE:
                const distance = parseFloat(value);
                if (!isNaN(distance) && distance > 0) {
                    // تحويل من الوحدة الحالية إلى الوحدة الداخلية
                    return this.convertToInternalUnit(distance, inputType);
                }
                return null;
                
            case INPUT_TYPES.ANGLE:
                const angle = parseFloat(value);
                return !isNaN(angle) ? angle : null;
                
            case INPUT_TYPES.SCALE:
                const scale = parseFloat(value);
                return !isNaN(scale) && scale > 0 ? scale : null;
                
            case INPUT_TYPES.COUNT:
                const count = parseInt(value);
                return !isNaN(count) && count > 0 ? count : null;
                
            case INPUT_TYPES.TEXT:
                return value.trim() || null;
                
            case INPUT_TYPES.DIMENSION:
                // معالجة إدخال مثل "100,50" أو "100 50"
                const parts = value.split(/[,\s]+/);
                if (parts.length === 2) {
                    const width = parseFloat(parts[0]);
                    const height = parseFloat(parts[1]);
                    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                        return { 
                            width: this.convertToInternalUnit(width, inputType),
                            height: this.convertToInternalUnit(height, inputType)
                        };
                    }
                }
                return null;
                
            case INPUT_TYPES.COORDINATE:
                // معالجة إدخال مثل "100,50" أو "100 50"
                const coords = value.split(/[,\s]+/);
                if (coords.length === 2) {
                    const x = parseFloat(coords[0]);
                    const y = parseFloat(coords[1]);
                    if (!isNaN(x) && !isNaN(y)) {
                        return { 
                            x: this.convertToInternalUnit(x, inputType),
                            y: this.convertToInternalUnit(y, inputType)
                        };
                    }
                }
                return null;
                
            default:
                return value;
        }
    }
    
    /**
     * تحديث المعاينة المقيدة
     */
    updateConstrainedPreview(value, inputType) {
        // الأدوات الفرعية يمكنها تخصيص هذا
        this.updatePreview(value);
    }
    
    /**
     * تطبيق القيمة المقيدة
     */
    applyConstrainedValue(value, inputType) {
        this.constrainedValue = value;
        this.constrainedMode = true;
        
        // الأدوات الفرعية ستنفذ المنطق الخاص بها
        this.onConstrainedValueApplied(value, inputType);
    }
    
    /**
     * إلغاء الإدخال الديناميكي
     */
    cancelDynamicInput() {
        this.constrainedMode = false;
        this.constrainedValue = null;
        this.liveValue = null;
        this.waitingForInput = false;
        this.dynamicInputConfig = null;
    }
    
    /**
     * تبديل الوضع المقيد
     */
    toggleConstrainedMode() {
        this.constrainedMode = !this.constrainedMode;
        
        if (!this.constrainedMode) {
            this.constrainedValue = null;
        } else if (this.liveValue !== null) {
            this.constrainedValue = this.liveValue;
        }
    }
    
    /**
     * إخفاء الإدخال الديناميكي
     */
    hideDynamicInput() {
        if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            this.cad.dynamicInputManager.hide();
        }
        this.cancelDynamicInput();
    }
    
    /**
     * طلب إدخال ديناميكي من المستخدم (للتوافق مع الكود القديم)
     * @deprecated استخدم showDynamicInputForValue بدلاً من ذلك
     */
    requestDynamicInput(options, callback) {
        console.warn('requestDynamicInput is deprecated. Use showDynamicInputForValue instead.');
        
        this.showDynamicInputForValue({
            ...options,
            onConfirm: callback
        });
    }
    
    /**
     * تحديث المعاينة (يمكن للأدوات الفرعية تخصيصها)
     */
    updatePreview(value) {
        // تطبيق افتراضي فارغ
        // الأدوات الفرعية ستعيد تعريف هذه الدالة
    }
    
    /**
     * معالج تطبيق القيمة المقيدة (للأدوات الفرعية)
     */
    onConstrainedValueApplied(value, inputType) {
        // الأدوات الفرعية ستعيد تعريف هذه الدالة
    }
    
    /**
     * معالجة الأخطاء
     */
    handleError(error) {
        console.error(`Tool error (${this.name}):`, error);
        this.errors.push(error);
        this.updateStatus(`Error: ${error.message || error}`);
    }
    
    /**
     * التحقق من إمكانية الرسم على الطبقة الحالية
     */
    canDrawOnCurrentLayer() {
        if (this.cad.layerManager) {
            const currentLayer = this.cad.layerManager.getCurrentLayer();
            if (!currentLayer || currentLayer.locked || !currentLayer.visible) {
                this.updateStatus('Cannot draw on locked or hidden layer');
                this.deactivate();
                return false;
            }
        }
        return true;
    }
    
    /**
     * إنشاء شكل بخصائص الطبقة الحالية
     */
    createShape(shapeData) {
        const shape = Object.assign({}, shapeData);
        
        // تعيين معرف فريد
        shape.id = this.cad.generateId();
        
        // تطبيق خصائص الطبقة الحالية
        if (this.cad.layerManager) {
            const layer = this.cad.layerManager.getCurrentLayer();
            shape.layerId = layer.id;
            
            // الألوان والخصائص
            if (!shape.color) {
                shape.color = layer.color || this.cad.currentColor;
            }
            
            // سمك الخط
            if (!shape.lineWidth) {
                if (layer.lineWeight !== undefined && layer.lineWeight !== 'bylayer') {
                    shape.lineWidth = layer.lineWeight === 'default' ? 
                        this.cad.currentLineWidth : layer.lineWeight;
                } else {
                    shape.lineWidth = this.cad.currentLineWidth;
                }
            }
            
            // نوع الخط
            if (!shape.lineType) {
                shape.lineType = layer.lineType || this.cad.currentLineType;
            }
        } else {
            // Fallback للنظام القديم
            shape.layerId = this.cad.currentLayerId || 0;
            shape.color = shape.color || this.cad.currentColor;
            shape.lineWidth = shape.lineWidth || this.cad.currentLineWidth;
            shape.lineType = shape.lineType || this.cad.currentLineType;
        }
        
        return shape;
    }
    
    /**
     * تنظيف
     */
    cleanup() {
        this.state = {};
        this.errors = [];
        this.waitingForInput = false;
        this.inputCallback = null;
        this.dynamicInputConfig = null;
        this.constrainedMode = false;
        this.constrainedValue = null;
        this.liveValue = null;
    }
    
    // Methods to override in subclasses
    onActivate() {}
    onDeactivate() {}
    onClick(point) {}
    onMouseMove(point) {}
    onKeyPress(key) {}
}

/**
 * الفئة الأساسية لأدوات الرسم مع دعم الإدخال الديناميكي المحسّن
 */
export class DrawingToolBase extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.drawingPoints = [];
        this.tempShape = null;
        this.lastPoint = null;
        this.currentDistance = 0;
        this.currentAngle = 0;
    }
    
    onActivate() {
        this.drawingPoints = [];
        this.tempShape = null;
        this.constrainedValue = null;
        this.lastPoint = null;
        this.currentDistance = 0;
        this.currentAngle = 0;
    }
    
    onDeactivate() {
        this.finishDrawing();
    }
    
    finishDrawing() {
        this.hideDynamicInput();
        this.cad.isDrawing = false;
        this.drawingPoints = [];
        this.tempShape = null;
        this.cad.tempShape = null;
        this.constrainedValue = null;
        this.lastPoint = null;
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
        this.cad.drawingPoints = this.drawingPoints;
        this.lastPoint = point;
    }
    
    /**
     * الحصول على نقطة مقيدة بناءً على الإدخال الديناميكي
     * 🆕 محدث لاستخدام قيود Ortho/Polar
     */
    getConstrainedPoint(basePoint, currentPoint, inputType = INPUT_TYPES.DISTANCE) {
        // تطبيق قيود Ortho/Polar أولاً
        let constrainedPoint = this.applyConstraints(basePoint, currentPoint);
        
        // ثم تطبيق القيود الديناميكية إن وجدت
        if (this.constrainedMode && this.constrainedValue !== null) {
            switch (inputType) {
                case INPUT_TYPES.DISTANCE:
                    // حساب النقطة بناءً على المسافة المقيدة
                    const angle = Math.atan2(
                        constrainedPoint.y - basePoint.y,
                        constrainedPoint.x - basePoint.x
                    );
                    
                    return {
                        x: basePoint.x + this.constrainedValue * Math.cos(angle),
                        y: basePoint.y + this.constrainedValue * Math.sin(angle)
                    };
                    
                case INPUT_TYPES.ANGLE:
                    // حساب النقطة بناءً على الزاوية المقيدة
                    const distance = Math.sqrt(
                        Math.pow(currentPoint.x - basePoint.x, 2) +
                        Math.pow(currentPoint.y - basePoint.y, 2)
                    );
                    const angleRad = this.constrainedValue * Math.PI / 180;
                    
                    return {
                        x: basePoint.x + distance * Math.cos(angleRad),
                        y: basePoint.y + distance * Math.sin(angleRad)
                    };
                    
                case INPUT_TYPES.COORDINATE:
                    // استخدام الإحداثيات المطلقة
                    return this.constrainedValue;
                    
                default:
                    return constrainedPoint;
            }
        }
        
        return constrainedPoint;
    }
    
    /**
     * تحديث المعلومات الحية (المسافة والزاوية)
     */
    updateLiveInfo(basePoint, currentPoint) {
        const dx = currentPoint.x - basePoint.x;
        const dy = currentPoint.y - basePoint.y;
        
        this.currentDistance = Math.sqrt(dx * dx + dy * dy);
        this.currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // تحديث القيمة الحية في الإدخال الديناميكي
        if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            if (this.dynamicInputConfig && this.dynamicInputConfig.inputType === INPUT_TYPES.ANGLE) {
                this.cad.dynamicInputManager.updateLiveValue(this.currentAngle);
            } else {
                // تحويل المسافة من الوحدة الداخلية إلى الوحدة الحالية للعرض
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
        }
    }
}

/**
 * الفئة الأساسية لأدوات التعديل مع دعم الإدخال الديناميكي المحسّن
 */
export class ModifyToolBase extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.selection = [];
        this.originalShapes = [];
        this.previewShapes = [];
        this.basePoint = null;
        this.referencePoint = null;
        this.showSelectionGrips = true;  // إضافة هذه الخاصية للسماح بعرض grips
    }
    
    onActivate() {
        this.selection = [];
        this.originalShapes = [];
        this.previewShapes = [];
        this.basePoint = null;
        this.referencePoint = null;
        
        // التحقق من وجود عناصر محددة قابلة للتعديل
        const modifiableShapes = this.getModifiableSelection();
        
        if (modifiableShapes.length === 0) {
            this.updateStatus('No modifiable objects selected');
            this.deactivate();
            return false;
        }
        
        // حفظ نسخ من الأشكال الأصلية
        this.selection = modifiableShapes;
        this.originalShapes = this.selection.map(s => this.cad.cloneShape(s));
        
        return true;
    }
    
    onDeactivate() {
        this.hideDynamicInput();
        this.clearPreview();
        super.onDeactivate();
    }
    
    /**
     * معالجة حركة الماوس
     * 🆕 محدث لاستخدام قيود Ortho/Polar
     */
    onMouseMove(point) {
        // تطبيق قيود Ortho/Polar إذا كان لدينا نقطة مرجعية
        if (this.basePoint) {
            const constrainedPoint = this.applyConstraints(this.basePoint, point);
            // استخدام النقطة المقيدة في المعالجة
            this.processMouseMove(constrainedPoint);
        } else {
            this.processMouseMove(point);
        }
    }
    
    /**
     * معالجة حركة الماوس (للأدوات الفرعية)
     */
    processMouseMove(point) {
        // الأدوات الفرعية ستعيد تعريف هذا
    }
    
    /**
     * الحصول على الأشكال المحددة القابلة للتعديل
     */
    getModifiableSelection() {
        const shapes = [];
        
        this.cad.selectedShapes.forEach(shape => {
            if (this.canModifyShape(shape)) {
                shapes.push(shape);
            }
        });
        
        return shapes;
    }
    
    /**
     * التحقق من إمكانية تعديل شكل
     */
    canModifyShape(shape) {
        // التحقق من القفل
        if (shape.locked) return false;
        
        // التحقق من الطبقة
        if (this.cad.layerManager) {
            const layer = this.cad.layerManager.getLayer(shape.layerId);
            if (layer && (layer.locked || !layer.visible)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * تطبيق التعديل
     */
    applyModification() {
        this.cad.recordState();
    }
    
    /**
     * عرض معاينة التعديل
     */
    showPreview(shapes) {
        this.previewShapes = shapes;
        this.cad.tempShapes = shapes;
        this.cad.render();
    }
    
    /**
     * مسح المعاينة
     */
    clearPreview() {
        this.previewShapes = [];
        this.cad.tempShapes = null;
        this.cad.render();
    }
    
    /**
     * إنهاء العملية
     */
    finishOperation() {
        this.hideDynamicInput();
        this.clearPreview();
        this.cad.isDrawing = false;
        this.cad.finishDrawing();
        this.resetState();
    }
    
    /**
     * إعادة تعيين الحالة
     */
    resetState() {
        this.basePoint = null;
        this.referencePoint = null;
        this.constrainedValue = null;
        this.constrainedMode = false;
        this.liveValue = null;
    }
    
    /**
     * إلغاء العملية
     */
    cancel() {
        this.finishOperation();
        this.updateStatus(`${this.name} cancelled`);
    }
    
    /**
     * معالجة المفاتيح الأساسية
     */
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cancel();
        } else if (key === 'Enter' && this.basePoint) {
            // تطبيق العملية بالقيمة الحالية
            this.confirmOperation();
        } else if (key === 'Tab' && this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            this.cad.dynamicInputManager.handleTab();
        }
    }
    
    /**
     * تأكيد العملية (للأدوات الفرعية)
     */
    confirmOperation() {
        // الأدوات الفرعية ستعيد تعريف هذا
    }
}

/**
 * الفئة الأساسية للأدوات المتقدمة مع دعم الإدخال الديناميكي
 */
export class AdvancedToolBase extends BaseTool {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.ui = null;
        this.preview = null;
        this.options = this.getDefaultOptions();
    }
    
    /**
     * الحصول على الخيارات الافتراضية
     */
    getDefaultOptions() {
        return {};
    }
    
    onActivate() {
        // إنشاء UI panel إذا لزم الأمر
        this.createUI();
    }
    
    onDeactivate() {
        // إزالة UI panel
        this.destroyUI();
        this.clearPreview();
    }
    
    createUI() {
        if (this.cad.ui && this.cad.ui.tools) {
            // استخدام النظام الجديد للـ panels
            this.cad.ui.showToolPanel(this.name, {
                x: 350,
                y: 200
            });
        }
    }
    
    destroyUI() {
        if (this.cad.ui && this.cad.ui.tools) {
            this.cad.ui.hideToolPanel();
        }
    }
    
    showPreview(shapes) {
        this.preview = shapes;
        this.cad.tempShapes = shapes;
        this.cad.render();
    }
    
    clearPreview() {
        this.preview = null;
        this.cad.tempShapes = null;
        this.cad.render();
    }
    
    /**
     * الحصول على خيارات UI (للأدوات الفرعية)
     */
    getUIOptions() {
        return [];
    }
    
    /**
     * تحديث الخيارات من UI
     */
    updateOptions(newOptions) {
        this.options = Object.assign({}, this.options, newOptions);
        this.onOptionsChanged();
    }
    
    /**
     * معالج تغيير الخيارات
     */
    onOptionsChanged() {
        // يمكن للأدوات الفرعية تخصيص هذا
        if (this.preview) {
            this.updatePreview();
        }
    }
}