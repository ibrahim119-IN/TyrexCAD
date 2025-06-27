/**
 * TyrexCAD UI System
 * نظام إدارة واجهة المستخدم
 * 
 * يحتوي على جميع وظائف التحديث والعرض للواجهة
 */

class UI {
    constructor(cad) {
        this.cad = cad;
        this.elements = new Map();
        this.inputDialogCallback = null;
    }
    
    /**
     * تهيئة النظام
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initializeColorPalette();
        this.initializeBottomToolbar();
        this.updateLayersList();
    }
    
    /**
     * تخزين مراجع العناصر للأداء
     */
    cacheElements() {
        // Coordinates and status
        this.elements.set('coordinates', document.getElementById('coordinates'));
        this.elements.set('statusMode', document.getElementById('statusMode'));
        this.elements.set('statusTool', document.getElementById('statusTool'));
        this.elements.set('statusLayer', document.getElementById('statusLayer'));
        this.elements.set('statusObjects', document.getElementById('statusObjects'));
        this.elements.set('statusSnap', document.getElementById('statusSnap'));
        this.elements.set('statusGrid', document.getElementById('statusGrid'));
        this.elements.set('statusOrtho', document.getElementById('statusOrtho'));
        this.elements.set('statusPolar', document.getElementById('statusPolar'));
        this.elements.set('fps', document.getElementById('fps'));
        
        // Properties panel
        this.elements.set('propertiesPanel', document.getElementById('propertiesPanel'));
        this.elements.set('propType', document.getElementById('propType'));
        this.elements.set('specificProperties', document.getElementById('specificProperties'));
        
        // Layers
        this.elements.set('layersList', document.getElementById('layersList'));
        
        // Drawing settings
        this.elements.set('lineWidthSlider', document.getElementById('lineWidthSlider'));
        this.elements.set('lineWidthValue', document.getElementById('lineWidthValue'));
        this.elements.set('lineTypeSelect', document.getElementById('lineTypeSelect'));
        this.elements.set('currentColorPreview', document.getElementById('currentColorPreview'));
        this.elements.set('currentColorText', document.getElementById('currentColorText'));
        this.elements.set('colorDropdown', document.getElementById('colorDropdown'));
        this.elements.set('colorGrid', document.getElementById('colorGrid'));
        
        // Snap menu
        this.elements.set('snapMenu', document.getElementById('snapMenu'));
        this.elements.set('snapButton', document.getElementById('snapButton'));
        this.elements.set('snapIndicator', document.getElementById('snapIndicator'));
        this.elements.set('snapLabel', document.getElementById('snapLabel'));
        
        // Toolbar buttons
        this.elements.set('orthoButton', document.getElementById('orthoButton'));
        this.elements.set('polarButton', document.getElementById('polarButton'));
        this.elements.set('gridButton', document.getElementById('gridButton'));
        
        // Dynamic input
        this.elements.set('dynamicInput', document.getElementById('dynamicInput'));
        this.elements.set('dynamicLabel', document.getElementById('dynamicLabel'));
        this.elements.set('dynamicField', document.getElementById('dynamicField'));
        
        // Input dialog
        this.elements.set('inputDialog', document.getElementById('inputDialog'));
        this.elements.set('inputDialogTitle', document.getElementById('inputDialogTitle'));
        this.elements.set('inputDialogContent', document.getElementById('inputDialogContent'));
        
        // Context menu
        this.elements.set('contextMenu', document.getElementById('contextMenu'));
        
        // Crosshair
        this.elements.set('crosshair', document.getElementById('crosshair'));
        
        // Selection box
        this.elements.set('selectionBox', document.getElementById('selectionBox'));
        
        // Zoom window
        this.elements.set('zoomWindowOverlay', document.getElementById('zoomWindowOverlay'));
        this.elements.set('zoomWindowBox', document.getElementById('zoomWindowBox'));
        
        // Canvas
        this.elements.set('canvasContainer', document.getElementById('canvasContainer'));
        this.elements.set('mainCanvas', document.getElementById('mainCanvas'));
        this.elements.set('canvas3D', document.getElementById('canvas3D'));
        this.elements.set('controls3D', document.getElementById('controls3D'));
        
        // Command input
        this.elements.set('commandInput', document.getElementById('commandInput'));
        
        // Units select
        this.elements.set('unitsSelect', document.getElementById('unitsSelect'));
    }
    
