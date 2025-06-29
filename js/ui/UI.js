/**
 * TyrexCAD UI System - Enhanced Edition
 * نظام إدارة واجهة المستخدم المتطور
 * 
 * يحتوي على جميع وظائف التحديث والعرض للواجهة
 * مع إضافة دعم كامل للأدوات المتقدمة
 */

class UI {
    constructor(cad) {
        this.cad = cad;
        this.elements = new Map();
        this.inputDialogCallback = null;
        
        // نظام الـ Panels المتقدم
        this.toolPanels = new Map();
        this.currentPanel = null;
        this.panelContainer = null;
        
        // نظام المعاينة الحية
        this.previewMode = false;
        this.previewShapes = [];
        
        // حالة الأدوات المتقدمة
        this.advancedToolState = {
            fillet: { radius: 10, trim: true, multiple: false },
            chamfer: { distance1: 10, distance2: 10, method: 'distance' },
            array: {
                rectangular: { rows: 3, cols: 3, rowSpacing: 50, colSpacing: 50 },
                polar: { count: 6, angle: 360, rotate: true },
                path: { count: 10, align: true, method: 'divide' }
            }
        };
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
        this.initializeAdvancedTools();
        this.createPanelContainer();
    }
    
    /**
     * تهيئة الأدوات المتقدمة
     */
    initializeAdvancedTools() {
        // تسجيل panels للأدوات المتقدمة
        this.registerToolPanel('fillet', this.createFilletPanel.bind(this));
        this.registerToolPanel('chamfer', this.createChamferPanel.bind(this));
        this.registerToolPanel('rectangular-array', this.createRectangularArrayPanel.bind(this));
        this.registerToolPanel('polar-array', this.createPolarArrayPanel.bind(this));
        this.registerToolPanel('path-array', this.createPathArrayPanel.bind(this));
        this.registerToolPanel('boolean', this.createBooleanPanel.bind(this));
        this.registerToolPanel('analysis', this.createAnalysisPanel.bind(this));
        this.registerToolPanel('curves', this.createCurvesPanel.bind(this));
    }
    
    /**
     * إنشاء حاوية الـ Panels
     */
    createPanelContainer() {
        this.panelContainer = document.createElement('div');
        this.panelContainer.id = 'toolPanelContainer';
        this.panelContainer.className = 'tool-panel-container';
        document.getElementById('canvasContainer').appendChild(this.panelContainer);
    }
    
    /**
     * تسجيل panel لأداة
     */
    registerToolPanel(toolName, createFunction) {
        this.toolPanels.set(toolName, createFunction);
    }
    
    /**
     * عرض panel أداة
     */
    showToolPanel(toolName, position) {
        // إخفاء أي panel مفتوح
        this.hideToolPanel();
        
        // إنشاء الـ panel الجديد
        const createPanel = this.toolPanels.get(toolName);
        if (!createPanel) return;
        
        const panel = document.createElement('div');
        panel.className = 'tool-panel active';
        panel.innerHTML = createPanel();
        
        // تحديد الموضع
        if (position) {
            panel.style.left = position.x + 'px';
            panel.style.top = position.y + 'px';
        } else {
            // موضع افتراضي بجانب الأدوات
            panel.style.left = '350px';
            panel.style.top = '200px';
        }
        
        this.panelContainer.appendChild(panel);
        this.currentPanel = panel;
        
        // تفعيل المعاينة الحية
        this.startLivePreview(toolName);
        
        // إضافة إمكانية السحب
        this.makePanelDraggable(panel);
    }
    
    /**
     * إخفاء panel الأداة
     */
    hideToolPanel() {
        if (this.currentPanel) {
            this.currentPanel.remove();
            this.currentPanel = null;
        }
        this.stopLivePreview();
        
        const panels = document.querySelectorAll('.tool-panel');
        panels.forEach(panel => {
            panel.classList.remove('active');
        });
    }
    
