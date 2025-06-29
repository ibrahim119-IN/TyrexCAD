// ==================== js/tools/modify/MoveTool.js ====================
// نسخة نهائية بسيطة مع إدخال مدمج

import { ModifyToolBase } from '../BaseTool.js';

/**
 * أداة التحريك مع إدخال ديناميكي مدمج
 */
export class MoveTool extends ModifyToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-arrows-alt';
        this.drawingPoints = [];
        this.basePoint = null;
        this.constrainedDistance = null;
        this.inputBox = null;
        this.mouseHandler = null;
    }
    
    onActivate() {
        if (!super.onActivate()) return;
        
        this.cad.isDrawing = false;
        this.updateStatus('Click base point for move');
        this.resetState();
        
        // إنشاء صندوق الإدخال مسبقاً
        this.createInputBox();
    }
    
    onDeactivate() {
        super.onDeactivate();
        this.removeInputBox();
        this.removeMouseHandler();
    }
    
    /**
     * إنشاء صندوق الإدخال المدمج
     */
    createInputBox() {
        // حذف أي صندوق قديم
        this.removeInputBox();
        
        // إنشاء الصندوق
        this.inputBox = document.createElement('div');
        this.inputBox.id = 'move-tool-input';
        this.inputBox.style.cssText = `
            position: fixed;
            display: none;
            background: rgba(26, 26, 26, 0.95);
            border: 2px solid #00d4aa;
            border-radius: 6px;
            padding: 10px 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            z-index: 2147483647; /* أعلى قيمة ممكنة */
            pointer-events: all;
            user-select: none;
        `;
        
        this.inputBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #a0a0a0; font-size: 13px;">Distance:</span>
                <input type="number" id="move-distance-input" value="50" step="any" style="
                    width: 80px;
                    padding: 6px 10px;
                    background: rgba(10, 10, 10, 0.9);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                    color: #ffffff;
                    font-size: 14px;
                    font-family: monospace;
                    text-align: right;
                    outline: none;
                ">
                <span style="color: #606060; font-size: 12px;">${this.cad.currentUnit || 'mm'}</span>
            </div>
        `;
        
        // إضافة للصفحة
        document.body.appendChild(this.inputBox);
        
        // ربط الأحداث
        const input = document.getElementById('move-distance-input');
        
        input.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value) && value > 0) {
                this.constrainedDistance = value;
                this.updateConstrainedPreview();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = parseFloat(input.value);
                if (!isNaN(value) && value > 0) {
                    this.applyConstrainedMove(value);
                    this.hideInputBox();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.hideInputBox();
                this.constrainedDistance = null;
            }
        });
        
        // منع إغلاق الصندوق عند النقر عليه
        this.inputBox.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
    }
    
    /**
     * عرض صندوق الإدخال
     */
    showInputBox() {
        if (!this.inputBox) return;
        
        this.inputBox.style.display = 'block';
        
        // تحديث الموضع الأولي
        const rect = this.cad.canvas.getBoundingClientRect();
        const x = rect.left + this.cad.mouseX + 20;
        const y = rect.top + this.cad.mouseY + 20;
        
        this.inputBox.style.left = x + 'px';
        this.inputBox.style.top = y + 'px';
        
        // تركيز وتحديد القيمة
        const input = document.getElementById('move-distance-input');
        input.value = this.getLastDistance();
        
        setTimeout(() => {
            input.focus();
            input.select();
        }, 50);
        
        // بدء تتبع الماوس
        this.startMouseTracking();
        
        console.log('✅ Input box shown');
    }
    
    /**
     * إخفاء صندوق الإدخال
     */
    hideInputBox() {
        if (this.inputBox) {
            this.inputBox.style.display = 'none';
        }
        this.removeMouseHandler();
    }
    
    /**
     * بدء تتبع الماوس
     */
    startMouseTracking() {
        this.removeMouseHandler();
        
        this.mouseHandler = (e) => {
            if (this.inputBox && this.inputBox.style.display !== 'none') {
                // تحديث موضع الصندوق
                const x = e.clientX + 20;
                const y = e.clientY + 20;
                
                // التأكد من بقاء الصندوق داخل الشاشة
                const boxRect = this.inputBox.getBoundingClientRect();
                const maxX = window.innerWidth - boxRect.width - 10;
                const maxY = window.innerHeight - boxRect.height - 10;
                
                this.inputBox.style.left = Math.min(x, maxX) + 'px';
                this.inputBox.style.top = Math.min(y, maxY) + 'px';
                
                // تحديث المعاينة
                if (this.constrainedDistance && this.basePoint) {
                    this.updateConstrainedPreview();
                }
            }
        };
        
        document.addEventListener('mousemove', this.mouseHandler);
    }
    
    /**
     * إزالة متتبع الماوس
     */
    removeMouseHandler() {
        if (this.mouseHandler) {
            document.removeEventListener('mousemove', this.mouseHandler);
            this.mouseHandler = null;
        }
    }
    
    /**
     * إزالة صندوق الإدخال
     */
    removeInputBox() {
        if (this.inputBox) {
            this.inputBox.remove();
            this.inputBox = null;
        }
    }
    
    onClick(point) {
        if (!this.cad.isDrawing) {
            // النقطة الأولى
            this.cad.isDrawing = true;
            this.basePoint = point;
            this.addPoint(point);
            this.updateStatus('Click second point or enter distance');
            
            // عرض صندوق الإدخال
            this.showInputBox();
            
        } else {
            // النقطة الثانية
            if (this.constrainedDistance === null) {
                const dx = point.x - this.basePoint.x;
                const dy = point.y - this.basePoint.y;
                
                this.applyMove(dx, dy);
                this.hideInputBox();
            }
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.basePoint) {
            if (this.constrainedDistance !== null && this.constrainedDistance > 0) {
                // المعاينة محدثة بواسطة mouse handler
            } else {
                // معاينة عادية
                const dx = point.x - this.basePoint.x;
                const dy = point.y - this.basePoint.y;
                
                this.showMovePreview(dx, dy);
                
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                this.updateStatus(
                    `Distance: ${distance.toFixed(2)}, Angle: ${angle.toFixed(1)}°`
                );
            }
        }
    }
    
    /**
     * تحديث المعاينة المقيدة
     */
    updateConstrainedPreview() {
        if (!this.basePoint || !this.constrainedDistance) return;
        
        // حساب الزاوية من موضع الماوس الحالي
        const angle = Math.atan2(
            this.cad.mouseY - this.basePoint.y,
            this.cad.mouseX - this.basePoint.x
        );
        
        const dx = this.constrainedDistance * Math.cos(angle);
        const dy = this.constrainedDistance * Math.sin(angle);
        
        this.showMovePreview(dx, dy);
        
        const angleDeg = angle * 180 / Math.PI;
        this.updateStatus(
            `Distance: ${this.constrainedDistance.toFixed(2)}, Angle: ${angleDeg.toFixed(1)}°`
        );
    }
    
    /**
     * تطبيق الحركة المقيدة
     */
    applyConstrainedMove(distance) {
        const angle = Math.atan2(
            this.cad.mouseY - this.basePoint.y,
            this.cad.mouseX - this.basePoint.x
        );
        
        const dx = distance * Math.cos(angle);
        const dy = distance * Math.sin(angle);
        
        this.applyMove(dx, dy);
    }
    
    /**
     * عرض معاينة الحركة
     */
    showMovePreview(dx, dy) {
        const tempShapes = this.originalShapes.map(shape => {
            const temp = this.cad.cloneShape(shape);
            this.cad.translateShape(temp, dx, dy);
            temp.tempOpacity = 0.5;
            return temp;
        });
        
        // خط إرشادي
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
            isTemp: true
        };
        
        tempShapes.push(guideLine);
        this.showPreview(tempShapes);
    }
    
    /**
     * تطبيق الحركة
     */
    applyMove(dx, dy) {
        this.applyModification();
        
        this.selection.forEach((shape, index) => {
            const original = this.originalShapes[index];
            this.cad.copyShapeProperties(shape, original);
            this.cad.translateShape(shape, dx, dy);
        });
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.saveLastDistance(distance);
        
        this.finishMoving();
        this.updateStatus(`Moved ${this.selection.length} objects`);
    }
    
    finishMoving() {
        this.cad.isDrawing = false;
        this.clearPreview();
        this.cad.finishDrawing();
        this.resetState();
        this.hideInputBox();
    }
    
    cancel() {
        this.hideInputBox();
        this.clearPreview();
        this.finishMoving();
        this.updateStatus('Move cancelled');
    }
    
    onKeyPress(key) {
        if (key === 'Escape') {
            this.cancel();
        }
    }
    
    resetState() {
        this.drawingPoints = [];
        this.basePoint = null;
        this.constrainedDistance = null;
    }
    
    addPoint(point) {
        this.drawingPoints.push(point);
    }
    
    getLastDistance() {
        try {
            return this.toolsManager?.modifyState?.lastMoveDistance || 50;
        } catch (e) {
            return 50;
        }
    }
    
    saveLastDistance(distance) {
        try {
            if (this.toolsManager && this.toolsManager.modifyState) {
                this.toolsManager.modifyState.lastMoveDistance = distance;
            }
        } catch (e) {}
    }
}