    /**
     * ربط الأحداث
     */
    bindEvents() {
        // Close menus when clicking outside
        document.addEventListener('click', (e) => {
            // Close snap menu
            const snapMenu = this.elements.get('snapMenu');
            const snapButton = this.elements.get('snapButton');
            if (!snapMenu.contains(e.target) && !snapButton.contains(e.target)) {
                snapMenu.classList.remove('open');
            }
            
            // Close color dropdown
            const colorDropdown = this.elements.get('colorDropdown');
            if (!colorDropdown.contains(e.target)) {
                colorDropdown.classList.remove('open');
            }
        });
    }
    
    /**
     * تحديث الواجهة بالكامل
     */
    updateUI() {
        this.updatePropertiesPanel();
        this.updateStatus();
        this.elements.get('statusObjects').textContent = this.cad.shapes.length;
        this.elements.get('statusLayer').textContent = this.cad.layers.get(this.cad.currentLayerId)?.name || '0';
        this.elements.get('unitsSelect').value = this.cad.currentUnit;
    }
    
    /**
     * تحديث رسالة الحالة
     */
    updateStatus(message) {
        this.elements.get('statusMode').textContent = message || 'READY';
    }
    
    /**
     * تحديث إحداثيات الماوس
     */
    updateCoordinates(x, y, z = 0) {
        const xFormatted = this.cad.formatValue(x);
        const yFormatted = this.cad.formatValue(y);
        const zFormatted = this.cad.formatValue(z);
        this.elements.get('coordinates').textContent = 
            `X: ${xFormatted}, Y: ${yFormatted}, Z: ${zFormatted}`;
    }
    
    /**
     * تحديث لوحة الخصائص
     */
    updatePropertiesPanel() {
        const selected = Array.from(this.cad.selectedShapes);
        const propType = this.elements.get('propType');
        const specificProperties = this.elements.get('specificProperties');
        
        if (selected.length === 1) {
            const shape = selected[0];
            propType.textContent = shape.type.toUpperCase();
            specificProperties.innerHTML = this.getShapeProperties(shape);
        } else if (selected.length > 1) {
            propType.textContent = `${selected.length} OBJECTS`;
            specificProperties.innerHTML = '';
        } else {
            propType.textContent = 'None';
            specificProperties.innerHTML = '';
        }
    }
    
