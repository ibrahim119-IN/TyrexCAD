/**
 * TyrexCAD UI System - Advanced Tools Module
 * نظام إدارة واجهة المستخدم - وحدة الأدوات المتقدمة
 * 
 * يحتوي على جميع وظائف الأدوات المتقدمة والـ panels
 */

class UITools {
    constructor(ui) {
        this.ui = ui;
        this.cad = ui.cad;
        
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
     * تهيئة الأدوات المتقدمة
     */
    initialize() {
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
                               onchange="cad.ui.tools.updateFilletOptions()">
                        <span class="unit-label">${unitSymbol}</span>
                    </div>
                </div>
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="filletTrim" ${state.trim ? 'checked' : ''}
                               onchange="cad.ui.tools.updateFilletOptions()">
                        Trim corners
                    </label>
                </div>
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="filletMultiple" ${state.multiple ? 'checked' : ''}
                               onchange="cad.ui.tools.updateFilletOptions()">
                        Multiple mode
                    </label>
                </div>
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="filletPolyline"
                               onchange="cad.ui.tools.updateFilletOptions()">
                        Apply to entire polyline
                    </label>
                </div>
                <div class="panel-help">
                    <i class="fas fa-info-circle"></i>
                    Select two lines or a polyline to apply fillet
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.tools.applyFillet()">
                        <i class="fas fa-check"></i> Apply
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.tools.hideToolPanel()">
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
                            onclick="cad.ui.tools.setChamferMethod('distance')">Distance</button>
                    <button class="tab-btn ${state.method === 'angle' ? 'active' : ''}"
                            onclick="cad.ui.tools.setChamferMethod('angle')">Angle</button>
                </div>
                
                <div id="chamferDistanceOptions" style="display: ${state.method === 'distance' ? 'block' : 'none'}">
                    <div class="panel-row">
                        <label>Distance 1:</label>
                        <div class="input-group">
                            <input type="number" id="chamferDistance1" value="${state.distance1}"
                                   onchange="cad.ui.tools.updateChamferOptions()">
                            <span class="unit-label">${unitSymbol}</span>
                        </div>
                    </div>
                    <div class="panel-row">
                        <label>Distance 2:</label>
                        <div class="input-group">
                            <input type="number" id="chamferDistance2" value="${state.distance2}"
                                   onchange="cad.ui.tools.updateChamferOptions()">
                            <span class="unit-label">${unitSymbol}</span>
                        </div>
                    </div>
                    <div class="panel-row">
                        <button class="btn btn-small" onclick="cad.ui.tools.setChamferEqual()">
                            <i class="fas fa-equals"></i> Equal distances
                        </button>
                    </div>
                </div>
                
                <div id="chamferAngleOptions" style="display: ${state.method === 'angle' ? 'block' : 'none'}">
                    <div class="panel-row">
                        <label>Distance:</label>
                        <div class="input-group">
                            <input type="number" id="chamferAngleDistance" value="${state.distance1}"
                                   onchange="cad.ui.tools.updateChamferOptions()">
                            <span class="unit-label">${unitSymbol}</span>
                        </div>
                    </div>
                    <div class="panel-row">
                        <label>Angle:</label>
                        <div class="input-group">
                            <input type="number" id="chamferAngle" value="45"
                                   onchange="cad.ui.tools.updateChamferOptions()">
                            <span class="unit-label">°</span>
                        </div>
                    </div>
                </div>
                
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="chamferTrim" checked
                               onchange="cad.ui.tools.updateChamferOptions()">
                        Trim corners
                    </label>
                </div>
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="chamferPolyline"
                               onchange="cad.ui.tools.updateChamferOptions()">
                        Apply to entire polyline
                    </label>
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.tools.applyChamfer()">
                        <i class="fas fa-check"></i> Apply
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.tools.hideToolPanel()">
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
                           onchange="cad.ui.tools.updateArrayPreview()">
                </div>
                <div class="panel-row">
                    <label>Columns:</label>
                    <input type="number" id="arrayCols" value="${state.cols}" min="1"
                           onchange="cad.ui.tools.updateArrayPreview()">
                </div>
                <div class="panel-row">
                    <label>Row spacing:</label>
                    <div class="input-group">
                        <input type="number" id="arrayRowSpacing" value="${state.rowSpacing}"
                               onchange="cad.ui.tools.updateArrayPreview()">
                        <span class="unit-label">${unitSymbol}</span>
                    </div>
                </div>
                <div class="panel-row">
                    <label>Column spacing:</label>
                    <div class="input-group">
                        <input type="number" id="arrayColSpacing" value="${state.colSpacing}"
                               onchange="cad.ui.tools.updateArrayPreview()">
                        <span class="unit-label">${unitSymbol}</span>
                    </div>
                </div>
                <div class="panel-row">
                    <label>Total items: <span id="arrayTotalItems">${state.rows * state.cols}</span></label>
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.tools.applyRectangularArray()">
                        <i class="fas fa-check"></i> Create Array
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.tools.hideToolPanel()">
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
                           onchange="cad.ui.tools.updateArrayPreview()">
                </div>
                <div class="panel-row">
                    <label>Fill angle:</label>
                    <div class="input-group">
                        <input type="number" id="polarAngle" value="${state.angle}" 
                               min="0" max="360" step="15"
                               onchange="cad.ui.tools.updateArrayPreview()">
                        <span class="unit-label">°</span>
                    </div>
                </div>
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="polarRotate" ${state.rotate ? 'checked' : ''}
                               onchange="cad.ui.tools.updateArrayPreview()">
                        Rotate items
                    </label>
                </div>
                <div class="panel-row">
                    <label>Center point:</label>
                    <button class="btn btn-small" onclick="cad.ui.tools.pickPolarCenter()">
                        <i class="fas fa-crosshairs"></i> Pick center
                    </button>
                </div>
                <div class="panel-help">
                    <i class="fas fa-info-circle"></i>
                    Click to specify the center point of rotation
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.tools.applyPolarArray()">
                        <i class="fas fa-check"></i> Create Array
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.tools.hideToolPanel()">
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
                            onclick="cad.ui.tools.setPathArrayMethod('divide')">Divide</button>
                    <button class="tab-btn ${state.method === 'measure' ? 'active' : ''}"
                            onclick="cad.ui.tools.setPathArrayMethod('measure')">Measure</button>
                </div>
                
                <div id="pathDivideOptions" style="display: ${state.method === 'divide' ? 'block' : 'none'}">
                    <div class="panel-row">
                        <label>Number of items:</label>
                        <input type="number" id="pathCount" value="${state.count}" min="2"
                               onchange="cad.ui.tools.updateArrayPreview()">
                    </div>
                </div>
                
                <div id="pathMeasureOptions" style="display: ${state.method === 'measure' ? 'block' : 'none'}">
                    <div class="panel-row">
                        <label>Item spacing:</label>
                        <div class="input-group">
                            <input type="number" id="pathSpacing" value="50"
                                   onchange="cad.ui.tools.updateArrayPreview()">
                            <span class="unit-label">${this.cad.units.getUnitInfo(this.cad.currentUnit).symbol}</span>
                        </div>
                    </div>
                </div>
                
                <div class="panel-row">
                    <label>
                        <input type="checkbox" id="pathAlign" ${state.align ? 'checked' : ''}
                               onchange="cad.ui.tools.updateArrayPreview()">
                        Align items to path
                    </label>
                </div>
                <div class="panel-row">
                    <label>Path:</label>
                    <button class="btn btn-small" onclick="cad.ui.tools.selectPathForArray()">
                        <i class="fas fa-mouse-pointer"></i> Select path
                    </button>
                </div>
                <div class="panel-help">
                    <i class="fas fa-info-circle"></i>
                    Select a polyline or curve as the path
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-primary" onclick="cad.ui.tools.applyPathArray()">
                        <i class="fas fa-check"></i> Create Array
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.tools.hideToolPanel()">
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
                    <button class="boolean-btn" onclick="cad.ui.tools.performBoolean('union')">
                        <svg width="40" height="40" viewBox="0 0 40 40">
                            <circle cx="15" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                            <circle cx="25" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                            <path d="M15 10 Q20 10 25 10 Q30 15 30 20 Q30 25 25 30 Q20 30 15 30 Q10 25 10 20 Q10 15 15 10" fill="currentColor" opacity="0.3"/>
                        </svg>
                        <span>Union</span>
                    </button>
                    <button class="boolean-btn" onclick="cad.ui.tools.performBoolean('difference')">
                        <svg width="40" height="40" viewBox="0 0 40 40">
                            <circle cx="15" cy="20" r="10" fill="currentColor" opacity="0.3"/>
                            <circle cx="25" cy="20" r="10" fill="white" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>Difference</span>
                    </button>
                    <button class="boolean-btn" onclick="cad.ui.tools.performBoolean('intersection')">
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
                    <button class="analysis-btn" onclick="cad.ui.tools.analyzeDistance()">
                        <i class="fas fa-ruler"></i>
                        <span>Distance</span>
                    </button>
                    <button class="analysis-btn" onclick="cad.ui.tools.analyzeArea()">
                        <i class="fas fa-vector-square"></i>
                        <span>Area</span>
                    </button>
                    <button class="analysis-btn" onclick="cad.ui.tools.analyzeProperties()">
                        <i class="fas fa-info"></i>
                        <span>Properties</span>
                    </button>
                </div>
                <div class="analysis-results" id="analysisResults">
                    <p class="placeholder">Select a tool to begin analysis</p>
                </div>
                <div class="panel-buttons">
                    <button class="btn btn-small" onclick="cad.ui.tools.exportAnalysisResults()">
                        <i class="fas fa-file-export"></i> Export Results
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.tools.hideToolPanel()">
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
                    <button class="curve-btn" onclick="cad.ui.tools.convertToPolyline()">
                        <i class="fas fa-project-diagram"></i>
                        <span>Convert to Polyline</span>
                    </button>
                    <button class="curve-btn" onclick="cad.ui.tools.simplifyCurve()">
                        <i class="fas fa-compress-alt"></i>
                        <span>Simplify</span>
                    </button>
                    <button class="curve-btn" onclick="cad.ui.tools.smoothCurve()">
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
                    <button class="btn btn-primary" onclick="cad.ui.tools.applyCurveOperation()">
                        <i class="fas fa-check"></i> Apply
                    </button>
                    <button class="btn btn-secondary" onclick="cad.ui.tools.hideToolPanel()">
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
     * تحديث معاينة Chamfer
     */
    updateChamferPreview() {
        // Placeholder - سيتم تطويرها لاحقاً
        if (this.cad.tempShapes && this.cad.tempShapes.length > 0) {
            this.cad.render();
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
}

// تصدير النظام
export { UITools };