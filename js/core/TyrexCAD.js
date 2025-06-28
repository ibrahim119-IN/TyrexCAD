// TyrexCAD - النواة الأساسية لنظام CAD
// يعتمد على: Geometry.js, GeometryAdvanced.js, Tools.js, UI.js

// TyrexCAD Professional v3.0 - Enhanced Implementation with Advanced Geometry

class TyrexCAD {
    constructor() {
        // Geometry library reference
        this.geo = window.Geometry;
        
        // Advanced Geometry library (loaded on demand)
        this.geometryAdvanced = null;
        
        // Tools Manager reference
        this.toolsManager = null;
        
        // Canvas setup
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas3D = document.getElementById('canvas3D');
        
        // State
        this.mode = '2D';
        this.currentTool = 'select';
        this.isDrawing = false;
        this.drawingPoints = [];
        this.tempShape = null;
        
        // View state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.gridSize = 20;
        this.minZoom = 0.01;
        this.maxZoom = 100;
        
        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
        this.worldX = 0;
        this.worldY = 0;
        this.isPanning = false;
        this.isSelecting = false;
        this.isZoomWindow = false;
        
        // Settings
        this.gridEnabled = true;
        this.snapEnabled = true;
        this.orthoEnabled = false;
        this.polarEnabled = false;
        
        // Snap settings
        this.snapSettings = {
            grid: true,
            endpoint: true,
            midpoint: true,
            center: true,
            intersection: false,
            perpendicular: false,
            tangent: false,
            nearest: false
        };
        
        // Drawing settings
        this.currentColor = '#00d4aa';
        this.currentLineWidth = 2;
        this.currentLineType = 'solid';
        
        // Data
        this.shapes = [];
        this.selectedShapes = new Set();
        this.layers = new Map();
        this.currentLayerId = 0;
        
        // History
        this.history = [];
        this.historyIndex = -1;
        this.clipboard = [];

        // Units system
        this.units = new UnitsSystem();
        this.currentUnit = 'mm'; // الوحدة الافتراضية
        
        // 3D Scene
        this.scene3D = null;
        this.camera3D = null;
        this.renderer3D = null;
        this.controls3D = null;
        this.meshes3D = new Map();
        
        // Colors
        this.colorPalette = [
            '#00d4aa', '#0099ff', '#ff0099', '#ffaa00',
            '#ff4444', '#44ff44', '#4444ff', '#ffff44',
            '#ff44ff', '#44ffff', '#ffffff', '#808080',
            '#ff6600', '#00ff66', '#6600ff', '#ffcc00',
            '#cc00ff', '#00ccff', '#ff0000', '#00ff00',
            '#0000ff', '#ffff00', '#ff00ff', '#00ffff'
        ];
        
        // Dimension settings
        this.dimensionSettings = {
            textHeight: 12,
            arrowSize: 10,
            extension: 5,
            offset: 10
        };
        
        // UI System
        this.ui = new UI(this);
        
        // Pending shape properties (from input dialog)
        this.pendingShapeProperties = null;
        
        // أضف هذه الخصائص الجديدة
        this.pickingPointMode = null;  // لتتبع وضع اختيار النقطة
        this.pickingPointCallback = null;  // callback لاختيار النقطة
        this.selectingPathMode = false;  // لتتبع وضع اختيار المسار
        this.distanceAnalysisCallback = null;  // callback لتحليل المسافة
        this.distanceAnalysisStep = 0;  // خطوة تحليل المسافة
        this.pathArrayPath = null;  // المسار المختار للمصفوفة
        
        this.init();
    }

    async init() {
        // تحديث استيراد وتهيئة Tools
        try {
            // استيراد نظام Tools الجديد
            const ToolsModule = await import('../tools/index.js');
            
            // تهيئة ToolsManager
            if (ToolsModule.Tools) {
                ToolsModule.Tools.init(this);
                this.toolsManager = ToolsModule.Tools;
            }
        } catch (error) {
            console.error('Failed to load Tools system:', error);
            // Fallback للنظام القديم إذا فشل التحميل
            if (window.Tools) {
                window.Tools.init(this);
                this.toolsManager = window.Tools;
            }
        }
        
        // Initialize UI
        this.ui.init();
        
        // تهيئة Canvas والأحداث
        this.resizeCanvas();
        this.setupEventListeners();
        this.initializeLayers();
        this.init3D();
        
        // Initialize units
        this.changeUnits('mm');
        
        // تهيئة GeometryAdvanced
        try {
            this.geometryAdvanced = new GeometryAdvanced();
            await this.geometryAdvanced.init(this);
        } catch (error) {
            console.warn('GeometryAdvanced initialization failed:', error);
        }
        
        this.updateUI();
        this.startRenderLoop();
        
        // Hide loading screen
        setTimeout(() => {
            this.ui.hideLoadingScreen();
        }, 1000);
        
        this.recordState();
        this.ready = true;
    }
    
    // Advanced Geometry Loader
    async loadAdvancedGeometry() {
        // إذا كان محملاً بالفعل، أرجعه
        if (this.geometryAdvanced) return this.geometryAdvanced;
        
        try {
            // تحقق من وجود GeometryAdvanced
            if (!window.GeometryAdvanced) {
                throw new Error('GeometryAdvanced module not loaded');
            }
            
            // إنشاء instance جديد
            this.geometryAdvanced = new GeometryAdvanced();
            
            // تهيئة مع مرجع CAD
            if (typeof this.geometryAdvanced.init === 'function') {
                await this.geometryAdvanced.init(this);
            } else {
                // إضافة مرجع CAD يدوياً
                this.geometryAdvanced.cad = this;
            }
            
            console.log('Advanced geometry loaded and initialized successfully');
            return this.geometryAdvanced;
            
        } catch (error) {
            console.error('Failed to load advanced geometry:', error);
            this.updateStatus('Advanced geometry module not available: ' + error.message);
            return null;
        }
    }
    
    resizeCanvas() {
        const container = document.getElementById('canvasContainer');
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas3D.width = rect.width;
        this.canvas3D.height = rect.height;
        
        // Center the view
        this.panX = this.canvas.width / 2;
        this.panY = this.canvas.height / 2;
        
        if (this.renderer3D) {
            this.renderer3D.setSize(rect.width, rect.height);
            this.camera3D.aspect = rect.width / rect.height;
            this.camera3D.updateProjectionMatrix();
        }
        
        this.render();
    }
    