    /**
     * الحصول على خصائص الشكل
     */
    getShapeProperties(shape) {
        let html = '';
        
        switch (shape.type) {
            case 'line':
                const length = this.cad.distance(
                    shape.start.x, shape.start.y,
                    shape.end.x, shape.end.y
                );
                const angle = Math.atan2(
                    shape.end.y - shape.start.y,
                    shape.end.x - shape.start.x
                ) * 180 / Math.PI;
                
                html = `
                    <div class="property-row">
                        <span class="property-label">Length:</span>
                        <span class="property-value">${this.cad.formatValue(length)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Angle:</span>
                        <span class="property-value">${angle.toFixed(1)}°</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Start:</span>
                        <span class="property-value">${this.cad.formatValue(shape.start.x)}, ${this.cad.formatValue(shape.start.y)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">End:</span>
                        <span class="property-value">${this.cad.formatValue(shape.end.x)}, ${this.cad.formatValue(shape.end.y)}</span>
                    </div>
                `;
                break;
                
            case 'circle':
                html = `
                    <div class="property-row">
                        <span class="property-label">Center:</span>
                        <span class="property-value">${this.cad.formatValue(shape.center.x)}, ${this.cad.formatValue(shape.center.y)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Radius:</span>
                        <span class="property-value">${this.cad.formatValue(shape.radius)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Circumference:</span>
                        <span class="property-value">${this.cad.formatValue(2 * Math.PI * shape.radius)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Area:</span>
                        <span class="property-value">${this.cad.formatValue(Math.PI * shape.radius * shape.radius)}</span>
                    </div>
                `;
                break;
                
            case 'rectangle':
                const width = Math.abs(shape.end.x - shape.start.x);
                const height = Math.abs(shape.end.y - shape.start.y);
                html = `
                    <div class="property-row">
                        <span class="property-label">Width:</span>
                        <span class="property-value">${this.cad.formatValue(width)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Height:</span>
                        <span class="property-value">${this.cad.formatValue(height)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Area:</span>
                        <span class="property-value">${this.cad.formatValue(width * height)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Perimeter:</span>
                        <span class="property-value">${this.cad.formatValue(2 * (width + height))}</span>
                    </div>
                `;
                break;
                
            case 'polyline':
                let totalLength = 0;
                for (let i = 0; i < shape.points.length - 1; i++) {
                    totalLength += this.cad.distance(
                        shape.points[i].x, shape.points[i].y,
                        shape.points[i + 1].x, shape.points[i + 1].y
                    );
                }
                html = `
                    <div class="property-row">
                        <span class="property-label">Points:</span>
                        <span class="property-value">${shape.points.length}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Total Length:</span>
                        <span class="property-value">${this.cad.formatValue(totalLength)}</span>
                    </div>
                `;
                break;
        }
        
        return html;
    }
    
    /**
     * تحديث قائمة الطبقات
     */
    updateLayersList() {
        const container = this.elements.get('layersList');
        container.innerHTML = '';
        
        for (const [id, layer] of this.cad.layers) {
            const item = document.createElement('div');
            item.className = 'layer-item';
            if (id === this.cad.currentLayerId) item.classList.add('active');
            
            item.innerHTML = `
                <div class="layer-visibility ${layer.visible ? 'visible' : ''}" 
                     onclick="cad.toggleLayerVisibility(${id})">
                    <i class="fas fa-eye${layer.visible ? '' : '-slash'}"></i>
                </div>
                <div class="layer-lock ${layer.locked ? 'locked' : ''}"
                     onclick="cad.toggleLayerLock(${id})">
                    <i class="fas fa-lock${layer.locked ? '' : '-open'}"></i>
                </div>
                <div class="layer-color" style="background: ${layer.color};"
                     onclick="cad.changeLayerColor(${id})"></div>
                <input class="layer-name" value="${layer.name}" 
                       style="background: transparent; border: none; color: var(--text-primary); flex: 1; font-size: 13px; padding: 4px;"
                       onchange="cad.renameLayer(${id}, this.value)"
                       onclick="cad.setCurrentLayer(${id})">
            `;
            
            container.appendChild(item);
        }
    }
    
    /**
     * إظهار قائمة السياق
     */
    showContextMenu(x, y) {
        const menu = this.elements.get('contextMenu');
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
        
        setTimeout(() => {
            document.addEventListener('click', () => {
                menu.style.display = 'none';
            }, { once: true });
        }, 0);
    }
    
    /**
     * إظهار لوحة الخصائص
     */
    showProperties() {
        const panel = this.elements.get('propertiesPanel');
        panel.classList.remove('collapsed');
    }
    
    /**
     * تبديل لوحة الخصائص
     */
    togglePropertiesPanel() {
        const panel = this.elements.get('propertiesPanel');
        panel.classList.toggle('collapsed');
    }
    
