// ==================== js/core/DynamicInputManager.js ====================

/**
 * Dynamic Input Manager - نظام الإدخال الديناميكي الذكي
 * يتكيف مع احتياجات كل أداة ويتتبع القيم الحية
 */

class DynamicInputManager {
    constructor(cad) {
        this.cad = cad;
        this.active = false;
        this.inputElement = null;
        this.container = null;
        
        // الحالة
        this.mode = 'passive'; // passive, active, locked
        this.currentValue = null;
        this.userValue = null;
        this.liveCallback = null;
        this.confirmCallback = null;
        
        // إنشاء العناصر
        this.createElements();
        this.bindEvents();
    }
    
    /**
     * إنشاء عناصر الواجهة
     */
    createElements() {
        // الحاوية الرئيسية
        this.container = document.createElement('div');
        this.container.className = 'dynamic-input-container';
        this.container.style.cssText = `
            position: fixed;
            display: none;
            background: rgba(26, 26, 26, 0.95);
            border: 2px solid #00d4aa;
            border-radius: 6px;
            padding: 8px 12px;
            box-shadow: 0 4px 16px rgba(0, 212, 170, 0.2);
            backdrop-filter: blur(10px);
            z-index: 10000;
            user-select: none;
            pointer-events: all;
            transition: opacity 0.2s ease;
        `;
        
        // الحاوية الداخلية
        const inner = document.createElement('div');
        inner.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        // التسمية
        this.labelElement = document.createElement('span');
        this.labelElement.style.cssText = `
            color: #a0a0a0;
            font-size: 12px;
            white-space: nowrap;
        `;
        
        // حقل الإدخال
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.style.cssText = `
            width: 70px;
            padding: 4px 8px;
            background: rgba(10, 10, 10, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: #ffffff;
            font-size: 13px;
            font-family: 'Consolas', 'Monaco', monospace;
            text-align: right;
            outline: none;
            transition: all 0.2s ease;
        `;
        
        // الوحدة
        this.unitElement = document.createElement('span');
        this.unitElement.style.cssText = `
            color: #606060;
            font-size: 11px;
        `;
        
        // التجميع
        inner.appendChild(this.labelElement);
        inner.appendChild(this.inputElement);
        inner.appendChild(this.unitElement);
        this.container.appendChild(inner);
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
            this.handleInput(e.target.value);
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
                // Tab يقفل القيمة ويستمر
                this.lock();
            }
        });
        
        // تغيير التركيز
        this.inputElement.addEventListener('focus', () => {
            this.mode = 'active';
            this.container.style.borderColor = '#00ffcc';
        });
        
        this.inputElement.addEventListener('blur', () => {
            if (this.mode === 'active') {
                this.mode = 'passive';
                this.container.style.borderColor = '#00d4aa';
            }
        });
        
        // تتبع حركة الماوس
        this.mouseHandler = (e) => {
            if (this.active) {
                this.updatePosition(e.clientX, e.clientY);
            }
        };
        document.addEventListener('mousemove', this.mouseHandler);
    }
    
    /**
     * عرض الإدخال الديناميكي
     * @param {Object} config - إعدادات الإدخال
     * @param {Function} callback - دالة callback اختيارية للتوافق العكسي
     */
    show(config, callback) {
        // دعم التوافق العكسي مع النمط القديم
        if (callback && typeof callback === 'function') {
            config.onLiveUpdate = (value) => callback(value, false);
            config.onConfirm = (value) => callback(value, true);
        }
        
        this.active = true;
        this.mode = config.startMode || 'passive';
        
        // الإعدادات
        this.config = {
            label: config.label || '',
            unit: config.unit || '',
            defaultValue: config.defaultValue || 0,
            decimals: config.decimals !== undefined ? config.decimals : 2,
            min: config.min || null,
            max: config.max || null,
            liveUpdate: config.liveUpdate !== false, // true by default
            trackMouse: config.trackMouse !== false  // true by default
        };
        
        // الـ callbacks
        this.liveCallback = config.onLiveUpdate || null;
        this.confirmCallback = config.onConfirm || null;
        
        // تحديث العناصر
        this.labelElement.textContent = this.config.label ? this.config.label + ':' : '';
        this.unitElement.textContent = this.config.unit;
        
        // عرض الحاوية
        this.container.style.display = 'block';
        this.container.style.opacity = '0';
        
        // موضع أولي
        const mousePos = this.getMousePosition();
        this.updatePosition(mousePos.x, mousePos.y);
        
        // تأثير الظهور
        requestAnimationFrame(() => {
            this.container.style.opacity = '1';
        });
        
        // عرض القيمة الافتراضية
        if (this.config.defaultValue !== null && this.config.defaultValue !== undefined) {
            this.displayValue(this.config.defaultValue);
        }
        
        // التركيز حسب الوضع
        if (this.mode === 'active') {
            setTimeout(() => {
                this.inputElement.focus();
                this.inputElement.select();
            }, 50);
        }
        
        return this;
    }
    
    /**
     * إخفاء الإدخال
     */
    hide() {
        this.active = false;
        this.container.style.opacity = '0';
        
        setTimeout(() => {
            this.container.style.display = 'none';
            this.reset();
        }, 200);
    }
    
    /**
     * تحديث القيمة الحية (من الماوس مثلاً)
     */
    updateLiveValue(value) {
        if (!this.active) return;
        
        this.currentValue = value;
        
        // عرض القيمة إذا لم يكن المستخدم يكتب
        if (this.mode === 'passive') {
            this.displayValue(value);
        }
        
        // استدعاء callback إذا لم تكن القيمة مقفلة
        if (this.mode !== 'locked' && this.config.liveUpdate && this.liveCallback) {
            const effectiveValue = this.userValue !== null ? this.userValue : value;
            this.liveCallback(effectiveValue, false);
        }
    }
    
    /**
     * معالجة إدخال المستخدم
     */
    handleInput(input) {
        this.mode = 'active';
        
        const value = this.parseValue(input);
        if (value !== null) {
            this.userValue = this.validateValue(value);
            
            // تحديث مباشر
            if (this.config.liveUpdate && this.liveCallback) {
                this.liveCallback(this.userValue, false);
            }
        }
    }
    
    /**
     * قفل القيمة الحالية
     */
    lock() {
        if (this.userValue !== null) {
            this.mode = 'locked';
            this.container.style.borderColor = '#ff9900';
            this.inputElement.blur();
            
            if (this.liveCallback) {
                this.liveCallback(this.userValue, true);
            }
        }
    }
    
    /**
     * تأكيد القيمة
     */
    confirm() {
        const value = this.userValue !== null ? this.userValue : this.currentValue;
        
        if (value !== null && this.confirmCallback) {
            this.confirmCallback(value);
        }
        
        this.hide();
    }
    
    /**
     * إلغاء
     */
    cancel() {
        if (this.confirmCallback) {
            this.confirmCallback(null);
        }
        
        this.hide();
    }
    
    /**
     * تحليل القيمة المدخلة
     */
    parseValue(input) {
        if (!input || input.trim() === '') return null;
        
        // دعم العمليات الحسابية البسيطة
        try {
            input = input.replace(/\s/g, '');
            
            // تعبير رياضي بسيط
            if (/^[\d\.\+\-\*\/\(\)]+$/.test(input)) {
                return new Function('return ' + input)();
            }
            
            // رقم مباشر
            const num = parseFloat(input);
            return isNaN(num) ? null : num;
            
        } catch (e) {
            return null;
        }
    }
    
    /**
     * التحقق من القيمة
     */
    validateValue(value) {
        if (this.config.min !== null && value < this.config.min) {
            value = this.config.min;
        }
        if (this.config.max !== null && value > this.config.max) {
            value = this.config.max;
        }
        return value;
    }
    
    /**
     * عرض القيمة
     */
    displayValue(value) {
        if (typeof value === 'number') {
            this.inputElement.value = value.toFixed(this.config.decimals);
        } else {
            this.inputElement.value = value || '';
        }
    }
    
    /**
     * تحديث الموضع
     */
    updatePosition(x, y) {
        const offset = 15;
        const padding = 10;
        
        // حساب الموضع
        let left = x + offset;
        let top = y + offset;
        
        // حدود الشاشة
        const rect = this.container.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - padding;
        const maxY = window.innerHeight - rect.height - padding;
        
        if (left > maxX) left = x - rect.width - offset;
        if (top > maxY) top = y - rect.height - offset;
        
        this.container.style.left = Math.max(padding, left) + 'px';
        this.container.style.top = Math.max(padding, top) + 'px';
    }
    
    /**
     * الحصول على موضع الماوس
     */
    getMousePosition() {
        // محاولة الحصول على الإحداثيات من مصادر مختلفة
        if (this.cad.mouseX !== undefined && this.cad.mouseY !== undefined) {
            return {
                x: this.cad.mouseX,
                y: this.cad.mouseY
            };
        }
        
        // fallback للإحداثيات على الشاشة
        if (this.cad.canvas) {
            const rect = this.cad.canvas.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }
        
        return { x: 100, y: 100 };
    }
    
    /**
     * إعادة تعيين
     */
    reset() {
        this.mode = 'passive';
        this.currentValue = null;
        this.userValue = null;
        this.liveCallback = null;
        this.confirmCallback = null;
        this.inputElement.value = '';
        this.container.style.borderColor = '#00d4aa';
    }
    
    /**
     * تنظيف
     */
    destroy() {
        document.removeEventListener('mousemove', this.mouseHandler);
        if (this.container) {
            this.container.remove();
        }
    }
}

// تصدير
window.DynamicInputManager = DynamicInputManager;