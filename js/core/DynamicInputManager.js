// ==================== js/core/DynamicInputManager.js ====================

/**
 * Dynamic Input Manager - نظام الإدخال الديناميكي
 * نسخة محسنة مع حركة تتبع الماوس
 */

class DynamicInputManager {
    constructor(cad) {
        this.cad = cad;
        this.active = false;
        this.currentInput = '';
        this.inputElement = null;
        this.callback = null;
        this.previewCallback = null;
        this.options = {
            type: 'number',
            label: '',
            unit: '',
            min: null,
            max: null,
            default: null
        };
        
        // موضع الماوس الحالي
        this.currentMouseX = 0;
        this.currentMouseY = 0;
        
        // إنشاء العنصر
        this.createInputElement();
        
        // ربط الأحداث
        this.bindEvents();
    }
    
    /**
     * إنشاء عنصر الإدخال
     */
    createInputElement() {
        // Container
        this.container = document.createElement('div');
        this.container.className = 'dynamic-input-container';
        this.container.style.cssText = `
            position: fixed;
            display: none;
            align-items: center;
            gap: 6px;
            background: rgba(26, 26, 26, 0.95);
            border: 2px solid #00d4aa;
            border-radius: 6px;
            padding: 8px 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
            z-index: 100000;
            pointer-events: all;
            user-select: none;
        `;
        
        // Label
        this.labelElement = document.createElement('span');
        this.labelElement.style.cssText = `
            color: #a0a0a0;
            font-size: 12px;
            white-space: nowrap;
            margin-right: 4px;
        `;
        
        // Input field
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.style.cssText = `
            width: 80px;
            padding: 6px 10px;
            background: rgba(10, 10, 10, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: #ffffff;
            font-size: 14px;
            font-family: 'Consolas', 'Monaco', monospace;
            text-align: right;
            outline: none;
        `;
        
        // Unit
        this.unitElement = document.createElement('span');
        this.unitElement.style.cssText = `
            color: #606060;
            font-size: 11px;
            margin-left: 2px;
        `;
        
        // تجميع العناصر
        this.container.appendChild(this.labelElement);
        this.container.appendChild(this.inputElement);
        this.container.appendChild(this.unitElement);
        
        // إضافة للصفحة
        document.body.appendChild(this.container);
    }
    