    /**
     * إظهار حقل الإدخال الديناميكي
     */
    showDynamicInput(label, point) {
        const input = this.elements.get('dynamicInput');
        const labelEl = this.elements.get('dynamicLabel');
        const field = this.elements.get('dynamicField');
        
        // أضف الوحدة للتسمية إذا كانت مناسبة
        let displayLabel = label;
        if (label.includes('distance') || label.includes('Offset') || label.includes('Length')) {
            const unitSymbol = this.cad.units.getUnitInfo(this.cad.currentUnit).symbol;
            displayLabel = `${label} (${unitSymbol})`;
        }
        
        labelEl.textContent = displayLabel;
        field.value = '';
        field.placeholder = 'e.g. 100 or 100mm';
        
        const screen = this.cad.worldToScreen(point.x, point.y);
        input.style.left = (screen.x + 20) + 'px';
        input.style.top = (screen.y - 40) + 'px';
        input.classList.add('active');
        
        field.focus();
        field.select();
    }
    
    /**
     * إخفاء حقل الإدخال الديناميكي
     */
    hideDynamicInput() {
        this.elements.get('dynamicInput').classList.remove('active');
    }
    
    /**
     * تحديث مؤشر الالتقاط
     */
    updateSnapIndicator(snapPoint, screenPos) {
        const indicator = this.elements.get('snapIndicator');
        const label = this.elements.get('snapLabel');
        
        if (snapPoint && snapPoint.type) {
            indicator.style.left = screenPos.x + 'px';
            indicator.style.top = screenPos.y + 'px';
            indicator.classList.add('visible');
            label.textContent = snapPoint.type;
        } else {
            indicator.classList.remove('visible');
        }
    }
    
    /**
     * تحديث المؤشر التقاطعي
     */
    updateCrosshair(x, y) {
        const crosshair = this.elements.get('crosshair');
        if (this.cad.mode === '2D') {
            crosshair.style.display = 'block';
            crosshair.style.left = x + 'px';
            crosshair.style.top = y + 'px';
        } else {
            crosshair.style.display = 'none';
        }
    }
    
    /**
     * تهيئة لوحة الألوان
     */
    initializeColorPalette() {
        const grid = this.elements.get('colorGrid');
        grid.innerHTML = '';
        
        this.cad.colorPalette.forEach(color => {
            const option = document.createElement('div');
            option.className = 'color-option';
            option.style.background = color;
            option.onclick = () => this.cad.setColor(color);
            grid.appendChild(option);
        });
    }
    
    /**
     * تهيئة شريط الأدوات السفلي
     */
    initializeBottomToolbar() {
        // Update snap menu options
        Object.keys(this.cad.snapSettings).forEach(key => {
            const element = document.getElementById('snap' + key.charAt(0).toUpperCase() + key.slice(1));
            if (element) {
                element.classList.toggle('active', this.cad.snapSettings[key]);
            }
        });
        
        // Update toolbar buttons
        this.elements.get('orthoButton').classList.toggle('active', this.cad.orthoEnabled);
        this.elements.get('polarButton').classList.toggle('active', this.cad.polarEnabled);
        this.elements.get('gridButton').classList.toggle('active', this.cad.gridEnabled);
        
        // Snap button active if any snap is enabled
        const anySnapActive = Object.values(this.cad.snapSettings).some(v => v);
        this.elements.get('snapButton').classList.toggle('active', anySnapActive);
    }
    
    /**
     * تبديل قائمة الالتقاط
     */
    toggleSnapMenu() {
        const menu = this.elements.get('snapMenu');
        menu.classList.toggle('open');
        event.stopPropagation();
    }
    
    /**
     * تبديل قائمة الألوان
     */
    toggleColorDropdown() {
        const dropdown = this.elements.get('colorDropdown');
        dropdown.classList.toggle('open');
        event.stopPropagation();
    }
    
