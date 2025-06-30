// ==================== js/core/DynamicInputManager.js ====================

/**
 * Dynamic Input Manager - مع جميع الإصلاحات المطبقة
 */

class DynamicInputManager {
    constructor(cad) {
        this.cad = cad;
        this.active = false;
        this.inputElement = null;
        this.container = null;
        
        // الحالة
        this.mode = 'passive';
        this.liveValue = null;
        this.userValue = null;
        this.lastConfirmedValue = null;
        
        // Callbacks
        this.callbacks = {
            onInput: null,
            onLiveUpdate: null,
            onConfirm: null,
            onCancel: null,
            onTab: null
        };
        
        // معالج المفاتيح العام
        this.globalKeyHandler = null;
        
        // إنشاء العناصر
        this.createElements();
        this.bindEvents();
    }
    
    createElements() {
        // الحاوية الرئيسية
        this.container = document.createElement('div');
        this.container.className = 'dynamic-input-container';
        this.container.style.cssText = `
            position: fixed;
            display: none;
            background: rgba(26, 26, 26, 0.98);
            border: 2px solid #00d4aa;
            border-radius: 8px;
            padding: 10px 14px;
            box-shadow: 0 6px 20px rgba(0, 212, 170, 0.3);
            backdrop-filter: blur(12px);
            z-index: 10000;
            user-select: none;
            pointer-events: all;
            transition: opacity 0.2s ease, transform 0.2s ease;
        `;
        
        // الحاوية الداخلية
        const inner = document.createElement('div');
        inner.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        // التسمية
        this.labelElement = document.createElement('span');
        this.labelElement.style.cssText = `
            color: #aaa;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            user-select: none;
        `;
        
        // حقل الإدخال
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.style.cssText = `
            width: 100px;
            padding: 6px 10px;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid #444;
            border-radius: 4px;
            color: #fff;
            font-size: 14px;
            font-family: 'Consolas', 'Monaco', monospace;
            text-align: right;
            outline: none;
            transition: all 0.15s ease;
            pointer-events: all;
            user-select: text;
        `;
        
        // وحدة القياس
        this.unitElement = document.createElement('span');
        this.unitElement.style.cssText = `
            color: #888;
            font-size: 11px;
            margin-left: -5px;
            user-select: none;
        `;
        
        // مؤشر الحالة
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.style.cssText = `
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #00d4aa;
            margin-left: 5px;
            transition: all 0.2s ease;
        `;
        
        // تجميع العناصر
        inner.appendChild(this.labelElement);
        inner.appendChild(this.inputElement);
        inner.appendChild(this.unitElement);
        inner.appendChild(this.statusIndicator);
        
        this.container.appendChild(inner);
        
        // ⭐ إضافة الحاوية إلى DOM مباشرة
        document.body.appendChild(this.container);
    }
    