    /**
     * ربط الأحداث
     */
    bindEvents() {
        // منع فقدان التركيز
        this.container.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        // معالجة الإدخال
        this.inputElement.addEventListener('input', (e) => {
            this.currentInput = e.target.value;
            this.onInputChange();
        });
        
        // معالجة المفاتيح
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancel();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.confirm();
            }
        });
        
        // تتبع حركة الماوس على Canvas
        this.mouseMoveHandler = (e) => {
            if (this.active) {
                // حفظ موضع الماوس
                const rect = this.cad.canvas.getBoundingClientRect();
                this.currentMouseX = e.clientX - rect.left;
                this.currentMouseY = e.clientY - rect.top;
                
                // تحديث موضع الصندوق
                this.updatePosition(e.clientX, e.clientY);
                
                // تحديث المعاينة إذا كان هناك قيمة
                if (this.currentInput) {
                    this.onInputChange();
                }
            }
        };
        
        // إضافة مستمع على Canvas وليس document
        this.cad.canvas.addEventListener('mousemove', this.mouseMoveHandler);
        document.addEventListener('mousemove', this.mouseMoveHandler);
    }
    
    /**
     * عرض الإدخال الديناميكي
     */
    show(options, callback, previewCallback = null) {
        // دمج الخيارات
        this.options = Object.assign({
            type: 'number',
            label: '',
            unit: '',
            min: null,
            max: null,
            default: null
        }, options);
        
        this.callback = callback;
        this.previewCallback = previewCallback;
        this.active = true;
        
        // تحديث العناصر
        this.labelElement.textContent = this.options.label ? this.options.label + ':' : '';
        this.unitElement.textContent = this.options.unit || '';
        this.inputElement.value = this.options.default || '';
        this.currentInput = this.inputElement.value;
        
        // عرض الحاوية
        this.container.style.display = 'flex';
        
        // تحديث الموضع الأولي
        const rect = this.cad.canvas.getBoundingClientRect();
        const x = rect.left + this.cad.mouseX;
        const y = rect.top + this.cad.mouseY;
        this.updatePosition(x, y);
        
        // تركيز على الإدخال
        setTimeout(() => {
            this.inputElement.focus();
            this.inputElement.select();
        }, 10);
    }
    
    /**
     * إخفاء الإدخال
     */
    hide() {
        this.active = false;
        this.container.style.display = 'none';
        this.inputElement.value = '';
        this.currentInput = '';
        this.callback = null;
        this.previewCallback = null;
    }
    
    /**
     * تحديث موضع الإدخال
     */
    updatePosition(screenX, screenY) {
        const offset = 20;
        const padding = 10;
        
        let left = screenX + offset;
        let top = screenY + offset;
        
        // الحصول على أبعاد الصندوق
        const rect = this.container.getBoundingClientRect();
        
        // التأكد من عدم الخروج من الشاشة
        if (left + rect.width > window.innerWidth - padding) {
            left = screenX - rect.width - offset;
        }
        
        if (top + rect.height > window.innerHeight - padding) {
            top = screenY - rect.height - offset;
        }
        
        // تطبيق الموضع
        this.container.style.left = Math.max(padding, left) + 'px';
        this.container.style.top = Math.max(padding, top) + 'px';
    }
    
    /**
     * معالجة تغيير الإدخال
     */
    onInputChange() {
        const value = this.parseValue();
        
        if (value !== null) {
            // إرسال القيمة مع موضع الماوس الحالي للمعاينة
            if (this.previewCallback) {
                this.previewCallback(value, this.currentMouseX, this.currentMouseY);
            } else if (this.callback) {
                this.callback(value, false); // preview only
            }
        }
    }
    
    /**
     * تحليل القيمة المدخلة
     */
    parseValue() {
        const input = this.currentInput.trim();
        
        if (!input) return null;
        
        switch (this.options.type) {
            case 'number':
            case 'angle':
                try {
                    let value = this.evaluateExpression(input);
                    
                    // التحقق من الحدود
                    if (this.options.min !== null && value < this.options.min) {
                        value = this.options.min;
                    }
                    if (this.options.max !== null && value > this.options.max) {
                        value = this.options.max;
                    }
                    
                    return value;
                } catch (e) {
                    return null;
                }
                
            case 'text':
                return input;
                
            default:
                return input;
        }
    }
    
    /**
     * تقييم التعبيرات الحسابية
     */
    evaluateExpression(expr) {
        // إزالة المسافات
        expr = expr.replace(/\s/g, '');
        
        // دعم العمليات الأساسية
        if (/^[\d\.\+\-\*\/\(\)]+$/.test(expr)) {
            try {
                return new Function('return ' + expr)();
            } catch (e) {
                throw new Error('Invalid expression');
            }
        } else {
            const num = parseFloat(expr);
            if (isNaN(num)) {
                throw new Error('Invalid number');
            }
            return num;
        }
    }
    
    /**
     * تأكيد الإدخال
     */
    confirm() {
        const value = this.parseValue();
        
        if (value !== null) {
            if (this.callback) {
                // إرسال القيمة مع موضع الماوس النهائي
                this.callback(value, true, this.currentMouseX, this.currentMouseY);
            }
            this.hide();
        } else {
            // اهتزاز للدلالة على خطأ
            this.inputElement.style.borderColor = '#ff4444';
            setTimeout(() => {
                this.inputElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }, 300);
        }
    }
    
    /**
     * إلغاء الإدخال
     */
    cancel() {
        if (this.callback) {
            this.callback(null, false);
        }
        this.hide();
    }
    
    /**
     * الحصول على القيمة الحالية
     */
    getValue() {
        return this.parseValue();
    }
    
    /**
     * هل الإدخال نشط؟
     */
    isActive() {
        return this.active;
    }
    
    /**
     * تنظيف
     */
    destroy() {
        // إزالة مستمعات الأحداث
        if (this.mouseMoveHandler) {
            this.cad.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
            document.removeEventListener('mousemove', this.mouseMoveHandler);
        }
        
        // إزالة العنصر من DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// تصدير الكلاس
window.DynamicInputManager = DynamicInputManager;