    /**
     * جعل الـ panel قابل للسحب
     */
    makePanelDraggable(panel) {
        const header = panel.querySelector('h3');
        if (!header) return;
        
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        
        header.style.cursor = 'move';
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            initialX = e.clientX - panel.offsetLeft;
            initialY = e.clientY - panel.offsetTop;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            panel.style.left = currentX + 'px';
            panel.style.top = currentY + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    // ==================== Panels للأدوات المتقدمة ====================
    
    /**
     * إنشاء panel Fillet
     */
    createFilletPanel() {
        const state = this.advancedToolState.fillet;
        const unitSymbol = this.cad.units.getUnitInfo(this.cad.currentUnit).symbol;
        
        return `
            <h3><i class="fas fa-bezier-curve"></i> Fillet Options</h3>
            <div class="panel-content">
                <div class="panel-row">
                    <label>Radius:</label>
                    <div class="input-group">
                        <input type="number" id="filletRadius" value="${state.radius}" 
                               onchange="cad.ui.updateFilletOptions()">
                        <span class="unit-label">${unitSymbol}</span>
                    </div>
                </div>
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="filletTrim" ${state.trim ? 'checked' : ''}
                               onchange="cad.ui.updateFilletOptions()">
                        Trim corners
                    </label>
                </div>
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="filletMultiple" ${state.multiple ? 'checked' : ''}
                               onchange="cad.ui.updateFilletOptions()">
                        Multiple mode
                    </label>
                </div>
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="filletPolyline"
                               onchange="cad.ui.updateFilletOptions()">
                        Apply to entire polyline
                    </label>
                </div>
                <div class="panel-help">
                    <i class="fas fa-info-circle"></i>
                    Select two lines or a polyline to apply fillet
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.applyFillet()">
                        <i class="fas fa-check"></i> Apply
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.hideToolPanel()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * إنشاء panel Chamfer
     */
    createChamferPanel() {
        const state = this.advancedToolState.chamfer;
        const unitSymbol = this.cad.units.getUnitInfo(this.cad.currentUnit).symbol;
        
        return `
            <h3><i class="fas fa-cut"></i> Chamfer Options</h3>
            <div class="panel-content">
                <div class="panel-tabs">
                    <button class="tab-btn ${state.method === 'distance' ? 'active' : ''}"
                            onclick="cad.ui.setChamferMethod('distance')">Distance</button>
                    <button class="tab-btn ${state.method === 'angle' ? 'active' : ''}"
                            onclick="cad.ui.setChamferMethod('angle')">Angle</button>
                </div>
                
                <div id="chamferDistanceOptions" style="display: ${state.method === 'distance' ? 'block' : 'none'}">
                    <div class="panel-row">
                        <label>Distance 1:</label>
                        <div class="input-group">
                            <input type="number" id="chamferDistance1" value="${state.distance1}"
                                   onchange="cad.ui.updateChamferOptions()">
                            <span class="unit-label">${unitSymbol}</span>
                        </div>
                    </div>
                    <div class="panel-row">
                        <label>Distance 2:</label>
                        <div class="input-group">
                            <input type="number" id="chamferDistance2" value="${state.distance2}"
                                   onchange="cad.ui.updateChamferOptions()">
                            <span class="unit-label">${unitSymbol}</span>
                        </div>
                    </div>
                    <div class="panel-row">
                        <button class="btn btn-small" onclick="cad.ui.setChamferEqual()">
                            <i class="fas fa-equals"></i> Equal distances
                        </button>
                    </div>
                </div>
                
                <div id="chamferAngleOptions" style="display: ${state.method === 'angle' ? 'block' : 'none'}">
                    <div class="panel-row">
                        <label>Distance:</label>
                        <div class="input-group">
                            <input type="number" id="chamferAngleDistance" value="${state.distance1}"
                                   onchange="cad.ui.updateChamferOptions()">
                            <span class="unit-label">${unitSymbol}</span>
                        </div>
                    </div>
                    <div class="panel-row">
                        <label>Angle:</label>
                        <div class="input-group">
                            <input type="number" id="chamferAngle" value="45"
                                   onchange="cad.ui.updateChamferOptions()">
                            <span class="unit-label">°</span>
                        </div>
                    </div>
                </div>
                
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="chamferTrim" checked
                               onchange="cad.ui.updateChamferOptions()">
                        Trim corners
                    </label>
                </div>
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="chamferPolyline"
                               onchange="cad.ui.updateChamferOptions()">
                        Apply to entire polyline
                    </label>
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.applyChamfer()">
                        <i class="fas fa-check"></i> Apply
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.hideToolPanel()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * إنشاء panel Rectangular Array
     */
    createRectangularArrayPanel() {
        const state = this.advancedToolState.array.rectangular;
        const unitSymbol = this.cad.units.getUnitInfo(this.cad.currentUnit).symbol;
        
        return `
            <h3><i class="fas fa-th"></i> Rectangular Array</h3>
            <div class="panel-content">
                <div class="array-preview">
                    <canvas id="arrayPreviewCanvas" width="200" height="150"></canvas>
                </div>
                <div class="panel-row">
                    <label>Rows:</label>
                    <input type="number" id="arrayRows" value="${state.rows}" min="1"
                           onchange="cad.ui.updateArrayPreview()">
                </div>
                <div class="panel-row">
                    <label>Columns:</label>
                    <input type="number" id="arrayCols" value="${state.cols}" min="1"
                           onchange="cad.ui.updateArrayPreview()">
                </div>
                <div class="panel-row">
                    <label>Row spacing:</label>
                    <div class="input-group">
                        <input type="number" id="arrayRowSpacing" value="${state.rowSpacing}"
                               onchange="cad.ui.updateArrayPreview()">
                        <span class="unit-label">${unitSymbol}</span>
                    </div>
                </div>
                <div class="panel-row">
                    <label>Column spacing:</label>
                    <div class="input-group">
                        <input type="number" id="arrayColSpacing" value="${state.colSpacing}"
                               onchange="cad.ui.updateArrayPreview()">
                        <span class="unit-label">${unitSymbol}</span>
                    </div>
                </div>
                <div class="panel-row">
                    <label>Total items: <span id="arrayTotalItems">${state.rows * state.cols}</span></label>
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.applyRectangularArray()">
                        <i class="fas fa-check"></i> Create Array
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.hideToolPanel()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * إنشاء panel Polar Array
     */
    createPolarArrayPanel() {
        const state = this.advancedToolState.array.polar;
        
        return `
            <h3><i class="fas fa-circle-notch"></i> Polar Array</h3>
            <div class="panel-content">
                <div class="array-preview">
                    <canvas id="arrayPreviewCanvas" width="200" height="200"></canvas>
                </div>
                <div class="panel-row">
                    <label>Number of items:</label>
                    <input type="number" id="polarCount" value="${state.count}" min="2"
                           onchange="cad.ui.updateArrayPreview()">
                </div>
                <div class="panel-row">
                    <label>Fill angle:</label>
                    <div class="input-group">
                        <input type="number" id="polarAngle" value="${state.angle}" 
                               min="0" max="360" step="15"
                               onchange="cad.ui.updateArrayPreview()">
                        <span class="unit-label">°</span>
                    </div>
                </div>
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="polarRotate" ${state.rotate ? 'checked' : ''}
                               onchange="cad.ui.updateArrayPreview()">
                        Rotate items
                    </label>
                </div>
                <div class="panel-row">
                    <label>Center point:</label>
                    <button class="btn btn-small" onclick="cad.ui.pickPolarCenter()">
                        <i class="fas fa-crosshairs"></i> Pick center
                    </button>
                </div>
                <div class="panel-help">
                    <i class="fas fa-info-circle"></i>
                    Click to specify the center point of rotation
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.applyPolarArray()">
                        <i class="fas fa-check"></i> Create Array
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.hideToolPanel()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * إنشاء panel Path Array
     */
    createPathArrayPanel() {
        const state = this.advancedToolState.array.path;
        
        return `
            <h3><i class="fas fa-route"></i> Path Array</h3>
            <div class="panel-content">
                <div class="panel-tabs">
                    <button class="tab-btn ${state.method === 'divide' ? 'active' : ''}"
                            onclick="cad.ui.setPathArrayMethod('divide')">Divide</button>
                    <button class="tab-btn ${state.method === 'measure' ? 'active' : ''}"
                            onclick="cad.ui.setPathArrayMethod('measure')">Measure</button>
                </div>
                
                <div id="pathDivideOptions" style="display: ${state.method === 'divide' ? 'block' : 'none'}">
                    <div class="panel-row">
                        <label>Number of items:</label>
                        <input type="number" id="pathCount" value="${state.count}" min="2"
                               onchange="cad.ui.updateArrayPreview()">
                    </div>
                </div>
                
                <div id="pathMeasureOptions" style="display: ${state.method === 'measure' ? 'block' : 'none'}">
                    <div class="panel-row">
                        <label>Item spacing:</label>
                        <div class="input-group">
                            <input type="number" id="pathSpacing" value="50"
                                   onchange="cad.ui.updateArrayPreview()">
                            <span class="unit-label">${this.cad.units.getUnitInfo(this.cad.currentUnit).symbol}</span>
                        </div>
                    </div>
                </div>
                
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="pathAlign" ${state.align ? 'checked' : ''}
                               onchange="cad.ui.updateArrayPreview()">
                        Align items to path
                    </label>
                </div>
                <div class="panel-row">
                    <label>Path:</label>
                    <button class="btn btn-small" onclick="cad.ui.selectPathForArray()">
                        <i class="fas fa-mouse-pointer"></i> Select path
                    </button>
                </div>
                <div class="panel-help">
                    <i class="fas fa-info-circle"></i>
                    Select a polyline or curve as the path
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.applyPathArray()">
                        <i class="fas fa-check"></i> Create Array
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.hideToolPanel()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * إنشاء panel Boolean Operations
     */
    createBooleanPanel() {
        return `
            <h3><i class="fas fa-object-group"></i> Boolean Operations</h3>
            <div class="panel-content">
                <div class="boolean-options">
                    <button class="boolean-btn" onclick="cad.ui.performBoolean('union')">
                        <svg width="40" height="40" viewBox="0 0 40 40">
                            <circle cx="15" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                            <circle cx="25" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                            <path d="M15 10 Q20 10 25 10 Q30 15 30 20 Q30 25 25 30 Q20 30 15 30 Q10 25 10 20 Q10 15 15 10" fill="currentColor" opacity="0.3"/>
                        </svg>
                        <span>Union</span>
                    </button>
                    <button class="boolean-btn" onclick="cad.ui.performBoolean('difference')">
                        <svg width="40" height="40" viewBox="0 0 40 40">
                            <circle cx="15" cy="20" r="10" fill="currentColor" opacity="0.3"/>
                            <circle cx="25" cy="20" r="10" fill="white" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>Difference</span>
                    </button>
                    <button class="boolean-btn" onclick="cad.ui.performBoolean('intersection')">
                        <svg width="40" height="40" viewBox="0 0 40 40">
                            <circle cx="15" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                            <circle cx="25" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                            <path d="M20 10 Q25 10 25 20 Q25 30 20 30 Q15 30 15 20 Q15 10 20 10" fill="currentColor" opacity="0.3"/>
                        </svg>
                        <span>Intersection</span>
                    </button>
                </div>
                <div class="panel-help">
                    <i class="fas fa-info-circle"></i>
                    Select shapes and click an operation
                </div>
                <div class="panel-row">
                    <label>Selected shapes: <span id="booleanShapeCount">0</span></label>
                </div>
            </div>
        `;
    }
    
    /**
     * إنشاء panel Analysis
     */
    createAnalysisPanel() {
        return `
            <h3><i class="fas fa-ruler-combined"></i> Analysis Tools</h3>
            <div class="panel-content">
                <div class="analysis-options">
                    <button class="analysis-btn" onclick="cad.ui.analyzeDistance()">
                        <i class="fas fa-ruler"></i>
                        <span>Distance</span>
                    </button>
                    <button class="analysis-btn" onclick="cad.ui.analyzeArea()">
                        <i class="fas fa-vector-square"></i>
                        <span>Area</span>
                    </button>
                    <button class="analysis-btn" onclick="cad.ui.analyzeProperties()">
                        <i class="fas fa-info"></i>
                        <span>Properties</span>
                    </button>
                </div>
                <div class="analysis-results" id="analysisResults">
                    <p class="placeholder">Select a tool to begin analysis</p>
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-small" onclick="cad.ui.exportAnalysisResults()">
                        <i class="fas fa-file-export"></i> Export Results
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.hideToolPanel()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * إنشاء panel Curves
     */
    createCurvesPanel() {
        return `
            <h3><i class="fas fa-wave-square"></i> Curve Tools</h3>
            <div class="panel-content">
                <div class="curve-options">
                    <button class="curve-btn" onclick="cad.ui.convertToPolyline()">
                        <i class="fas fa-project-diagram"></i>
                        <span>Convert to Polyline</span>
                    </button>
                    <button class="curve-btn" onclick="cad.ui.simplifyCurve()">
                        <i class="fas fa-compress-alt"></i>
                        <span>Simplify</span>
                    </button>
                    <button class="curve-btn" onclick="cad.ui.smoothCurve()">
                        <i class="fas fa-bezier-curve"></i>
                        <span>Smooth</span>
                    </button>
                </div>
                <div class="panel-row" id="simplifyOptions" style="display: none;">
                    <label>Tolerance:</label>
                    <div class="input-group">
                        <input type="number" id="simplifyTolerance" value="1" step="0.1">
                        <span class="unit-label">${this.cad.units.getUnitInfo(this.cad.currentUnit).symbol}</span>
                    </div>
                </div>
                <div class="panel-row" id="smoothOptions" style="display: none;">
                    <label>Iterations:</label>
                    <input type="number" id="smoothIterations" value="2" min="1" max="10">
                </div>
                <div class="panel-help">
                    <i class="fas fa-info-circle"></i>
                    Select curves or polylines to process
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.applyCurveOperation()">
                        <i class="fas fa-check"></i> Apply
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.hideToolPanel()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
    }
    
    // ==================== نظام المعاينة الحية ====================
    
    /**
     * بدء المعاينة الحية
     */
    startLivePreview(toolName) {
        this.previewMode = true;
        this.updateLivePreview();
    }
    
    /**
     * إيقاف المعاينة الحية
     */
    stopLivePreview() {
        this.previewMode = false;
        this.cad.tempShapes = null;
        this.cad.render();
    }
    
    /**
     * تحديث المعاينة الحية
     */
    updateLivePreview() {
        if (!this.previewMode) return;
        
        // توليد أشكال المعاينة بناءً على الأداة الحالية
        const tool = this.cad.currentTool;
        
        switch (tool) {
            case 'fillet':
                this.updateFilletPreview();
                break;
            case 'chamfer':
                this.updateChamferPreview();
                break;
            case 'rectangular-array':
            case 'polar-array':
            case 'path-array':
                this.updateArrayPreview();
                break;
        }
        
        this.cad.render();
    }
    
    /**
     * تحديث معاينة Fillet
     */
    updateFilletPreview() {
        // التحقق من وجود أشكال محددة
        const selected = Array.from(this.cad.selectedShapes);
        if (selected.length < 2) return;
        
        const radius = parseFloat(document.getElementById('filletRadius')?.value) || 10;
        
        // محاولة إنشاء fillet preview
        if (this.cad.geometryAdvanced) {
            try {
                const result = this.cad.geometryAdvanced.filletCorner(
                    selected[0], 
                    selected[1], 
                    radius
                );
                if (result) {
                    this.cad.tempShapes = [result.arc];
                }
            } catch (error) {
                console.error('Fillet preview error:', error);
            }
        }
    }
    
    /**
     * تحديث معاينة Array
     */
    updateArrayPreview() {
        const canvas = document.getElementById('arrayPreviewCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // رسم معاينة بسيطة للمصفوفة
        ctx.strokeStyle = '#00d4aa';
        ctx.fillStyle = '#00d4aa';
        
        if (this.cad.currentTool === 'rectangular-array') {
            const rows = parseInt(document.getElementById('arrayRows')?.value) || 3;
            const cols = parseInt(document.getElementById('arrayCols')?.value) || 3;
            
            const cellWidth = canvas.width / (cols + 1);
            const cellHeight = canvas.height / (rows + 1);
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const x = (col + 1) * cellWidth;
                    const y = (row + 1) * cellHeight;
                    ctx.fillRect(x - 5, y - 5, 10, 10);
                }
            }
            
            // تحديث عدد العناصر
            const totalItems = document.getElementById('arrayTotalItems');
            if (totalItems) totalItems.textContent = rows * cols;
        } else if (this.cad.currentTool === 'polar-array') {
            const count = parseInt(document.getElementById('polarCount')?.value) || 6;
            const angle = parseFloat(document.getElementById('polarAngle')?.value) || 360;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(canvas.width, canvas.height) / 3;
            
            for (let i = 0; i < count; i++) {
                const a = (i / count) * (angle * Math.PI / 180);
                const x = centerX + radius * Math.cos(a);
                const y = centerY + radius * Math.sin(a);
                ctx.fillRect(x - 5, y - 5, 10, 10);
            }
        }
    }
    
    // ==================== معالجات الأحداث للأدوات المتقدمة ====================
    
    /**
     * تحديث خيارات Fillet
     */
    updateFilletOptions() {
        const radius = parseFloat(document.getElementById('filletRadius').value) || 10;
        const trim = document.getElementById('filletTrim').checked;
        const multiple = document.getElementById('filletMultiple').checked;
        const polyline = document.getElementById('filletPolyline').checked;
        
        this.advancedToolState.fillet = { radius, trim, multiple, polyline };
        this.updateLivePreview();
    }
    
    /**
     * تطبيق Fillet
     */
    applyFillet() {
        const state = this.advancedToolState.fillet;
        this.hideToolPanel();
        
        // استدعاء دالة Fillet في CAD
        this.cad.applyFilletWithOptions(state);
    }
    
    /**
     * تحديث خيارات Chamfer
     */
    updateChamferOptions() {
        const distance1 = parseFloat(document.getElementById('chamferDistance1')?.value) || 10;
        const distance2 = parseFloat(document.getElementById('chamferDistance2')?.value) || 10;
        
        this.advancedToolState.chamfer.distance1 = distance1;
        this.advancedToolState.chamfer.distance2 = distance2;
        this.updateLivePreview();
    }
    
    /**
     * تعيين طريقة Chamfer
     */
    setChamferMethod(method) {
        this.advancedToolState.chamfer.method = method;
        document.getElementById('chamferDistanceOptions').style.display = 
            method === 'distance' ? 'block' : 'none';
        document.getElementById('chamferAngleOptions').style.display = 
            method === 'angle' ? 'block' : 'none';
        
        // تحديث الأزرار
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase() === method);
        });
    }
    
    /**
     * جعل مسافات Chamfer متساوية
     */
    setChamferEqual() {
        const distance1 = document.getElementById('chamferDistance1').value;
        document.getElementById('chamferDistance2').value = distance1;
        this.updateChamferOptions();
    }
    
    /**
     * تطبيق Chamfer
     */
    applyChamfer() {
        const state = this.advancedToolState.chamfer;
        this.hideToolPanel();
        
        // استدعاء دالة Chamfer في CAD
        this.cad.applyChamferWithOptions(state);
    }
    
    /**
     * تطبيق Rectangular Array
     */
    applyRectangularArray() {
        const rows = parseInt(document.getElementById('arrayRows').value);
        const cols = parseInt(document.getElementById('arrayCols').value);
        const rowSpacing = parseFloat(document.getElementById('arrayRowSpacing').value);
        const colSpacing = parseFloat(document.getElementById('arrayColSpacing').value);
        
        this.hideToolPanel();
        
        this.cad.applyRectangularArrayWithOptions({
            rows, cols, rowSpacing, colSpacing
        });
    }
    
    /**
     * تطبيق Polar Array
     */
    applyPolarArray() {
        const count = parseInt(document.getElementById('polarCount').value);
        const angle = parseFloat(document.getElementById('polarAngle').value);
        const rotate = document.getElementById('polarRotate').checked;
        
        this.hideToolPanel();
        
        this.cad.applyPolarArrayWithOptions({
            count, angle, rotate
        });
    }
    
    /**
     * اختيار مركز Polar Array
     */
    pickPolarCenter() {
        this.hideToolPanel();
        this.cad.startPickingPoint('polar-center');
    }
    
    /**
     * تعيين طريقة Path Array
     */
    setPathArrayMethod(method) {
        this.advancedToolState.array.path.method = method;
        document.getElementById('pathDivideOptions').style.display = 
            method === 'divide' ? 'block' : 'none';
        document.getElementById('pathMeasureOptions').style.display = 
            method === 'measure' ? 'block' : 'none';
        
        // تحديث الأزرار
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase() === method);
        });
    }
    
    /**
     * اختيار مسار للمصفوفة
     */
    selectPathForArray() {
        this.hideToolPanel();
        this.cad.startSelectingPath();
    }
    
    /**
     * تطبيق Path Array
     */
    applyPathArray() {
        const method = this.advancedToolState.array.path.method;
        const count = parseInt(document.getElementById('pathCount')?.value) || 10;
        const spacing = parseFloat(document.getElementById('pathSpacing')?.value) || 50;
        const align = document.getElementById('pathAlign').checked;
        
        this.hideToolPanel();
        
        this.cad.applyPathArrayWithOptions({
            method, count, spacing, align
        });
    }
    
    /**
     * تنفيذ Boolean Operation
     */
    performBoolean(operation) {
        this.hideToolPanel();
        
        switch (operation) {
            case 'union':
                this.cad.performUnion();
                break;
            case 'difference':
                this.cad.performDifference();
                break;
            case 'intersection':
                this.cad.performIntersection();
                break;
        }
    }
    
    /**
     * تحليل المسافة
     */
    analyzeDistance() {
        const results = document.getElementById('analysisResults');
        results.innerHTML = '<p>Select two shapes to measure distance...</p>';
        
        this.cad.startDistanceAnalysis((result) => {
            results.innerHTML = `
                <div class="analysis-result">
                    <h4>Distance Measurement</h4>
                    <p><strong>Distance:</strong> ${this.cad.formatValue(result.distance)}</p>
                    <p><strong>ΔX:</strong> ${this.cad.formatValue(result.dx)}</p>
                    <p><strong>ΔY:</strong> ${this.cad.formatValue(result.dy)}</p>
                    <p><strong>Angle:</strong> ${result.angle.toFixed(2)}°</p>
                </div>
            `;
        });
    }
    
    /**
     * تحليل المساحة
     */
    analyzeArea() {
        const results = document.getElementById('analysisResults');
        this.cad.analyzeArea();
    }
    
    /**
     * تحليل الخصائص
     */
    analyzeProperties() {
        const results = document.getElementById('analysisResults');
        this.cad.analyzeProperties();
    }
    
    /**
     * تصدير نتائج التحليل
     */
    exportAnalysisResults() {
        const results = document.getElementById('analysisResults').innerText;
        const blob = new Blob([results], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analysis_results.txt';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * تحويل إلى Polyline
     */
    convertToPolyline() {
        document.getElementById('simplifyOptions').style.display = 'none';
        document.getElementById('smoothOptions').style.display = 'none';
        this.cad.convertToPolyline();
    }
    
    /**
     * تبسيط المنحنى
     */
    simplifyCurve() {
        document.getElementById('simplifyOptions').style.display = 'block';
        document.getElementById('smoothOptions').style.display = 'none';
    }
    
    /**
     * تنعيم المنحنى
     */
    smoothCurve() {
        document.getElementById('simplifyOptions').style.display = 'none';
        document.getElementById('smoothOptions').style.display = 'block';
    }
    
    /**
     * تطبيق عملية المنحنى
     */
    applyCurveOperation() {
        const tolerance = parseFloat(document.getElementById('simplifyTolerance')?.value) || 1;
        const iterations = parseInt(document.getElementById('smoothIterations')?.value) || 2;
        
        this.hideToolPanel();
        
        if (document.getElementById('simplifyOptions').style.display === 'block') {
            this.cad.simplifyPolyline(tolerance);
        } else if (document.getElementById('smoothOptions').style.display === 'block') {
            this.cad.smoothPolyline(iterations);
        }
    }
    
    // ==================== دوال مساعدة ====================
    
    /**
     * عرض tooltip
     */
    showTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => tooltip.remove(), 3000);
    }
    
    /**
     * عرض رسالة خطأ
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.classList.add('fade-out');
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
        
        // تحديث الحالة (إذا لم تكن موجودة)
        const originalStatus = document.getElementById('statusMode').textContent;
        this.updateStatus(`ERROR: ${message}`);
        
        // إرجاع الحالة السابقة بعد 3 ثواني
        setTimeout(() => {
            document.getElementById('statusMode').textContent = originalStatus;
        }, 3000);
        
        console.error(message);
    }
    
    /**
     * عرض رسالة نجاح
     */
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.classList.add('fade-out');
            setTimeout(() => successDiv.remove(), 300);
        }, 2000);
    }
    
    // ==================== الدوال الأصلية المحدثة ====================
    
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
     * ربط الأحداث - محدث
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
            
            // Close tool panels if clicking outside
            if (this.currentPanel && !this.currentPanel.contains(e.target)) {
                const isToolButton = e.target.closest('.ribbon-tool, .tool-btn');
                if (!isToolButton) {
                    this.hideToolPanel();
                }
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC to cancel current operation
            if (e.key === 'Escape') {
                if (this.currentPanel) {
                    this.hideToolPanel();
                } else {
                    this.cad.cancelCurrentOperation();
                }
            }
            
            // Ctrl+Z for undo
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.cad.undo();
            }
            
            // Ctrl+Y for redo
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.cad.redo();
            }
            
            // Delete for delete selected
            if (e.key === 'Delete') {
                this.cad.deleteSelected();
            }
        });
    }
    
    /**
     * تحديث الأداة النشطة - محدث
     */
    updateActiveTool(tool) {
        // Update UI
        document.querySelectorAll('.ribbon-tool, .tool-btn').forEach(el => {
            el.classList.remove('active');
        });
        
        // Find and activate the current tool button
        document.querySelectorAll('.ribbon-tool, .tool-btn').forEach(el => {
            if (el.onclick && el.onclick.toString().includes(`'${tool}'`)) {
                el.classList.add('active');
            }
        });
        
        // Update status
        this.elements.get('statusTool').textContent = tool.toUpperCase();
        
        // Show panel for advanced tools
        if (this.toolPanels.has(tool)) {
            setTimeout(() => {
                this.showToolPanel(tool);
            }, 100);
        }
    }
    
    /**
     * تحديث الواجهة بالكامل
     */
    updateUI() {
        // التحقق من وجود CAD
        if (!this.cad) return;
        
        // تحديث معلومات الأداة
        const statusTool = document.getElementById('statusTool');
        if (statusTool) {
            statusTool.textContent = this.cad.currentTool ? 
                this.cad.currentTool.toUpperCase() : 'SELECT';
        }
        
        // تحديث الإحداثيات
        const coordX = document.getElementById('coordX');
        const coordY = document.getElementById('coordY');
        
        if (coordX && coordY) {
            const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
            const snapPoint = this.cad.getSnapPoint(world.x, world.y);
            
            coordX.textContent = this.cad.formatValue(snapPoint.x);
            coordY.textContent = this.cad.formatValue(snapPoint.y);
        }
        
        // تحديث معلومات الأشكال المحددة
        const propType = document.getElementById('propType');
        const specificProperties = document.getElementById('specificProperties');
        
        if (propType) {
            if (this.cad.selectedShapes.size === 0) {
                propType.textContent = 'None';
                if (specificProperties) {
                    specificProperties.innerHTML = '';
                }
            } else if (this.cad.selectedShapes.size === 1) {
                const shape = Array.from(this.cad.selectedShapes)[0];
                propType.textContent = shape.type.charAt(0).toUpperCase() + shape.type.slice(1);
                if (specificProperties) {
                    specificProperties.innerHTML = this.getShapePropertiesHTML(shape);
                }
            } else {
                propType.textContent = `${this.cad.selectedShapes.size} objects`;
                if (specificProperties) {
                    specificProperties.innerHTML = '';
                }
            }
        }
        
        // تحديث قائمة الطبقات إذا كان LayerManager موجود
        if (this.cad.layerManager) {
            this.updateLayersList();
        } else if (this.cad.layers && this.cad.layers.size > 0) {
            // استخدام النظام القديم
            this.updateLayersList();
        }
        
        // تحديث أزرار التحكم
        this.updateBottomToolbar();
        
        // تحديث dropdown الوحدات
        const unitsSelect = document.getElementById('unitsSelect');
        if (unitsSelect && this.cad.currentUnit) {
            unitsSelect.value = this.cad.currentUnit;
        }
        
        // تحديث عرض اللون
        this.updateColorDisplay(this.cad.currentColor);
        
        // تحديث عرض عرض الخط
        const lineWidthSlider = document.getElementById('lineWidthSlider');
        const lineWidthValue = document.getElementById('lineWidthValue');
        
        if (lineWidthSlider && lineWidthValue) {
            lineWidthSlider.value = this.cad.currentLineWidth;
            lineWidthValue.textContent = this.cad.currentLineWidth;
        }
        
        // تحديث نوع الخط
        const lineTypeSelect = document.getElementById('lineTypeSelect');
        if (lineTypeSelect && this.cad.currentLineType) {
            lineTypeSelect.value = this.cad.currentLineType;
        }
    }
    
    /**
     * تحديث رسالة الحالة
     */
    updateStatus(message) {
        const statusElement = this.elements.get('statusMode') || document.getElementById('statusMode');
        if (statusElement) {
            statusElement.textContent = message || 'READY';
        }
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
        
        // إضافة في النهاية:
        if (this.cad.selectedShapes.size > 0) {
            this.updateSelectionInfo();
            this.showQuickActionBar(this.cad.selectedShapes);
        } else {
            const panel = document.getElementById('selectionInfoPanel');
            if (panel) panel.style.display = 'none';
            this.hideQuickActionBar();
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
     * الحصول على HTML خصائص الشكل
     */
    getShapePropertiesHTML(shape) {
        return this.getShapeProperties(shape);
    }
    
    /**
     * إصلاح تحديث قائمة الطبقات لتجنب الـ recursion
     */
    updateLayersList() {
        // تحقق من وجود العناصر المطلوبة
        const container = this.elements.get('layersList');
        if (!container) return;
        
        // منع التحديثات المتكررة
        if (this._updatingLayersList) return;
        this._updatingLayersList = true;
        
        try {
            container.innerHTML = '';
            
            // الحصول على الطبقات
            const layers = this.cad.layerManager ? 
                Array.from(this.cad.layerManager.layers.values()) : 
                Array.from(this.cad.layers.values());
            
            // ترتيب الطبقات (الأحدث أولاً)
            layers.sort((a, b) => b.id - a.id);
            
            // إنشاء عناصر الطبقات
            layers.forEach(layer => {
                const item = this.createLayerItem(layer);
                container.appendChild(item);
            });
            
            // تحديث الـ dropdown إذا كان موجوداً
            if (typeof updateLayerDropdown === 'function') {
                updateLayerDropdown();
            }
            
        } finally {
            this._updatingLayersList = false;
        }
    }

    /**
     * إنشاء عنصر طبقة محسّن
     */
    createLayerItem(layer) {
        const currentLayerId = this.cad.getCurrentLayerId();
        
        const item = document.createElement('div');
        item.className = 'layer-item';
        if (layer.id === currentLayerId) {
            item.classList.add('active');
        }
        
        // عدد الأشكال في الطبقة
        const shapeCount = this.cad.shapes.filter(s => s.layerId === layer.id).length;
        
        // إنشاء HTML
        item.innerHTML = `
            <div class="layer-controls">
                <div class="layer-visibility ${layer.visible ? 'visible' : ''}" 
                     onclick="window.cad.toggleLayerVisibility(${layer.id})"
                     title="${layer.visible ? 'Hide' : 'Show'} Layer">
                    <i class="fas fa-eye${layer.visible ? '' : '-slash'}"></i>
                </div>
                <div class="layer-freeze ${layer.frozen ? 'frozen' : ''}"
                     onclick="window.cad.toggleLayerFreeze(${layer.id})"
                     title="${layer.frozen ? 'Thaw' : 'Freeze'} Layer">
                    <i class="fas fa-snowflake"></i>
                </div>
                <div class="layer-lock ${layer.locked ? 'locked' : ''}"
                     onclick="window.cad.toggleLayerLock(${layer.id})"
                     title="${layer.locked ? 'Unlock' : 'Lock'} Layer">
                    <i class="fas fa-lock${layer.locked ? '' : '-open'}"></i>
                </div>
                <div class="layer-plot ${layer.plot !== false ? 'plot' : ''}"
                     onclick="window.cad.layerManager && window.cad.layerManager.togglePlot(${layer.id})"
                     title="${layer.plot !== false ? 'No Plot' : 'Plot'} Layer">
                    <i class="fas fa-print"></i>
                </div>
            </div>
            <div class="layer-color" style="background: ${layer.color};"
                 onclick="window.cad.changeLayerColor(${layer.id})"
                 title="Change Color"></div>
            <div class="layer-info" onclick="window.cad.setCurrentLayer(${layer.id})">
                <input class="layer-name" value="${layer.name}" 
                       onclick="event.stopPropagation();"
                       onchange="window.cad.renameLayer(${layer.id}, this.value)"
                       ${layer.id === 0 ? 'readonly' : ''}>
                <span class="layer-count">${shapeCount} objects</span>
            </div>
            <div class="layer-options">
                <button class="layer-option-btn" onclick="window.cad.ui.showLayerOptionsMenu(event, ${layer.id})">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        `;
        
        // إضافة مؤشر الشفافية إذا كانت مفعلة
        if (layer.transparency > 0) {
            const transparencyIndicator = document.createElement('div');
            transparencyIndicator.className = 'layer-transparency';
            transparencyIndicator.textContent = `${layer.transparency}%`;
            transparencyIndicator.title = `Transparency: ${layer.transparency}%`;
            item.querySelector('.layer-info').appendChild(transparencyIndicator);
        }
        
        return item;
    }

    /**
     * إصلاح showLayerOptionsMenu
     */
    showLayerOptionsMenu(event, layerId) {
        event.stopPropagation();
        
        const layer = this.cad.getLayer(layerId);
        if (!layer) return;
        
        // إنشاء array من العناصر مباشرة
        const items = [];
        
        items.push({ 
            icon: 'fas fa-adjust', 
            label: 'Set Transparency...', 
            action: () => this.showTransparencyDialog(layerId) 
        });
        
        items.push({ 
            icon: 'fas fa-eye', 
            label: 'Isolate Layer', 
            action: () => {
                if (this.cad.layerManager) {
                    this.cad.layerManager.isolateLayer(layerId);
                }
            }
        });
        
        items.push({ separator: true });
        
        items.push({ 
            icon: 'fas fa-clone', 
            label: 'Duplicate Layer', 
            action: () => this.duplicateLayer(layerId) 
        });
        
        items.push({ 
            icon: 'fas fa-compress-arrows-alt', 
            label: 'Merge Down', 
            action: () => this.mergeLayerDown(layerId) 
        });
        
        items.push({ separator: true });
        
        items.push({ 
            icon: 'fas fa-info-circle', 
            label: 'Layer Properties...', 
            action: () => this.showLayerPropertiesDialog(layerId) 
        });
        
        // إذا كانت ليست الطبقة 0، أضف خيار الحذف
        if (layerId !== 0) {
            items.push({ separator: true });
            items.push({ 
                icon: 'fas fa-trash', 
                label: 'Delete Layer', 
                action: () => this.cad.deleteLayer(layerId) 
            });
        }
        
        const rect = event.target.getBoundingClientRect();
        this.showContextMenu(rect.left, rect.bottom + 5, items);
    }

    /**
     * عرض حوار الشفافية
     */
    showTransparencyDialog(layerId) {
        const layer = this.cad.layerManager ? 
            this.cad.layerManager.layers.get(layerId) : 
            this.cad.layers.get(layerId);
        
        if (!layer) return;
        
        const dialog = document.createElement('div');
        dialog.className = 'layer-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay" onclick="this.parentElement.remove()"></div>
            <div class="dialog-content">
                <h3>Layer Transparency</h3>
                <div class="dialog-body">
                    <label>Transparency (0-100%):</label>
                    <div class="transparency-control">
                        <input type="range" id="transparencySlider" 
                               min="0" max="100" value="${layer.transparency || 0}"
                               oninput="document.getElementById('transparencyValue').textContent = this.value + '%'">
                        <span id="transparencyValue">${layer.transparency || 0}%</span>
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button class="btn-cancel" onclick="this.closest('.layer-dialog').remove()">Cancel</button>
                    <button class="btn-ok" onclick="cad.ui.applyTransparency(${layerId}, document.getElementById('transparencySlider').value)">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    /**
     * تطبيق الشفافية
     */
    applyTransparency(layerId, transparency) {
        if (this.cad.layerManager) {
            this.cad.layerManager.setLayerTransparency(layerId, parseInt(transparency));
        }
        document.querySelector('.layer-dialog').remove();
        this.updateLayersList();
    }

    /**
     * عرض حوار حالات الطبقات
     */
    showLayerStatesDialog() {
        if (!this.cad.layerManager) {
            this.cad.updateStatus('Layer states not available');
            return;
        }
        
        const states = this.cad.layerManager.getLayerStates();
        
        const dialog = document.createElement('div');
        dialog.className = 'layer-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay" onclick="this.parentElement.remove()"></div>
            <div class="dialog-content layer-states-dialog">
                <h3>Layer States Manager</h3>
                <div class="dialog-body">
                    <div class="states-toolbar">
                        <button class="btn" onclick="cad.ui.saveNewLayerState()">
                            <i class="fas fa-plus"></i> New State
                        </button>
                    </div>
                    <div class="states-list">
                        ${states.length === 0 ? '<p class="no-states">No saved states</p>' : ''}
                        ${states.map(state => `
                            <div class="state-item">
                                <span class="state-name">${state}</span>
                                <div class="state-actions">
                                    <button onclick="cad.restoreLayerState('${state}')" title="Restore">
                                        <i class="fas fa-undo"></i>
                                    </button>
                                    <button onclick="cad.ui.deleteLayerState('${state}')" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button class="btn-ok" onclick="this.closest('.layer-dialog').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    /**
     * حفظ حالة طبقة جديدة
     */
    saveNewLayerState() {
        const name = prompt('Enter state name:');
        if (name && name.trim()) {
            this.cad.saveLayerState(name.trim());
            document.querySelector('.layer-dialog').remove();
            this.showLayerStatesDialog();
        }
    }

    /**
     * حذف حالة طبقة
     */
    deleteLayerState(stateName) {
        if (confirm(`Delete layer state "${stateName}"?`)) {
            if (this.cad.layerManager) {
                this.cad.layerManager.layerStates.delete(stateName);
                this.cad.updateStatus(`Layer state "${stateName}" deleted`);
            }
            document.querySelector('.layer-dialog').remove();
            this.showLayerStatesDialog();
        }
    }

    /**
     * تحديث toggleAllLayers لاستخدام cad مباشرة
     */
    toggleAllLayers(visible) {
        this.cad.toggleAllLayers(visible);
    }

    /**
     * إضافة دالة duplicateLayer
     */
    duplicateLayer(layerId) {
        if (!this.cad.layerManager) return;
        
        const sourceLayer = this.cad.layerManager.layers.get(layerId);
        if (!sourceLayer) return;
        
        // إنشاء طبقة جديدة بنفس الخصائص
        const newLayer = this.cad.layerManager.addLayer({
            name: sourceLayer.name + ' Copy',
            color: sourceLayer.color,
            lineWidth: sourceLayer.lineWidth,
            lineType: sourceLayer.lineType,
            transparency: sourceLayer.transparency
        });
        
        // نسخ الأشكال
        const shapesToCopy = this.cad.shapes.filter(s => s.layerId === layerId);
        shapesToCopy.forEach(shape => {
            const newShape = this.cad.cloneShape(shape);
            newShape.layerId = newLayer.id;
            newShape.id = this.cad.generateId();
            this.cad.shapes.push(newShape);
        });
        
        this.cad.render();
        this.updateLayersList();
        this.cad.updateStatus(`Layer duplicated: ${newLayer.name}`);
    }

    /**
     * إضافة دالة mergeLayerDown
     */
    mergeLayerDown(layerId) {
        if (!this.cad.layerManager || layerId === 0) return;
        
        const layers = Array.from(this.cad.layerManager.layers.values());
        layers.sort((a, b) => b.id - a.id);
        
        const currentIndex = layers.findIndex(l => l.id === layerId);
        if (currentIndex === -1 || currentIndex === layers.length - 1) return;
        
        const targetLayer = layers[currentIndex + 1];
        
        if (confirm(`Merge "${layers[currentIndex].name}" into "${targetLayer.name}"?`)) {
            this.cad.layerManager.mergeLayers([layerId], targetLayer.id);
        }
    }

    /**
     * إضافة دالة showLayerPropertiesDialog
     */
    showLayerPropertiesDialog(layerId) {
        const layer = this.cad.getLayer(layerId);
        if (!layer) return;
        
        const dialog = document.createElement('div');
        dialog.className = 'layer-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay" onclick="this.parentElement.remove()"></div>
            <div class="dialog-content">
                <h3>Layer Properties</h3>
                <div class="dialog-body">
                    <div class="form-group">
                        <label>Name:</label>
                        <input type="text" id="layerPropName" value="${layer.name}" 
                               ${layerId === 0 ? 'readonly' : ''}>
                    </div>
                    <div class="form-group">
                        <label>Color:</label>
                        <input type="color" id="layerPropColor" value="${layer.color}">
                    </div>
                    <div class="form-group">
                        <label>Line Type:</label>
                        <select id="layerPropLineType">
                            <option value="solid" ${layer.lineType === 'solid' ? 'selected' : ''}>Solid</option>
                            <option value="dashed" ${layer.lineType === 'dashed' ? 'selected' : ''}>Dashed</option>
                            <option value="dotted" ${layer.lineType === 'dotted' ? 'selected' : ''}>Dotted</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Line Weight:</label>
                        <input type="number" id="layerPropLineWeight" value="${layer.lineWidth || 2}" 
                               min="1" max="10" step="1">
                    </div>
                    <div class="form-group">
                        <label>Transparency:</label>
                        <input type="range" id="layerPropTransparency" 
                               value="${layer.transparency || 0}" min="0" max="100">
                        <span>${layer.transparency || 0}%</span>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="layerPropPlot" 
                                   ${layer.plot !== false ? 'checked' : ''}>
                            Plot/Print
                        </label>
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button class="btn-cancel" onclick="this.closest('.layer-dialog').remove()">Cancel</button>
                    <button class="btn-ok" onclick="window.cad.ui.applyLayerProperties(${layerId})">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Update transparency display
        const slider = dialog.querySelector('#layerPropTransparency');
        const display = slider.nextElementSibling;
        slider.oninput = () => {
            display.textContent = slider.value + '%';
        };
    }

    /**
     * تطبيق خصائص الطبقة
     */
    applyLayerProperties(layerId) {
        const layer = this.cad.getLayer(layerId);
        if (!layer) return;
        
        const name = document.getElementById('layerPropName').value;
        const color = document.getElementById('layerPropColor').value;
        const lineType = document.getElementById('layerPropLineType').value;
        const lineWeight = parseInt(document.getElementById('layerPropLineWeight').value);
        const transparency = parseInt(document.getElementById('layerPropTransparency').value);
        const plot = document.getElementById('layerPropPlot').checked;
        
        // تطبيق التغييرات
        if (layerId !== 0) {
            layer.name = name;
        }
        layer.color = color;
        layer.lineType = lineType;
        layer.lineWidth = lineWeight;
        layer.transparency = transparency;
        layer.plot = plot;
        
        // إذا كانت الطبقة الحالية، حدث الإعدادات
        if (layerId === this.cad.getCurrentLayerId()) {
            this.cad.currentColor = color;
            this.cad.currentLineType = lineType;
            this.cad.currentLineWidth = lineWeight;
            this.cad.setColor(color);
        }
        
        document.querySelector('.layer-dialog').remove();
        this.updateLayersList();
        this.cad.render();
    }


    
    /**
     * إصلاح showContextMenu - نسخة محدثة
     */
    showContextMenu(x, y, items) {
        // إضافة فحص أقوى للمعاملات
        if (!items) {
            console.error('showContextMenu: items is undefined');
            return;
        }
        
        // تحويل items إلى array إذا لم يكن كذلك
        if (!Array.isArray(items)) {
            console.error('showContextMenu expects an array of items, got:', typeof items);
            // محاولة تحويل إلى array
            if (items && typeof items === 'object') {
                items = Object.values(items);
            } else {
                return;
            }
        }
        
        // إخفاء أي قائمة سابقة
        this.hideContextMenu();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu grips-context-menu';
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.zIndex = '1000';
        
        // التعامل مع العناصر
        items.forEach(item => {
            if (!item) return; // تجاهل العناصر الفارغة
            
            if (item.separator) {
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                
                if (item.enabled === false) {
                    menuItem.classList.add('disabled');
                }
                
                // إنشاء المحتوى
                const icon = item.icon ? `<i class="${item.icon}"></i>` : '';
                const label = item.label || '';
                
                menuItem.innerHTML = `${icon}<span>${label}</span>`;
                
                if (item.enabled !== false && item.action) {
                    menuItem.onclick = (e) => {
                        e.stopPropagation();
                        this.hideContextMenu();
                        if (typeof item.action === 'function') {
                            item.action();
                        }
                    };
                }
                
                menu.appendChild(menuItem);
            }
        });
        
        document.body.appendChild(menu);
        this.currentContextMenu = menu;
        
        // إخفاء عند النقر خارج القائمة
        setTimeout(() => {
            this.hideContextMenuHandler = (e) => {
                if (!menu.contains(e.target)) {
                    this.hideContextMenu();
                }
            };
            document.addEventListener('click', this.hideContextMenuHandler);
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
        const input = this.elements.get('dynamicInput') || document.getElementById('dynamicInput');
        if (input) {
            input.classList.remove('active');
            input.style.display = 'none';
        }
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
        const box = this.elements.get('selectionBox') || document.getElementById('selectionBox');
        if (box) {
            box.style.display = 'none';
        }
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
        const overlay = this.elements.get('zoomWindowOverlay') || document.getElementById('zoomWindowOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        const box = this.elements.get('zoomWindowBox');
        if (box) {
            box.style.display = 'none';
        }
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
     * تبديل قائمة Array
     */
    toggleArrayMenu() {
        const menu = document.getElementById('arrayMenu');
        menu.classList.toggle('show');
        
        // Close on click outside
        window.onclick = (event) => {
            if (!event.target.matches('.tool-btn')) {
                const dropdowns = document.getElementsByClassName('dropdown-content');
                for (let dropdown of dropdowns) {
                    if (dropdown.classList.contains('show')) {
                        dropdown.classList.remove('show');
                    }
                }
            }
        };
    }
    
    /**
     * إخفاء شاشة التحميل
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.style.display = 'none', 500);
    }

// ==================== إضافات للتوافق مع الأدوات ====================

/**
 * عرض حوار إدخال عدد أضلاع المضلع
 */
showPolygonDialog(callback) {
    const sides = parseInt(prompt('Enter number of sides (3-20):', '6'));
    if (sides && sides >= 3 && sides <= 20) {
        if (callback) callback(sides);
    }
}

/**
 * تحديث معاينة Chamfer
 */
updateChamferPreview() {
    // Placeholder - سيتم تطويرها لاحقاً
    if (this.cad.tempShapes && this.cad.tempShapes.length > 0) {
        this.cad.render();
    }
}

/**
 * عرض نتائج التحليل
 */
showAnalysisResult(result) {
    let message = '';
    
    switch(result.type) {
        case 'distance':
            message = `Distance: ${result.distance.toFixed(2)} ${this.cad.currentUnit}`;
            break;
            
        case 'area':
            message = `Total Area: ${result.totalArea.toFixed(2)} ${this.cad.currentUnit}²`;
            if (result.details && result.details.length > 0) {
                message += '\n\nDetails:';
                result.details.forEach((detail, index) => {
                    message += `\n${index + 1}. ${detail.type}: ${detail.area.toFixed(2)} ${this.cad.currentUnit}²`;
                });
            }
            break;
            
        case 'properties':
            message = 'Shape Properties:\n';
            if (result.properties) {
                Object.entries(result.properties).forEach(([key, value]) => {
                    if (typeof value === 'number') {
                        message += `\n${key}: ${value.toFixed(2)}`;
                    } else {
                        message += `\n${key}: ${value}`;
                    }
                });
            }
            break;
            
        default:
            message = 'Analysis completed';
    }
    
    // عرض النتيجة في حوار أو في panel
    alert(message);
    
    // يمكن تطوير هذا لعرض النتائج في panel مخصص
    this.updateStatus(message.split('\n')[0]);
}

/**
 * عرض قائمة سياق مخصصة
 * @param {Array} items - عناصر القائمة
 * @param {number} x - موقع X على الشاشة
 * @param {number} y - موقع Y على الشاشة
 */
showContextMenu(items, x, y) {
    // إخفاء أي قائمة سابقة
    this.hideContextMenu();
    
    const menu = document.createElement('div');
    menu.className = 'grips-context-menu';
    menu.style.position = 'absolute';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.zIndex = '1000';
    
    items.forEach(item => {
        if (item.separator) {
            const separator = document.createElement('div');
            separator.className = 'context-menu-separator';
            menu.appendChild(separator);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            
            if (item.enabled === false) {
                menuItem.classList.add('disabled');
            }
            
            menuItem.innerHTML = `
                <i class="fas ${item.icon}"></i>
                <span>${item.label}</span>
            `;
            
            if (item.enabled !== false) {
                menuItem.onclick = () => {
                    this.hideContextMenu();
                    item.action();
                };
            }
            
            menu.appendChild(menuItem);
        }
    });
    
    document.body.appendChild(menu);
    this.currentContextMenu = menu;
    
    // إخفاء عند النقر خارج القائمة
    setTimeout(() => {
        document.addEventListener('click', this.hideContextMenuHandler);
    }, 0);
}

/**
 * إخفاء قائمة السياق
 */
hideContextMenu() {
    if (this.currentContextMenu) {
        this.currentContextMenu.remove();
        this.currentContextMenu = null;
        document.removeEventListener('click', this.hideContextMenuHandler);
    }
}

/**
 * معالج إخفاء القائمة
 */
hideContextMenuHandler = (e) => {
    if (this.currentContextMenu && !this.currentContextMenu.contains(e.target)) {
        this.hideContextMenu();
    }
}

/**
 * عرض dialog خصائص Grips المتقدمة
 */
showGripPropertiesDialog(content, callback) {
    // إنشاء dialog إذا لم يكن موجود
    let dialog = document.getElementById('gripPropertiesDialog');
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'gripPropertiesDialog';
        dialog.className = 'grip-properties-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>Properties</h3>
                    <button class="close-btn" onclick="this.closest('.grip-properties-dialog').style.display='none'">×</button>
                </div>
                <div class="dialog-body"></div>
                <div class="dialog-footer">
                    <button class="btn btn-primary" id="gripDialogOk">OK</button>
                    <button class="btn btn-cancel" id="gripDialogCancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }
    
    // تحديث المحتوى
    dialog.querySelector('.dialog-body').innerHTML = content;
    
    // إظهار dialog
    dialog.style.display = 'block';
    
    // معالجات الأحداث
    const okBtn = dialog.querySelector('#gripDialogOk');
    const cancelBtn = dialog.querySelector('#gripDialogCancel');
    
    // إزالة معالجات قديمة
    okBtn.replaceWith(okBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    
    // إضافة معالجات جديدة
    dialog.querySelector('#gripDialogOk').onclick = () => {
        dialog.style.display = 'none';
        if (callback) callback(true);
    };
    
    dialog.querySelector('#gripDialogCancel').onclick = () => {
        dialog.style.display = 'none';
        if (callback) callback(false);
    };
}

/**
 * عرض شريط معلومات Grip
 */
showGripInfo(message) {
    let infoBar = document.querySelector('.grip-info-bar');
    if (!infoBar) {
        infoBar = document.createElement('div');
        infoBar.className = 'grip-info-bar';
        document.body.appendChild(infoBar);
    }
    
    infoBar.textContent = message;
    infoBar.classList.add('active');
    
    clearTimeout(this.gripInfoTimeout);
    this.gripInfoTimeout = setTimeout(() => {
        infoBar.classList.remove('active');
    }, 3000);
}

/**
 * عرض معلومات التحديد المحسنة
 */
updateSelectionInfo() {
    const count = this.cad.selectedShapes.size;
    const shapes = Array.from(this.cad.selectedShapes);
    
    // حساب الإحصائيات
    const types = {};
    let totalLength = 0;
    let totalArea = 0;
    
    shapes.forEach(shape => {
        types[shape.type] = (types[shape.type] || 0) + 1;
        
        // حساب الطول
        switch (shape.type) {
            case 'line':
                totalLength += this.cad.distance(
                    shape.start.x, shape.start.y,
                    shape.end.x, shape.end.y
                );
                break;
            case 'circle':
                totalLength += 2 * Math.PI * shape.radius;
                totalArea += Math.PI * shape.radius * shape.radius;
                break;
            case 'rectangle':
                const width = Math.abs(shape.end.x - shape.start.x);
                const height = Math.abs(shape.end.y - shape.start.y);
                totalLength += 2 * (width + height);
                totalArea += width * height;
                break;
            case 'polyline':
                for (let i = 1; i < shape.points.length; i++) {
                    totalLength += this.cad.distance(
                        shape.points[i-1].x, shape.points[i-1].y,
                        shape.points[i].x, shape.points[i].y
                    );
                }
                if (shape.closed && shape.points.length > 2) {
                    totalLength += this.cad.distance(
                        shape.points[shape.points.length-1].x,
                        shape.points[shape.points.length-1].y,
                        shape.points[0].x,
                        shape.points[0].y
                    );
                }
                break;
            case 'arc':
                const arcLength = shape.radius * Math.abs(shape.endAngle - shape.startAngle);
                totalLength += arcLength;
                break;
            case 'ellipse':
                // تقريب محيط القطع الناقص
                const h = Math.pow((shape.radiusX - shape.radiusY), 2) / 
                         Math.pow((shape.radiusX + shape.radiusY), 2);
                const perimeter = Math.PI * (shape.radiusX + shape.radiusY) * 
                                 (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
                totalLength += perimeter;
                totalArea += Math.PI * shape.radiusX * shape.radiusY;
                break;
        }
    });
    
    // تحديث العرض
    this.showSelectionInfoPanel({
        count,
        types,
        totalLength,
        totalArea
    });
}

/**
 * عرض لوحة معلومات التحديد
 */
showSelectionInfoPanel(info) {
    let panel = document.getElementById('selectionInfoPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'selectionInfoPanel';
        panel.className = 'selection-info-panel';
        document.getElementById('canvasContainer').appendChild(panel);
    }
    
    // تكوين أنواع الأشكال
    const typesText = Object.entries(info.types)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');
    
    panel.innerHTML = `
        <div class="info-header">Selection Info</div>
        <div class="info-row">
            <span class="label">Objects:</span>
            <span class="value">${info.count}</span>
        </div>
        ${typesText ? `
        <div class="info-row">
            <span class="label">Types:</span>
            <span class="value">${typesText}</span>
        </div>
        ` : ''}
        ${info.totalLength > 0 ? `
        <div class="info-row">
            <span class="label">Total Length:</span>
            <span class="value">${info.totalLength.toFixed(2)} units</span>
        </div>
        ` : ''}
        ${info.totalArea > 0 ? `
        <div class="info-row">
            <span class="label">Total Area:</span>
            <span class="value">${info.totalArea.toFixed(2)} units²</span>
        </div>
        ` : ''}
    `;
    
    // إظهار/إخفاء اللوحة
    panel.style.display = info.count > 0 ? 'block' : 'none';
}

/**
 * عرض شريط الإجراءات السريعة
 */
showQuickActionBar(selectedShapes) {
    if (selectedShapes.size === 0) {
        this.hideQuickActionBar();
        return;
    }
    
    let bar = document.getElementById('quickActionBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'quickActionBar';
        bar.className = 'quick-action-bar';
        document.getElementById('canvasContainer').appendChild(bar);
    }
    
    bar.innerHTML = `
        <button class="quick-action" title="Copy (Ctrl+C)" onclick="cad.copySelected()">
            <i class="fas fa-copy"></i>
        </button>
        <button class="quick-action" title="Delete (Del)" onclick="cad.deleteSelected()">
            <i class="fas fa-trash"></i>
        </button>
        <button class="quick-action" title="Move" onclick="cad.setTool('move')">
            <i class="fas fa-arrows-alt"></i>
        </button>
        <button class="quick-action" title="Rotate" onclick="cad.setTool('rotate')">
            <i class="fas fa-sync-alt"></i>
        </button>
        <button class="quick-action" title="Scale" onclick="cad.setTool('scale')">
            <i class="fas fa-expand-arrows-alt"></i>
        </button>
        <div class="separator"></div>
        <button class="quick-action" title="Group" onclick="cad.groupSelected()">
            <i class="fas fa-object-group"></i>
        </button>
        <button class="quick-action" title="Align" onclick="cad.showAlignMenu()">
            <i class="fas fa-align-center"></i>
        </button>
        <button class="quick-action" title="Properties" onclick="cad.showProperties()">
            <i class="fas fa-cog"></i>
        </button>
    `;
    
    // تحديد موقع الشريط
    const bounds = this.cad.getSelectionBounds();
    if (bounds) {
        const screenPos = this.cad.worldToScreen(
            (bounds.minX + bounds.maxX) / 2,
            bounds.minY - 20
        );
        
        // التأكد من أن الشريط داخل حدود الشاشة
        const rect = bar.getBoundingClientRect();
        let left = screenPos.x - rect.width / 2;
        let top = screenPos.y - rect.height - 10;
        
        // تعديل الموقع إذا كان خارج الشاشة
        if (left < 10) left = 10;
        if (left + rect.width > window.innerWidth - 10) {
            left = window.innerWidth - rect.width - 10;
        }
        if (top < 10) {
            top = screenPos.y + 30; // عرض أسفل التحديد بدلاً من أعلى
        }
        
        bar.style.left = left + 'px';
        bar.style.top = top + 'px';
    }
    
    bar.style.display = 'flex';
}

/**
 * إخفاء شريط الإجراءات السريعة
 */
hideQuickActionBar() {
    const bar = document.getElementById('quickActionBar');
    if (bar) {
        bar.style.display = 'none';
    }
}

/**
 * عرض مؤشر وضع التحديد
 */
showSelectionModeIndicator() {
    let indicator = document.getElementById('selectionModeIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'selectionModeIndicator';
        indicator.className = 'selection-mode-indicator';
        document.getElementById('canvasContainer').appendChild(indicator);
    }
    
    const mode = this.cad.cumulativeSelection ? 'Cumulative' : 'Replace';
    const modeClass = this.cad.cumulativeSelection ? 'cumulative' : 'replace';
    
    indicator.innerHTML = `
        <i class="fas fa-mouse-pointer"></i>
        <span class="${modeClass}">${mode} Selection</span>
    `;
    
    indicator.style.display = 'block';
    
    // إخفاء تلقائي بعد 2 ثانية
    clearTimeout(this.modeIndicatorTimeout);
    this.modeIndicatorTimeout = setTimeout(() => {
        indicator.style.display = 'none';
    }, 2000);
}

}

// دالة إغلاق Layer Manager
window.closeLayerManager = function() {
    const panel = document.getElementById('layerManagerPanel');
    if (panel) {
        panel.remove();
    }
};

// دالة تطبيق التغييرات
window.applyLayerChanges = function() {
    window.cad.render();
    window.cad.updateStatus('Layer changes applied');
    // لا نغلق الـ panel تلقائياً
};

// دالة حذف الطبقات المحددة
window.deleteSelectedLayers = function() {
    const checkboxes = document.querySelectorAll('#layerTableBody input[type="checkbox"]:checked');
    const layerIds = [];
    
    checkboxes.forEach(cb => {
        const layerId = parseInt(cb.getAttribute('data-layer-id'));
        if (layerId !== 0) { // لا يمكن حذف الطبقة 0
            layerIds.push(layerId);
        }
    });
    
    if (layerIds.length === 0) {
        window.cad.updateStatus('No layers selected for deletion');
        return;
    }
    
    if (confirm(`Delete ${layerIds.length} selected layer(s)?`)) {
        layerIds.forEach(id => {
            window.cad.deleteLayer(id);
        });
        window.cad.ui.updateLayerTable();
        window.cad.updateStatus(`${layerIds.length} layer(s) deleted`);
    }
};

// دالة تحديث جدول الطبقات
window.updateLayerTable = function() {
    if (window.cad && window.cad.ui) {
        window.cad.ui.updateLayerTable();
    }
};

// تصدير النظام
window.UI = UI;
export { UI };