    /**
     * إظهار نافذة الإدخال
     */
    showInputDialog(shapeType) {
        const dialog = this.elements.get('inputDialog');
        const title = this.elements.get('inputDialogTitle');
        const content = this.elements.get('inputDialogContent');
        
        const unitSymbol = this.cad.units.getUnitInfo(this.cad.currentUnit).symbol;
        let html = '';
        
        switch (shapeType) {
            case 'line':
                title.textContent = 'Line Properties';
                html = `
                    <div class="input-dialog-row">
                        <span class="input-dialog-label">Length (${unitSymbol}):</span>
                        <input type="text" class="input-dialog-field" id="lineLength" 
                               placeholder="e.g. 100 or 100mm or 10cm">
                    </div>
                    <div class="input-dialog-row">
                        <span class="input-dialog-label">Angle (degrees):</span>
                        <input type="number" class="input-dialog-field" id="lineAngle" 
                               placeholder="Angle in degrees">
                    </div>
                `;
                break;
                
            case 'rectangle':
                title.textContent = 'Rectangle Properties';
                html = `
                    <div class="input-dialog-row">
                        <span class="input-dialog-label">Width (${unitSymbol}):</span>
                        <input type="text" class="input-dialog-field" id="rectWidth" 
                               placeholder="e.g. 100 or 100mm">
                    </div>
                    <div class="input-dialog-row">
                        <span class="input-dialog-label">Height (${unitSymbol}):</span>
                        <input type="text" class="input-dialog-field" id="rectHeight" 
                               placeholder="e.g. 50 or 5cm">
                    </div>
                `;
                break;
                
            case 'circle':
                title.textContent = 'Circle Properties';
                html = `
                    <div class="input-dialog-row">
                        <span class="input-dialog-label">Radius (${unitSymbol}):</span>
                        <input type="text" class="input-dialog-field" id="circleRadius" 
                               placeholder="e.g. 50 or 50mm">
                    </div>
                    <div class="input-dialog-row">
                        <span class="input-dialog-label">Diameter (${unitSymbol}):</span>
                        <input type="text" class="input-dialog-field" id="circleDiameter" 
                               placeholder="e.g. 100 or 10cm">
                    </div>
                `;
                break;
        }
        
        content.innerHTML = html;
        dialog.classList.add('active');
        
        // Set up input field interactions with units support
        if (shapeType === 'circle') {
            const radiusInput = document.getElementById('circleRadius');
            const diameterInput = document.getElementById('circleDiameter');
            
            radiusInput.addEventListener('input', () => {
                const parsed = this.cad.parseUserInput(radiusInput.value);
                if (parsed !== null) {
                    const radiusInternal = parsed;
                    const diameterUser = this.cad.toUserUnits(radiusInternal * 2);
                    diameterInput.value = diameterUser.toFixed(2);
                }
            });
            
            diameterInput.addEventListener('input', () => {
                const parsed = this.cad.parseUserInput(diameterInput.value);
                if (parsed !== null) {
                    const diameterInternal = parsed;
                    const radiusUser = this.cad.toUserUnits(diameterInternal / 2);
                    radiusInput.value = radiusUser.toFixed(2);
                }
            });
        }
        
        // Focus first input
        setTimeout(() => {
            const firstInput = content.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
        
        this.inputDialogCallback = () => {
            const values = {};
            content.querySelectorAll('input').forEach(input => {
                if (input.type === 'number') {
                    values[input.id] = parseFloat(input.value) || 0;
                } else {
                    // Parse text inputs that may contain units
                    const parsed = this.cad.parseUserInput(input.value);
                    values[input.id] = parsed !== null ? parsed : 0;
                }
            });
            
            this.updateStatus('Click to specify starting point');
            this.cad.pendingShapeProperties = values;
        };
    }
    
    /**
     * إلغاء نافذة الإدخال
     */
    cancelInputDialog() {
        this.elements.get('inputDialog').classList.remove('active');
        this.inputDialogCallback = null;
        this.cad.pendingShapeProperties = null;
    }
    
    /**
     * تأكيد نافذة الإدخال
     */
    confirmInputDialog() {
        if (this.inputDialogCallback) {
            this.inputDialogCallback();
        }
        this.elements.get('inputDialog').classList.remove('active');
    }
    
    /**
     * تحديث صندوق التحديد
     */
    updateSelectionBox(startX, startY, currentX, currentY) {
        const box = this.elements.get('selectionBox');
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        box.style.left = x + 'px';
        box.style.top = y + 'px';
        box.style.width = width + 'px';
        box.style.height = height + 'px';
        box.style.display = 'block';
    }
    
    /**
     * إخفاء صندوق التحديد
     */
    hideSelectionBox() {
        this.elements.get('selectionBox').style.display = 'none';
    }
    
    /**
     * إظهار نافذة التكبير
     */
    showZoomWindow() {
        this.elements.get('zoomWindowOverlay').style.display = 'block';
        this.elements.get('zoomWindowOverlay').style.cursor = 'crosshair';
    }
    
    /**
     * إخفاء نافذة التكبير
     */
    hideZoomWindow() {
        this.elements.get('zoomWindowOverlay').style.display = 'none';
        this.elements.get('zoomWindowBox').style.display = 'none';
    }
    
    /**
     * تحديث صندوق التكبير
     */
    updateZoomBox(startX, startY, currentX, currentY) {
        const box = this.elements.get('zoomWindowBox');
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        box.style.left = x + 'px';
        box.style.top = y + 'px';
        box.style.width = width + 'px';
        box.style.height = height + 'px';
        box.style.display = 'block';
    }
    
    /**
     * تحديث لون العرض
     */
    updateColorDisplay(color) {
        this.elements.get('currentColorPreview').style.background = color;
        this.elements.get('currentColorText').textContent = color;
        this.elements.get('colorDropdown').classList.remove('open');
    }
    
    /**
     * تحديث عرض عرض الخط
     */
    updateLineWidthDisplay(width) {
        this.elements.get('lineWidthValue').textContent = width;
    }
    
    /**
     * تحديث أزرار الشريط السفلي
     */
    updateBottomToolbar() {
        this.elements.get('statusSnap').textContent = this.cad.snapEnabled ? 'ON' : 'OFF';
        this.elements.get('statusGrid').textContent = this.cad.gridEnabled ? 'ON' : 'OFF';
        this.elements.get('statusOrtho').textContent = this.cad.orthoEnabled ? 'ON' : 'OFF';
        this.elements.get('statusPolar').textContent = this.cad.polarEnabled ? 'ON' : 'OFF';
        this.elements.get('orthoButton').classList.toggle('active', this.cad.orthoEnabled);
        this.elements.get('polarButton').classList.toggle('active', this.cad.polarEnabled);
        this.elements.get('gridButton').classList.toggle('active', this.cad.gridEnabled);
        
        // Update snap button
        const anySnapActive = Object.values(this.cad.snapSettings).some(v => v);
        this.elements.get('snapButton').classList.toggle('active', anySnapActive);
    }
    
    /**
     * تحديث وضع العرض
     */
    updateViewMode(mode) {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === mode);
        });
        
        if (mode === '2D') {
            this.elements.get('mainCanvas').style.display = 'block';
            this.elements.get('canvas3D').style.display = 'none';
            this.elements.get('controls3D').classList.remove('visible');
        } else {
            this.elements.get('mainCanvas').style.display = 'none';
            this.elements.get('canvas3D').style.display = 'block';
            this.elements.get('controls3D').classList.add('visible');
            this.elements.get('crosshair').style.display = 'none';
        }
    }
    
    /**
     * تحديث الأداة النشطة
     */
    updateActiveTool(tool) {
        // Update UI
        document.querySelectorAll('.ribbon-tool').forEach(el => {
            el.classList.remove('active');
        });
        
        // Find and activate the current tool button
        document.querySelectorAll('.ribbon-tool').forEach(el => {
            if (el.onclick && el.onclick.toString().includes(`'${tool}'`)) {
                el.classList.add('active');
            }
        });
        
        // Update status
        this.elements.get('statusTool').textContent = tool.toUpperCase();
    }
    
    /**
     * إخفاء شاشة التحميل
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.style.display = 'none', 500);
    }
}

// تصدير النظام
window.UI = UI;