    bindEvents() {
        // منع فقدان التركيز
        this.container.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        // إدخال النص
        this.inputElement.addEventListener('input', (e) => {
            const value = e.target.value;
            this.handleUserInput(value);
        });
        
        // لوحة المفاتيح
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancel();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.handleTab();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.adjustValue(e.key === 'ArrowUp' ? 1 : -1);
            }
        });
        
        // التركيز
        this.inputElement.addEventListener('focus', () => {
            this.setMode('active');
        });
        
        // ⭐ معالج حركة الماوس مع الحفاظ على السياق
        this.mouseHandler = (e) => {
            if (this.active && this.config && this.config.trackMouse) {
                this.updatePosition(e.clientX, e.clientY);
            }
        };
        
        // النقر خارج الحقل
        this.clickHandler = (e) => {
            if (this.active && !this.container.contains(e.target)) {
                if (this.mode === 'active' && this.userValue !== null) {
                    this.confirm();
                }
            }
        };
        document.addEventListener('mousedown', this.clickHandler);
    }
    
    show(config) {
        this.active = true;
        this.mode = config.startMode || 'passive';
        
        // حفظ الإعدادات
        this.config = {
            label: config.label || '',
            unit: config.unit || '',
            defaultValue: config.defaultValue,
            placeholder: config.placeholder || '',
            decimals: config.decimals !== undefined ? config.decimals : 2,
            min: config.min || null,
            max: config.max || null,
            liveUpdate: config.liveUpdate !== false,
            trackMouse: config.trackMouse !== false
        };
        
        // حفظ callbacks
        this.callbacks.onInput = config.onInput || null;
        this.callbacks.onLiveUpdate = config.onLiveUpdate || null;
        this.callbacks.onConfirm = config.onConfirm || null;
        this.callbacks.onCancel = config.onCancel || null;
        this.callbacks.onTab = config.onTab || null;
        
        // تحديث العناصر
        this.labelElement.textContent = this.config.label ? this.config.label + ':' : '';
        this.unitElement.textContent = this.config.unit;
        this.inputElement.placeholder = this.config.placeholder;
        
        // ⭐ التأكد من أن الحاوية في DOM
        if (!this.container.parentNode) {
            document.body.appendChild(this.container);
            console.log('✅ Container added to DOM');
        }
        
        // عرض الحاوية
        this.container.style.display = 'block';
        this.container.style.opacity = '0';
        
        // موضع أولي
        const mousePos = this.getMousePosition();
        this.updatePosition(mousePos.x, mousePos.y);
        
        // تأثير الظهور
        requestAnimationFrame(() => {
            this.container.style.opacity = '1';
            this.container.style.transform = 'scale(1)';
        });
        
        // القيمة الافتراضية
        if (this.config.defaultValue !== null && this.config.defaultValue !== undefined) {
            this.displayValue(this.config.defaultValue);
        } else {
            this.inputElement.value = '';
        }
        
        // ⭐ إعداد تتبع الماوس
        if (this.config.trackMouse) {
            // إزالة المعالج القديم إن وجد
            document.removeEventListener('mousemove', this.mouseHandler);
            // إضافة المعالج الجديد
            document.addEventListener('mousemove', this.mouseHandler);
            console.log('✅ Mouse tracking enabled');
        }
        
        // ⭐ إعداد التقاط المفاتيح العام
        if (this.globalKeyHandler) {
            document.removeEventListener('keydown', this.globalKeyHandler, true);
        }
        
        this.globalKeyHandler = (e) => {
            // إذا كان Dynamic Input نشط وليس في وضع الكتابة
            if (this.active && document.activeElement !== this.inputElement) {
                // التقط الأرقام
                if ((e.key >= '0' && e.key <= '9') || e.key === '.' || e.key === '-') {
                    e.preventDefault();
                    
                    // ركز على الحقل وأضف الرقم
                    this.inputElement.focus();
                    this.inputElement.value = e.key;
                    
                    // أطلق حدث input
                    this.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    console.log('✅ Captured key:', e.key);
                }
                // Enter للتأكيد
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.confirm();
                }
                // Escape للإلغاء
                else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancel();
                }
            }
        };
        
        document.addEventListener('keydown', this.globalKeyHandler, true);
        console.log('✅ Global key capture enabled');
        
        // ⭐ التركيز التلقائي
        setTimeout(() => {
            if (this.active && this.inputElement) {
                this.inputElement.focus();
                this.inputElement.select();
                console.log('✅ Auto-focused on input');
            }
        }, 50);
        
        // تحديث المؤشر
        this.updateStatusIndicator();
        
        return this;
    }
    
    hide() {
        this.active = false;
        
        // ⭐ إزالة معالج المفاتيح العام
        if (this.globalKeyHandler) {
            document.removeEventListener('keydown', this.globalKeyHandler, true);
            this.globalKeyHandler = null;
        }
        
        // إزالة معالج الماوس
        document.removeEventListener('mousemove', this.mouseHandler);
        
        // تأثير الإخفاء
        this.container.style.opacity = '0';
        this.container.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.container.style.display = 'none';
            this.reset();
        }, 200);
    }
    
    updateLiveValue(value) {
        if (!this.active) return;
        
        this.liveValue = value;
        
        // عرض القيمة فقط في الوضع السلبي
        if (this.mode === 'passive') {
            this.displayValue(value);
        }
        
        // استدعاء callback
        if (this.config.liveUpdate && this.callbacks.onLiveUpdate) {
            this.callbacks.onLiveUpdate(value, this.mode === 'locked');
        }
    }
    
    handleUserInput(input) {
        this.setMode('active');
        
        if (input.trim() === '') {
            this.userValue = null;
            if (this.callbacks.onInput) {
                this.callbacks.onInput(null);
            }
            return;
        }
        
        const value = this.parseValue(input);
        if (value !== null) {
            this.userValue = this.validateValue(value);
            
            if (this.callbacks.onInput) {
                this.callbacks.onInput(this.userValue);
            }
        }
    }
    
    setMode(mode) {
        this.mode = mode;
        this.updateStatusIndicator();
        
        switch (mode) {
            case 'passive':
                this.container.style.borderColor = '#00d4aa';
                this.inputElement.style.borderColor = '#444';
                break;
            case 'active':
                this.container.style.borderColor = '#00ffcc';
                this.inputElement.style.borderColor = '#00ffcc';
                break;
            case 'locked':
                this.container.style.borderColor = '#ff9900';
                this.inputElement.style.borderColor = '#ff9900';
                break;
        }
    }
    
    updateStatusIndicator() {
        switch (this.mode) {
            case 'passive':
                this.statusIndicator.style.background = '#00d4aa';
                break;
            case 'active':
                this.statusIndicator.style.background = '#00ffcc';
                break;
            case 'locked':
                this.statusIndicator.style.background = '#ff9900';
                break;
        }
    }
    
    handleTab() {
        if (this.callbacks.onTab) {
            this.callbacks.onTab();
        } else {
            if (this.mode === 'locked') {
                this.setMode('passive');
            } else if (this.userValue !== null) {
                this.setMode('locked');
            }
        }
    }
    
    confirm() {
        const value = this.userValue !== null ? this.userValue : this.liveValue;
        
        if (this.callbacks.onConfirm) {
            this.callbacks.onConfirm(value);
        }
        
        this.lastConfirmedValue = value;
        // ⭐ لا نغلق الإدخال تلقائياً - دع الأداة تقرر
        // this.hide();
    }
    
    cancel() {
        if (this.callbacks.onCancel) {
            this.callbacks.onCancel();
        }
        
        this.hide();
    }
    
    /**
     * 🆕 مسح حقل الإدخال
     * يُستخدم بعد تأكيد القيمة للسماح بإدخال قيمة جديدة
     */
    clearInput() {
        if (this.inputElement) {
            this.inputElement.value = '';
            this.userValue = null;
            this.setMode('passive');
            
            // إعادة التركيز
            this.inputElement.focus();
            
            console.log('✅ Input cleared');
        }
    }
    
    adjustValue(direction) {
        const current = this.userValue !== null ? this.userValue : this.liveValue;
        if (current === null) return;
        
        const step = 1 / Math.pow(10, this.config.decimals);
        const newValue = current + (direction * step);
        
        this.userValue = this.validateValue(newValue);
        this.displayValue(this.userValue);
        
        if (this.callbacks.onInput) {
            this.callbacks.onInput(this.userValue);
        }
    }
    
    parseValue(input) {
        if (!input || input.trim() === '') return null;
        
        try {
            input = input.replace(/\s/g, '');
            
            if (/^[\d\.\+\-\*\/\(\)]+$/.test(input)) {
                const result = new Function('return ' + input)();
                return isNaN(result) ? null : result;
            }
            
            const num = parseFloat(input);
            return isNaN(num) ? null : num;
            
        } catch (e) {
            return null;
        }
    }
    
    validateValue(value) {
        if (this.config.min !== null && value < this.config.min) {
            value = this.config.min;
        }
        if (this.config.max !== null && value > this.config.max) {
            value = this.config.max;
        }
        return value;
    }
    
    displayValue(value) {
        if (typeof value === 'number') {
            this.inputElement.value = value.toFixed(this.config.decimals);
        } else {
            this.inputElement.value = value || '';
        }
    }
    
    updatePosition(x, y) {
        // ⭐ تحقق إضافي للتأكد
        if (!this.active || !this.config || !this.config.trackMouse) {
            return;
        }
        
        const offset = 20;
        const padding = 10;
        
        const rect = this.container.getBoundingClientRect();
        let left = x + offset;
        let top = y - rect.height / 2;
        
        const maxX = window.innerWidth - rect.width - padding;
        const maxY = window.innerHeight - rect.height - padding;
        
        if (left > maxX) left = x - rect.width - offset;
        if (top > maxY) top = maxY;
        if (top < padding) top = padding;
        
        this.container.style.left = left + 'px';
        this.container.style.top = top + 'px';
    }
    
    getMousePosition() {
        if (this.cad && this.cad.mouseX !== undefined && this.cad.mouseY !== undefined) {
            const rect = this.cad.canvas ? this.cad.canvas.getBoundingClientRect() : { left: 0, top: 0 };
            return {
                x: rect.left + this.cad.mouseX,
                y: rect.top + this.cad.mouseY
            };
        }
        
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    
    reset() {
        this.mode = 'passive';
        this.liveValue = null;
        this.userValue = null;
        this.callbacks = {};
        this.inputElement.value = '';
        this.container.style.borderColor = '#00d4aa';
    }
    
    destroy() {
        document.removeEventListener('mousemove', this.mouseHandler);
        document.removeEventListener('mousedown', this.clickHandler);
        
        if (this.globalKeyHandler) {
            document.removeEventListener('keydown', this.globalKeyHandler, true);
        }
        
        if (this.container && this.container.parentNode) {
            this.container.remove();
        }
    }
}

// تصدير
window.DynamicInputManager = DynamicInputManager;