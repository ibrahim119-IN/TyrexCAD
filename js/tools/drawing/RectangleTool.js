// ==================== js/tools/drawing/RectangleTool.js ====================

import { DrawingToolBase, INPUT_TYPES } from '../BaseTool.js';

/**
 * أداة رسم المستطيل - محدثة بالإدخال الديناميكي
 * Rectangle Tool with Dynamic Input Support
 */
export class RectangleTool extends DrawingToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        this.icon = 'fa-square';
        this.startPoint = null;
        this.currentWidth = 0;
        this.currentHeight = 0;
        this.constrainedDimensions = null;
    }
    
    onActivate() {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return false;
        }
        
        super.onActivate();
        this.resetState();
        this.updateStatus('Specify first corner');
    }
    
    onDeactivate() {
        this.hideDynamicInput();
        this.finishDrawing();
        super.onDeactivate();
    }
    
    onClick(point) {
        // التحقق من إمكانية الرسم
        if (!this.canDrawOnCurrentLayer()) {
            return;
        }
        
        if (!this.cad.isDrawing) {
            // النقطة الأولى
            this.cad.isDrawing = true;
            this.startPoint = point;
            this.addPoint(point);
            
            // التحقق من الخصائص المعلقة
            if (this.cad.pendingShapeProperties && 
                this.cad.pendingShapeProperties.rectWidth > 0 && 
                this.cad.pendingShapeProperties.rectHeight > 0) {
                
                const width = this.cad.pendingShapeProperties.rectWidth;
                const height = this.cad.pendingShapeProperties.rectHeight;
                
                this.createRectangle(point, {
                    x: point.x + width,
                    y: point.y + height
                });
                
                this.finishDrawing();
                this.cad.pendingShapeProperties = null;
            } else {
                this.updateStatus('Specify opposite corner or enter dimensions');
                this.showDynamicInput();
            }
        } else {
            // النقطة الثانية - إنشاء المستطيل
            const constrainedPoint = this.getConstrainedEndPoint(point);
            this.createRectangle(this.startPoint, constrainedPoint);
            this.finishDrawing();
        }
    }
    
    onMouseMove(point) {
        if (this.cad.isDrawing && this.startPoint) {
            // تطبيق القيود والحصول على النقطة النهائية
            const endPoint = this.getConstrainedEndPoint(point);
            
            // حساب الأبعاد الحالية
            this.currentWidth = Math.abs(endPoint.x - this.startPoint.x);
            this.currentHeight = Math.abs(endPoint.y - this.startPoint.y);
            
            // تحديث القيم الحية في الإدخال الديناميكي
            this.updateLiveValues();
            
            // عرض المعاينة
            this.showRectanglePreview(endPoint);
            
            // تحديث الحالة
            this.updateStatusWithDimensions();
        }
    }
    
    /**
     * الحصول على النقطة النهائية مع تطبيق القيود
     * 🔧 محدث لمعالجة الاتجاهات بشكل صحيح
     */
    getConstrainedEndPoint(point) {
        if (this.constrainedMode && this.constrainedDimensions) {
            // تحديد الاتجاه بناءً على موضع الماوس
            const dx = point.x >= this.startPoint.x ? 1 : -1;
            const dy = point.y >= this.startPoint.y ? 1 : -1;
            
            return {
                x: this.startPoint.x + (this.constrainedDimensions.width * dx),
                y: this.startPoint.y + (this.constrainedDimensions.height * dy)
            };
        } else {
            // تطبيق قيود Ortho/Polar
            return this.applyConstraints(this.startPoint, point);
        }
    }
    
    /**
     * عرض الإدخال الديناميكي
     */
    showDynamicInput() {
        this.showDynamicInputForValue({
            inputType: INPUT_TYPES.DIMENSION,
            label: 'Size',
            placeholder: 'width,height',
            defaultValue: this.getLastRectangleDimensions(),
            
            onInput: (value) => {
                if (value && value.width && value.height) {
                    this.constrainedMode = true;
                    this.constrainedDimensions = value;
                    this.updateConstrainedPreview();
                } else {
                    this.constrainedMode = false;
                    this.constrainedDimensions = null;
                }
            },
            
            onConfirm: (value) => {
                if (value && value.width > 0 && value.height > 0) {
                    // 🔧 تحديد الاتجاه بناءً على موضع الماوس الحالي
                    const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
                    const dx = world.x >= this.startPoint.x ? 1 : -1;
                    const dy = world.y >= this.startPoint.y ? 1 : -1;
                    
                    const endPoint = {
                        x: this.startPoint.x + (value.width * dx),
                        y: this.startPoint.y + (value.height * dy)
                    };
                    this.createRectangle(this.startPoint, endPoint);
                    this.finishDrawing();
                } else if (this.currentWidth > 0 && this.currentHeight > 0) {
                    // استخدام الموضع الحالي
                    const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
                    const endPoint = this.getConstrainedEndPoint(world);
                    this.createRectangle(this.startPoint, endPoint);
                    this.finishDrawing();
                }
            },
            
            onCancel: () => {
                this.finishDrawing();
                this.updateStatus('Rectangle cancelled');
            }
        });
    }
    
    /**
     * تحديث القيم الحية
     */
    updateLiveValues() {
        if (this.cad.dynamicInputManager && this.cad.dynamicInputManager.active && !this.constrainedMode) {
            // تحويل للوحدة الحالية
            let displayWidth = this.currentWidth;
            let displayHeight = this.currentHeight;
            
            if (this.cad.units && this.cad.currentUnit) {
                try {
                    displayWidth = this.cad.units.fromInternal(displayWidth, this.cad.currentUnit);
                    displayHeight = this.cad.units.fromInternal(displayHeight, this.cad.currentUnit);
                } catch (e) {
                    // استخدام القيم الأصلية
                }
            }
            
            // تحديث حقل الإدخال بالقيم الحالية
            const displayText = `${displayWidth.toFixed(2)},${displayHeight.toFixed(2)}`;
            this.cad.dynamicInputManager.updateLiveValue(displayText);
        }
    }
    
    /**
     * تحديث المعاينة المقيدة
     * 🔧 محدث لمعالجة الاتجاهات
     */
    updateConstrainedPreview() {
        if (this.startPoint && this.constrainedDimensions) {
            // استخدام موضع الماوس الحالي لتحديد الاتجاه
            const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
            const dx = world.x >= this.startPoint.x ? 1 : -1;
            const dy = world.y >= this.startPoint.y ? 1 : -1;
            
            const endPoint = {
                x: this.startPoint.x + (this.constrainedDimensions.width * dx),
                y: this.startPoint.y + (this.constrainedDimensions.height * dy)
            };
            this.showRectanglePreview(endPoint);
            
            // تحديث حالة الأبعاد
            this.currentWidth = this.constrainedDimensions.width;
            this.currentHeight = this.constrainedDimensions.height;
            this.updateStatusWithDimensions();
        }
    }
    
    /**
     * عرض معاينة المستطيل
     */
    showRectanglePreview(endPoint) {
        const currentLayer = this.cad.layerManager?.getCurrentLayer();
        
        const tempShapes = [];
        
        // المستطيل الأساسي
        this.tempShape = {
            type: 'rectangle',
            start: this.startPoint,
            end: endPoint,
            color: currentLayer?.color || this.cad.currentColor,
            lineWidth: currentLayer?.lineWidth || this.cad.currentLineWidth,
            lineType: currentLayer?.lineType || this.cad.currentLineType,
            tempStyle: {
                opacity: this.constrainedMode ? 0.8 : 0.6
            }
        };
        tempShapes.push(this.tempShape);
        
        // خطوط الأبعاد المساعدة
        if (this.constrainedMode || (this.cad.orthoEnabled || this.cad.polarEnabled)) {
            const minX = Math.min(this.startPoint.x, endPoint.x);
            const maxX = Math.max(this.startPoint.x, endPoint.x);
            const minY = Math.min(this.startPoint.y, endPoint.y);
            const maxY = Math.max(this.startPoint.y, endPoint.y);
            
            // خط العرض
            const widthLine = {
                type: 'line',
                start: { x: minX, y: minY - 10 / this.cad.zoom },
                end: { x: maxX, y: minY - 10 / this.cad.zoom },
                color: '#00ffcc',
                lineWidth: 1,
                tempStyle: { opacity: 0.5, dashArray: [2, 2] }
            };
            tempShapes.push(widthLine);
            
            // خط الارتفاع
            const heightLine = {
                type: 'line',
                start: { x: minX - 10 / this.cad.zoom, y: minY },
                end: { x: minX - 10 / this.cad.zoom, y: maxY },
                color: '#00ffcc',
                lineWidth: 1,
                tempStyle: { opacity: 0.5, dashArray: [2, 2] }
            };
            tempShapes.push(heightLine);
        }
        
        // نقطة البداية
        const startMarker = {
            type: 'circle',
            center: this.startPoint,
            radius: 3 / this.cad.zoom,
            color: '#ff9900',
            lineWidth: 2,
            filled: true,
            tempStyle: { opacity: 0.8 }
        };
        tempShapes.push(startMarker);
        
        this.cad.tempShapes = tempShapes;
        this.cad.render();
    }
    
    /**
     * تحديث رسالة الحالة بالأبعاد
     */
    updateStatusWithDimensions() {
        let displayWidth = this.currentWidth;
        let displayHeight = this.currentHeight;
        
        if (this.cad.units && this.cad.currentUnit) {
            try {
                displayWidth = this.cad.units.fromInternal(displayWidth, this.cad.currentUnit);
                displayHeight = this.cad.units.fromInternal(displayHeight, this.cad.currentUnit);
            } catch (e) {
                // استخدام القيم الأصلية
            }
        }
        
        let status = `Width: ${displayWidth.toFixed(2)}, Height: ${displayHeight.toFixed(2)} ${this.cad.currentUnit}`;
        
        if (this.constrainedMode) status += ' [CONSTRAINED]';
        if (this.cad.orthoEnabled) status += ' [ORTHO]';
        if (this.cad.polarEnabled) status += ' [POLAR]';
        
        this.updateStatus(status);
    }
    
    /**
     * إنشاء المستطيل
     */
    createRectangle(start, end) {
        const shape = this.createShape({
            type: 'rectangle',
            start: start,
            end: end,
            filled: false
        });
        
        this.cad.addShape(shape);
        
        // حفظ الأبعاد
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        this.saveLastRectangleDimensions(width, height);
        
        // رسالة النجاح
        let displayWidth = width;
        let displayHeight = height;
        
        if (this.cad.units && this.cad.currentUnit) {
            try {
                displayWidth = this.cad.units.fromInternal(width, this.cad.currentUnit);
                displayHeight = this.cad.units.fromInternal(height, this.cad.currentUnit);
            } catch (e) {
                // استخدام القيم الأصلية
            }
        }
        
        this.updateStatus(
            `Rectangle created: ${displayWidth.toFixed(2)} × ${displayHeight.toFixed(2)} ${this.cad.currentUnit}`
        );
    }
    
    /**
     * إنهاء الرسم
     */
    finishDrawing() {
        this.hideDynamicInput();
        super.finishDrawing();
        this.resetState();
    }
    
    /**
     * إعادة تعيين الحالة
     */
    resetState() {
        this.startPoint = null;
        this.currentWidth = 0;
        this.currentHeight = 0;
        this.constrainedDimensions = null;
        this.constrainedMode = false;
    }
    
    /**
     * معالجة المفاتيح
     */
    onKeyPress(key) {
        if (key === 'Escape') {
            this.finishDrawing();
            this.updateStatus('Rectangle cancelled');
        } else if (key === 'Enter' && this.startPoint) {
            // تطبيق بالقيم الحالية
            if (this.constrainedMode && this.constrainedDimensions) {
                // 🔧 استخدام موضع الماوس لتحديد الاتجاه
                const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
                const dx = world.x >= this.startPoint.x ? 1 : -1;
                const dy = world.y >= this.startPoint.y ? 1 : -1;
                
                const endPoint = {
                    x: this.startPoint.x + (this.constrainedDimensions.width * dx),
                    y: this.startPoint.y + (this.constrainedDimensions.height * dy)
                };
                this.createRectangle(this.startPoint, endPoint);
                this.finishDrawing();
            } else if (this.currentWidth > 0 && this.currentHeight > 0) {
                const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
                const endPoint = this.getConstrainedEndPoint(world);
                this.createRectangle(this.startPoint, endPoint);
                this.finishDrawing();
            }
        } else if (key === 'Tab' && this.cad.dynamicInputManager && this.cad.dynamicInputManager.active) {
            this.cad.dynamicInputManager.handleTab();
        }
    }
    
    /**
     * الحصول على آخر أبعاد مستطيل
     */
    getLastRectangleDimensions() {
        const lastWidth = this.toolsManager?.drawingState?.lastRectWidth || 0;
        const lastHeight = this.toolsManager?.drawingState?.lastRectHeight || 0;
        
        if (lastWidth > 0 && lastHeight > 0 && this.cad.units && this.cad.currentUnit) {
            try {
                const displayWidth = this.cad.units.fromInternal(lastWidth, this.cad.currentUnit);
                const displayHeight = this.cad.units.fromInternal(lastHeight, this.cad.currentUnit);
                return `${displayWidth.toFixed(2)},${displayHeight.toFixed(2)}`;
            } catch (e) {
                return '';
            }
        }
        
        return '';
    }
    
    /**
     * حفظ آخر أبعاد مستطيل
     */
    saveLastRectangleDimensions(width, height) {
        if (this.toolsManager && !this.toolsManager.drawingState) {
            this.toolsManager.drawingState = {};
        }
        if (this.toolsManager) {
            this.toolsManager.drawingState.lastRectWidth = width;
            this.toolsManager.drawingState.lastRectHeight = height;
        }
    }
}