    setupEventListeners() {
        // Window events
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Canvas events - only for 2D mode
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.mode === '2D') this.onMouseDown(e);
        });
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.mode === '2D') this.onMouseMove(e);
        });
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.mode === '2D') this.onMouseUp(e);
        });
        this.canvas.addEventListener('wheel', (e) => {
        if (this.mode === '2D') this.onWheel(e);
        }, { passive: false }); // نحتاج false لاستخدام preventDefault
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // 3D Canvas events
        this.canvas3D.addEventListener('mousedown', (e) => {
            if (this.mode === '3D') this.on3DMouseDown(e);
        });
        this.canvas3D.addEventListener('mousemove', (e) => {
            if (this.mode === '3D') this.on3DMouseMove(e);
        });
        this.canvas3D.addEventListener('mouseup', (e) => {
            if (this.mode === '3D') this.on3DMouseUp(e);
        });
        this.canvas3D.addEventListener('wheel', (e) => {
        if (this.mode === '3D') this.on3DWheel(e);
        }, { passive: false });
        this.canvas3D.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Command input
        const commandInput = document.getElementById('commandInput');
        commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(e.target.value);
                e.target.value = '';
            } else if (e.key === 'Escape') {
                e.target.value = '';
                this.cancelCurrentOperation();
            }
        });
        
        // Dynamic input
        const dynamicField = document.getElementById('dynamicField');
        dynamicField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.applyDynamicInput();
            } else if (e.key === 'Escape') {
                this.ui.hideDynamicInput();
                this.cancelCurrentOperation();
            }
        });
        
        // Zoom window overlay
        const zoomOverlay = document.getElementById('zoomWindowOverlay');
        zoomOverlay.addEventListener('mousedown', (e) => this.onZoomWindowStart(e));
        zoomOverlay.addEventListener('mousemove', (e) => this.onZoomWindowMove(e));
        zoomOverlay.addEventListener('mouseup', (e) => this.onZoomWindowEnd(e));
    }
    
    // 3D Scene Setup
    init3D() {
        // Scene
        this.scene3D = new THREE.Scene();
        this.scene3D.background = new THREE.Color(0x0a0a0a);
        this.scene3D.fog = new THREE.Fog(0x0a0a0a, 100, 1000);
        
        // Camera
        this.camera3D = new THREE.PerspectiveCamera(
            75,
            this.canvas3D.width / this.canvas3D.height,
            0.1,
            10000
        );
        this.camera3D.position.set(100, 100, 100);
        this.camera3D.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer3D = new THREE.WebGLRenderer({
            canvas: this.canvas3D,
            antialias: true
        });
        this.renderer3D.setSize(this.canvas3D.width, this.canvas3D.height);
        this.renderer3D.shadowMap.enabled = true;
        this.renderer3D.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene3D.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(100, 200, 50);
        directionalLight.castShadow = true;
        this.scene3D.add(directionalLight);
        
        // Grid
        const gridHelper = new THREE.GridHelper(1000, 50, 0x00d4aa, 0x00d4aa);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.scene3D.add(gridHelper);
        
        // Axes
        const axesHelper = new THREE.AxesHelper(100);
        this.scene3D.add(axesHelper);
        
        // Camera controls variables
        this.camera3DRotating = false;
        this.camera3DPanning = false;
        this.camera3DStartX = 0;
        this.camera3DStartY = 0;
    }
    
    // Initialize UI
    initializeLayers() {
        this.layers.set(0, {
            id: 0,
            name: 'Layer 0',
            color: '#ffffff',
            visible: true,
            locked: false,
            lineWidth: 2,
            lineType: 'solid'
        });
    }
    
    // UI wrapper methods
    updateUI() {
        this.ui.updateUI();
    }
    
    updateStatus(message) {
        this.ui.updateStatus(message);
    }
    
    showDynamicInput(label, point) {
        this.ui.showDynamicInput(label, point);
    }
    
    showInputDialog(shapeType) {
        this.ui.showInputDialog(shapeType);
    }
    
    cancelInputDialog() {
        this.ui.cancelInputDialog();
    }
    
    confirmInputDialog() {
        this.ui.confirmInputDialog();
    }
    
    showContextMenu(x, y) {
        this.ui.showContextMenu(x, y);
    }
    
    showProperties() {
        this.ui.showProperties();
    }
    
    togglePropertiesPanel() {
        this.ui.togglePropertiesPanel();
    }
    
    toggleSnapMenu() {
        this.ui.toggleSnapMenu();
    }
    
    toggleColorDropdown() {
        this.ui.toggleColorDropdown();
    }
    
    // Coordinate transformations
    screenToWorld(x, y) {
        return {
            x: (x - this.panX) / this.zoom,
            y: (y - this.panY) / this.zoom
        };
    }
    
    worldToScreen(x, y) {
        return {
            x: x * this.zoom + this.panX,
            y: y * this.zoom + this.panY
        };
    }
    
    // Mouse events
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (e.button === 0) { // Left click
            if (this.currentTool === 'pan' || e.shiftKey) {
                this.startPanning(x, y);
            } else if (this.currentTool === 'select') {
                this.handleSelection(x, y, e.ctrlKey);
            } else {
                this.handleDrawing(x, y);
            }
        } else if (e.button === 1) { // Middle click
            this.startPanning(x, y);
        } else if (e.button === 2) { // Right click
            if (this.isDrawing && this.currentTool === 'polyline') {
                this.delegateToTool('finishPolyline');
            } else {
                this.showContextMenu(e.clientX, e.clientY);
            }
        }
    }
    
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        
        const world = this.screenToWorld(this.mouseX, this.mouseY);
        this.worldX = world.x;
        this.worldY = world.y;
        
        // Update coordinates display
        this.ui.updateCoordinates(this.worldX, this.worldY, 0);
        
        // Update crosshair only in 2D mode
        if (this.mode === '2D') {
            this.ui.updateCrosshair(this.mouseX, this.mouseY);
        }
        
        if (this.isPanning) {
            this.updatePanning();
        } else if (this.isSelecting) {
            this.updateSelection();
        } else if (this.toolsManager) {
            // دع ToolsManager يتعامل مع حركة الماوس
            const snapPoint = this.getSnapPoint(world.x, world.y);
            this.toolsManager.handleMouseMove(snapPoint);
        }
        
        // Update snap indicator
        if (this.snapEnabled && this.mode === '2D') {
            const snapPoint = this.getSnapPoint(world.x, world.y);
            if (snapPoint.type) {
                const screen = this.worldToScreen(snapPoint.x, snapPoint.y);
                this.ui.updateSnapIndicator(snapPoint, screen);
            } else {
                this.ui.updateSnapIndicator(null, null);
            }
        }
        
        this.render();
    }
    
    onMouseUp(e) {
        this.isPanning = false;
        this.canvas.style.cursor = this.currentTool === 'pan' ? 'grab' : 'none';
        
        if (this.isSelecting) {
            this.finishSelection();
        }
    }
    
    onWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const worldBefore = this.screenToWorld(this.mouseX, this.mouseY);
        
        this.zoom *= delta;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
        
        const worldAfter = this.screenToWorld(this.mouseX, this.mouseY);
        
        this.panX += (worldAfter.x - worldBefore.x) * this.zoom;
        this.panY += (worldAfter.y - worldBefore.y) * this.zoom;
        
        this.render();
    }
    
    // 3D Mouse events
    on3DMouseDown(e) {
        if (e.button === 0) {
            this.camera3DRotating = true;
        } else if (e.button === 1) {
            this.camera3DPanning = true;
        }
        this.camera3DStartX = e.clientX;
        this.camera3DStartY = e.clientY;
    }
    
    on3DMouseMove(e) {
        if (this.camera3DRotating) {
            const deltaX = e.clientX - this.camera3DStartX;
            const deltaY = e.clientY - this.camera3DStartY;
            
            const spherical = new THREE.Spherical();
            spherical.setFromVector3(this.camera3D.position);
            spherical.theta -= deltaX * 0.01;
            spherical.phi += deltaY * 0.01;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
            
            this.camera3D.position.setFromSpherical(spherical);
            this.camera3D.lookAt(0, 0, 0);
            
            this.camera3DStartX = e.clientX;
            this.camera3DStartY = e.clientY;
            this.render3D();
        } else if (this.camera3DPanning) {
            const deltaX = (e.clientX - this.camera3DStartX) * 0.5;
            const deltaY = (e.clientY - this.camera3DStartY) * 0.5;
            
            const right = new THREE.Vector3();
            this.camera3D.getWorldDirection(new THREE.Vector3());
            right.crossVectors(this.camera3D.up, this.camera3D.getWorldDirection(new THREE.Vector3())).normalize();
            
            this.camera3D.position.add(right.multiplyScalar(-deltaX));
            this.camera3D.position.add(this.camera3D.up.clone().multiplyScalar(deltaY));
            
            this.camera3DStartX = e.clientX;
            this.camera3DStartY = e.clientY;
            this.render3D();
        }
    }
    
    on3DMouseUp(e) {
        this.camera3DRotating = false;
        this.camera3DPanning = false;
    }
    
    on3DWheel(e) {
        e.preventDefault();
        const scale = e.deltaY > 0 ? 1.1 : 0.9;
        this.camera3D.position.multiplyScalar(scale);
        this.render3D();
    }
    
    onKeyDown(e) {
        // ESC key cancels current operation
        if (e.key === 'Escape') {
            this.cancelCurrentOperation();
            return;
        }
        
        if (e.target.tagName === 'INPUT') return;
        
        // معالجة المفاتيح الخاصة بالنظام
        switch (e.key) {
            case 'Delete':
                this.deleteSelected();
                break;
            case 'Enter':
                // دع ToolsManager يتعامل مع Enter
                if (this.toolsManager) {
                    this.toolsManager.handleKeyPress('Enter');
                }
                break;
        }
        
        // Ctrl shortcuts
        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    this.undo();
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case 'a':
                    e.preventDefault();
                    this.selectAll();
                    break;
                case 'c':
                    e.preventDefault();
                    this.copySelected();
                    break;
                case 'v':
                    e.preventDefault();
                    this.pasteClipboard();
                    break;
            }
        }
        
        // مرر المفاتيح الأخرى للأداة النشطة
        if (this.toolsManager && !e.ctrlKey && !e.altKey) {
            this.toolsManager.handleKeyPress(e.key);
        }
    }
    
    onKeyUp(e) {
        // Handle key up if needed
    }
    
    // Tool handling
    setTool(tool) {
        // إلغاء العملية الحالية
        this.cancelCurrentOperation();
        
        // استخدم ToolsManager
        if (this.toolsManager) {
            this.toolsManager.activateTool(tool);
            this.currentTool = tool;
        } else {
            console.error('Tools system not initialized');
        }
        
        // Update UI
        this.ui.updateActiveTool(tool);
        
        // Update cursor
        this.updateCursorForTool(tool);
        
        // Update status
        this.updateStatus(`${tool.toUpperCase()} tool activated`);
        
        // لا نحتاج لإظهار input dialog هنا - الأداة ستتعامل معه
    }
    
    updateCursorForTool(tool) {
        // احصل على معلومات الأداة من ToolsManager
        if (this.toolsManager && this.toolsManager.activeTool) {
            this.canvas.style.cursor = this.toolsManager.activeTool.cursor || 'none';
        } else {
            this.canvas.style.cursor = tool === 'pan' ? 'grab' : 'none';
        }
    }
    
    handleDrawing(x, y) {
        const world = this.screenToWorld(x, y);
        const snapPoint = this.getSnapPoint(world.x, world.y);
        
        // معالجة الحالات الخاصة (picking points, etc.) - تبقى كما هي
        if (this.pickingPointMode) {
            switch (this.pickingPointMode) {
                case 'polar-center':
                    this.polarArrayCenter = snapPoint;
                    this.pickingPointMode = null;
                    this.canvas.style.cursor = 'none';
                    
                    // إعادة فتح الـ panel وتطبيق المصفوفة
                    this.ui.showToolPanel('polar-array');
                    setTimeout(() => {
                        this.applyPolarArrayWithOptions(this.polarArrayOptions);
                    }, 100);
                    break;
            }
            return;
        }
        
        if (this.selectingPathMode) {
            const shape = this.getShapeAt(world.x, world.y);
            if (shape && (shape.type === 'polyline' || shape.type === 'line' || 
                         shape.type === 'arc' || shape.type === 'circle')) {
                this.pathArrayPath = shape;
                this.selectingPathMode = false;
                this.canvas.style.cursor = 'none';
                
                // إعادة فتح الـ panel وتطبيق المصفوفة
                this.ui.showToolPanel('path-array');
                setTimeout(() => {
                    this.applyPathArrayWithOptions(this.pathArrayOptions);
                }, 100);
            } else {
                this.ui.showError('Please select a valid path');
            }
            return;
        }
        
        if (this.distanceAnalysisCallback) {
            const shape = this.getShapeAt(world.x, world.y);
            if (shape) {
                this.selectedShapes.add(shape);
                this.distanceAnalysisStep++;
                
                if (this.distanceAnalysisStep === 2) {
                    // لدينا شكلين، احسب المسافة
                    const selected = Array.from(this.selectedShapes);
                    if (this.geometryAdvanced) {
                        const result = this.geometryAdvanced.calculateDistance(selected[0], selected[1]);
                        this.distanceAnalysisCallback({
                            distance: result.distance,
                            dx: Math.abs(result.point2.x - result.point1.x),
                            dy: Math.abs(result.point2.y - result.point1.y),
                            angle: Math.atan2(result.point2.y - result.point1.y, 
                                             result.point2.x - result.point1.x) * 180 / Math.PI
                        });
                    }
                    
                    // إعادة تعيين
                    this.distanceAnalysisCallback = null;
                    this.distanceAnalysisStep = 0;
                    this.selectedShapes.clear();
                } else {
                    this.updateStatus('Select second shape for distance measurement');
                }
                
                this.render();
            }
            return;
        }
        
        // استخدم ToolsManager للتعامل مع النقر
        if (this.toolsManager) {
            this.toolsManager.handleClick(snapPoint);
        }
    }
    
    // استبدال Wrapper Functions بدالة واحدة موحدة
    delegateToTool(methodName, ...args) {
        if (this.toolsManager && this.toolsManager.activeTool) {
            const tool = this.toolsManager.activeTool;
            if (typeof tool[methodName] === 'function') {
                return tool[methodName](...args);
            }
        }
        console.warn(`Method ${methodName} not found in active tool`);
    }
    
    // Shape transformations
    copyShapeProperties(dest, src) {
        Object.keys(src).forEach(key => {
            if (key !== 'id') {
                dest[key] = JSON.parse(JSON.stringify(src[key]));
            }
        });
    }
    
    translateShape(shape, dx, dy) {
        switch (shape.type) {
            case 'line':
                shape.start.x += dx;
                shape.start.y += dy;
                shape.end.x += dx;
                shape.end.y += dy;
                break;
            case 'rectangle':
                shape.start.x += dx;
                shape.start.y += dy;
                shape.end.x += dx;
                shape.end.y += dy;
                break;
            case 'circle':
            case 'arc':
            case 'ellipse':
                shape.center.x += dx;
                shape.center.y += dy;
                break;
            case 'polyline':
                shape.points.forEach(p => {
                    p.x += dx;
                    p.y += dy;
                });
                break;
            case 'text':
                shape.position.x += dx;
                shape.position.y += dy;
                break;
            case 'dimension-linear':
                shape.start.x += dx;
                shape.start.y += dy;
                shape.end.x += dx;
                shape.end.y += dy;
                break;
            case 'dimension-angular':
            case 'dimension-radius':
            case 'dimension-diameter':
                shape.center.x += dx;
                shape.center.y += dy;
                if (shape.endPoint) {
                    shape.endPoint.x += dx;
                    shape.endPoint.y += dy;
                }
                break;
        }
    }
    
    rotateShape(shape, center, angle) {
        const rotatePoint = (p) => {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const dx = p.x - center.x;
            const dy = p.y - center.y;
            return {
                x: center.x + dx * cos - dy * sin,
                y: center.y + dx * sin + dy * cos
            };
        };
        
        switch (shape.type) {
            case 'line':
                shape.start = rotatePoint(shape.start);
                shape.end = rotatePoint(shape.end);
                break;
            case 'rectangle':
                const corners = [
                    { x: shape.start.x, y: shape.start.y },
                    { x: shape.end.x, y: shape.start.y },
                    { x: shape.end.x, y: shape.end.y },
                    { x: shape.start.x, y: shape.end.y }
                ];
                const rotatedCorners = corners.map(rotatePoint);
                shape.start = {
                    x: Math.min(...rotatedCorners.map(c => c.x)),
                    y: Math.min(...rotatedCorners.map(c => c.y))
                };
                shape.end = {
                    x: Math.max(...rotatedCorners.map(c => c.x)),
                    y: Math.max(...rotatedCorners.map(c => c.y))
                };
                break;
            case 'circle':
            case 'ellipse':
                shape.center = rotatePoint(shape.center);
                break;
            case 'arc':
                shape.center = rotatePoint(shape.center);
                shape.startAngle += angle;
                shape.endAngle += angle;
                break;
            case 'polyline':
                shape.points = shape.points.map(rotatePoint);
                break;
            case 'text':
                shape.position = rotatePoint(shape.position);
                break;
        }
    }
    
    scaleShape(shape, center, scale) {
        const scalePoint = (p) => ({
            x: center.x + (p.x - center.x) * scale,
            y: center.y + (p.y - center.y) * scale
        });
        
        switch (shape.type) {
            case 'line':
                shape.start = scalePoint(shape.start);
                shape.end = scalePoint(shape.end);
                break;
            case 'rectangle':
                shape.start = scalePoint(shape.start);
                shape.end = scalePoint(shape.end);
                break;
            case 'circle':
            case 'arc':
                shape.center = scalePoint(shape.center);
                shape.radius *= scale;
                break;
            case 'ellipse':
                shape.center = scalePoint(shape.center);
                shape.radiusX *= scale;
                shape.radiusY *= scale;
                break;
            case 'polyline':
                shape.points = shape.points.map(scalePoint);
                break;
            case 'text':
                shape.position = scalePoint(shape.position);
                shape.fontSize *= scale;
                break;
        }
    }
    
    mirrorShape(shape, mirrorLine) {
        const mirrorPoint = (p) => {
            const dx = mirrorLine.end.x - mirrorLine.start.x;
            const dy = mirrorLine.end.y - mirrorLine.start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            if (len === 0) return p;
            
            const nx = dx / len;
            const ny = dy / len;
            
            const px = p.x - mirrorLine.start.x;
            const py = p.y - mirrorLine.start.y;
            
            const dot = px * nx + py * ny;
            const projX = mirrorLine.start.x + dot * nx;
            const projY = mirrorLine.start.y + dot * ny;
            
            return {
                x: 2 * projX - p.x,
                y: 2 * projY - p.y
            };
        };
        
        switch (shape.type) {
            case 'line':
                shape.start = mirrorPoint(shape.start);
                shape.end = mirrorPoint(shape.end);
                break;
            case 'rectangle':
                const tempStart = mirrorPoint(shape.start);
                const tempEnd = mirrorPoint(shape.end);
                shape.start = {
                    x: Math.min(tempStart.x, tempEnd.x),
                    y: Math.min(tempStart.y, tempEnd.y)
                };
                shape.end = {
                    x: Math.max(tempStart.x, tempEnd.x),
                    y: Math.max(tempStart.y, tempEnd.y)
                };
                break;
            case 'circle':
            case 'ellipse':
                shape.center = mirrorPoint(shape.center);
                break;
            case 'arc':
                shape.center = mirrorPoint(shape.center);
                // Mirror angles
                const startPoint = {
                    x: shape.center.x + shape.radius * Math.cos(shape.startAngle),
                    y: shape.center.y + shape.radius * Math.sin(shape.startAngle)
                };
                const endPoint = {
                    x: shape.center.x + shape.radius * Math.cos(shape.endAngle),
                    y: shape.center.y + shape.radius * Math.sin(shape.endAngle)
                };
                const mirroredStart = mirrorPoint(startPoint);
                const mirroredEnd = mirrorPoint(endPoint);
                shape.startAngle = Math.atan2(
                    mirroredEnd.y - shape.center.y,
                    mirroredEnd.x - shape.center.x
                );
                shape.endAngle = Math.atan2(
                    mirroredStart.y - shape.center.y,
                    mirroredStart.x - shape.center.x
                );
                break;
            case 'polyline':
                shape.points = shape.points.map(mirrorPoint);
                break;
            case 'text':
                shape.position = mirrorPoint(shape.position);
                break;
        }
    }
    
    // Selection
    handleSelection(x, y, ctrlKey) {
        const world = this.screenToWorld(x, y);
        const shape = this.getShapeAt(world.x, world.y);
        
        if (shape) {
            if (ctrlKey) {
                // Toggle selection
                if (this.selectedShapes.has(shape)) {
                    this.selectedShapes.delete(shape);
                } else {
                    this.selectedShapes.add(shape);
                }
            } else {
                // Replace selection
                if (!this.selectedShapes.has(shape)) {
                    this.selectedShapes.clear();
                    this.selectedShapes.add(shape);
                }
            }
            this.ui.updatePropertiesPanel();
        } else {
            if (!ctrlKey) {
                this.selectedShapes.clear();
            }
            this.isSelecting = true;
            this.selectionStart = { x, y };
        }
        
        this.render();
    }
    
    updateSelection() {
        this.ui.updateSelectionBox(
            this.selectionStart.x, 
            this.selectionStart.y, 
            this.mouseX, 
            this.mouseY
        );
    }
    
    finishSelection() {
        this.isSelecting = false;
        this.ui.hideSelectionBox();
        
        const minScreen = {
            x: Math.min(this.selectionStart.x, this.mouseX),
            y: Math.min(this.selectionStart.y, this.mouseY)
        };
        const maxScreen = {
            x: Math.max(this.selectionStart.x, this.mouseX),
            y: Math.max(this.selectionStart.y, this.mouseY)
        };
        
        const minWorld = this.screenToWorld(minScreen.x, minScreen.y);
        const maxWorld = this.screenToWorld(maxScreen.x, maxScreen.y);
        
        this.shapes.forEach(shape => {
            const layer = this.layers.get(shape.layerId);
            if (!layer || !layer.visible || layer.locked) return;
            
            if (this.isShapeInRect(shape, minWorld, maxWorld)) {
                this.selectedShapes.add(shape);
            }
        });
        
        this.ui.updatePropertiesPanel();
        this.render();
    }
    
    getShapeAt(x, y) {
        const tolerance = 5 / this.zoom;
        
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            const layer = this.layers.get(shape.layerId);
            
            if (!layer || !layer.visible || layer.locked) continue;
            
            if (this.isPointOnShape(x, y, shape, tolerance)) {
                return shape;
            }
        }
        return null;
    }
    
    isPointOnShape(x, y, shape, tolerance) {
        switch (shape.type) {
            case 'line':
                return this.geo.isPointOnLine(x, y, shape.start, shape.end, tolerance);
            case 'rectangle':
                return this.isPointOnRectangle(x, y, shape, tolerance);
            case 'circle':
                return Math.abs(this.distance(x, y, shape.center.x, shape.center.y) - shape.radius) < tolerance;
            case 'polyline':
                for (let i = 0; i < shape.points.length - 1; i++) {
                    if (this.geo.isPointOnLine(x, y, shape.points[i], shape.points[i + 1], tolerance)) {
                        return true;
                    }
                }
                return false;
            case 'arc':
                const dist = this.distance(x, y, shape.center.x, shape.center.y);
                if (Math.abs(dist - shape.radius) > tolerance) return false;
                const angle = Math.atan2(y - shape.center.y, x - shape.center.x);
                return this.isAngleInArc(angle, shape.startAngle, shape.endAngle);
            case 'ellipse':
                return this.isPointOnEllipse(x, y, shape, tolerance);
            case 'text':
                const textWidth = shape.text.length * 8;
                const textHeight = shape.fontSize || 16;
                return x >= shape.position.x && x <= shape.position.x + textWidth &&
                       y >= shape.position.y - textHeight && y <= shape.position.y;
            case 'dimension-linear':
            case 'dimension-angular':
            case 'dimension-radius':
            case 'dimension-diameter':
                // Simplified check for dimensions
                return false;
        }
        return false;
    }
    
    isPointOnRectangle(x, y, rect, tolerance) {
        const corners = [
            { x: rect.start.x, y: rect.start.y },
            { x: rect.end.x, y: rect.start.y },
            { x: rect.end.x, y: rect.end.y },
            { x: rect.start.x, y: rect.end.y }
        ];
        
        for (let i = 0; i < 4; i++) {
            if (this.geo.isPointOnLine(x, y, corners[i], corners[(i + 1) % 4], tolerance)) {
                return true;
            }
        }
        return false;
    }
    
    isPointOnEllipse(x, y, ellipse, tolerance) {
        const dx = x - ellipse.center.x;
        const dy = y - ellipse.center.y;
        const normalized = (dx * dx) / (ellipse.radiusX * ellipse.radiusX) + 
                          (dy * dy) / (ellipse.radiusY * ellipse.radiusY);
        return Math.abs(normalized - 1) < tolerance / Math.min(ellipse.radiusX, ellipse.radiusY);
    }
    
    isAngleInArc(angle, startAngle, endAngle) {
        angle = (angle + 2 * Math.PI) % (2 * Math.PI);
        startAngle = (startAngle + 2 * Math.PI) % (2 * Math.PI);
        endAngle = (endAngle + 2 * Math.PI) % (2 * Math.PI);
        
        if (startAngle <= endAngle) {
            return angle >= startAngle && angle <= endAngle;
        } else {
            return angle >= startAngle || angle <= endAngle;
        }
    }
    
    isShapeInRect(shape, min, max) {
        const bounds = this.getShapeBounds(shape);
        return !(bounds.maxX < min.x || bounds.minX > max.x || 
                bounds.maxY < min.y || bounds.minY > max.y);
    }
    
    getShapeBounds(shape) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        const updateBounds = (x, y) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        };
        
        switch (shape.type) {
            case 'line':
                updateBounds(shape.start.x, shape.start.y);
                updateBounds(shape.end.x, shape.end.y);
                break;
            case 'rectangle':
                updateBounds(shape.start.x, shape.start.y);
                updateBounds(shape.end.x, shape.end.y);
                break;
            case 'circle':
                updateBounds(shape.center.x - shape.radius, shape.center.y - shape.radius);
                updateBounds(shape.center.x + shape.radius, shape.center.y + shape.radius);
                break;
            case 'arc':
                updateBounds(shape.center.x - shape.radius, shape.center.y - shape.radius);
                updateBounds(shape.center.x + shape.radius, shape.center.y + shape.radius);
                break;
            case 'ellipse':
                updateBounds(shape.center.x - shape.radiusX, shape.center.y - shape.radiusY);
                updateBounds(shape.center.x + shape.radiusX, shape.center.y + shape.radiusY);
                break;
            case 'polyline':
                shape.points.forEach(p => updateBounds(p.x, p.y));
                break;
            case 'text':
                updateBounds(shape.position.x, shape.position.y);
                updateBounds(shape.position.x + shape.text.length * 8, shape.position.y - 16);
                break;
        }
        
        return { minX, minY, maxX, maxY };
    }
    
    // Snap system
    getSnapPoint(x, y) {
        if (!this.snapEnabled) return { x, y };
        
        let bestSnap = null;
        let bestDistance = Infinity;
        const snapRadius = 10 / this.zoom;
        
        // Grid snap
        if (this.snapSettings.grid && this.gridEnabled) {
            const gridX = Math.round(x / this.gridSize) * this.gridSize;
            const gridY = Math.round(y / this.gridSize) * this.gridSize;
            const dist = this.distance(x, y, gridX, gridY);
            
            if (dist < snapRadius && dist < bestDistance) {
                bestDistance = dist;
                bestSnap = { x: gridX, y: gridY, type: 'Grid' };
            }
        }
        
        // Object snaps
        for (const shape of this.shapes) {
            const layer = this.layers.get(shape.layerId);
            if (!layer || !layer.visible) continue;
            
            // Skip selected shapes when moving/copying
            if ((this.currentTool === 'move' || this.currentTool === 'copy') && 
                this.isDrawing && this.selectedShapes.has(shape)) {
                continue;
            }
            
            // Endpoint snap
            if (this.snapSettings.endpoint) {
                const endpoints = this.getShapeEndpoints(shape);
                for (const point of endpoints) {
                    const dist = this.distance(x, y, point.x, point.y);
                    if (dist < snapRadius && dist < bestDistance) {
                        bestDistance = dist;
                        bestSnap = { ...point, type: 'Endpoint' };
                    }
                }
            }
            
            // Midpoint snap
            if (this.snapSettings.midpoint) {
                const midpoints = this.getShapeMidpoints(shape);
                for (const point of midpoints) {
                    const dist = this.distance(x, y, point.x, point.y);
                    if (dist < snapRadius && dist < bestDistance) {
                        bestDistance = dist;
                        bestSnap = { ...point, type: 'Midpoint' };
                    }
                }
            }
            
            // Center snap
            if (this.snapSettings.center) {
                const center = this.getShapeCenter(shape);
                if (center) {
                    const dist = this.distance(x, y, center.x, center.y);
                    if (dist < snapRadius && dist < bestDistance) {
                        bestDistance = dist;
                        bestSnap = { ...center, type: 'Center' };
                    }
                }
            }
            
            // Intersection snap
            if (this.snapSettings.intersection) {
                for (const otherShape of this.shapes) {
                    if (shape === otherShape) continue;
                    const intersections = this.getShapeIntersections(shape, otherShape);
                    for (const point of intersections) {
                        const dist = this.distance(x, y, point.x, point.y);
                        if (dist < snapRadius && dist < bestDistance) {
                            bestDistance = dist;
                            bestSnap = { ...point, type: 'Intersection' };
                        }
                    }
                }
            }
            
            // Perpendicular snap
            if (this.snapSettings.perpendicular && this.isDrawing && this.drawingPoints.length > 0) {
                const perpPoint = this.geo.getPerpendicularPoint(this.drawingPoints[0], { x, y }, shape);
                if (perpPoint) {
                    const dist = this.distance(x, y, perpPoint.x, perpPoint.y);
                    if (dist < snapRadius && dist < bestDistance) {
                        bestDistance = dist;
                        bestSnap = { ...perpPoint, type: 'Perpendicular' };
                    }
                }
            }
            
            // Tangent snap
            if (this.snapSettings.tangent && shape.type === 'circle') {
                const tangentPoints = this.getTangentPoints({ x, y }, shape);
                for (const point of tangentPoints) {
                    const dist = this.distance(x, y, point.x, point.y);
                    if (dist < snapRadius && dist < bestDistance) {
                        bestDistance = dist;
                        bestSnap = { ...point, type: 'Tangent' };
                    }
                }
            }
            
            // Nearest snap
            if (this.snapSettings.nearest) {
                const nearestPoint = this.getNearestPointOnShape({ x, y }, shape);
                if (nearestPoint) {
                    const dist = this.distance(x, y, nearestPoint.x, nearestPoint.y);
                    if (dist < snapRadius && dist < bestDistance) {
                        bestDistance = dist;
                        bestSnap = { ...nearestPoint, type: 'Nearest' };
                    }
                }
            }
        }
        
        // Ortho mode
        if (this.orthoEnabled && this.isDrawing && this.drawingPoints.length > 0) {
            const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                bestSnap = { x: x, y: lastPoint.y, type: 'Ortho' };
            } else {
                bestSnap = { x: lastPoint.x, y: y, type: 'Ortho' };
            }
        }
        
        // Polar tracking
        if (this.polarEnabled && this.isDrawing && this.drawingPoints.length > 0) {
            const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
            const angle = Math.atan2(y - lastPoint.y, x - lastPoint.x);
            const distance = this.distance(x, y, lastPoint.x, lastPoint.y);
            
            // Snap to 15-degree increments
            const snapAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
            const angleDiff = Math.abs(angle - snapAngle);
            
            if (angleDiff < Math.PI / 36) { // Within 5 degrees
                const snapX = lastPoint.x + distance * Math.cos(snapAngle);
                const snapY = lastPoint.y + distance * Math.sin(snapAngle);
                bestSnap = { x: snapX, y: snapY, type: 'Polar' };
            }
        }
        
        return bestSnap || { x, y };
    }
    
    getShapeEndpoints(shape) {
        switch (shape.type) {
            case 'line':
                return [shape.start, shape.end];
            case 'rectangle':
                return [
                    { x: shape.start.x, y: shape.start.y },
                    { x: shape.end.x, y: shape.start.y },
                    { x: shape.end.x, y: shape.end.y },
                    { x: shape.start.x, y: shape.end.y }
                ];
            case 'polyline':
                return shape.points;
            case 'arc':
                return [
                    {
                        x: shape.center.x + shape.radius * Math.cos(shape.startAngle),
                        y: shape.center.y + shape.radius * Math.sin(shape.startAngle)
                    },
                    {
                        x: shape.center.x + shape.radius * Math.cos(shape.endAngle),
                        y: shape.center.y + shape.radius * Math.sin(shape.endAngle)
                    }
                ];
            default:
                return [];
        }
    }
    
    getShapeMidpoints(shape) {
        switch (shape.type) {
            case 'line':
                return [{
                    x: (shape.start.x + shape.end.x) / 2,
                    y: (shape.start.y + shape.end.y) / 2
                }];
            case 'rectangle':
                return [
                    { x: (shape.start.x + shape.end.x) / 2, y: shape.start.y },
                    { x: shape.end.x, y: (shape.start.y + shape.end.y) / 2 },
                    { x: (shape.start.x + shape.end.x) / 2, y: shape.end.y },
                    { x: shape.start.x, y: (shape.start.y + shape.end.y) / 2 }
                ];
            case 'polyline':
                const midpoints = [];
                for (let i = 0; i < shape.points.length - 1; i++) {
                    midpoints.push({
                        x: (shape.points[i].x + shape.points[i + 1].x) / 2,
                        y: (shape.points[i].y + shape.points[i + 1].y) / 2
                    });
                }
                return midpoints;
            case 'arc':
                const midAngle = (shape.startAngle + shape.endAngle) / 2;
                return [{
                    x: shape.center.x + shape.radius * Math.cos(midAngle),
                    y: shape.center.y + shape.radius * Math.sin(midAngle)
                }];
            default:
                return [];
        }
    }
    
    getShapeCenter(shape) {
        switch (shape.type) {
            case 'circle':
            case 'arc':
            case 'ellipse':
                return shape.center;
            case 'rectangle':
                return {
                    x: (shape.start.x + shape.end.x) / 2,
                    y: (shape.start.y + shape.end.y) / 2
                };
            case 'line':
                return {
                    x: (shape.start.x + shape.end.x) / 2,
                    y: (shape.start.y + shape.end.y) / 2
                };
            default:
                return null;
        }
    }
    
    getShapeIntersections(shape1, shape2) {
        const intersections = [];
        
        if (shape1.type === 'line' && shape2.type === 'line') {
            const intersection = this.geo.lineLineIntersection(
                shape1.start, shape1.end,
                shape2.start, shape2.end
            );
            if (intersection) intersections.push(intersection);
        } else if (shape1.type === 'line' && shape2.type === 'circle') {
            const lineCircle = this.geo.lineCircleIntersection(
                shape1.start, shape1.end,
                shape2.center, shape2.radius
            );
            intersections.push(...lineCircle);
        } else if (shape1.type === 'circle' && shape2.type === 'line') {
            const lineCircle = this.geo.lineCircleIntersection(
                shape2.start, shape2.end,
                shape1.center, shape1.radius
            );
            intersections.push(...lineCircle);
        } else if (shape1.type === 'circle' && shape2.type === 'circle') {
            const circleCircle = this.geo.circleCircleIntersection(
                shape1.center, shape1.radius,
                shape2.center, shape2.radius
            );
            intersections.push(...circleCircle);
        }
        
        return intersections;
    }
    
    getTangentPoints(fromPoint, circle) {
        const tangents = [];
        const dist = this.distance(fromPoint.x, fromPoint.y, circle.center.x, circle.center.y);
        
        if (dist > circle.radius) {
            const angle = Math.asin(circle.radius / dist);
            const baseAngle = Math.atan2(circle.center.y - fromPoint.y, circle.center.x - fromPoint.x);
            
            tangents.push({
                x: circle.center.x + circle.radius * Math.cos(baseAngle - angle + Math.PI / 2),
                y: circle.center.y + circle.radius * Math.sin(baseAngle - angle + Math.PI / 2)
            });
            
            tangents.push({
                x: circle.center.x + circle.radius * Math.cos(baseAngle + angle - Math.PI / 2),
                y: circle.center.y + circle.radius * Math.sin(baseAngle + angle - Math.PI / 2)
            });
        }
        
        return tangents;
    }
    
    getNearestPointOnShape(point, shape) {
        switch (shape.type) {
            case 'line':
                return this.geo.getNearestPointOnLine(point, shape.start, shape.end);
            case 'circle':
                const angle = Math.atan2(point.y - shape.center.y, point.x - shape.center.x);
                return {
                    x: shape.center.x + shape.radius * Math.cos(angle),
                    y: shape.center.y + shape.radius * Math.sin(angle)
                };
            case 'rectangle':
                let nearestPoint = null;
                let minDist = Infinity;
                
                const corners = [
                    { x: shape.start.x, y: shape.start.y },
                    { x: shape.end.x, y: shape.start.y },
                    { x: shape.end.x, y: shape.end.y },
                    { x: shape.start.x, y: shape.end.y }
                ];
                
                for (let i = 0; i < 4; i++) {
                    const p = this.geo.getNearestPointOnLine(point, corners[i], corners[(i + 1) % 4]);
                    const dist = this.distance(point.x, point.y, p.x, p.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestPoint = p;
                    }
                }
                return nearestPoint;
            default:
                return null;
        }
    }
    
    // Panning
    startPanning(x, y) {
        this.isPanning = true;
        this.panStartX = x;
        this.panStartY = y;
        this.canvas.style.cursor = 'grabbing';
    }
    
    updatePanning() {
        const dx = this.mouseX - this.panStartX;
        const dy = this.mouseY - this.panStartY;
        
        this.panX += dx;
        this.panY += dy;
        
        this.panStartX = this.mouseX;
        this.panStartY = this.mouseY;
    }
    
    // Dynamic input
    applyDynamicInput() {
        const field = document.getElementById('dynamicField');
        const parsedValue = this.parseUserInput(field.value);
        
        if (parsedValue !== null) {
            const value = this.toUserUnits(parsedValue); // حول للوحدة الحالية للعرض
            
            switch (this.currentTool) {
                case 'rotate':
                    if (this.drawingPoints.length === 1) {
                        const angle = value * Math.PI / 180;
                        const endPoint = {
                            x: this.drawingPoints[0].x + 100 * Math.cos(angle),
                            y: this.drawingPoints[0].y + 100 * Math.sin(angle)
                        };
                        this.delegateToTool('onClick', endPoint);
                    }
                    break;
                    
                case 'scale':
                    if (this.drawingPoints.length === 1) {
                        const endPoint = {
                            x: this.drawingPoints[0].x + (this.toolsManager?.modifyState?.baseDistance || 100) * value,
                            y: this.drawingPoints[0].y
                        };
                        this.delegateToTool('onClick', endPoint);
                    }
                    break;
                    
                case 'offset':
                    if (this.toolsManager) {
                        this.toolsManager.updateOffsetDistance(parsedValue); // استخدم القيمة بالوحدات الداخلية
                    }
                    if (this.drawingPoints.length === 1) {
                        this.delegateToTool('onClick', this.drawingPoints[0]);
                    }
                    break;
            }
        }
        
        this.ui.hideDynamicInput();
    }
    
    // Zoom window
    zoomWindow() {
        this.isZoomWindow = true;
        this.updateStatus('Specify first corner of zoom window');
        this.ui.showZoomWindow();
    }
    
    onZoomWindowStart(e) {
        if (!this.isZoomWindow) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.zoomWindowStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.isZoomWindowDragging = true;
    }
    
    onZoomWindowMove(e) {
        if (!this.isZoomWindowDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        this.ui.updateZoomBox(
            this.zoomWindowStart.x,
            this.zoomWindowStart.y,
            currentX,
            currentY
        );
    }
    
    onZoomWindowEnd(e) {
        if (!this.isZoomWindowDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        
        const minScreen = {
            x: Math.min(this.zoomWindowStart.x, endX),
            y: Math.min(this.zoomWindowStart.y, endY)
        };
        const maxScreen = {
            x: Math.max(this.zoomWindowStart.x, endX),
            y: Math.max(this.zoomWindowStart.y, endY)
        };
        
        if (maxScreen.x - minScreen.x > 5 && maxScreen.y - minScreen.y > 5) {
            const minWorld = this.screenToWorld(minScreen.x, minScreen.y);
            const maxWorld = this.screenToWorld(maxScreen.x, maxScreen.y);
            
            const width = maxWorld.x - minWorld.x;
            const height = maxWorld.y - minWorld.y;
            
            const zoomX = this.canvas.width / width;
            const zoomY = this.canvas.height / height;
            this.zoom = Math.min(zoomX, zoomY) * 0.9;
            
            const centerX = (minWorld.x + maxWorld.x) / 2;
            const centerY = (minWorld.y + maxWorld.y) / 2;
            
            this.panX = this.canvas.width / 2 - centerX * this.zoom;
            this.panY = this.canvas.height / 2 - centerY * this.zoom;
            
            this.render();
        }
        
        this.isZoomWindow = false;
        this.isZoomWindowDragging = false;
        this.ui.hideZoomWindow();
        this.updateStatus('READY');
    }
    
    // Rendering
    render() {
        if (this.mode === '2D') {
            this.render2D();
        } else {
            this.render3D();
        }
    }
    
    render2D() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context
        this.ctx.save();
        
        // Apply transformations
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Draw grid
        if (this.gridEnabled) {
            this.drawGrid();
        }
        
        // Draw shapes by layer
        for (const [layerId, layer] of this.layers) {
            if (!layer.visible) continue;
            
            for (const shape of this.shapes) {
                if (shape.layerId === layerId) {
                    const isSelected = this.selectedShapes.has(shape);
                    this.drawShape(shape, isSelected, layer);
                }
            }
        }
        
        // Draw temporary shape
        if (this.tempShape) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.5;
            this.drawShape(this.tempShape, false);
            this.ctx.restore();
        }
        
        // Draw temporary shapes (for move, copy, etc.)
        if (this.tempShapes) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.5;
            this.tempShapes.forEach(shape => this.drawShape(shape, false));
            this.ctx.restore();
        }
        
        // Restore context
        this.ctx.restore();
    }
    
    render3D() {
        if (this.renderer3D && this.scene3D && this.camera3D) {
            this.renderer3D.render(this.scene3D, this.camera3D);
        }
    }
    
    drawGrid() {
        this.ctx.save();
        
        const viewport = {
            left: -this.panX / this.zoom,
            top: -this.panY / this.zoom,
            right: (this.canvas.width - this.panX) / this.zoom,
            bottom: (this.canvas.height - this.panY) / this.zoom
        };
        
        // Dynamic grid sizing
        const viewSize = Math.max(viewport.right - viewport.left, viewport.bottom - viewport.top);
        let gridSize = this.gridSize;
        
        if (this.zoom < 0.1) gridSize = 1000;
        else if (this.zoom < 0.5) gridSize = 100;
        else if (this.zoom < 1) gridSize = 50;
        else if (this.zoom < 2) gridSize = 20;
        else if (this.zoom < 5) gridSize = 10;
        else gridSize = 5;
        
        // Store current grid size for snapping
        this.gridSize = gridSize;
        
        // Minor grid
        this.ctx.strokeStyle = 'rgba(0, 212, 170, 0.05)';
        this.ctx.lineWidth = 0.5 / this.zoom;
        
        const minorSize = gridSize / 5;
        const startX = Math.floor(viewport.left / minorSize) * minorSize;
        const endX = Math.ceil(viewport.right / minorSize) * minorSize;
        const startY = Math.floor(viewport.top / minorSize) * minorSize;
        const endY = Math.ceil(viewport.bottom / minorSize) * minorSize;
        
        for (let x = startX; x <= endX; x += minorSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, viewport.top);
            this.ctx.lineTo(x, viewport.bottom);
            this.ctx.stroke();
        }
        
        for (let y = startY; y <= endY; y += minorSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(viewport.left, y);
            this.ctx.lineTo(viewport.right, y);
            this.ctx.stroke();
        }
        
        // Major grid
        this.ctx.strokeStyle = 'rgba(0, 212, 170, 0.1)';
        this.ctx.lineWidth = 1 / this.zoom;
        
        const majorStartX = Math.floor(viewport.left / gridSize) * gridSize;
        const majorEndX = Math.ceil(viewport.right / gridSize) * gridSize;
        const majorStartY = Math.floor(viewport.top / gridSize) * gridSize;
        const majorEndY = Math.ceil(viewport.bottom / gridSize) * gridSize;
        
        for (let x = majorStartX; x <= majorEndX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, viewport.top);
            this.ctx.lineTo(x, viewport.bottom);
            this.ctx.stroke();
        }
        
        for (let y = majorStartY; y <= majorEndY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(viewport.left, y);
            this.ctx.lineTo(viewport.right, y);
            this.ctx.stroke();
        }
        
        // Axes
        this.ctx.strokeStyle = 'rgba(0, 212, 170, 0.3)';
        this.ctx.lineWidth = 2 / this.zoom;
        
        this.ctx.beginPath();
        this.ctx.moveTo(viewport.left, 0);
        this.ctx.lineTo(viewport.right, 0);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, viewport.top);
        this.ctx.lineTo(0, viewport.bottom);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawShape(shape, isSelected = false, layer = null) {
        this.ctx.save();
        
        // Use layer properties if available
        if (layer) {
            this.ctx.strokeStyle = shape.color || layer.color;
            this.ctx.lineWidth = (shape.lineWidth || layer.lineWidth) / this.zoom;
            this.ctx.fillStyle = shape.color || layer.color;
            
            // Apply line type from layer
            switch (shape.lineType || layer.lineType) {
                case 'dashed':
                    this.ctx.setLineDash([10 / this.zoom, 5 / this.zoom]);
                    break;
                case 'dotted':
                    this.ctx.setLineDash([2 / this.zoom, 3 / this.zoom]);
                    break;
            }
        } else {
            // Use shape properties
            this.ctx.strokeStyle = shape.color || '#ffffff';
            this.ctx.lineWidth = (shape.lineWidth || 2) / this.zoom;
            this.ctx.fillStyle = shape.color || '#ffffff';
            
            // Apply line type
            switch (shape.lineType) {
                case 'dashed':
                    this.ctx.setLineDash([10 / this.zoom, 5 / this.zoom]);
                    break;
                case 'dotted':
                    this.ctx.setLineDash([2 / this.zoom, 3 / this.zoom]);
                    break;
            }
        }
        
        // Selection effect
        if (isSelected) {
            this.ctx.shadowColor = shape.color || '#00d4aa';
            this.ctx.shadowBlur = 10 / this.zoom;
        }
        
        // Draw shape
        switch (shape.type) {
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(shape.start.x, shape.start.y);
                this.ctx.lineTo(shape.end.x, shape.end.y);
                this.ctx.stroke();
                break;
                
            case 'rectangle':
                const x = Math.min(shape.start.x, shape.end.x);
                const y = Math.min(shape.start.y, shape.end.y);
                const width = Math.abs(shape.end.x - shape.start.x);
                const height = Math.abs(shape.end.y - shape.start.y);
                this.ctx.strokeRect(x, y, width, height);
                break;
                
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                break;
                
            case 'arc':
                this.ctx.beginPath();
                this.ctx.arc(shape.center.x, shape.center.y, shape.radius,
                             shape.startAngle, shape.endAngle);
                this.ctx.stroke();
                break;
                
            case 'ellipse':
                this.ctx.beginPath();
                this.ctx.ellipse(shape.center.x, shape.center.y,
                                 shape.radiusX, shape.radiusY, 0, 0, Math.PI * 2);
                this.ctx.stroke();
                break;
                
            case 'polyline':
                this.ctx.beginPath();
                this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                this.ctx.stroke();
                break;
                
            case 'text':
                this.ctx.font = `${shape.fontSize}px Arial`;
                this.ctx.fillText(shape.text, shape.position.x, shape.position.y);
                break;
                
            case 'dimension-linear':
                this.drawLinearDimensionShape(shape);
                break;
                
            case 'dimension-angular':
                this.drawAngularDimensionShape(shape);
                break;
                
            case 'dimension-radius':
                this.drawRadiusDimensionShape(shape);
                break;
                
            case 'dimension-diameter':
                this.drawDiameterDimensionShape(shape);
                break;
        }
        
        // Draw selection handles
        if (isSelected && !shape.type.startsWith('dimension')) {
            this.drawSelectionHandles(shape);
        }
        
        this.ctx.restore();
    }
    
    drawLinearDimensionShape(dim) {
        const angle = Math.atan2(dim.end.y - dim.start.y, dim.end.x - dim.start.x);
        const perpAngle = angle + Math.PI / 2;
        
        const offset = Math.abs(dim.offset);
        const side = dim.offset > 0 ? 1 : -1;
        
        // Calculate dimension line points
        const dimStart = {
            x: dim.start.x + Math.cos(perpAngle) * offset * side,
            y: dim.start.y + Math.sin(perpAngle) * offset * side
        };
        const dimEnd = {
            x: dim.end.x + Math.cos(perpAngle) * offset * side,
            y: dim.end.y + Math.sin(perpAngle) * offset * side
        };
        
        // Extension lines
        this.ctx.beginPath();
        this.ctx.moveTo(dim.start.x, dim.start.y);
        this.ctx.lineTo(dimStart.x + Math.cos(perpAngle) * this.dimensionSettings.extension * side, 
                       dimStart.y + Math.sin(perpAngle) * this.dimensionSettings.extension * side);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(dim.end.x, dim.end.y);
        this.ctx.lineTo(dimEnd.x + Math.cos(perpAngle) * this.dimensionSettings.extension * side,
                       dimEnd.y + Math.sin(perpAngle) * this.dimensionSettings.extension * side);
        this.ctx.stroke();
        
        // Dimension line
        this.ctx.beginPath();
        this.ctx.moveTo(dimStart.x, dimStart.y);
        this.ctx.lineTo(dimEnd.x, dimEnd.y);
        this.ctx.stroke();
        
        // Arrows
        const arrowSize = this.dimensionSettings.arrowSize / this.zoom;
        this.drawArrow(dimStart, angle + Math.PI, arrowSize);
        this.drawArrow(dimEnd, angle, arrowSize);
        
        // Text
        const midX = (dimStart.x + dimEnd.x) / 2;
        const midY = (dimStart.y + dimEnd.y) / 2;
        
        this.ctx.save();
        this.ctx.font = `${this.dimensionSettings.textHeight / this.zoom}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Background for text
        const textWidth = this.ctx.measureText(dim.text).width;
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(midX - textWidth/2 - 5/this.zoom, 
                         midY - this.dimensionSettings.textHeight/2/this.zoom - 2/this.zoom,
                         textWidth + 10/this.zoom,
                         this.dimensionSettings.textHeight/this.zoom + 4/this.zoom);
        
        this.ctx.fillStyle = dim.color;
        this.ctx.fillText(dim.text, midX, midY);
        this.ctx.restore();
    }
    
    drawAngularDimensionShape(dim) {
        // Draw arc
        this.ctx.beginPath();
        this.ctx.arc(dim.center.x, dim.center.y, dim.radius, dim.startAngle, dim.endAngle);
        this.ctx.stroke();
        
        // Draw extension lines
        const startPoint = {
            x: dim.center.x + dim.radius * Math.cos(dim.startAngle),
            y: dim.center.y + dim.radius * Math.sin(dim.startAngle)
        };
        const endPoint = {
            x: dim.center.x + dim.radius * Math.cos(dim.endAngle),
            y: dim.center.y + dim.radius * Math.sin(dim.endAngle)
        };
        
        this.ctx.beginPath();
        this.ctx.moveTo(dim.center.x, dim.center.y);
        this.ctx.lineTo(startPoint.x, startPoint.y);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(dim.center.x, dim.center.y);
        this.ctx.lineTo(endPoint.x, endPoint.y);
        this.ctx.stroke();
        
        // Draw arrows
        const arrowSize = this.dimensionSettings.arrowSize / this.zoom;
        this.drawArrow(startPoint, dim.startAngle + Math.PI/2, arrowSize);
        this.drawArrow(endPoint, dim.endAngle - Math.PI/2, arrowSize);
        
        // Draw text
        const midAngle = (dim.startAngle + dim.endAngle) / 2;
        const textX = dim.center.x + (dim.radius + 20/this.zoom) * Math.cos(midAngle);
        const textY = dim.center.y + (dim.radius + 20/this.zoom) * Math.sin(midAngle);
        
        this.ctx.save();
        this.ctx.font = `${this.dimensionSettings.textHeight / this.zoom}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = dim.color;
        this.ctx.fillText(dim.text, textX, textY);
        this.ctx.restore();
    }
    
    drawRadiusDimensionShape(dim) {
        // Draw leader line
        this.ctx.beginPath();
        this.ctx.moveTo(dim.center.x, dim.center.y);
        this.ctx.lineTo(dim.endPoint.x, dim.endPoint.y);
        this.ctx.stroke();
        
        // Draw arrow at circle
        const angle = Math.atan2(dim.endPoint.y - dim.center.y, dim.endPoint.x - dim.center.x);
        const arrowPoint = {
            x: dim.center.x + dim.radius * Math.cos(angle),
            y: dim.center.y + dim.radius * Math.sin(angle)
        };
        const arrowSize = this.dimensionSettings.arrowSize / this.zoom;
        this.drawArrow(arrowPoint, angle + Math.PI, arrowSize);
        
        // Draw text
        this.ctx.save();
        this.ctx.font = `${this.dimensionSettings.textHeight / this.zoom}px Arial`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = dim.color;
        this.ctx.fillText(dim.text, dim.endPoint.x + 5/this.zoom, dim.endPoint.y);
        this.ctx.restore();
    }
    
    drawDiameterDimensionShape(dim) {
        // Draw diameter line
        const p1 = {
            x: dim.center.x - dim.radius * Math.cos(dim.angle),
            y: dim.center.y - dim.radius * Math.sin(dim.angle)
        };
        const p2 = {
            x: dim.center.x + dim.radius * Math.cos(dim.angle),
            y: dim.center.y + dim.radius * Math.sin(dim.angle)
        };
        
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
        
        // Draw arrows
        const arrowSize = this.dimensionSettings.arrowSize / this.zoom;
        this.drawArrow(p1, dim.angle + Math.PI, arrowSize);
        this.drawArrow(p2, dim.angle, arrowSize);
        
        // Draw text
        const midX = dim.center.x;
        const midY = dim.center.y;
        
        this.ctx.save();
        this.ctx.font = `${this.dimensionSettings.textHeight / this.zoom}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Background for text
        const textWidth = this.ctx.measureText(dim.text).width;
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(midX - textWidth/2 - 5/this.zoom, 
                         midY - this.dimensionSettings.textHeight/2/this.zoom - 2/this.zoom,
                         textWidth + 10/this.zoom,
                         this.dimensionSettings.textHeight/this.zoom + 4/this.zoom);
        
        this.ctx.fillStyle = dim.color;
        this.ctx.fillText(dim.text, midX, midY);
        this.ctx.restore();
    }
    
    drawArrow(point, angle, size) {
        this.ctx.save();
        this.ctx.translate(point.x, point.y);
        this.ctx.rotate(angle);
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-size, -size/2);
        this.ctx.lineTo(-size, size/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawSelectionHandles(shape) {
        this.ctx.save();
        this.ctx.fillStyle = '#00d4aa';
        const size = 6 / this.zoom;
        
        const drawHandle = (x, y) => {
            this.ctx.fillRect(x - size/2, y - size/2, size, size);
        };
        
        switch (shape.type) {
            case 'line':
                drawHandle(shape.start.x, shape.start.y);
                drawHandle(shape.end.x, shape.end.y);
                drawHandle((shape.start.x + shape.end.x) / 2, (shape.start.y + shape.end.y) / 2);
                break;
                
            case 'rectangle':
                drawHandle(shape.start.x, shape.start.y);
                drawHandle(shape.end.x, shape.start.y);
                drawHandle(shape.end.x, shape.end.y);
                drawHandle(shape.start.x, shape.end.y);
                // Midpoint handles
                drawHandle((shape.start.x + shape.end.x) / 2, shape.start.y);
                drawHandle(shape.end.x, (shape.start.y + shape.end.y) / 2);
                drawHandle((shape.start.x + shape.end.x) / 2, shape.end.y);
                drawHandle(shape.start.x, (shape.start.y + shape.end.y) / 2);
                break;
                
            case 'circle':
                drawHandle(shape.center.x + shape.radius, shape.center.y);
                drawHandle(shape.center.x - shape.radius, shape.center.y);
                drawHandle(shape.center.x, shape.center.y + shape.radius);
                drawHandle(shape.center.x, shape.center.y - shape.radius);
                break;
                
            case 'polyline':
                shape.points.forEach(p => drawHandle(p.x, p.y));
                break;
        }
        
        this.ctx.restore();
    }
    
    // History
    recordState() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push({
            shapes: JSON.parse(JSON.stringify(this.shapes)),
            selectedShapes: Array.from(this.selectedShapes).map(s => s.id)
        });
        this.historyIndex++;
        
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            this.shapes = JSON.parse(JSON.stringify(state.shapes));
            
            this.selectedShapes.clear();
            for (const id of state.selectedShapes) {
                const shape = this.shapes.find(s => s.id === id);
                if (shape) this.selectedShapes.add(shape);
            }
            
            this.updateUI();
            this.render();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            this.shapes = JSON.parse(JSON.stringify(state.shapes));
            
            this.selectedShapes.clear();
            for (const id of state.selectedShapes) {
                const shape = this.shapes.find(s => s.id === id);
                if (shape) this.selectedShapes.add(shape);
            }
            
            this.updateUI();
            this.render();
        }
    }
    
    // Operations
    selectAll() {
        this.selectedShapes.clear();
        this.shapes.forEach(shape => {
            const layer = this.layers.get(shape.layerId);
            if (layer && layer.visible && !layer.locked) {
                this.selectedShapes.add(shape);
            }
        });
        this.ui.updatePropertiesPanel();
        this.render();
    }
    
    deselectAll() {
        this.selectedShapes.clear();
        this.ui.updatePropertiesPanel();
        this.render();
    }
    
    selectSimilar() {
        if (this.selectedShapes.size === 0) return;
        
        const referenceShape = Array.from(this.selectedShapes)[0];
        const similar = this.shapes.filter(shape => 
            shape.type === referenceShape.type && 
            shape.layerId === referenceShape.layerId &&
            !this.selectedShapes.has(shape)
        );
        
        similar.forEach(shape => this.selectedShapes.add(shape));
        this.ui.updatePropertiesPanel();
        this.render();
    }
    
    deleteSelected() {
        if (this.selectedShapes.size > 0) {
            this.recordState();
            
            this.selectedShapes.forEach(shape => {
                const index = this.shapes.indexOf(shape);
                if (index !== -1) {
                    this.shapes.splice(index, 1);
                }
            });
            
            this.selectedShapes.clear();
            this.updateUI();
            this.render();
        }
    }
    
    copySelected() {
        this.clipboard = Array.from(this.selectedShapes).map(shape => 
            this.cloneShape(shape)
        );
        this.updateStatus(`Copied ${this.clipboard.length} objects`);
    }
    
    pasteClipboard() {
        if (this.clipboard.length > 0) {
            this.recordState();
            this.selectedShapes.clear();
            
            const offset = 20 / this.zoom;
            
            this.clipboard.forEach(shape => {
                const newShape = this.cloneShape(shape);
                newShape.id = this.generateId();
                this.translateShape(newShape, offset, offset);
                this.shapes.push(newShape);
                this.selectedShapes.add(newShape);
            });
            
            this.updateUI();
            this.render();
        }
    }
    
    repeatLastCommand() {
        if (this.lastTool) {
            this.setTool(this.lastTool);
        }
    }
    
    // View operations
    zoomExtents() {
        if (this.shapes.length === 0) return;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        this.shapes.forEach(shape => {
            const bounds = this.getShapeBounds(shape);
            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
        });
        
        const padding = 50;
        const width = maxX - minX;
        const height = maxY - minY;
        
        const zoomX = (this.canvas.width - padding * 2) / width;
        const zoomY = (this.canvas.height - padding * 2) / height;
        this.zoom = Math.min(zoomX, zoomY, 2);
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        this.panX = this.canvas.width / 2 - centerX * this.zoom;
        this.panY = this.canvas.height / 2 - centerY * this.zoom;
        
        this.render();
    }
    
    setViewMode(mode) {
        this.mode = mode;
        this.ui.updateViewMode(mode);
        this.render();
        this.updateStatus(`Switched to ${mode} mode`);
    }
    
    set3DView(view) {
        switch (view) {
            case 'top':
                this.camera3D.position.set(0, 300, 0);
                this.camera3D.lookAt(0, 0, 0);
                break;
            case 'front':
                this.camera3D.position.set(0, 0, 300);
                this.camera3D.lookAt(0, 0, 0);
                break;
            case 'iso':
                this.camera3D.position.set(200, 200, 200);
                this.camera3D.lookAt(0, 0, 0);
                break;
        }
        this.render3D();
    }
    
    // Settings
    setColor(color) {
        this.currentColor = color;
        
        const layer = this.layers.get(this.currentLayerId);
        if (layer) {
            layer.color = color;
        }
        
        // Update color preview
        this.ui.updateColorDisplay(color);
        
        this.render();
    }
    
    setLineWidth(width) {
        this.currentLineWidth = parseInt(width);
        const layer = this.layers.get(this.currentLayerId);
        if (layer) {
            layer.lineWidth = this.currentLineWidth;
        }
        
        // Update display
        this.ui.updateLineWidthDisplay(width);
        
        this.render();
    }
    
    setLineType(type) {
        this.currentLineType = type;
        const layer = this.layers.get(this.currentLayerId);
        if (layer) {
            layer.lineType = type;
        }
        this.render();
    }
    
    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        this.ui.updateBottomToolbar();
        this.render();
    }
    
    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        this.ui.updateBottomToolbar();
    }
    
    toggleOrtho() {
        this.orthoEnabled = !this.orthoEnabled;
        this.ui.updateBottomToolbar();
    }
    
    togglePolar() {
        this.polarEnabled = !this.polarEnabled;
        this.ui.updateBottomToolbar();
    }
    
    toggleSnapSetting(type) {
        this.snapSettings[type] = !this.snapSettings[type];
        const element = document.getElementById('snap' + type.charAt(0).toUpperCase() + type.slice(1));
        if (element) {
            element.classList.toggle('active', this.snapSettings[type]);
        }
        
        // Update snap enabled state
        const anySnapActive = Object.values(this.snapSettings).some(v => v);
        this.snapEnabled = anySnapActive;
        
        this.ui.updateBottomToolbar();
        
        // Prevent menu from closing
        event.stopPropagation();
    }
    
    // Layer management
    addLayer() {
        const id = Date.now();
        const name = `Layer ${this.layers.size}`;
        this.layers.set(id, {
            id: id,
            name: name,
            color: '#ffffff',
            visible: true,
            locked: false,
            lineWidth: 2,
            lineType: 'solid'
        });
        this.ui.updateLayersList();
    }
    
    setCurrentLayer(id) {
        this.currentLayerId = id;
        const layer = this.layers.get(id);
        if (layer) {
            this.currentColor = layer.color;
            this.currentLineWidth = layer.lineWidth;
            this.currentLineType = layer.lineType;
            
            // Update UI elements
            this.setColor(layer.color);
            document.getElementById('lineWidthSlider').value = layer.lineWidth;
            document.getElementById('lineWidthValue').textContent = layer.lineWidth;
            document.getElementById('lineTypeSelect').value = layer.lineType;
        }
        this.ui.updateLayersList();
        this.updateUI();
    }
    
    toggleLayerVisibility(id) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.visible = !layer.visible;
            this.ui.updateLayersList();
            this.render();
        }
    }
    
    toggleLayerLock(id) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.locked = !layer.locked;
            this.ui.updateLayersList();
        }
    }
    
    renameLayer(id, name) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.name = name;
        }
    }
    
    changeLayerColor(id) {
        const color = prompt('Enter color (hex):', '#ffffff');
        if (color && /^#[0-9A-F]{6}$/i.test(color)) {
            const layer = this.layers.get(id);
            if (layer) {
                layer.color = color;
                if (id === this.currentLayerId) {
                    this.currentColor = color;
                    this.setColor(color);
                }
                this.ui.updateLayersList();
                this.render();
            }
        }
    }
    
    // Commands
    executeCommand(command) {
        const cmd = command.toLowerCase().trim();
        
        // تحقق من أمر تغيير الوحدات
        if (cmd.startsWith('units ')) {
            const unit = cmd.substring(6).trim();
            this.changeUnits(unit);
            return;
        }
        
        // قائمة الأوامر المحدثة
        const commands = {
            // أوامر الرسم - استخدم setTool
            'line': () => this.setTool('line'),
            'l': () => this.setTool('line'),
            'circle': () => this.setTool('circle'),
            'c': () => this.setTool('circle'),
            'rectangle': () => this.setTool('rectangle'),
            'rect': () => this.setTool('rectangle'),
            'r': () => this.setTool('rectangle'),
            'polyline': () => this.setTool('polyline'),
            'pl': () => this.setTool('polyline'),
            'arc': () => this.setTool('arc'),
            'a': () => this.setTool('arc'),
            'ellipse': () => this.setTool('ellipse'),
            'el': () => this.setTool('ellipse'),
            'polygon': () => this.setTool('polygon'),
            'pol': () => this.setTool('polygon'),
            
            // أوامر التعديل
            'move': () => this.setTool('move'),
            'm': () => this.setTool('move'),
            'copy': () => this.setTool('copy'),
            'co': () => this.setTool('copy'),
            'rotate': () => this.setTool('rotate'),
            'ro': () => this.setTool('rotate'),
            'scale': () => this.setTool('scale'),
            'sc': () => this.setTool('scale'),
            'mirror': () => this.setTool('mirror'),
            'mi': () => this.setTool('mirror'),
            'trim': () => this.setTool('trim'),
            'tr': () => this.setTool('trim'),
            'extend': () => this.setTool('extend'),
            'ex': () => this.setTool('extend'),
            'offset': () => this.setTool('offset'),
            'of': () => this.setTool('offset'),
            'fillet': () => this.setTool('fillet'),
            'f': () => this.setTool('fillet'),
            'chamfer': () => this.setTool('chamfer'),
            'cha': () => this.setTool('chamfer'),
            'array': () => this.showArrayMenu(),
            'ar': () => this.showArrayMenu(),
            
            // Boolean operations - استخدم setTool أو activateTool
            'union': () => this.toolsManager?.activateTool('union'),
            'uni': () => this.toolsManager?.activateTool('union'),
            'difference': () => this.toolsManager?.activateTool('difference'),
            'dif': () => this.toolsManager?.activateTool('difference'),
            'intersection': () => this.toolsManager?.activateTool('intersection'),
            'int': () => this.toolsManager?.activateTool('intersection'),
            'distance': () => this.toolsManager?.activateTool('distance-analysis'),
            'dist': () => this.toolsManager?.activateTool('distance-analysis'),
            'area': () => this.toolsManager?.activateTool('area-analysis'),
            'properties': () => this.toolsManager?.activateTool('properties-analysis'),
            'prop': () => this.toolsManager?.activateTool('properties-analysis'),
            
            // الأوامر الأخرى تبقى كما هي
            'delete': () => this.deleteSelected(),
            'del': () => this.deleteSelected(),
            'undo': () => this.undo(),
            'u': () => this.undo(),
            'redo': () => this.redo(),
            'zoom': () => this.zoomExtents(),
            'z': () => this.zoomExtents(),
            'zw': () => this.zoomWindow(),
            'pan': () => this.setTool('pan'),
            'p': () => this.setTool('pan'),
            'select': () => this.setTool('select'),
            'sel': () => this.setTool('select'),
            'grid': () => this.toggleGrid(),
            'snap': () => this.toggleSnap(),
            'ortho': () => this.toggleOrtho(),
            'polar': () => this.togglePolar(),
            'units': () => this.showUnitsDialog(),
            'help': () => this.showHelp(),
            'f1': () => this.showHelp()
        };
        
        if (commands[cmd]) {
            commands[cmd]();
            this.lastCommand = cmd;
        } else {
            this.updateStatus(`Unknown command: ${cmd}`);
        }
    }
    
    showArrayMenu() {
        const choice = prompt('Array type:\n1. Rectangular\n2. Polar\n3. Path', '1');
        switch (choice) {
            case '1':
                this.setTool('rectangular-array');
                break;
            case '2':
                this.setTool('polar-array');
                break;
            case '3':
                this.setTool('path-array');
                break;
        }
    }
    
    showHelp() {
        alert(`TyrexCAD Commands:
        
Drawing:
- LINE (L) - Draw line
- CIRCLE (C) - Draw circle
- RECTANGLE (R) - Draw rectangle
- POLYLINE (PL) - Draw polyline
- ARC (A) - Draw arc
- ELLIPSE (EL) - Draw ellipse
- POLYGON (POL) - Draw polygon

Modify:
- MOVE (M) - Move objects
- COPY (CO) - Copy objects
- ROTATE (RO) - Rotate objects
- SCALE (SC) - Scale objects
- MIRROR (MI) - Mirror objects
- TRIM (TR) - Trim objects
- EXTEND (EX) - Extend objects
- OFFSET (OF) - Offset objects
- FILLET (F) - Fillet corners
- CHAMFER (CHA) - Chamfer corners
- ARRAY (AR) - Create arrays

Boolean Operations:
- UNION (UNI) - Combine shapes
- DIFFERENCE (DIF) - Subtract shapes
- INTERSECTION (INT) - Find overlap

Analysis:
- DISTANCE (DIST) - Measure distance
- AREA - Calculate area
- PROPERTIES (PROP) - Show properties

View:
- ZOOM (Z) - Zoom extents
- ZW - Zoom window
- PAN (P) - Pan view

Edit:
- DELETE (DEL) - Delete selected
- UNDO (U) - Undo last action
- REDO - Redo action

Settings:
- GRID - Toggle grid
- SNAP - Toggle snap
- ORTHO - Toggle orthogonal mode
- POLAR - Toggle polar tracking
- UNITS - Show available units
- UNITS <unit> - Change units (e.g., units mm, units in)

Units Input:
- You can enter values with units: 100mm, 10cm, 1m, 12in, 1ft
- If no unit is specified, the current unit is used

Other:
- ESC - Cancel current operation`);
    }
    
    showUnitsDialog() {
        const availableUnits = this.units.getAvailableUnits();
        const unitGroups = {
            'Metric': this.units.getUnitsByCategory('metric'),
            'Imperial': this.units.getUnitsByCategory('imperial'),
            'Typography': this.units.getUnitsByCategory('typography')
        };
        
        let message = 'Available units:\n\n';
        for (const [category, units] of Object.entries(unitGroups)) {
            message += `${category}:\n`;
            units.forEach(unit => {
                const info = this.units.getUnitInfo(unit);
                message += `  ${info.code} - ${info.name} (${info.symbol})\n`;
            });
            message += '\n';
        }
        
        message += `\nCurrent unit: ${this.currentUnit}\n`;
        message += '\nTo change units, type: units <unit_code>';
        
        alert(message);
    }
    
    // File operations
    newFile() {
        if (confirm('Create new file? All unsaved changes will be lost.')) {
            this.shapes = [];
            this.selectedShapes.clear();
            this.history = [];
            this.historyIndex = -1;
            this.recordState();
            this.updateUI();
            this.render();
        }
    }
    
    openFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.loadData(data);
                    } catch (err) {
                        alert('Invalid file format');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
    saveFile() {
        const data = {
            shapes: this.shapes,
            layers: Array.from(this.layers.entries())
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tyrexcad_drawing.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    exportFile() {
        // Export to DXF format
        let dxf = '0\nSECTION\n2\nENTITIES\n';
        
        this.shapes.forEach(shape => {
            switch (shape.type) {
                case 'line':
                    dxf += `0\nLINE\n10\n${shape.start.x}\n20\n${shape.start.y}\n11\n${shape.end.x}\n21\n${shape.end.y}\n`;
                    break;
                case 'circle':
                    dxf += `0\nCIRCLE\n10\n${shape.center.x}\n20\n${shape.center.y}\n40\n${shape.radius}\n`;
                    break;
                // Add more entity types as needed
            }
        });
        
        dxf += '0\nENDSEC\n0\nEOF';
        
        const blob = new Blob([dxf], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tyrexcad_export.dxf';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    loadData(data) {
        this.shapes = data.shapes || [];
        this.layers.clear();
        if (data.layers) {
            data.layers.forEach(([id, layer]) => {
                this.layers.set(id, layer);
            });
        }
        this.selectedShapes.clear();
        this.history = [];
        this.historyIndex = -1;
        this.recordState();
        this.updateUI();
        this.render();
    }
    
    // Helper functions
    finishDrawing() {
        // أخبر ToolsManager أن الرسم انتهى
        if (this.toolsManager && this.toolsManager.activeTool) {
            if (typeof this.toolsManager.activeTool.finishDrawing === 'function') {
                this.toolsManager.activeTool.finishDrawing();
            }
        }
        
        // تنظيف الحالة العامة
        this.isDrawing = false;
        this.drawingPoints = [];
        this.tempShape = null;
        this.tempShapes = null;
        this.ui.hideDynamicInput();
        this.updateStatus('READY');
    }
    
    cancelCurrentOperation() {
        // إلغاء الأوضاع الخاصة
        this.pickingPointMode = null;
        this.selectingPathMode = false;
        this.distanceAnalysisCallback = null;
        this.distanceAnalysisStep = 0;
        this.polarArrayCenter = null;
        this.pathArrayPath = null;
        this.polarArrayOptions = null;
        this.pathArrayOptions = null;
        
        // أخبر ToolsManager
        if (this.toolsManager) {
            this.toolsManager.deactivateCurrentTool();
        }
        
        // تنظيف
        this.finishDrawing();
        this.isPanning = false;
        this.isSelecting = false;
        this.isZoomWindow = false;
        
        // إخفاء UI elements
        this.ui.hideSelectionBox();
        this.ui.hideZoomWindow();
        this.ui.hideToolPanel();
        this.ui.hideDynamicInput();
        
        this.updateStatus('READY');
        this.render();
    }
    
    addShape(shape) {
        this.shapes.push(shape);
        this.recordState();
        this.updateUI();
        this.render();
    }
    
    cloneShape(shape) {
        return JSON.parse(JSON.stringify(shape));
    }
    
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    generateId() {
        return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    //  Helper methods للوحدات
    /**
     * تحويل من وحدات المستخدم للوحدات الداخلية
     * @param {number} value - القيمة في وحدات المستخدم
     * @param {string} [unit] - الوحدة (اختياري، يستخدم الوحدة الحالية إذا لم تُحدد)
     * @returns {number} القيمة في الوحدات الداخلية (mm)
     */
    toInternalUnits(value, unit = null) {
        const fromUnit = unit || this.currentUnit;
        return this.units.toInternal(value, fromUnit);
    }

    /**
     * تحويل من الوحدات الداخلية لوحدات المستخدم
     * @param {number} value - القيمة في الوحدات الداخلية (mm)
     * @param {string} [unit] - الوحدة المستهدفة (اختياري، يستخدم الوحدة الحالية إذا لم تُحدد)
     * @returns {number} القيمة في وحدات المستخدم
     */
    toUserUnits(value, unit = null) {
        const toUnit = unit || this.currentUnit;
        return this.units.fromInternal(value, toUnit);
    }

    /**
     * عرض قيمة منسقة بالوحدة الحالية
     * @param {number} value - القيمة في الوحدات الداخلية (mm)
     * @param {number} [precision] - عدد المنازل العشرية (اختياري)
     * @returns {string} القيمة المنسقة مع الوحدة
     */
    formatValue(value, precision = null) {
        const userValue = this.toUserUnits(value);
        return this.units.format(userValue, this.currentUnit, precision);
    }

    /**
     * تحليل مدخلات المستخدم التي قد تحتوي على وحدات
     * @param {string} input - مدخلات المستخدم
     * @returns {number|null} القيمة في الوحدات الداخلية أو null
     */
    parseUserInput(input) {
        const parsed = this.units.parseInput(input);
        
        if (parsed) {
            if (parsed.unit) {
                // المستخدم حدد وحدة
                return this.units.toInternal(parsed.value, parsed.unit);
            } else {
                // لم يحدد وحدة، استخدم الوحدة الحالية
                return this.toInternalUnits(parsed.value);
            }
        }
        
        return null;
    }

    /**
     * تغيير وحدة القياس الحالية
     * @param {string} newUnit - الوحدة الجديدة
     */
    changeUnits(newUnit) {
        if (this.units.isValidUnit(newUnit)) {
            this.currentUnit = newUnit;
            
            // تحديث قيمة grid size بناءً على الوحدة
            this.updateGridSizeForUnit();
            
            this.updateUI();
            this.render();
            this.updateStatus(`Units changed to ${this.units.getUnitInfo(newUnit).symbol}`);
        } else {
            this.updateStatus(`Invalid unit: ${newUnit}`);
        }
    }

    /**
     * تحديث حجم الشبكة بناءً على الوحدة الحالية
     */
    updateGridSizeForUnit() {
        // اضبط حجم الشبكة الافتراضي بناءً على الوحدة
        const gridSizes = {
            'nm': 100,      // 100 nanometers
            'um': 100,      // 100 micrometers  
            'mm': 10,       // 10 millimeters
            'cm': 1,        // 1 centimeter
            'm': 0.1,       // 0.1 meter
            'in': 1,        // 1 inch
            'ft': 0.1,      // 0.1 foot
            'mil': 100      // 100 mils
        };
        
        const defaultSize = gridSizes[this.currentUnit] || 10;
        this.gridSize = this.toInternalUnits(defaultSize);
    }
    
    // Animation loop
    startRenderLoop() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const animate = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                document.getElementById('fps').textContent = `${frameCount} FPS`;
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    // ==================== دوال مساعدة جديدة ====================
    
    /**
     * دالة للحصول على معلومات الأداة الحالية
     */
    getCurrentToolInfo() {
        if (this.toolsManager) {
            return this.toolsManager.getCurrentToolInfo();
        }
        return null;
    }
    
    /**
     * دالة لتحديث حالة الرسم من الأداة
     */
    updateDrawingState(state) {
        if (state.isDrawing !== undefined) {
            this.isDrawing = state.isDrawing;
        }
        if (state.drawingPoints) {
            this.drawingPoints = state.drawingPoints;
        }
        if (state.tempShape !== undefined) {
            this.tempShape = state.tempShape;
        }
        if (state.tempShapes !== undefined) {
            this.tempShapes = state.tempShapes;
        }
    }
    
    /**
     * التحقق من جاهزية النظام
     */
    isToolSystemReady() {
        return this.toolsManager && 
               this.toolsManager.isReady && 
               this.ready;
    }
    
    // ==================== الأدوات المدمجة التي لم تُنقل بعد ====================
    
    // Dimension handling
    handleDimension(point) {
        const dimType = this.currentTool;
        
        switch (dimType) {
            case 'dimension': // Linear dimension
                this.drawLinearDimension(point);
                break;
            case 'dimension-angular':
                this.drawAngularDimension(point);
                break;
            case 'dimension-radius':
                this.drawRadiusDimension(point);
                break;
            case 'dimension-diameter':
                this.drawDiameterDimension(point);
                break;
        }
    }
    
    drawLinearDimension(point) {
        if (!this.isDrawing) {
            this.isDrawing = true;
            this.drawingPoints = [point];
            this.updateStatus('Specify second point');
        } else if (this.drawingPoints.length === 1) {
            this.drawingPoints.push(point);
            this.updateStatus('Specify dimension line position');
        } else {
            const p1 = this.drawingPoints[0];
            const p2 = this.drawingPoints[1];
            const distance = this.distance(p1.x, p1.y, p2.x, p2.y);
            
            // Calculate dimension line position
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const perpAngle = angle + Math.PI / 2;
            
            // Determine offset from points to dimension line
            const offsetDist = this.distance(
                (p1.x + p2.x) / 2,
                (p1.y + p2.y) / 2,
                point.x,
                point.y
            );
            
            const offsetX = Math.cos(perpAngle) * offsetDist;
            const offsetY = Math.sin(perpAngle) * offsetDist;
            
            // Check which side of the line the point is on
            const cross = (point.x - p1.x) * (p2.y - p1.y) - (point.y - p1.y) * (p2.x - p1.x);
            const side = cross > 0 ? 1 : -1;
            
            const dimension = {
                type: 'dimension-linear',
                start: p1,
                end: p2,
                offset: offsetDist * side,
                text: this.formatValue(distance),
                color: this.currentColor,
                layerId: this.currentLayerId,
                id: this.generateId()
            };
            
            this.addShape(dimension);
            this.finishDrawing();
        }
    }
    
    drawAngularDimension(point) {
        if (!this.isDrawing) {
            this.isDrawing = true;
            this.drawingPoints = [point];
            this.updateStatus('Specify second line start point');
        } else if (this.drawingPoints.length === 1) {
            this.drawingPoints.push(point);
            this.updateStatus('Specify second line end point');
        } else if (this.drawingPoints.length === 2) {
            this.drawingPoints.push(point);
            this.updateStatus('Specify dimension arc position');
        } else {
            // Calculate angle between two lines
            const center = this.drawingPoints[0];
            const p1 = this.drawingPoints[1];
            const p2 = this.drawingPoints[2];
            
            const angle1 = Math.atan2(p1.y - center.y, p1.x - center.x);
            const angle2 = Math.atan2(p2.y - center.y, p2.x - center.x);
            
            let angleDiff = angle2 - angle1;
            if (angleDiff < 0) angleDiff += 2 * Math.PI;
            
            const angleDegrees = angleDiff * 180 / Math.PI;
            
            const dimension = {
                type: 'dimension-angular',
                center: center,
                startAngle: angle1,
                endAngle: angle2,
                radius: this.distance(center.x, center.y, point.x, point.y),
                text: angleDegrees.toFixed(1) + '°',
                color: this.currentColor,
                layerId: this.currentLayerId,
                id: this.generateId()
            };
            
            this.addShape(dimension);
            this.finishDrawing();
        }
    }
    
    drawRadiusDimension(point) {
        const world = this.screenToWorld(this.mouseX, this.mouseY);
        const shape = this.getShapeAt(world.x, world.y);
        
        if (shape && (shape.type === 'circle' || shape.type === 'arc')) {
            const dimension = {
                type: 'dimension-radius',
                center: shape.center,
                endPoint: point,
                radius: shape.radius,
                text: 'R' + this.formatValue(shape.radius),
                color: this.currentColor,
                layerId: this.currentLayerId,
                id: this.generateId()
            };
            
            this.addShape(dimension);
            this.updateStatus('Radius dimension added');
        } else {
            this.updateStatus('Select a circle or arc');
        }
    }
    
    drawDiameterDimension(point) {
        const world = this.screenToWorld(this.mouseX, this.mouseY);
        const shape = this.getShapeAt(world.x, world.y);
        
        if (shape && shape.type === 'circle') {
            const angle = Math.atan2(point.y - shape.center.y, point.x - shape.center.x);
            
            const dimension = {
                type: 'dimension-diameter',
                center: shape.center,
                angle: angle,
                radius: shape.radius,
                text: 'Ø' + this.formatValue(shape.radius * 2),
                color: this.currentColor,
                layerId: this.currentLayerId,
                id: this.generateId()
            };
            
            this.addShape(dimension);
            this.updateStatus('Diameter dimension added');
        } else {
            this.updateStatus('Select a circle');
        }
    }
    
    // Utility function to delete a shape
    deleteShape(shape) {
        const index = this.shapes.indexOf(shape);
        if (index !== -1) {
            this.shapes.splice(index, 1);
        }
        this.selectedShapes.delete(shape);
    }
    
    // ==================== دوال الأدوات المتقدمة الجديدة ====================

    /**
     * تطبيق Fillet مع الخيارات من الواجهة
     * @param {Object} options - خيارات Fillet
     */
    async applyFilletWithOptions(options) {
        const geo = await this.loadAdvancedGeometry();
        if (!geo) {
            this.updateStatus('Advanced geometry not available');
            return;
        }
        
        const selected = Array.from(this.selectedShapes);
        
        // إذا كان polyline mode مفعل
        if (options.polyline && selected.length === 1 && selected[0].type === 'polyline') {
            try {
                this.recordState();
                const result = await geo.filletPolygon(selected[0], options.radius);
                
                // استبدل الشكل الأصلي بالنتيجة
                const index = this.shapes.indexOf(selected[0]);
                if (index !== -1 && result) {
                    this.shapes[index] = result;
                }
                
                this.render();
                this.ui.showSuccess('Fillet applied to polyline');
            } catch (error) {
                this.ui.showError('Fillet failed: ' + error.message);
            }
        } 
        // وضع multiple mode
        else if (options.multiple) {
            this.currentTool = 'fillet';
            this.filletOptions = options;
            this.updateStatus('Select shapes for fillet (ESC to finish)');
        }
        // الوضع العادي
        else if (selected.length >= 2) {
            try {
                this.recordState();
                
                for (let i = 0; i < selected.length - 1; i++) {
                    const result = await geo.fillet(selected[i], selected[i + 1], options.radius);
                    if (result.success) {
                        // أضف الأشكال الجديدة
                        result.shapes.forEach(s => {
                            s.color = this.currentColor;
                            s.lineWidth = this.currentLineWidth;
                            s.lineType = this.currentLineType;
                            s.layerId = this.currentLayerId;
                            s.id = this.generateId();
                            this.shapes.push(s);
                        });
                        
                        // احذف الأشكال الأصلية إذا كان trim مفعل
                        if (options.trim) {
                            this.deleteShape(selected[i]);
                            this.deleteShape(selected[i + 1]);
                        }
                    }
                }
                
                this.selectedShapes.clear();
                this.render();
                this.ui.showSuccess('Fillet applied successfully');
            } catch (error) {
                this.ui.showError('Fillet failed: ' + error.message);
            }
        } else {
            this.ui.showError('Select at least 2 shapes for fillet');
        }
    }

    /**
     * تطبيق Chamfer مع الخيارات من الواجهة
     * @param {Object} options - خيارات Chamfer
     */
    async applyChamferWithOptions(options) {
        const geo = await this.loadAdvancedGeometry();
        if (!geo) {
            this.updateStatus('Advanced geometry not available');
            return;
        }
        
        const selected = Array.from(this.selectedShapes);
        
        if (selected.length >= 2) {
            try {
                this.recordState();
                
                const distance1 = options.distance1;
                const distance2 = options.method === 'distance' ? options.distance2 : options.distance1;
                
                for (let i = 0; i < selected.length - 1; i++) {
                    const result = await geo.chamfer(selected[i], selected[i + 1], distance1, distance2);
                    if (result.success) {
                        // أضف الأشكال الجديدة
                        result.shapes.forEach(s => {
                            s.color = this.currentColor;
                            s.lineWidth = this.currentLineWidth;
                            s.lineType = this.currentLineType;
                            s.layerId = this.currentLayerId;
                            s.id = this.generateId();
                            this.shapes.push(s);
                        });
                        
                        // احذف الأشكال الأصلية
                        this.deleteShape(selected[i]);
                        this.deleteShape(selected[i + 1]);
                    }
                }
                
                this.selectedShapes.clear();
                this.render();
                this.ui.showSuccess('Chamfer applied successfully');
            } catch (error) {
                this.ui.showError('Chamfer failed: ' + error.message);
            }
        } else {
            this.ui.showError('Select at least 2 shapes for chamfer');
        }
    }

    /**
     * تطبيق Rectangular Array مع الخيارات
     * @param {Object} options - خيارات المصفوفة
     */
    async applyRectangularArrayWithOptions(options) {
        const geo = await this.loadAdvancedGeometry();
        if (!geo) {
            this.updateStatus('Advanced geometry not available');
            return;
        }
        
        const selected = Array.from(this.selectedShapes);
        if (selected.length === 0) {
            this.ui.showError('Select objects to array');
            return;
        }
        
        try {
            this.recordState();
            
            const arrayOptions = {
                rows: options.rows,
                columns: options.cols,
                rowSpacing: this.toInternalUnits(options.rowSpacing),
                columnSpacing: this.toInternalUnits(options.colSpacing)
            };
            
            const result = geo.rectangularArray(selected, arrayOptions);
            
            result.forEach(shape => {
                shape.id = this.generateId();
                this.shapes.push(shape);
            });
            
            this.render();
            this.ui.showSuccess(`Created ${result.length} copies in rectangular array`);
        } catch (error) {
            this.ui.showError('Array failed: ' + error.message);
        }
    }

    /**
     * تطبيق Polar Array مع الخيارات
     * @param {Object} options - خيارات المصفوفة القطبية
     */
    async applyPolarArrayWithOptions(options) {
        const geo = await this.loadAdvancedGeometry();
        if (!geo) {
            this.updateStatus('Advanced geometry not available');
            return;
        }
        
        const selected = Array.from(this.selectedShapes);
        if (selected.length === 0) {
            this.ui.showError('Select objects to array');
            return;
        }
        
        // إذا لم يتم تحديد مركز، ابدأ وضع اختيار المركز
        if (!this.polarArrayCenter) {
            this.polarArrayOptions = options;
            this.startPickingPoint('polar-center');
            return;
        }
        
        try {
            this.recordState();
            
            const arrayOptions = {
                center: this.polarArrayCenter,
                count: options.count,
                angle: options.angle * Math.PI / 180,  // تحويل لراديان
                rotateItems: options.rotate
            };
            
            const result = geo.polarArray(selected, arrayOptions);
            
            result.forEach(shape => {
                shape.id = this.generateId();
                this.shapes.push(shape);
            });
            
            this.render();
            this.ui.showSuccess(`Created ${result.length} copies in polar array`);
            
            // إعادة تعيين المركز
            this.polarArrayCenter = null;
        } catch (error) {
            this.ui.showError('Array failed: ' + error.message);
        }
    }

    /**
     * تطبيق Path Array مع الخيارات
     * @param {Object} options - خيارات مصفوفة المسار
     */
    async applyPathArrayWithOptions(options) {
        const geo = await this.loadAdvancedGeometry();
        if (!geo) {
            this.updateStatus('Advanced geometry not available');
            return;
        }
        
        const selected = Array.from(this.selectedShapes);
        if (selected.length === 0) {
            this.ui.showError('Select objects to array');
            return;
        }
        
        if (!this.pathArrayPath) {
            this.pathArrayOptions = options;
            this.startSelectingPath();
            return;
        }
        
        try {
            this.recordState();
            
            const arrayOptions = {
                count: options.method === 'divide' ? options.count : undefined,
                spacing: options.method === 'measure' ? this.toInternalUnits(options.spacing) : undefined,
                alignToPath: options.align
            };
            
            const result = geo.pathArray(selected, this.pathArrayPath, arrayOptions);
            
            result.forEach(shape => {
                shape.id = this.generateId();
                this.shapes.push(shape);
            });
            
            this.render();
            this.ui.showSuccess(`Created ${result.length} copies along path`);
            
            // إعادة تعيين المسار
            this.pathArrayPath = null;
        } catch (error) {
            this.ui.showError('Array failed: ' + error.message);
        }
    }

    /**
     * بدء وضع اختيار نقطة
     * @param {string} purpose - الغرض من اختيار النقطة
     */
    startPickingPoint(purpose) {
        this.pickingPointMode = purpose;
        this.ui.hideToolPanel();
        
        switch (purpose) {
            case 'polar-center':
                this.updateStatus('Click to specify center point for polar array');
                break;
            default:
                this.updateStatus('Click to pick a point');
        }
        
        // تغيير مؤشر الماوس
        this.canvas.style.cursor = 'crosshair';
    }

    /**
     * بدء وضع اختيار مسار
     */
    startSelectingPath() {
        this.selectingPathMode = true;
        this.ui.hideToolPanel();
        this.updateStatus('Select a path (polyline, arc, or circle)');
        this.canvas.style.cursor = 'pointer';
    }

    /**
     * بدء تحليل المسافة
     * @param {Function} callback - دالة callback للنتائج
     */
    startDistanceAnalysis(callback) {
        this.distanceAnalysisCallback = callback;
        this.distanceAnalysisStep = 0;
        this.selectedShapes.clear();
        this.updateStatus('Select first shape for distance measurement');
    }

    /**
     * تحويل الأشكال المحددة إلى polyline
     * @param {number} segments - عدد القطع
     */
    async convertToPolyline(segments = 32) {
        const geo = await this.loadAdvancedGeometry();
        if (!geo) {
            this.updateStatus('Advanced geometry not available');
            return;
        }
        
        const selected = Array.from(this.selectedShapes);
        if (selected.length === 0) {
            this.ui.showError('Select shapes to convert');
            return;
        }
        
        try {
            this.recordState();
            let converted = 0;
            
            for (const shape of selected) {
                if (shape.type === 'circle' || shape.type === 'arc' || shape.type === 'ellipse') {
                    const polyline = geo.curveToPolyline(shape, { segments });
                    polyline.color = shape.color;
                    polyline.lineWidth = shape.lineWidth;
                    polyline.lineType = shape.lineType;
                    polyline.layerId = shape.layerId;
                    polyline.id = this.generateId();
                    
                    this.shapes.push(polyline);
                    this.deleteShape(shape);
                    converted++;
                }
            }
            
            this.selectedShapes.clear();
            this.render();
            this.ui.showSuccess(`Converted ${converted} shapes to polylines`);
        } catch (error) {
            this.ui.showError('Conversion failed: ' + error.message);
        }
    }

    /**
     * تبسيط polylines المحددة
     * @param {number} tolerance - درجة التبسيط
     */
    async simplifyPolyline(tolerance) {
        const geo = await this.loadAdvancedGeometry();
        if (!geo) {
            this.updateStatus('Advanced geometry not available');
            return;
        }
        
        const selected = Array.from(this.selectedShapes);
        const polylines = selected.filter(s => s.type === 'polyline');
        
        if (polylines.length === 0) {
            this.ui.showError('Select polylines to simplify');
            return;
        }
        
        try {
            this.recordState();
            
            for (const polyline of polylines) {
                const simplified = geo.simplifyPolyline(polyline, {
                    tolerance: this.toInternalUnits(tolerance)
                });
                
                polyline.points = simplified.points;
            }
            
            this.render();
            this.ui.showSuccess(`Simplified ${polylines.length} polylines`);
        } catch (error) {
            this.ui.showError('Simplification failed: ' + error.message);
        }
    }

    /**
     * تنعيم polylines المحددة
     * @param {number} iterations - عدد التكرارات
     */
    async smoothPolyline(iterations) {
        const geo = await this.loadAdvancedGeometry();
        if (!geo) {
            this.updateStatus('Advanced geometry not available');
            return;
        }
        
        const selected = Array.from(this.selectedShapes);
        const polylines = selected.filter(s => s.type === 'polyline');
        
        if (polylines.length === 0) {
            this.ui.showError('Select polylines to smooth');
            return;
        }
        
        try {
            this.recordState();
            
            for (const polyline of polylines) {
                const smoothed = geo.smoothPolyline(polyline, {
                    iterations: iterations,
                    factor: 0.5
                });
                
                polyline.points = smoothed.points;
            }
            
            this.render();
            this.ui.showSuccess(`Smoothed ${polylines.length} polylines`);
        } catch (error) {
            this.ui.showError('Smoothing failed: ' + error.message);
        }
    }
}

// تصدير الـ class للاستخدام العام
window.TyrexCAD = TyrexCAD;