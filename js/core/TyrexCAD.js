// TyrexCAD - النواة الأساسية لنظام CAD
// يعتمد على: Geometry.js, GeometryAdvanced.js, Tools.js, UI.js

// TyrexCAD Professional v3.0 - Enhanced Implementation with Advanced Geometry

class TyrexCAD {
    constructor() {

      console.log('📐 Creating TyrexCAD instance...');
    
        // تأكد من وجود المتطلبات
        if (!window.THREE) {
            throw new Error('THREE.js not loaded');
        }
        if (!window.Geometry) {
            throw new Error('Geometry not loaded');
        }
        if (!window.UI) {
            throw new Error('UI not loaded');
        }
        // Geometry library reference
        this.geo = window.Geometry;
        
        // Advanced Geometry library (loaded on demand)
        this.geometryAdvanced = null;
        
        // Tools Manager reference
        this.toolsManager = null;
        
        // Layer Management System
        this.layerManager = null; // سيتم تهيئته بعد تحميل LayerManager
        
        // Linetype Management System
        this.linetypeManager = null; // سيتم تهيئته بعد تحميل LinetypeManager
        
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
        this.selectionStart = null;
        this.selectionEnd = null;
        
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
        this.currentLineType = 'continuous'; // محدث من 'solid' إلى 'continuous'
        this.currentLineWeight = 0.25; // وزن الخط بالمليمتر
        
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
        
        // Selection enhancements - محدثة
        this.defaultTool = 'select'; // الأداة الافتراضية
        this.lastTool = null; // آخر أداة مستخدمة
        this.lastCommand = null; // آخر أمر مستخدم
        this.selectionMode = 'window'; // 'window' or 'crossing'
        this.selectionDirection = null; // 'ltr' or 'rtl'
        this.selectionClickMode = true; // الوضع الجديد: نقرتين للتحديد
        this.selectionFirstClick = false; // تتبع النقرة الأولى
        this.cumulativeSelection = true; // التحديد التراكمي افتراضياً
        this.selectionStartPoint = null; // نقطة البداية للتحديد
        
        // Preview state
        this.previewShapes = new Set(); // الأشكال في Preview
        this.lastPreviewUpdate = 0; // لتحسين الأداء
        
        // Performance
        this.fastRenderMode = false;
        
        // Selection colors
        this.selectionColor = '#0099ff'; // أزرق مثل AutoCAD
        this.crossingBoxColor = '#00ff00'; // أخضر للـ crossing
        this.windowBoxColor = '#0099ff'; // أزرق للـ window
        this.previewColor = '#00d4aa'; // لون المعاينة
        
        // Hover state
        this.hoveredShape = null;
        
        // Grips system
        this.gripsController = null;
        this.gripsVisible = true;
        this.lastClickTime = 0; // لدعم double-click
        
        // Mouse and keyboard state
        this.mouseDown = false;
        this.clickCount = 0;
        this.clickTimer = null;
        this.keys = {
            shift: false,
            ctrl: false,
            alt: false
        };
        
        // Transform states
        this.moveBasePoint = null;
        this.moveTargetPoint = null;
        this.rotateBasePoint = null;
        this.scaleBasePoint = null;
        this.mirrorFirstPoint = null;
        this.mirrorSecondPoint = null;
        this.distanceFirstPoint = null;
        this.distanceSecondPoint = null;
        this.isRotating = false;
        this.isScaling = false;
        
        this.init();
    }

    async init() {
        try {
            // لا تحاول استيراد Tools - سيتم تعيينه من app.js
            // this.toolsManager سيتم تعيينه من الخارج
            
            // Initialize UI
            this.ui.init();
            
            // تهيئة Canvas والأحداث
            this.resizeCanvas();
            this.setupEventListeners();
            
            // تهيئة نظام الطبقات
            if (window.LayerManager) {
                this.layerManager = new LayerManager(this);
                console.log('✅ Layer Manager initialized');
            } else {
                console.warn('⚠️ LayerManager not loaded, using basic layer system');
                this.initializeLayers(); // النظام القديم كـ fallback
            }
            
            // تهيئة نظام أنواع الخطوط
            if (window.LinetypeManager) {
                this.linetypeManager = new LinetypeManager(this);
                console.log('✅ Linetype Manager initialized');
                
                // تحديث UI
                if (this.ui) {
                    this.ui.initializeLinetypeSystem();
                }
            } else {
                console.warn('⚠️ LinetypeManager not loaded');
            }
            
            this.init3D();
            
            // Initialize units
            this.changeUnits('mm');
            
            // تهيئة GeometryAdvanced (بدون async)
            if (window.GeometryAdvanced) {
                this.geometryAdvanced = new GeometryAdvanced();
                if (this.geometryAdvanced.init) {
                    this.geometryAdvanced.init(this);
                }
            }
            
            this.updateUI();
            this.startRenderLoop();
            
            // تهيئة نظام Grips
            this.gripsController = new GripsController(this);
            console.log('✅ Grips controller initialized');
            
            // Hide loading screen
            setTimeout(() => {
                this.ui.hideLoadingScreen();
            }, 1000);
            
            this.recordState();
            this.ready = true;
            
            // تعيين الأداة الافتراضية بدون recursion
            setTimeout(() => {
                this.currentTool = 'select';
                document.getElementById('statusTool').textContent = 'SELECT';
                if (this.toolsManager) {
                    this.toolsManager.activateTool('select');
                }
            }, 100);
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }
    
    // Advanced Geometry Loader
    loadAdvancedGeometry() {
        // إذا كان محملاً بالفعل، أرجعه
        if (this.geometryAdvanced) return this.geometryAdvanced;
        
        try {
            // تحقق من وجود GeometryAdvanced
            if (!window.GeometryAdvanced) {
                throw new Error('GeometryAdvanced module not loaded');
            }
            
            // إنشاء instance جديد
            this.geometryAdvanced = new GeometryAdvanced();
            
            // تهيئة مع مرجع CAD (بدون await)
            if (typeof this.geometryAdvanced.init === 'function') {
                this.geometryAdvanced.init(this);
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
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.mode === '2D') this.onContextMenu(e);
        });
        this.canvas.addEventListener('mouseleave', (e) => {
            if (this.mode === '2D') this.onMouseLeave(e);
        });
        this.canvas.addEventListener('dblclick', (e) => {
            if (this.mode === '2D') this.onDoubleClick(e);
        });
        
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
    const items = [];
    
    if (this.selectedShapes.size > 0) {
        // قائمة للأشكال المحددة
        items.push(
            { icon: 'fas fa-copy', label: 'Copy', action: () => this.copySelected() },
            { icon: 'fas fa-cut', label: 'Cut', action: () => this.cutSelected() },
            { icon: 'fas fa-paste', label: 'Paste', action: () => this.pasteClipboard() },
            { icon: 'fas fa-trash', label: 'Delete', action: () => this.deleteSelected() },
            { separator: true },
            { icon: 'fas fa-clone', label: 'Duplicate', action: () => { this.copySelected(); this.pasteClipboard(); } },
            { icon: 'fas fa-arrows-alt', label: 'Move', action: () => this.setTool('move') },
            { icon: 'fas fa-sync-alt', label: 'Rotate', action: () => this.setTool('rotate') },
            { icon: 'fas fa-expand-arrows-alt', label: 'Scale', action: () => this.setTool('scale') },
            { separator: true },
            { icon: 'fas fa-info-circle', label: 'Properties', action: () => this.showProperties() }
        );
    } else {
        // قائمة عامة
        items.push(
            { icon: 'fas fa-mouse-pointer', label: 'Select All', action: () => this.selectAll() },
            { separator: true },
            { icon: 'fas fa-undo', label: 'Undo', action: () => this.undo() },
            { icon: 'fas fa-redo', label: 'Redo', action: () => this.redo() },
            { separator: true },
            { icon: 'fas fa-search-plus', label: 'Zoom In', action: () => this.zoomIn() },
            { icon: 'fas fa-search-minus', label: 'Zoom Out', action: () => this.zoomOut() },
            { icon: 'fas fa-expand', label: 'Zoom Extents', action: () => this.zoomExtents() }
        );
    }
    
    // استدعاء UI.showContextMenu بالترتيب الصحيح: x, y, items
    this.ui.showContextMenu(x, y, items);
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
        
        this.mouseDown = true;
        
        if (e.button === 0) { // Left click
            if (this.currentTool === 'pan') {
                this.startPanning(x, y);
            } else if (this.currentTool === 'select') {
                // في أداة select - السلوك الجديد
                if (e.shiftKey && !this.isSelecting) {
                    this.startPanning(x, y);
                } else {
                    this.handleSelection(x, y, e.ctrlKey);
                }
            } else {
                // في الأدوات الأخرى
                if (e.shiftKey) {
                    this.startPanning(x, y);
                } else {
                    this.handleDrawing(x, y);
                }
            }
        } else if (e.button === 1) { // Middle click
            this.startPanning(x, y);
        } else if (e.button === 2) { // Right click
            if (this.isDrawing && this.currentTool === 'polyline') {
                this.delegateToTool('finishPolyline');
            } else if (this.isSelecting) {
                // إلغاء selection box بالنقر الأيمن
                this.cancelSelection();
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
        
        // معالجة Grips في وضع التحديد
        if (this.currentTool === 'select' && this.gripsController && !this.isSelecting && !this.isPanning) {
            if (this.gripsController.draggedGrip) {
                // تحديث السحب
                this.gripsController.updateDrag(world);
            } else if (this.selectedShapes.size > 0) {
                // تحديث hover فقط إذا كان هناك أشكال محددة
                this.gripsController.updateHover(world, this.selectedShapes);
                
                // تحديث المؤشر بناءً على الحالة
                if (this.gripsController.hoveredGrip) {
                    this.canvas.style.cursor = 'move';
                } else {
                    // لا يوجد grip - تحقق من الشكل
                    const shape = this.getShapeAt(world.x, world.y);
                    this.canvas.style.cursor = shape ? 'pointer' : 'default';
                }
            } else {
                // لا توجد أشكال محددة - عرض pointer للأشكال
                const shape = this.getShapeAt(world.x, world.y);
                this.canvas.style.cursor = shape ? 'pointer' : 'default';
            }
        }
        
        // باقي معالجة الأحداث...
        if (this.isPanning) {
            this.updatePanning();
        } else if (this.isSelecting) {
            // تحديث selection box
            this.updateSelection();
        } else if (this.toolsManager && this.toolsManager.activeTool) {
            // دع ToolsManager يتعامل مع حركة الماوس
            const snapPoint = this.getSnapPoint(world.x, world.y);
            this.toolsManager.handleMouseMove(snapPoint);
        }
        
        // تتبع الشكل تحت الماوس (للـ hover effect)
        if (this.currentTool === 'select' && !this.isSelecting && !this.isPanning && !this.gripsController?.draggedGrip) {
            const newHoveredShape = this.getShapeAt(world.x, world.y);
            if (newHoveredShape !== this.hoveredShape) {
                this.hoveredShape = newHoveredShape;
                this.render();
            }
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
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const world = this.screenToWorld(x, y);
        
        // إنهاء سحب Grip إذا كان موجوداً
        if (this.gripsController && this.gripsController.draggedGrip) {
            this.gripsController.endDrag(world);
        }
        
        // لا ننهي selection box هنا - ننتظر النقرة الثانية
        
        this.isPanning = false;
        this.mouseDown = false;
        this.canvas.style.cursor = this.currentTool === 'pan' ? 'grab' : 'default';
        
        // إعادة الرسم بجودة كاملة
        this.fastRenderMode = false;
        this.render();
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
    
    onMouseLeave(e) {
        // تنظيف hover state
        if (this.hoveredShape) {
            this.hoveredShape = null;
            this.render();
        }
        
        // إخفاء crosshair
        this.ui.updateCrosshair(-100, -100);
        
        // إخفاء snap indicator
        this.ui.updateSnapIndicator(null, null);
    }
    
    // إضافة معالج للنقرة المزدوجة
    onDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const world = this.screenToWorld(x, y);
        
        // معالجة double-click على Grips
        if (this.currentTool === 'select' && this.gripsController && this.selectedShapes.size > 0) {
            if (this.gripsController.handleDoubleClick(world)) {
                return;
            }
        }
        
        // معالجة double-click العادية
        // ... باقي الكود ...
    }
    
    // إضافة معالج للنقرة اليمنى
    onContextMenu(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const world = this.screenToWorld(x, y);
        
        // معالجة النقرة اليمنى على Grips
        if (this.currentTool === 'select' && this.gripsController && this.selectedShapes.size > 0) {
            if (this.gripsController.handleRightClick(world, e)) {
                return;
            }
        }
        
        // القائمة السياقية العادية
        this.showContextMenu(e.clientX, e.clientY);
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
        if (e.target.tagName === 'INPUT') return;
        
        // تحديث حالة المفاتيح
        this.keys.shift = e.shiftKey;
        this.keys.ctrl = e.ctrlKey;
        this.keys.alt = e.altKey;
        
        // معالجة اختصارات grips
        if (this.currentTool === 'select' && this.handleGripKeyboard(e)) {
            e.preventDefault();
            return;
        }
        
        // معالجة الاختصارات العامة
        if (e.key === 'Escape') {
            e.preventDefault();
            if (this.isSelecting) {
                this.isSelecting = false;
                this.selectionFirstClick = false;
                const box = document.getElementById('selectionBox');
                if (box) box.style.display = 'none';
                this.previewShapes.clear();
                this.render();
            } else if (this.isDrawing) {
                this.cancelCurrentOperation();
            } else if (this.currentTool !== 'select') {
                this.setTool('select');
            }
        }
        
        switch (e.key) {
            case ' ': // Space bar - تكرار آخر أمر
                e.preventDefault();
                if (this.lastTool && this.currentTool === 'select') {
                    this.setTool(this.lastTool);
                } else if (this.lastCommand) {
                    this.executeCommand(this.lastCommand);
                }
                break;
                
            case 'Delete':
                if (this.selectedShapes.size > 0) {
                    this.deleteSelected();
                }
                break;
                
            case 'Enter':
                // دع ToolsManager يتعامل مع Enter
                if (this.toolsManager) {
                    this.toolsManager.handleKeyPress('Enter');
                }
                break;
                
            case 't':
                // T - تبديل وضع التحديد التراكمي
                if (!e.ctrlKey && !e.shiftKey) {
                    this.cumulativeSelection = !this.cumulativeSelection;
                    this.updateStatus(`Cumulative selection: ${this.cumulativeSelection ? 'ON' : 'OFF'}`);
                }
                break;
        }
        
        // اختصارات Ctrl
        if (e.ctrlKey) {
            switch(e.key.toLowerCase()) {
                case 'a':
                    e.preventDefault();
                    this.selectAll();
                    break;
                case 'z':
                    e.preventDefault();
                    this.undo();
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
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
        // تحديث حالة المفاتيح
        this.keys.shift = e.shiftKey;
        this.keys.ctrl = e.ctrlKey;
        this.keys.alt = e.altKey;
    }
    
    // إضافة اختصارات لوحة المفاتيح للـ Grips
    handleGripKeyboard(e) {
        if (!this.gripsController || !this.gripsController.hoveredGrip) return false;
        
        const grip = this.gripsController.hoveredGrip;
        
        switch(e.key) {
            case 'Delete':
                if (grip.type === 'vertex') {
                    this.gripsController.removeVertex(grip);
                    return true;
                }
                break;
                
            case 'a':
            case 'A':
                if (grip.type === 'edge') {
                    this.gripsController.addVertexAtEdge(grip, grip.point);
                    return true;
                }
                break;
                
            case 'c':
            case 'C':
                if (grip.type === 'edge') {
                    this.gripsController.convertEdgeToArc(grip);
                    return true;
                }
                break;
        }
        
        return false;
    }
    
    // Tool handling
    setTool(tool) {
        // تجنب الـ recursion
        if (this.currentTool === tool) return;
        
        // حفظ آخر أداة (ما عدا select)
        if (this.currentTool !== 'select' && tool !== 'select') {
            this.lastTool = this.currentTool;
        }
        
        // إلغاء العمليات الحالية بدون recursion
        this.cleanupCurrentOperation();
        
        // تغيير الأداة
        const previousTool = this.currentTool;
        this.currentTool = tool;
        
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
        
        // Update cursor
        this.updateCursorForTool(tool);
        
        // Update status
        document.getElementById('statusTool').textContent = tool.toUpperCase();
        this.updateStatus(`${tool.toUpperCase()} tool activated`);
        
        // تفعيل الأداة في ToolsManager إن وجد
        if (this.toolsManager) {
            try {
                this.toolsManager.activateTool(tool);
            } catch (error) {
                console.warn('Tool activation error:', error);
                // في حالة الفشل، ارجع للأداة السابقة
                this.currentTool = previousTool;
                this.updateStatus('Tool not available');
            }
        }
        
        // Update UI if method exists
        if (this.ui && typeof this.ui.updateActiveTool === 'function') {
            this.ui.updateActiveTool(tool);
        }
    }
    
    // دالة جديدة للرجوع للأداة الافتراضية
    returnToDefaultTool() {
        this.setTool(this.defaultTool);
    }
    
    updateCursorForTool(tool) {
        // احصل على معلومات الأداة من ToolsManager
        if (this.toolsManager && this.toolsManager.activeTool) {
            this.canvas.style.cursor = this.toolsManager.activeTool.cursor || 'none';
        } else {
            this.canvas.style.cursor = tool === 'pan' ? 'grab' : 'none';
        }
    }
    
    // دالة تنظيف بدون تغيير الأداة
    cleanupCurrentOperation() {
        // إيقاف أي عملية رسم جارية
        this.isDrawing = false;
        this.drawingPoints = [];
        this.tempShape = null;
        this.tempShapes = null;
        
        // إيقاف picking modes
        this.pickingPointMode = null;
        this.selectingPathMode = false;
        this.distanceAnalysisCallback = null;
        this.distanceAnalysisStep = 0;
        this.polarArrayCenter = null;
        this.pathArrayPath = null;
        this.polarArrayOptions = null;
        this.pathArrayOptions = null;
        
        // إيقاف selection
        this.isSelecting = false;
        this.selectionFirstClick = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectionStartPoint = null;
        this.selectionDirection = null;
        this.hoveredShape = null;
        
        // تنظيف UI
        if (this.ui) {
            this.ui.hideSelectionBox();
            this.ui.hideZoomWindow();
            this.ui.hideToolPanel();
            this.ui.hideDynamicInput();
        }
        
        // إخفاء selection box
        const box = document.getElementById('selectionBox');
        if (box) box.style.display = 'none';
        
        // إيقاف الحركة
        this.isPanning = false;
        this.isZoomWindow = false;
        
        this.updateStatus('READY');
    }
    
    handleDrawing(x, y) {
        const world = this.screenToWorld(x, y);
        const snapPoint = this.getSnapPoint(world.x, world.y);
        
        // معالجة الحالات الخاصة (picking points, etc.)
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
                    
                case 'move-base':
                    this.moveBasePoint = snapPoint;
                    this.pickingPointMode = 'move-target';
                    this.updateStatus('MOVE: Specify second point');
                    break;
                    
                case 'move-target':
                    this.moveTargetPoint = snapPoint;
                    this.pickingPointMode = null;
                    this.applyMove();
                    break;
                    
                case 'rotate-base':
                    this.rotateBasePoint = snapPoint;
                    this.pickingPointMode = null;
                    this.startRotation();
                    break;
                    
                case 'scale-base':
                    this.scaleBasePoint = snapPoint;
                    this.pickingPointMode = null;
                    this.startScaling();
                    break;
                    
                case 'mirror-first':
                    this.mirrorFirstPoint = snapPoint;
                    this.pickingPointMode = 'mirror-second';
                    this.updateStatus('MIRROR: Specify second point of mirror line');
                    break;
                    
                case 'mirror-second':
                    this.mirrorSecondPoint = snapPoint;
                    this.pickingPointMode = null;
                    this.applyMirror();
                    break;
                    
                case 'distance-first':
                    this.distanceFirstPoint = snapPoint;
                    this.pickingPointMode = 'distance-second';
                    this.updateStatus('DISTANCE: Specify second point');
                    break;
                    
                case 'distance-second':
                    this.distanceSecondPoint = snapPoint;
                    this.pickingPointMode = null;
                    this.showDistance();
                    break;
                    
                case 'area-pick':
                    this.handleAreaPick(snapPoint);
                    break;
                    
                case 'matchLayer':
                    if (this.pickingPointCallback) {
                        this.pickingPointCallback(snapPoint);
                    }
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
        
        // معالجة رسم الأشكال العادية - استخدم handleClick
        if (this.toolsManager && this.toolsManager.activeTool) {
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
    
    /**
     * تحريك شكل
     * @param {Object} shape - الشكل المراد تحريكه
     * @param {number} dx - الإزاحة الأفقية
     * @param {number} dy - الإزاحة الرأسية
     */
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
        }
    }
    
    /**
     * تدوير شكل حول نقطة
     * @param {Object} shape - الشكل المراد تدويره
     * @param {Object} center - مركز الدوران
     * @param {number} angle - زاوية الدوران بالراديان
     */
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
                const tempStart = rotatePoint(shape.start);
                const tempEnd = rotatePoint(shape.end);
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
                shape.rotation = (shape.rotation || 0) + angle;
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
    
    // Selection - محدثة لدعم Grips والسلوك الجديد
    handleSelection(x, y, ctrlKey) {
        const world = this.screenToWorld(x, y);
        
        // معالجة سحب Grip أولاً
        if (this.gripsController && this.selectedShapes.size > 0) {
            const grip = this.gripsController.findGripAt(world, this.selectedShapes);
            
            if (grip) {
                this.gripsController.startDrag(grip, world);
                return;
            }
        }
        
        // التحقق من الأشكال
        const shape = this.getShapeAt(world.x, world.y);
        
        if (shape) {
            // نقرة على شكل
            if (this.isSelecting && this.selectionFirstClick) {
                // إذا كنا في وضع التحديد، أنهي التحديد أولاً
                this.finishSelection();
            }
            
            // معالجة تحديد الشكل
            if (this.cumulativeSelection || ctrlKey) {
                // التحديد التراكمي
                if (this.selectedShapes.has(shape)) {
                    this.selectedShapes.delete(shape);
                } else {
                    this.selectedShapes.add(shape);
                }
            } else {
                // استبدال التحديد
                if (!this.selectedShapes.has(shape)) {
                    this.selectedShapes.clear();
                    this.selectedShapes.add(shape);
                }
            }
            this.ui.updatePropertiesPanel();
            this.render();
        } else {
            // نقرة في الفراغ - بدء أو إنهاء selection box
            if (!this.selectionFirstClick) {
                // النقرة الأولى - بدء التحديد
                this.startSelectionBox(x, y, ctrlKey);
            } else {
                // النقرة الثانية - إنهاء التحديد
                this.finishSelection();
            }
        }
    }
    
    // دالة جديدة لبدء selection box
    startSelectionBox(x, y, ctrlKey) {
        // مسح التحديد السابق إذا لم يكن تراكمي
        if (!this.cumulativeSelection && !ctrlKey) {
            this.selectedShapes.clear();
        }
        
        // بدء صندوق التحديد
        this.isSelecting = true;
        this.selectionFirstClick = true;
        this.selectionStart = { x, y };
        this.selectionEnd = { x, y };
        this.selectionStartPoint = { x, y };
        this.selectionDirection = null;
        this.previewShapes.clear();
        
        // إظهار selection box
        const box = document.getElementById('selectionBox');
        if (box) {
            box.style.display = 'block';
            box.style.left = x + 'px';
            box.style.top = y + 'px';
            box.style.width = '0px';
            box.style.height = '0px';
        }
        
        this.updateStatus('Move to opposite corner and click');
        this.render();
    }
    
    updateSelection() {
        if (!this.isSelecting) return;
        
        const box = document.getElementById('selectionBox');
        
        // تحديث نقطة النهاية
        this.selectionEnd = { x: this.mouseX, y: this.mouseY };
        
        // حسابات الصندوق
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        // تحديد الاتجاه
        if (!this.selectionDirection && width > 5) {
            this.selectionDirection = this.selectionEnd.x > this.selectionStart.x ? 'ltr' : 'rtl';
            this.selectionMode = this.selectionDirection === 'ltr' ? 'window' : 'crossing';
        }
        
        // تحديث مظهر الصندوق
        box.style.left = x + 'px';
        box.style.top = y + 'px';
        box.style.width = width + 'px';
        box.style.height = height + 'px';
        
        // تحديث الألوان وحجم الخط بناءً على الزووم
        const lineWidth = Math.max(1, 2 / Math.sqrt(this.zoom));
        
        if (this.selectionMode === 'crossing') {
            box.style.borderColor = this.crossingBoxColor;
            box.style.backgroundColor = 'rgba(0, 255, 0, 0.05)';
            box.style.borderStyle = 'dashed';
            box.style.borderWidth = lineWidth + 'px';
        } else {
            box.style.borderColor = this.windowBoxColor;
            box.style.backgroundColor = 'rgba(0, 153, 255, 0.05)';
            box.style.borderStyle = 'solid';
            box.style.borderWidth = lineWidth + 'px';
        }
        
        // تحديث Preview
        const now = Date.now();
        if (now - this.lastPreviewUpdate > 50) {
            this.updateSelectionPreview();
            this.lastPreviewUpdate = now;
            
            // عرض عدد الأشكال المحددة
            const count = this.previewShapes.size;
            const mode = this.selectionMode === 'window' ? 'Window' : 'Crossing';
            this.updateStatus(`${mode} selection: ${count} object${count !== 1 ? 's' : ''} found. Click to confirm`);
            
            this.render();
        }
    }
    
    // دالة Preview جديدة
    updateSelectionPreview() {
        this.previewShapes.clear();
        
        if (!this.selectionStart || !this.selectionEnd) return;
        
        const rect = {
            x1: Math.min(this.selectionStart.x, this.selectionEnd.x),
            y1: Math.min(this.selectionStart.y, this.selectionEnd.y),
            x2: Math.max(this.selectionStart.x, this.selectionEnd.x),
            y2: Math.max(this.selectionStart.y, this.selectionEnd.y)
        };
        
        const worldRect = {
            min: this.screenToWorld(rect.x1, rect.y1),
            max: this.screenToWorld(rect.x2, rect.y2)
        };
        
        const isWindowMode = this.selectionMode === 'window';
        
        // فحص الأشكال
        for (const shape of this.shapes) {
            const layer = this.getLayer(shape.layerId);
            if (!layer?.visible || layer.locked) continue;
            
            if (this.willShapeBeSelected(shape, worldRect, isWindowMode)) {
                this.previewShapes.add(shape);
            }
        }
    }
    
    // دالة تحديد دقيقة
    willShapeBeSelected(shape, rect, isWindowMode) {
        const bounds = this.getShapeBounds(shape);
        
        // فحص سريع
        if (bounds.maxX < rect.min.x || bounds.minX > rect.max.x ||
            bounds.maxY < rect.min.y || bounds.minY > rect.max.y) {
            return false;
        }
        
        if (isWindowMode) {
            // Window mode - يجب أن يكون بالكامل داخل
            return bounds.minX >= rect.min.x && bounds.maxX <= rect.max.x &&
                   bounds.minY >= rect.min.y && bounds.maxY <= rect.max.y;
        } else {
            // Crossing mode - فحص دقيق حسب نوع الشكل
            return this.isShapeIntersectingRect(shape, rect);
        }
    }
    
    // فحص دقيق للتقاطع
    isShapeIntersectingRect(shape, rect) {
        switch (shape.type) {
            case 'line':
                return this.isLineIntersectingRect(shape, rect);
                
            case 'rectangle':
                return this.isRectangleIntersectingRect(shape, rect);
                
            case 'circle':
                return this.isCircleIntersectingRect(shape, rect);
                
            case 'polyline':
                for (let i = 0; i < shape.points.length - 1; i++) {
                    if (this.isLineSegmentIntersectingRect(
                        shape.points[i], shape.points[i + 1], rect)) {
                        return true;
                    }
                }
                return false;
                
            default:
                // للأشكال الأخرى، استخدم bounding box
                return true;
        }
    }
    
    // فحص تقاطع خط مع مستطيل (دقيق)
    isLineIntersectingRect(line, rect) {
        return this.isLineSegmentIntersectingRect(line.start, line.end, rect);
    }
    
    // خوارزمية Liang-Barsky (أبسط وأسرع من Cohen-Sutherland)
    isLineSegmentIntersectingRect(p1, p2, rect) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        let tmin = 0;
        let tmax = 1;
        
        // فحص كل حد من حدود المستطيل
        const clipTest = (p, q) => {
            if (p === 0) {
                return q >= 0;
            }
            const r = q / p;
            if (p < 0) {
                if (r > tmax) return false;
                if (r > tmin) tmin = r;
            } else {
                if (r < tmin) return false;
                if (r < tmax) tmax = r;
            }
            return true;
        };
        
        return clipTest(-dx, p1.x - rect.min.x) &&
               clipTest(dx, rect.max.x - p1.x) &&
               clipTest(-dy, p1.y - rect.min.y) &&
               clipTest(dy, rect.max.y - p1.y);
    }
    
    // فحص تقاطع مستطيل مع مستطيل
    isRectangleIntersectingRect(shape, rect) {
        return !(shape.end.x < rect.min.x || shape.start.x > rect.max.x ||
                 shape.end.y < rect.min.y || shape.start.y > rect.max.y);
    }
    
    // فحص تقاطع دائرة مع مستطيل
    isCircleIntersectingRect(shape, rect) {
        // أقرب نقطة على المستطيل من مركز الدائرة
        const closestX = Math.max(rect.min.x, Math.min(shape.center.x, rect.max.x));
        const closestY = Math.max(rect.min.y, Math.min(shape.center.y, rect.max.y));
        
        // المسافة من المركز لأقرب نقطة
        const dx = shape.center.x - closestX;
        const dy = shape.center.y - closestY;
        
        return (dx * dx + dy * dy) <= (shape.radius * shape.radius);
    }
    
    finishSelection() {
        this.isSelecting = false;
        this.selectionFirstClick = false;
        
        const box = document.getElementById('selectionBox');
        if (box) {
            box.style.display = 'none';
        }
        
        // نقل الأشكال من preview للـ selection الفعلي
        // التحديد التراكمي يعمل افتراضياً
        for (const shape of this.previewShapes) {
            this.selectedShapes.add(shape);
        }
        
        this.previewShapes.clear();
        this.selectionDirection = null;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectionStartPoint = null;
        
        this.ui.updatePropertiesPanel();
        this.updateStatus('READY');
        this.render();
    }
    
    // دالة جديدة لإلغاء التحديد
    cancelSelection() {
        this.isSelecting = false;
        this.selectionFirstClick = false;
        
        const box = document.getElementById('selectionBox');
        if (box) {
            box.style.display = 'none';
        }
        
        this.previewShapes.clear();
        this.selectionDirection = null;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectionStartPoint = null;
        
        this.updateStatus('READY');
        this.render();
    }
    
    /**
     * الحصول على الشكل عند نقطة معينة
     * @param {number} x - إحداثي X
     * @param {number} y - إحداثي Y
     * @returns {Object|null} الشكل إذا وُجد أو null
     */
    getShapeAt(x, y) {
        const tolerance = 5 / this.zoom;
        
        // البحث بترتيب عكسي (الأشكال الأحدث أولاً)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            
            // تحقق من الطبقة
            const layer = this.getLayer(shape.layerId);
            if (!layer || !layer.visible || layer.locked || (layer.frozen && this.layerManager)) continue;
            
            if (this.isPointOnShape(x, y, shape, tolerance)) {
                return shape;
            }
        }
        
        return null;
    }
    
    /**
     * التحقق من وقوع نقطة على شكل
     * @param {number} x - إحداثي X
     * @param {number} y - إحداثي Y
     * @param {Object} shape - الشكل
     * @param {number} tolerance - مدى التسامح
     * @returns {boolean} true إذا كانت النقطة على الشكل
     */
    isPointOnShape(x, y, shape, tolerance) {
        switch (shape.type) {
            case 'line':
                return this.isPointOnLine(x, y, shape.start, shape.end, tolerance);
                
            case 'rectangle':
                return this.isPointOnRectangle(x, y, shape, tolerance);
                
            case 'circle':
                return this.isPointOnCircle(x, y, shape, tolerance);
                
            case 'arc':
                return this.isPointOnArc(x, y, shape, tolerance);
                
            case 'ellipse':
                return this.isPointOnEllipse(x, y, shape, tolerance);
                
            case 'polyline':
                return this.isPointOnPolyline(x, y, shape, tolerance);
                
            case 'text':
                return this.isPointInRectangle(x, y, 
                    shape.position.x, shape.position.y - 16,
                    shape.position.x + shape.text.length * 8, shape.position.y);
                    
            default:
                return false;
        }
    }
    
    /**
     * التحقق من وقوع نقطة على خط
     */
    isPointOnLine(px, py, p1, p2, tolerance) {
        const d = this.distance(p1.x, p1.y, p2.x, p2.y);
        if (d === 0) return this.distance(px, py, p1.x, p1.y) < tolerance;
        
        const t = ((px - p1.x) * (p2.x - p1.x) + (py - p1.y) * (p2.y - p1.y)) / (d * d);
        
        if (t < 0 || t > 1) {
            return Math.min(
                this.distance(px, py, p1.x, p1.y),
                this.distance(px, py, p2.x, p2.y)
            ) < tolerance;
        }
        
        const projX = p1.x + t * (p2.x - p1.x);
        const projY = p1.y + t * (p2.y - p1.y);
        
        return this.distance(px, py, projX, projY) < tolerance;
    }
    
    /**
     * التحقق من وقوع نقطة على مستطيل
     */
    isPointOnRectangle(px, py, rect, tolerance) {
        const x1 = Math.min(rect.start.x, rect.end.x);
        const y1 = Math.min(rect.start.y, rect.end.y);
        const x2 = Math.max(rect.start.x, rect.end.x);
        const y2 = Math.max(rect.start.y, rect.end.y);
        
        // التحقق من الحواف الأربعة
        return this.isPointOnLine(px, py, {x: x1, y: y1}, {x: x2, y: y1}, tolerance) ||
               this.isPointOnLine(px, py, {x: x2, y: y1}, {x: x2, y: y2}, tolerance) ||
               this.isPointOnLine(px, py, {x: x2, y: y2}, {x: x1, y: y2}, tolerance) ||
               this.isPointOnLine(px, py, {x: x1, y: y2}, {x: x1, y: y1}, tolerance);
    }
    
    /**
     * التحقق من وقوع نقطة على دائرة
     */
    isPointOnCircle(px, py, circle, tolerance) {
        const d = this.distance(px, py, circle.center.x, circle.center.y);
        return Math.abs(d - circle.radius) < tolerance;
    }
    
    /**
     * التحقق من وقوع نقطة على قوس
     */
    isPointOnArc(px, py, arc, tolerance) {
        const d = this.distance(px, py, arc.center.x, arc.center.y);
        if (Math.abs(d - arc.radius) > tolerance) return false;
        
        // التحقق من الزاوية
        let angle = Math.atan2(py - arc.center.y, px - arc.center.x);
        let startAngle = arc.startAngle;
        let endAngle = arc.endAngle;
        
        // تطبيع الزوايا
        while (angle < 0) angle += Math.PI * 2;
        while (startAngle < 0) startAngle += Math.PI * 2;
        while (endAngle < 0) endAngle += Math.PI * 2;
        
        if (startAngle > endAngle) {
            return angle >= startAngle || angle <= endAngle;
        } else {
            return angle >= startAngle && angle <= endAngle;
        }
    }
    
    /**
     * التحقق من وقوع نقطة على ellipse
     */
    isPointOnEllipse(px, py, ellipse, tolerance) {
        const dx = px - ellipse.center.x;
        const dy = py - ellipse.center.y;
        const value = (dx * dx) / (ellipse.radiusX * ellipse.radiusX) + 
                      (dy * dy) / (ellipse.radiusY * ellipse.radiusY);
        return Math.abs(value - 1) < tolerance / Math.min(ellipse.radiusX, ellipse.radiusY);
    }
    
    /**
     * التحقق من وقوع نقطة على polyline
     */
    isPointOnPolyline(px, py, polyline, tolerance) {
        const len = polyline.closed ? polyline.points.length : polyline.points.length - 1;
        
        for (let i = 0; i < len; i++) {
            const p1 = polyline.points[i];
            const p2 = polyline.points[(i + 1) % polyline.points.length];
            
            if (this.isPointOnLine(px, py, p1, p2, tolerance)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * التحقق من وقوع نقطة داخل مستطيل
     * @param {number} px - إحداثي X للنقطة
     * @param {number} py - إحداثي Y للنقطة
     * @param {number} x1 - إحداثي X للزاوية الأولى
     * @param {number} y1 - إحداثي Y للزاوية الأولى
     * @param {number} x2 - إحداثي X للزاوية المقابلة
     * @param {number} y2 - إحداثي Y للزاوية المقابلة
     * @returns {boolean} true إذا كانت النقطة داخل المستطيل
     */
    isPointInRectangle(px, py, x1, y1, x2, y2) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        return px >= minX && px <= maxX && py >= minY && py <= maxY;
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
    
    /**
     * الحصول على حدود التحديد (bounding box)
     * @returns {Object|null} حدود التحديد أو null إذا لم يكن هناك تحديد
     */
    getSelectionBounds() {
        if (this.selectedShapes.size === 0) return null;
        
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        // حساب الحدود لكل شكل محدد
        for (const shape of this.selectedShapes) {
            const bounds = this.getShapeBounds(shape);
            if (bounds) {
                minX = Math.min(minX, bounds.minX);
                minY = Math.min(minY, bounds.minY);
                maxX = Math.max(maxX, bounds.maxX);
                maxY = Math.max(maxY, bounds.maxY);
            }
        }
        
        // التحقق من صحة القيم
        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
            return null;
        }
        
        return {
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }
    
    /**
     * الحصول على حدود الشكل
     * @param {Object} shape - الشكل
     * @returns {Object} حدود الشكل {minX, minY, maxX, maxY}
     */
    /**
     * الحصول على حدود الشكل
     * @param {Object} shape - الشكل
     * @returns {Object} حدود الشكل {minX, minY, maxX, maxY}
     */
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
                updateBounds(shape.start.x, shape.end.y);
                updateBounds(shape.end.x, shape.start.y);
                break;
                
            case 'circle':
                updateBounds(shape.center.x - shape.radius, shape.center.y - shape.radius);
                updateBounds(shape.center.x + shape.radius, shape.center.y + shape.radius);
                break;
                
            case 'arc':
                // حساب نقاط البداية والنهاية
                const startX = shape.center.x + shape.radius * Math.cos(shape.startAngle);
                const startY = shape.center.y + shape.radius * Math.sin(shape.startAngle);
                const endX = shape.center.x + shape.radius * Math.cos(shape.endAngle);
                const endY = shape.center.y + shape.radius * Math.sin(shape.endAngle);
                
                updateBounds(startX, startY);
                updateBounds(endX, endY);
                
                // فحص إذا كان القوس يمر بنقاط القطر
                const checkAngle = (angle) => {
                    const normalizedStart = ((shape.startAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                    const normalizedEnd = ((shape.endAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                    const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                    
                    if (normalizedStart <= normalizedEnd) {
                        return normalizedAngle >= normalizedStart && normalizedAngle <= normalizedEnd;
                    } else {
                        return normalizedAngle >= normalizedStart || normalizedAngle <= normalizedEnd;
                    }
                };
                
                // فحص النقاط الحرجة (0, π/2, π, 3π/2)
                if (checkAngle(0)) updateBounds(shape.center.x + shape.radius, shape.center.y);
                if (checkAngle(Math.PI / 2)) updateBounds(shape.center.x, shape.center.y + shape.radius);
                if (checkAngle(Math.PI)) updateBounds(shape.center.x - shape.radius, shape.center.y);
                if (checkAngle(3 * Math.PI / 2)) updateBounds(shape.center.x, shape.center.y - shape.radius);
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
                // تقدير حجم النص
                const textWidth = (shape.text || '').length * (shape.fontSize || 12) * 0.6;
                const textHeight = shape.fontSize || 12;
                updateBounds(shape.position.x + textWidth, shape.position.y - textHeight);
                break;
                
            case 'polygon':
                if (shape.points) {
                    shape.points.forEach(p => updateBounds(p.x, p.y));
                }
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
            const layer = this.getLayer(shape.layerId);
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
    
    // Rendering - محدثة لدعم Grips والطبقات المتقدمة
render() {
    if (this.mode === '3D') {
        this.render3D();
        return;
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Save context state
    this.ctx.save();
    
    // Apply transformations
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);
    
    // Draw grid
    if (this.gridEnabled) {
        this.drawGrid();
    }
    
    // ترتيب رسم الأشكال حسب الطبقات
    const layerGroups = new Map();
    
    // تجميع الأشكال حسب الطبقات
    this.shapes.forEach(shape => {
        const layerId = shape.layerId || 0;
        if (!layerGroups.has(layerId)) {
            layerGroups.set(layerId, []);
        }
        layerGroups.get(layerId).push(shape);
    });
    
    // رسم الطبقات بالترتيب
    const sortedLayerIds = Array.from(layerGroups.keys()).sort((a, b) => a - b);
    
    sortedLayerIds.forEach(layerId => {
        const layer = this.getLayer(layerId);
        if (!layer || !layer.visible) return;
        
        const shapes = layerGroups.get(layerId);
        
        shapes.forEach(shape => {
            const isSelected = this.selectedShapes.has(shape);
            const isHovered = shape === this.hoveredShape && !isSelected;
            const isPreview = this.previewShapes.has(shape);
            
            this.ctx.save();
            
            // تطبيق خصائص الطبقة
            const layerTransparency = layer.transparency || 0;
            const alpha = 1 - (layerTransparency / 100);
            
            // Apply layer properties
            this.ctx.globalAlpha = alpha;
            
            // Locked layer fading
            if (layer.locked && layer.lockedFading !== false) {
                this.ctx.globalAlpha *= 0.5;
            }
            
            // Apply shape properties (مع أولوية لخصائص الشكل)
            this.ctx.strokeStyle = shape.color || layer.color || this.currentColor;
            this.ctx.lineWidth = (shape.lineWidth || layer.lineWidth || this.currentLineWidth) / this.zoom;
            this.ctx.fillStyle = shape.fillColor || 'transparent';
            
            // Apply line type
            const lineType = shape.lineType || layer.lineType || 'solid';
            if (lineType === 'dashed') {
                this.ctx.setLineDash([10 / this.zoom, 5 / this.zoom]);
            } else if (lineType === 'dotted') {
                this.ctx.setLineDash([2 / this.zoom, 3 / this.zoom]);
            } else {
                this.ctx.setLineDash([]);
            }
            
            // Selection/hover effects
            if (isSelected) {
                this.ctx.strokeStyle = this.selectionColor || '#00d4aa';
                this.ctx.lineWidth = ((shape.lineWidth || 2) + 1) / this.zoom;
                this.ctx.shadowColor = this.selectionColor || '#00d4aa';
                this.ctx.shadowBlur = 10 / this.zoom;
            } else if (isHovered && !layer.locked) {
                this.ctx.lineWidth = ((shape.lineWidth || 2) + 0.5) / this.zoom;
                this.ctx.globalAlpha *= 0.8;
            } else if (isPreview) {
                this.ctx.globalAlpha *= 0.5;
                this.ctx.strokeStyle = this.previewColor || '#ffaa00';
            }
            
            // Draw the shape
            this.drawShape(this.ctx, shape);
            
            this.ctx.restore();
            
            // رسم Grips للأشكال المحددة (فقط للطبقات غير المقفولة)
            if (isSelected && !layer.locked && this.gripsController && 
                this.gripsVisible && this.currentTool === 'select') {
                this.gripsController.drawGrips(shape);
            }
        });
    });
    
    // Draw temporary shape (معاينة)
    if (this.tempShape) {
        this.ctx.save();
        this.ctx.strokeStyle = this.tempShape.color || this.currentColor;
        this.ctx.lineWidth = (this.tempShape.lineWidth || this.currentLineWidth) / this.zoom;
        
        if (this.tempShape.lineType === 'dashed') {
            this.ctx.setLineDash([10 / this.zoom, 5 / this.zoom]);
        }
        
        this.ctx.globalAlpha = 0.7;
        this.drawShape(this.ctx, this.tempShape);  
        this.ctx.restore();
    }
    
    // Draw temporary shapes من الأدوات
    if (this.tempShapes && this.tempShapes.length > 0) {
        this.tempShapes.forEach(shape => {
            this.ctx.save();
            this.ctx.strokeStyle = shape.color || '#00d4aa';
            this.ctx.lineWidth = (shape.lineWidth || 2) / this.zoom;
            
            if (shape.lineType === 'dashed') {
                this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
            }
            
            this.ctx.globalAlpha = 0.6;
            this.drawShape(this.ctx, shape);
            this.ctx.restore();
        });
    }
    
    // Draw selection box
    if (this.isSelecting) {
        this.drawSelectionBox();
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
    
   /**
 * رسم شكل على Canvas مع دعم كامل لـ LinetypeManager
 * @param {CanvasRenderingContext2D} ctx - سياق الرسم
 * @param {Object} shape - الشكل المراد رسمه
 */
drawShape(ctx, shape) {
    // حفظ حالة السياق
    ctx.save();
    
    try {
        // تطبيق خصائص الطبقة إذا لم تكن محددة على الشكل
        if (this.layerManager) {
            const layer = this.layerManager.layers.get(shape.layerId);
            if (layer) {
                // استخدام خصائص الطبقة كقيم افتراضية
                shape = {
                    color: shape.color || layer.color,
                    lineType: shape.lineType || layer.lineType,
                    lineWeight: shape.lineWeight !== undefined ? shape.lineWeight : layer.lineWidth,
                    transparency: shape.transparency || layer.transparency,
                    ...shape
                };
            }
        }
        
        // تطبيق اللون
        const color = shape.color || this.currentColor;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        
        // تطبيق الشفافية
        if (shape.transparency && shape.transparency > 0) {
            ctx.globalAlpha = 1 - (shape.transparency / 100);
        }
        
        // تطبيق نوع الخط (Linetype)
        if (this.linetypeManager && shape.type !== 'text') {
            const lineType = shape.lineType || this.currentLineType || 'continuous';
            const scale = shape.linetypeScale || 1;
            this.linetypeManager.applyLinetype(ctx, lineType, this.zoom, scale);
        } else {
            // Fallback للنظام القديم
            switch (shape.lineType) {
                case 'dashed':
                    ctx.setLineDash([10 * this.zoom, 5 * this.zoom]);
                    break;
                case 'dotted':
                    ctx.setLineDash([2 * this.zoom, 3 * this.zoom]);
                    break;
                case 'dashdot':
                    ctx.setLineDash([10 * this.zoom, 5 * this.zoom, 2 * this.zoom, 5 * this.zoom]);
                    break;
                default:
                    ctx.setLineDash([]);
            }
        }
        
        // تطبيق وزن الخط (Line Weight)
        if (this.linetypeManager && this.linetypeManager.displayLineWeights) {
            // استخدام نظام أوزان الخطوط
            const lineWeight = shape.lineWeight !== undefined ? shape.lineWeight : this.currentLineWeight;
            const actualWeight = this.linetypeManager.getActualLineWeight(lineWeight);
            ctx.lineWidth = actualWeight * this.zoom * this.linetypeManager.weightDisplayScale;
        } else {
            // النظام القديم أو عند إيقاف عرض الأوزان
            const width = shape.lineWidth || shape.lineWeight || this.currentLineWidth || 2;
            ctx.lineWidth = width * this.zoom;
        }
        
        // إعدادات إضافية للرسم
        ctx.lineCap = shape.lineCap || 'round';
        ctx.lineJoin = shape.lineJoin || 'round';
        
        // رسم الشكل حسب نوعه
        switch (shape.type) {
            case 'line':
                this.drawLine(ctx, shape);
                break;
                
            case 'rectangle':
                this.drawRectangle(ctx, shape);
                break;
                
            case 'circle':
                this.drawCircle(ctx, shape);
                break;
                
            case 'arc':
                this.drawArc(ctx, shape);
                break;
                
            case 'ellipse':
                this.drawEllipse(ctx, shape);
                break;
                
            case 'polyline':
                this.drawPolyline(ctx, shape);
                break;
                
            case 'polygon':
                this.drawPolygon(ctx, shape);
                break;
                
            case 'text':
                this.drawText(ctx, shape);
                break;
                
            case 'dimension':
                // الأبعاد المركبة
                if (shape.draw && typeof shape.draw === 'function') {
                    shape.draw(ctx, this);
                } else {
                    this.drawDimension(ctx, shape);
                }
                break;
                
            case 'spline':
                this.drawSpline(ctx, shape);
                break;
                
            case 'hatch':
                this.drawHatch(ctx, shape);
                break;
                
            default:
                // للأشكال المخصصة
                if (shape.draw && typeof shape.draw === 'function') {
                    shape.draw(ctx, this);
                }
                break;
        }
        
    } catch (error) {
        console.error('Error drawing shape:', error, shape);
    } finally {
        // استعادة حالة السياق
        ctx.restore();
    }
}

// دوال مساعدة لرسم الأشكال المختلفة

drawLine(ctx, shape) {
    const start = shape.start || shape.point1;
    const end = shape.end || shape.point2;
    
    if (!start || !end) return;
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
}

drawRectangle(ctx, shape) {
    const start = shape.start || shape.point1;
    const end = shape.end || shape.point2;
    
    if (!start || !end) return;
    
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    
    if (shape.filled || shape.fillColor) {
        ctx.fillStyle = shape.fillColor || shape.color || this.currentColor;
        ctx.fillRect(x, y, width, height);
    }
    
    ctx.strokeRect(x, y, width, height);
}

drawCircle(ctx, shape) {
    const center = shape.center || shape.position;
    const radius = shape.radius;
    
    if (!center || !radius) return;
    
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    
    if (shape.filled || shape.fillColor) {
        ctx.fillStyle = shape.fillColor || shape.color || this.currentColor;
        ctx.fill();
    }
    
    ctx.stroke();
}

drawArc(ctx, shape) {
    const center = shape.center || shape.position;
    const radius = shape.radius;
    const startAngle = shape.startAngle || 0;
    const endAngle = shape.endAngle || Math.PI * 2;
    const counterclockwise = shape.counterclockwise || false;
    
    if (!center || !radius) return;
    
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, startAngle, endAngle, counterclockwise);
    ctx.stroke();
}

drawEllipse(ctx, shape) {
    const center = shape.center || shape.position;
    const radiusX = shape.radiusX || shape.rx;
    const radiusY = shape.radiusY || shape.ry;
    const rotation = shape.rotation || 0;
    
    if (!center || !radiusX || !radiusY) return;
    
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    
    if (shape.filled || shape.fillColor) {
        ctx.fillStyle = shape.fillColor || shape.color || this.currentColor;
        ctx.fill();
    }
    
    ctx.stroke();
}

drawPolyline(ctx, shape) {
    const points = shape.points;
    if (!points || points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    if (shape.closed) {
        ctx.closePath();
    }
    
    if ((shape.closed && shape.filled) || shape.fillColor) {
        ctx.fillStyle = shape.fillColor || shape.color || this.currentColor;
        ctx.fill();
    }
    
    ctx.stroke();
}

drawPolygon(ctx, shape) {
    const points = shape.points;
    if (!points || points.length < 3) return;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.closePath();
    
    if (shape.filled !== false || shape.fillColor) {
        ctx.fillStyle = shape.fillColor || shape.color || this.currentColor;
        ctx.fill();
    }
    
    ctx.stroke();
}

drawText(ctx, shape) {
    const position = shape.position || shape.point;
    const text = shape.text || '';
    const fontSize = (shape.fontSize || 14) * this.zoom;
    const fontFamily = shape.fontFamily || 'Arial';
    const align = shape.align || 'left';
    const baseline = shape.baseline || 'alphabetic';
    
    if (!position) return;
    
    // لا نطبق linetype على النص
    ctx.setLineDash([]);
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    
    // النص له fillStyle وليس strokeStyle
    ctx.fillStyle = shape.color || this.currentColor;
    
    // دعم النص متعدد الأسطر
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
    
    lines.forEach((line, index) => {
        const y = position.y + (index * lineHeight);
        
        if (shape.background) {
            // رسم خلفية للنص
            const metrics = ctx.measureText(line);
            const padding = 4 * this.zoom;
            
            ctx.save();
            ctx.fillStyle = shape.background;
            ctx.fillRect(
                position.x - padding,
                y - fontSize - padding,
                metrics.width + (padding * 2),
                fontSize + (padding * 2)
            );
            ctx.restore();
        }
        
        ctx.fillText(line, position.x, y);
        
        if (shape.underline) {
            const metrics = ctx.measureText(line);
            ctx.beginPath();
            ctx.moveTo(position.x, y + 2 * this.zoom);
            ctx.lineTo(position.x + metrics.width, y + 2 * this.zoom);
            ctx.stroke();
        }
    });
}

drawDimension(ctx, shape) {
    // رسم الأبعاد (يمكن توسيعها حسب الحاجة)
    const type = shape.subtype || shape.dimensionType || 'linear';
    
    switch (type) {
        case 'linear':
            this.drawLinearDimension(ctx, shape);
            break;
        case 'angular':
            this.drawAngularDimension(ctx, shape);
            break;
        case 'radius':
            this.drawRadiusDimension(ctx, shape);
            break;
        case 'diameter':
            this.drawDiameterDimension(ctx, shape);
            break;
        default:
            console.warn('Unknown dimension type:', type);
    }
}

drawSpline(ctx, shape) {
    const points = shape.points;
    if (!points || points.length < 2) return;
    
    ctx.beginPath();
    
    if (points.length === 2) {
        // خط مستقيم
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
    } else {
        // منحنى Bezier
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        
        // آخر نقطتين
        ctx.quadraticCurveTo(
            points[points.length - 2].x,
            points[points.length - 2].y,
            points[points.length - 1].x,
            points[points.length - 1].y
        );
    }
    
    ctx.stroke();
}

drawHatch(ctx, shape) {
    // رسم التظليل (Hatch)
    if (!shape.boundary || shape.boundary.length === 0) return;
    
    // رسم الحدود
    ctx.beginPath();
    ctx.moveTo(shape.boundary[0].x, shape.boundary[0].y);
    
    for (let i = 1; i < shape.boundary.length; i++) {
        ctx.lineTo(shape.boundary[i].x, shape.boundary[i].y);
    }
    
    ctx.closePath();
    
    // حفظ منطقة القص
    ctx.save();
    ctx.clip();
    
    // رسم خطوط التظليل
    const pattern = shape.pattern || 'horizontal';
    const spacing = (shape.spacing || 5) * this.zoom;
    const angle = shape.angle || 0;
    
    // حساب حدود المنطقة
    const bounds = this.getBounds(shape.boundary);
    
    ctx.strokeStyle = shape.color || this.currentColor;
    ctx.lineWidth = this.zoom;
    
    // رسم الخطوط حسب النمط
    this.drawHatchPattern(ctx, pattern, bounds, spacing, angle);
    
    ctx.restore();
    
    // رسم الحدود
    ctx.stroke();
}

// دالة مساعدة لحساب حدود مجموعة نقاط
getBounds(points) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    });
    
    return { minX, minY, maxX, maxY };
}

// دالة مساعدة لرسم أنماط التظليل
drawHatchPattern(ctx, pattern, bounds, spacing, angle) {
    const { minX, minY, maxX, maxY } = bounds;
    const width = maxX - minX;
    const height = maxY - minY;
    
    ctx.save();
    ctx.translate((minX + maxX) / 2, (minY + maxY) / 2);
    ctx.rotate(angle * Math.PI / 180);
    
    switch (pattern) {
        case 'horizontal':
        case 'vertical':
            const isVertical = pattern === 'vertical';
            const count = Math.ceil((isVertical ? width : height) / spacing);
            
            for (let i = -count; i <= count; i++) {
                ctx.beginPath();
                if (isVertical) {
                    ctx.moveTo(i * spacing, -height);
                    ctx.lineTo(i * spacing, height);
                } else {
                    ctx.moveTo(-width, i * spacing);
                    ctx.lineTo(width, i * spacing);
                }
                ctx.stroke();
            }
            break;
            
        case 'cross':
            // خطوط أفقية وعمودية
            this.drawHatchPattern(ctx, 'horizontal', bounds, spacing, 0);
            this.drawHatchPattern(ctx, 'vertical', bounds, spacing, 0);
            break;
            
        case 'diagonal':
            // خطوط مائلة
            const diagonal = Math.sqrt(width * width + height * height);
            const dCount = Math.ceil(diagonal / spacing);
            
            for (let i = -dCount; i <= dCount; i++) {
                ctx.beginPath();
                ctx.moveTo(-diagonal, i * spacing);
                ctx.lineTo(diagonal, i * spacing);
                ctx.stroke();
            }
            break;
    }
    
    ctx.restore();
}
    
    // رسم صندوق التحديد
    drawSelectionBox() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        // لا نرسم في Canvas - نستخدم HTML element بدلاً من ذلك
        // هذا يوفر أداء أفضل وتحكم أكثر في المظهر
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
    
    // إضافة دالة لتبديل عرض Grips
    toggleGrips() {
        this.gripsVisible = !this.gripsVisible;
        this.render();
        this.updateStatus(`Grips ${this.gripsVisible ? 'enabled' : 'disabled'}`);
    }
    
    // تحديث drawSelectionHandles لتجنب التداخل مع Grips
    drawSelectionHandles_OLD(shape) {
        // هذه الدالة القديمة - يمكن إبقاؤها للرجوع إليها
        // لكن لن يتم استخدامها عند تفعيل نظام Grips الجديد
        if (this.gripsController && this.gripsVisible) {
            return; // استخدم نظام Grips الجديد بدلاً من handles القديمة
        }
        
        // ... كود handles القديم ...
    }
    
    // دالة تعيين نوع الخط
    setLinetype(linetypeId) {
        if (this.linetypeManager) {
            this.linetypeManager.setCurrentLinetype(linetypeId);
        } else {
            // Fallback للنظام القديم
            this.currentLineType = linetypeId;
        }
        
        this.render();
    }
    
    /**
 * تعيين وزن الخط (Line Weight)
 * @param {string|number} weight - قيمة الوزن أو معرف خاص
 */
setLineWeight(weight) {
    // التحقق من صحة المعطيات
    if (weight === undefined || weight === null) {
        console.warn('Invalid line weight');
        return;
    }
    
    // معالجة القيم الخاصة
    let actualWeight = weight;
    let pixelWidth = 2; // القيمة الافتراضية
    
    if (this.linetypeManager) {
        // استخدام LinetypeManager
        this.linetypeManager.setCurrentLineWeight(weight);
        
        // الحصول على القيمة الفعلية بالبكسل
        pixelWidth = this.linetypeManager.getActualLineWeight(weight);
        
        // الحصول على معلومات الوزن
        const weightInfo = this.linetypeManager.lineWeights.find(w => w.value === weight);
        if (weightInfo) {
            this.updateStatus(`Line weight: ${weightInfo.label}`);
        }
        
        // تحديث القيمة الداخلية
        this.currentLineWeight = weight;
        this.currentLineWidth = pixelWidth;
    } else {
        // Fallback - معالجة يدوية
        switch (weight) {
            case 'default':
                actualWeight = -3;
                pixelWidth = 2;
                break;
            case 'bylayer':
                actualWeight = -2;
                pixelWidth = 2;
                break;
            case 'byblock':
                actualWeight = -1;
                pixelWidth = 2;
                break;
            default:
                // تحويل من مم إلى بكسل (تقريبي)
                const mm = parseFloat(weight);
                if (!isNaN(mm)) {
                    actualWeight = mm;
                    // 1mm ≈ 3.78 pixels at 96 DPI
                    pixelWidth = Math.max(1, mm * 3.78);
                }
                break;
        }
        
        this.currentLineWeight = actualWeight;
        this.currentLineWidth = pixelWidth;
        this.updateStatus(`Line weight: ${weight}`);
    }
    
    // تحديث الطبقة الحالية
    if (this.layerManager) {
        const layer = this.layerManager.getCurrentLayer();
        if (layer) {
            layer.lineWeight = actualWeight;
            layer.lineWidth = pixelWidth;
        }
    } else {
        // Fallback للنظام القديم
        const layer = this.getLayer(this.currentLayerId);
        if (layer) {
            layer.lineWidth = pixelWidth;
        }
    }
    
    // تحديث UI
    if (this.ui) {
        this.ui.updateLineWeightDisplay();
        this.ui.updateLineWeightDropdowns();
    }
    
    // تحديث الأشكال المحددة
    if (this.selectedShapes.size > 0) {
        this.selectedShapes.forEach(shape => {
            shape.lineWeight = actualWeight;
            shape.lineWidth = pixelWidth;
        });
        this.recordState();
    }
    
    // إعادة الرسم
    this.render();
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
            const layer = this.getLayer(shape.layerId);
            if (layer && layer.visible && !layer.locked && (!layer.frozen || !this.layerManager)) {
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
    
    zoomIn() {
        const factor = 1.2;
        const worldBefore = this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
        
        this.zoom *= factor;
        this.zoom = Math.min(this.zoom, this.maxZoom);
        
        const worldAfter = this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
        
        this.panX += (worldAfter.x - worldBefore.x) * this.zoom;
        this.panY += (worldAfter.y - worldBefore.y) * this.zoom;
        
        this.render();
    }
    
    zoomOut() {
        const factor = 0.8;
        const worldBefore = this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
        
        this.zoom *= factor;
        this.zoom = Math.max(this.zoom, this.minZoom);
        
        const worldAfter = this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
        
        this.panX += (worldAfter.x - worldBefore.x) * this.zoom;
        this.panY += (worldAfter.y - worldBefore.y) * this.zoom;
        
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
        
        const layer = this.getLayer(this.currentLayerId);
        if (layer) {
            layer.color = color;
        }
        
        // Update color preview
        this.ui.updateColorDisplay(color);
        
        this.render();
    }
    
   /**
 * تعيين عرض الخط بالبكسل (للتوافق مع الكود القديم)
 * @param {number} width - العرض بالبكسل
 */
setLineWidth(width) {
    // التحقق من صحة المعطيات
    const pixelWidth = parseFloat(width);
    if (isNaN(pixelWidth) || pixelWidth <= 0) {
        console.warn('Invalid line width:', width);
        return;
    }
    
    // تحديث القيمة الداخلية
    this.currentLineWidth = pixelWidth;
    
    if (this.linetypeManager) {
        // البحث عن أقرب وزن خط مطابق
        const weights = this.linetypeManager.lineWeights;
        let closestWeight = weights[0];
        let minDiff = Infinity;
        
        weights.forEach(w => {
            if (w.mm >= 0) { // تجاهل القيم الخاصة
                const weightPixels = w.mm * 3.78;
                const diff = Math.abs(weightPixels - pixelWidth);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestWeight = w;
                }
            }
        });
        
        // تعيين الوزن الأقرب
        this.setLineWeight(closestWeight.value);
        
        // تحديث UI مع القيمة الفعلية
        if (this.ui) {
            this.ui.updateLineWeightDisplay();
        }
    } else {
        // النظام القديم
        this.currentLineWidth = pixelWidth;
        
        // تحديث الطبقة الحالية
        const layer = this.getLayer(this.currentLayerId);
        if (layer) {
            layer.lineWidth = pixelWidth;
        }
        
        // تحديث UI
        if (this.ui && this.ui.updateLineWidthDisplay) {
            this.ui.updateLineWidthDisplay(pixelWidth);
        }
        
        // تحديث الأشكال المحددة
        if (this.selectedShapes.size > 0) {
            this.selectedShapes.forEach(shape => {
                shape.lineWidth = pixelWidth;
            });
            this.recordState();
        }
        
        this.updateStatus(`Line width: ${pixelWidth.toFixed(1)}px`);
        this.render();
    }
}
    

   /**
 * دالة مساعدة: تعيين نوع الخط من Preset
 * @param {string} preset - اسم النمط المحدد مسبقاً
 */
setLineTypePreset(preset) {
    const presets = {
        'continuous': 'continuous',
        'hidden': 'hidden',
        'center': 'center',
        'phantom': 'phantom',
        'dashed': 'dashed',
        'dotted': 'dotted',
        'dashdot': 'dashdot'
    };
    
    const type = presets[preset] || 'continuous';
    this.setLineType(type);
}

/**
 * دالة مساعدة: تعيين وزن الخط من قائمة سريعة
 * @param {string} quickWeight - وزن سريع (thin, normal, bold, heavy)
 */
setQuickLineWeight(quickWeight) {
    const quickWeights = {
        'thin': 0.13,
        'normal': 0.25,
        'bold': 0.50,
        'heavy': 1.00
    };
    
    const weight = quickWeights[quickWeight] || 0.25;
    this.setLineWeight(weight);
} 


    /**
 * دالة مساعدة: مطابقة خصائص الخط من شكل موجود
 * @param {Object} sourceShape - الشكل المصدر
 */
matchLineProperties(sourceShape) {
    if (!sourceShape) return;
    
    // مطابقة نوع الخط
    if (sourceShape.lineType) {
        this.setLineType(sourceShape.lineType);
    }
    
    // مطابقة وزن الخط
    if (sourceShape.lineWeight !== undefined) {
        this.setLineWeight(sourceShape.lineWeight);
    } else if (sourceShape.lineWidth !== undefined) {
        this.setLineWidth(sourceShape.lineWidth);
    }
    
    // مطابقة اللون
    if (sourceShape.color) {
        this.setColor(sourceShape.color);
    }
    
    this.updateStatus('Line properties matched');
}

/**
 * دالة مساعدة: إعادة تعيين خصائص الخط للقيم الافتراضية
 */
resetLineProperties() {
    this.setLineType('continuous');
    this.setLineWeight(0.25);
    this.setColor('#00d4aa');
    
    this.updateStatus('Line properties reset to defaults');
}


   /**
 * تعيين نوع الخط (Linetype)
 * @param {string} type - معرف نوع الخط
 */
setLineType(type) {
    // التحقق من صحة المعطيات
    if (!type) {
        console.warn('Invalid line type');
        return;
    }
    
    // تحديث نوع الخط الحالي
    this.currentLineType = type;
    
    // التحديث عبر LinetypeManager إن وجد
    if (this.linetypeManager) {
        this.linetypeManager.setCurrentLinetype(type);
        
        // الحصول على معلومات نوع الخط
        const linetypeInfo = this.linetypeManager.getCurrentLinetype();
        if (linetypeInfo) {
            this.updateStatus(`Line type: ${linetypeInfo.name}`);
        }
    }
    
    // تحديث الطبقة الحالية
    if (this.layerManager) {
        const layer = this.layerManager.getCurrentLayer();
        if (layer) {
            layer.lineType = type;
        }
    } else {
        // Fallback للنظام القديم
        const layer = this.getLayer(this.currentLayerId);
        if (layer) {
            layer.lineType = type;
        }
    }
    
    // تحديث UI
    if (this.ui) {
        this.ui.updateLinetypeDisplay();
        this.ui.updateLinetypeDropdowns();
    }
    
    // تحديث الأشكال المحددة
    if (this.selectedShapes.size > 0) {
        this.selectedShapes.forEach(shape => {
            shape.lineType = type;
        });
        this.recordState();
    }
    
    // إعادة الرسم
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
    
    // Layer management - محدثة لدعم LayerManager
    getLayer(id) {
        if (this.layerManager) {
            return this.layerManager.layers.get(id);
        } else {
            return this.layers.get(id);
        }
    }
    
    getCurrentLayer() {
        if (this.layerManager) {
            return this.layerManager.getCurrentLayer();
        } else {
            return this.layers.get(this.currentLayerId);
        }
    }
    
    /**
     * الحصول على ID الطبقة الحالية
     */
    getCurrentLayerId() {
        if (this.layerManager) {
            return this.layerManager.currentLayerId;
        } else {
            return this.currentLayerId;
        }
    }
    
    /**
     * الحصول على جميع الطبقات
     */
    getAllLayers() {
        if (this.layerManager) {
            return this.layerManager.layers;
        } else {
            return this.layers;
        }
    }
    
    addLayer() {
        if (this.layerManager) {
            this.layerManager.addLayer();
        } else {
            // الكود القديم كـ fallback
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
    }
    
    setCurrentLayer(id) {
        if (this.layerManager) {
            return this.layerManager.setCurrentLayer(id);
        } else {
            // الكود القديم
            this.currentLayerId = id;
            const layer = this.layers.get(id);
            if (layer) {
                this.currentColor = layer.color;
                this.currentLineWidth = layer.lineWidth;
                this.currentLineType = layer.lineType;
                
                this.setColor(layer.color);
                document.getElementById('lineWidthSlider').value = layer.lineWidth;
                document.getElementById('lineWidthValue').textContent = layer.lineWidth;
                document.getElementById('lineTypeSelect').value = layer.lineType;
            }
            this.ui.updateLayersList();
            this.updateUI();
        }
    }
    
    toggleLayerVisibility(id) {
        if (this.layerManager) {
            this.layerManager.toggleVisibility(id);
        } else {
            const layer = this.layers.get(id);
            if (layer) {
                layer.visible = !layer.visible;
                this.ui.updateLayersList();
                this.render();
            }
        }
    }
    
    toggleLayerLock(id) {
        if (this.layerManager) {
            this.layerManager.toggleLock(id);
        } else {
            const layer = this.layers.get(id);
            if (layer) {
                layer.locked = !layer.locked;
                this.ui.updateLayersList();
            }
        }
    }
    
    toggleLayerFreeze(id) {
        if (this.layerManager) {
            this.layerManager.toggleFreeze(id);
        } else {
            // إضافة دعم التجميد للنظام القديم
            const layer = this.layers.get(id);
            if (layer) {
                // تحقق من أنها ليست الطبقة الحالية
                if (id === this.currentLayerId) {
                    this.updateStatus('Cannot freeze current layer');
                    return;
                }
                
                // إضافة خاصية frozen إذا لم تكن موجودة
                if (layer.frozen === undefined) {
                    layer.frozen = false;
                }
                
                layer.frozen = !layer.frozen;
                
                // إلغاء تحديد الأشكال في الطبقة المجمدة
                if (layer.frozen) {
                    const shapesToDeselect = [];
                    this.selectedShapes.forEach(shape => {
                        if (shape.layerId === id) {
                            shapesToDeselect.push(shape);
                        }
                    });
                    shapesToDeselect.forEach(shape => {
                        this.selectedShapes.delete(shape);
                    });
                }
                
                this.ui.updateLayersList();
                this.render();
            }
        }
    }
    
    renameLayer(id, name) {
        if (this.layerManager) {
            this.layerManager.renameLayer(id, name);
        } else {
            const layer = this.layers.get(id);
            if (layer) {
                layer.name = name;
            }
        }
    }
    
    changeLayerColor(id) {
        const color = prompt('Enter color (hex):', '#ffffff');
        if (color && /^#[0-9A-F]{6}$/i.test(color)) {
            if (this.layerManager) {
                this.layerManager.setLayerColor(id, color);
            } else {
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
    }
    
    // دوال جديدة للطبقات
    deleteLayer(id) {
        if (this.layerManager) {
            return this.layerManager.deleteLayer(id);
        } else {
            // دعم أساسي للحذف في النظام القديم
            if (id === 0) {
                this.updateStatus('Cannot delete Layer 0');
                return false;
            }
            
            if (this.layers.size <= 1) {
                this.updateStatus('Cannot delete the only layer');
                return false;
            }
            
            // نقل الأشكال للطبقة 0
            this.shapes.forEach(shape => {
                if (shape.layerId === id) {
                    shape.layerId = 0;
                }
            });
            
            this.layers.delete(id);
            
            if (this.currentLayerId === id) {
                this.setCurrentLayer(0);
            }
            
            this.render();
            this.ui.updateLayersList();
            return true;
        }
    }
    
    /**
     * تبديل جميع الطبقات
     */
    toggleAllLayers(visible) {
        if (this.layerManager) {
            this.layerManager.toggleAllLayers(visible);
        } else {
            // دعم النظام القديم
            this.layers.forEach((layer, id) => {
                if (id !== this.currentLayerId) {
                    layer.visible = visible;
                }
            });
            
            this.render();
            this.ui.updateLayersList();
        }
    }
    
    matchLayer() {
        if (!this.layerManager) {
            this.updateStatus('Match layer not available');
            return;
        }
        
        // تفعيل وضع اختيار العنصر
        this.updateStatus('Select object to match layer');
        this.pickingPointMode = 'matchLayer';
        this.pickingPointCallback = (point) => {
            const shape = this.getShapeAtPoint(point);
            if (shape) {
                this.layerManager.matchLayer(shape);
            } else {
                this.updateStatus('No object selected');
            }
            this.pickingPointMode = null;
            this.pickingPointCallback = null;
        };
    }
    
    /**
     * تنفيذ Match Properties الصحيح
     */
    matchProperties() {
        // تفعيل وضع اختيار العنصر
        this.updateStatus('Select source object for properties');
        
        // إظهار رسالة المساعدة
        const infoDiv = document.getElementById('matchPropertiesInfo');
        if (infoDiv) {
            infoDiv.style.display = 'block';
        }
        
        // حفظ الأداة الحالية
        const previousTool = this.currentTool;
        
        // تغيير المؤشر
        this.canvas.style.cursor = 'crosshair';
        
        // وضع اختيار المصدر
        this.pickingMode = 'matchPropertiesSource';
        
        // معالج النقر المؤقت
        const handleClick = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const worldPoint = this.screenToWorld(x, y);
            
            if (this.pickingMode === 'matchPropertiesSource') {
                // البحث عن شكل عند النقطة
                const shape = this.getShapeAtPoint(worldPoint);
                
                if (shape) {
                    // حفظ خصائص الشكل المصدر
                    this.matchPropertiesSource = {
                        color: shape.color || this.currentColor,
                        lineType: shape.lineType || this.currentLineType,
                        lineWeight: shape.lineWeight !== undefined ? shape.lineWeight : this.currentLineWeight,
                        lineWidth: shape.lineWidth || this.currentLineWidth,
                        layerId: shape.layerId
                    };
                    
                    // الانتقال لوضع اختيار الهدف
                    this.pickingMode = 'matchPropertiesTarget';
                    this.updateStatus('Select destination objects (ESC to finish)');
                    
                } else {
                    this.updateStatus('No object found, try again');
                }
                
            } else if (this.pickingMode === 'matchPropertiesTarget') {
                // البحث عن شكل الهدف
                const shape = this.getShapeAtPoint(worldPoint);
                
                if (shape) {
                    // تطبيق الخصائص
                    shape.color = this.matchPropertiesSource.color;
                    shape.lineType = this.matchPropertiesSource.lineType;
                    shape.lineWeight = this.matchPropertiesSource.lineWeight;
                    shape.lineWidth = this.matchPropertiesSource.lineWidth;
                    shape.layerId = this.matchPropertiesSource.layerId;
                    
                    this.render();
                    this.updateStatus('Properties applied, click more objects or ESC to finish');
                }
            }
        };
        
        // معالج ESC
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                // إنهاء Match Properties
                this.canvas.removeEventListener('click', handleClick);
                document.removeEventListener('keydown', handleKeyDown);
                
                this.pickingMode = null;
                this.matchPropertiesSource = null;
                this.canvas.style.cursor = 'default';
                
                if (infoDiv) {
                    infoDiv.style.display = 'none';
                }
                
                // العودة للأداة السابقة
                this.setTool(previousTool);
                this.updateStatus('Match Properties cancelled');
            }
        };
        
        // ربط الأحداث
        this.canvas.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleKeyDown);
    }
    
    /**
     * الحصول على الشكل عند نقطة معينة
     */
    getShapeAtPoint(point) {
        // البحث من الأعلى للأسفل (آخر شكل مرسوم يكون في الأعلى)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            
            // التحقق من الطبقة
            const layer = this.getLayer(shape.layerId);
            if (layer && (!layer.visible || layer.locked || layer.frozen)) {
                continue;
            }
            
            if (this.isPointInShape(point, shape)) {
                return shape;
            }
        }
        return null;
    }
    
    /**
     * التحقق من وقوع نقطة داخل شكل
     */
    isPointInShape(point, shape) {
        const tolerance = 5 / this.zoom; // 5 pixels tolerance
        
        switch (shape.type) {
            case 'line':
                return this.isPointOnLine(point.x, point.y, shape.start, shape.end, tolerance);
                
            case 'rectangle':
                const minX = Math.min(shape.start.x, shape.end.x);
                const minY = Math.min(shape.start.y, shape.end.y);
                const maxX = Math.max(shape.start.x, shape.end.x);
                const maxY = Math.max(shape.start.y, shape.end.y);
                
                // Check if on border
                if (Math.abs(point.x - minX) < tolerance || Math.abs(point.x - maxX) < tolerance) {
                    if (point.y >= minY - tolerance && point.y <= maxY + tolerance) return true;
                }
                if (Math.abs(point.y - minY) < tolerance || Math.abs(point.y - maxY) < tolerance) {
                    if (point.x >= minX - tolerance && point.x <= maxX + tolerance) return true;
                }
                return false;
                
            case 'circle':
                const dist = this.distance(point.x, point.y, shape.center.x, shape.center.y);
                return Math.abs(dist - shape.radius) < tolerance;
                
            case 'arc':
                const arcDist = this.distance(point.x, point.y, shape.center.x, shape.center.y);
                if (Math.abs(arcDist - shape.radius) > tolerance) return false;
                
                // Check angle
                let angle = Math.atan2(point.y - shape.center.y, point.x - shape.center.x);
                if (angle < 0) angle += Math.PI * 2;
                
                let start = shape.startAngle;
                let end = shape.endAngle;
                if (start < 0) start += Math.PI * 2;
                if (end < 0) end += Math.PI * 2;
                
                if (start > end) {
                    return angle >= start || angle <= end;
                } else {
                    return angle >= start && angle <= end;
                }
                
            case 'polyline':
                for (let i = 0; i < shape.points.length - 1; i++) {
                    if (this.isPointOnLine(point.x, point.y, shape.points[i], shape.points[i + 1], tolerance)) {
                        return true;
                    }
                }
                return false;
                
            case 'polygon':
                // Check edges
                for (let i = 0; i < shape.points.length; i++) {
                    const next = (i + 1) % shape.points.length;
                    if (this.isPointOnLine(point.x, point.y, shape.points[i], shape.points[next], tolerance)) {
                        return true;
                    }
                }
                return false;
                
            case 'text':
                // Approximate text bounds
                const textWidth = (shape.text || '').length * (shape.fontSize || 12) * 0.6;
                const textHeight = shape.fontSize || 12;
                
                return point.x >= shape.position.x - tolerance &&
                       point.x <= shape.position.x + textWidth + tolerance &&
                       point.y >= shape.position.y - textHeight - tolerance &&
                       point.y <= shape.position.y + tolerance;
                
            default:
                return false;
        }
    }
    
    saveLayerState(stateName) {
        if (this.layerManager) {
            this.layerManager.saveLayerState(stateName);
        }
    }
    
    restoreLayerState(stateName) {
        if (this.layerManager) {
            this.layerManager.restoreLayerState(stateName);
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
            layers: this.layerManager ? this.layerManager.exportLayers() : Array.from(this.layers.entries()),
            units: this.currentUnit,
            version: '3.0'
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
    
    // تحديث دالة التصدير لتضمين أنواع الخطوط
    exportToDXF() {
        let dxf = '0\nSECTION\n2\nHEADER\n';
        dxf += '9\n$ACADVER\n1\nAC1014\n'; // AutoCAD 2000 format
        dxf += '0\nENDSEC\n';
        
        // قسم أنواع الخطوط
        dxf += '0\nSECTION\n2\nTABLES\n';
        dxf += '0\nTABLE\n2\nLTYPE\n';
        
        if (this.linetypeManager) {
            const linetypes = this.linetypeManager.getLinetypesList();
            linetypes.forEach(type => {
                dxf += '0\nLTYPE\n';
                dxf += `2\n${type.name.toUpperCase()}\n`;
                dxf += '70\n0\n'; // Standard flag
                dxf += `3\n${type.description}\n`;
                dxf += '72\n65\n'; // Alignment code
                dxf += `73\n${type.pattern ? type.pattern.length : 0}\n`;
                dxf += '40\n0.0\n'; // Total pattern length
                
                if (type.pattern) {
                    type.pattern.forEach(segment => {
                        dxf += `49\n${segment}\n`;
                        dxf += '74\n0\n'; // Element type
                    });
                }
            });
        }
        
        dxf += '0\nENDTAB\n';
        
        // قسم الطبقات
        dxf += '0\nTABLE\n2\nLAYER\n';
        
        const layers = this.layerManager ? 
            Array.from(this.layerManager.layers.values()) : 
            Array.from(this.layers.values());
        
        layers.forEach(layer => {
            dxf += '0\nLAYER\n';
            dxf += `2\n${layer.name}\n`;
            dxf += '70\n0\n'; // Standard flag
            dxf += `62\n${this.colorToDXF(layer.color)}\n`;
            dxf += `6\n${layer.lineType || 'CONTINUOUS'}\n`;
            
            if (this.linetypeManager && layer.lineWeight !== undefined) {
                const weight = layer.lineWeight === 'bylayer' ? -2 : 
                              layer.lineWeight === 'default' ? -3 : 
                              Math.round(layer.lineWeight * 100);
                dxf += `370\n${weight}\n`;
            }
        });
        
        dxf += '0\nENDTAB\n';
        dxf += '0\nENDSEC\n';
        
        // قسم الكيانات
        dxf += '0\nSECTION\n2\nENTITIES\n';
        
        this.shapes.forEach(shape => {
            dxf += this.shapeToDXF(shape);
        });
        
        dxf += '0\nENDSEC\n';
        dxf += '0\nEOF\n';
        
        // تنزيل الملف
        const blob = new Blob([dxf], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tyrexcad_export.dxf';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // دالة مساعدة لتحويل الشكل إلى DXF
    shapeToDXF(shape) {
        let dxf = '';
        const layer = this.layerManager ? 
            this.layerManager.layers.get(shape.layerId) : 
            this.layers.get(shape.layerId);
        
        const layerName = layer ? layer.name : 'Layer 0';
        const lineType = shape.lineType || 'CONTINUOUS';
        
        // خصائص مشتركة
        const commonProps = () => {
            let props = `8\n${layerName}\n`; // Layer
            props += `6\n${lineType.toUpperCase()}\n`; // Linetype
            
            if (this.linetypeManager && shape.lineWeight !== undefined) {
                const weight = shape.lineWeight === 'bylayer' ? -2 : 
                              shape.lineWeight === 'default' ? -3 : 
                              Math.round(shape.lineWeight * 100);
                props += `370\n${weight}\n`;
            }
            
            return props;
        };
        
        switch (shape.type) {
            case 'line':
                dxf += '0\nLINE\n';
                dxf += commonProps();
                dxf += `10\n${shape.start.x}\n20\n${shape.start.y}\n30\n0.0\n`;
                dxf += `11\n${shape.end.x}\n21\n${shape.end.y}\n31\n0.0\n`;
                break;
                
            case 'circle':
                dxf += '0\nCIRCLE\n';
                dxf += commonProps();
                dxf += `10\n${shape.center.x}\n20\n${shape.center.y}\n30\n0.0\n`;
                dxf += `40\n${shape.radius}\n`;
                break;
                
            case 'arc':
                dxf += '0\nARC\n';
                dxf += commonProps();
                dxf += `10\n${shape.center.x}\n20\n${shape.center.y}\n30\n0.0\n`;
                dxf += `40\n${shape.radius}\n`;
                dxf += `50\n${shape.startAngle * 180 / Math.PI}\n`;
                dxf += `51\n${shape.endAngle * 180 / Math.PI}\n`;
                break;
                
            case 'polyline':
                dxf += '0\nLWPOLYLINE\n';
                dxf += commonProps();
                dxf += `90\n${shape.points.length}\n`; // عدد النقاط
                dxf += '70\n0\n'; // مفتوح
                shape.points.forEach(pt => {
                    dxf += `10\n${pt.x}\n20\n${pt.y}\n`;
                });
                break;
                
            // ... باقي الأشكال
        }
        
        return dxf;
    }
    
    // دالة مساعدة لتحويل اللون إلى كود DXF
    colorToDXF(color) {
        // تحويل hex إلى أقرب لون AutoCAD
        const colors = {
            '#ff0000': 1, // Red
            '#ffff00': 2, // Yellow
            '#00ff00': 3, // Green
            '#00ffff': 4, // Cyan
            '#0000ff': 5, // Blue
            '#ff00ff': 6, // Magenta
            '#ffffff': 7, // White
            '#808080': 8, // Gray
            '#c0c0c0': 9  // Light gray
        };
        
        return colors[color.toLowerCase()] || 7; // افتراضي: أبيض
    }
    
    loadData(data) {
        this.shapes = data.shapes || [];
        
        // استيراد الطبقات
        if (this.layerManager && data.layers) {
            this.layerManager.importLayers(data.layers);
        } else if (data.layers) {
            this.layers.clear();
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
        // تنظيف العمليات
        this.cleanupCurrentOperation();
        
        // أخبر ToolsManager عن الإلغاء
        if (this.toolsManager) {
            this.toolsManager.cancelCurrentOperation();
        }
        
        // إذا كنا في أداة غير select، ارجع لها
        if (this.currentTool !== 'select') {
            // لا نستدعي setTool لتجنب recursion
            const previousTool = this.currentTool;
            this.currentTool = 'select';
            
            // تحديث UI مباشرة
            document.getElementById('statusTool').textContent = 'SELECT';
            this.canvas.style.cursor = 'default';
            
            // تحديث أزرار الأدوات
            document.querySelectorAll('.ribbon-tool').forEach(el => {
                el.classList.remove('active');
            });
            document.querySelectorAll('.ribbon-tool').forEach(el => {
                if (el.onclick && el.onclick.toString().includes("'select'")) {
                    el.classList.add('active');
                }
            });
            
            // تفعيل أداة select
            if (this.toolsManager) {
                try {
                    this.toolsManager.activateTool('select');
                } catch (error) {
                    console.warn('Failed to activate select tool:', error);
                }
            }
            
            // حفظ الأداة السابقة
            if (previousTool !== 'select') {
                this.lastTool = previousTool;
            }
        } else {
            // إذا كنا في select، امسح التحديد فقط
            this.selectedShapes.clear();
            if (this.previewShapes) {
                this.previewShapes.clear();
            }
            this.ui.updatePropertiesPanel();
        }
        
        this.updateStatus('READY');
        this.render();
    }
    
    /**
     * إضافة شكل جديد
     * @param {Object} shape - الشكل المراد إضافته
     */
    addShape(shape) {
        // التأكد من وجود ID
        if (!shape.id) {
            shape.id = this.generateId();
        }
        
        // التأكد من وجود layerId
        if (shape.layerId === undefined) {
            shape.layerId = this.layerManager ? this.layerManager.currentLayerId : this.currentLayerId;
        }
        
        // تطبيق خصائص الخط
        if (this.linetypeManager) {
            shape = this.linetypeManager.applyLineProperties(shape);
        } else {
            // Fallback للنظام القديم
            if (!shape.lineType) shape.lineType = this.currentLineType;
            if (shape.lineWeight === undefined) shape.lineWeight = this.currentLineWeight;
            if (!shape.color) shape.color = this.currentColor;
            if (!shape.lineWidth) shape.lineWidth = this.currentLineWidth;
        }
        
        // تطبيق خصائص الطبقة
        if (this.layerManager) {
            shape = this.layerManager.applyLayerProperties(shape);
        }
        
        // إضافة الشكل
        this.shapes.push(shape);
        
        // تسجيل في History
        this.recordState();
        
        // تحديث العرض
        this.render();
        
        return shape;
    }
    
    /**
     * استنساخ شكل مع جميع خصائصه
     * @param {Object} shape - الشكل المراد استنساخه
     * @returns {Object} نسخة جديدة من الشكل
     */
    cloneShape(shape) {
        // نسخ عميق للشكل
        const clone = JSON.parse(JSON.stringify(shape));
        
        // إنشاء ID جديد للنسخة
        clone.id = this.generateId();
        
        // إزاحة بسيطة للتمييز
        const offset = 10 / this.zoom;
        
        // معالجة خاصة لبعض الأنواع مع إضافة إزاحة
        switch (shape.type) {
            case 'line':
                clone.start.x += offset;
                clone.start.y += offset;
                clone.end.x += offset;
                clone.end.y += offset;
                break;
                
            case 'rectangle':
                clone.start.x += offset;
                clone.start.y += offset;
                clone.end.x += offset;
                clone.end.y += offset;
                break;
                
            case 'circle':
            case 'arc':
            case 'ellipse':
                clone.center.x += offset;
                clone.center.y += offset;
                break;
                
            case 'polyline':
            case 'polygon':
                // التأكد من نسخ array النقاط بشكل صحيح
                clone.points = shape.points.map(p => ({ 
                    x: p.x + offset, 
                    y: p.y + offset 
                }));
                break;
                
            case 'text':
                // التأكد من نسخ خصائص النص
                clone.text = shape.text;
                clone.position.x += offset;
                clone.position.y += offset;
                break;
                
            case 'dimension-linear':
            case 'dimension-angular':
            case 'dimension-radius':
            case 'dimension-diameter':
                // نسخ خصائص الأبعاد
                if (shape.points) {
                    clone.points = shape.points.map(p => ({ x: p.x, y: p.y }));
                }
                break;
        }
        
        return clone;
    }
    
    /**
     * حساب المسافة بين نقطتين
     * @param {number} x1 - إحداثي X للنقطة الأولى
     * @param {number} y1 - إحداثي Y للنقطة الأولى
     * @param {number} x2 - إحداثي X للنقطة الثانية
     * @param {number} y2 - إحداثي Y للنقطة الثانية
     * @returns {number} المسافة بين النقطتين
     */
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
    applyFilletWithOptions(options) {
        const geo = this.loadAdvancedGeometry();
        if (!geo) {
            this.updateStatus('Advanced geometry not available');
            return;
        }
        
        const selected = Array.from(this.selectedShapes);
        
        // إذا كان polyline mode مفعل
        if (options.polyline && selected.length === 1 && selected[0].type === 'polyline') {
            try {
                this.recordState();
                const result = geo.filletPolygon(selected[0], options.radius);
                
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
                    const result = geo.fillet(selected[i], selected[i + 1], options.radius);
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
    applyChamferWithOptions(options) {
        const geo = this.loadAdvancedGeometry();
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
                    const result = geo.chamfer(selected[i], selected[i + 1], distance1, distance2);
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
    applyRectangularArrayWithOptions(options) {
        const geo = this.loadAdvancedGeometry();
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
    applyPolarArrayWithOptions(options) {
        const geo = this.loadAdvancedGeometry();
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
    applyPathArrayWithOptions(options) {
        const geo = this.loadAdvancedGeometry();
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
    convertToPolyline(segments = 32) {
        const geo = this.loadAdvancedGeometry();
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
    simplifyPolyline(tolerance) {
        const geo = this.loadAdvancedGeometry();
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
    smoothPolyline(iterations) {
        const geo = this.loadAdvancedGeometry();
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
    
    // ==================== دوال مساعدة إضافية ====================
    
    /**
     * عرض المسافة بين نقطتين
     */
    showDistance() {
        if (this.distanceFirstPoint && this.distanceSecondPoint) {
            const distance = this.distance(
                this.distanceFirstPoint.x,
                this.distanceFirstPoint.y,
                this.distanceSecondPoint.x,
                this.distanceSecondPoint.y
            );
            
            const dx = this.distanceSecondPoint.x - this.distanceFirstPoint.x;
            const dy = this.distanceSecondPoint.y - this.distanceFirstPoint.y;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            const message = `
Distance: ${distance.toFixed(2)} units
ΔX: ${Math.abs(dx).toFixed(2)}
ΔY: ${Math.abs(dy).toFixed(2)}
Angle: ${angle.toFixed(2)}°
            `.trim();
            
            if (this.ui) {
                this.ui.showInfo(message);
            } else {
                alert(message);
            }
            
            this.distanceFirstPoint = null;
            this.distanceSecondPoint = null;
        }
    }
    
    /**
     * معالجة اختيار شكل لحساب المساحة
     */
    handleAreaPick(point) {
        // ابحث عن الشكل عند النقطة
        const shape = this.getShapeAt(point.x, point.y);
        
        if (shape) {
            // احسب المساحة حسب نوع الشكل
            let area = 0;
            let perimeter = 0;
            
            switch (shape.type) {
                case 'rectangle':
                    const width = Math.abs(shape.end.x - shape.start.x);
                    const height = Math.abs(shape.end.y - shape.start.y);
                    area = width * height;
                    perimeter = 2 * (width + height);
                    break;
                    
                case 'circle':
                    area = Math.PI * shape.radius * shape.radius;
                    perimeter = 2 * Math.PI * shape.radius;
                    break;
                    
                case 'polygon':
                case 'polyline':
                    if (shape.closed) {
                        area = this.calculatePolygonArea(shape.points);
                        perimeter = this.calculatePolygonPerimeter(shape.points, true);
                    } else {
                        area = 0;
                        perimeter = this.calculatePolygonPerimeter(shape.points, false);
                    }
                    break;
            }
            
            const message = `
Shape: ${shape.type}
Area: ${area.toFixed(2)} sq units
Perimeter: ${perimeter.toFixed(2)} units
            `.trim();
            
            if (this.ui) {
                this.ui.showInfo(message);
            } else {
                alert(message);
            }
        } else {
            this.updateStatus('No shape found at this point');
        }
        
        this.pickingPointMode = null;
    }
    
    /**
     * حساب مساحة مضلع
     */
    calculatePolygonArea(points) {
        let area = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        
        return Math.abs(area / 2);
    }
    
    /**
     * حساب محيط مضلع
     */
    calculatePolygonPerimeter(points, closed) {
        let perimeter = 0;
        const n = points.length;
        
        for (let i = 0; i < n - 1; i++) {
            perimeter += this.distance(
                points[i].x, points[i].y,
                points[i + 1].x, points[i + 1].y
            );
        }
        
        // إذا كان مغلقاً، أضف المسافة من آخر نقطة للأولى
        if (closed && n > 2) {
            perimeter += this.distance(
                points[n - 1].x, points[n - 1].y,
                points[0].x, points[0].y
            );
        }
        
        return perimeter;
    }
    
    /**
     * تطبيق التحريك
     */
    applyMove() {
        if (this.moveBasePoint && this.moveTargetPoint) {
            const dx = this.moveTargetPoint.x - this.moveBasePoint.x;
            const dy = this.moveTargetPoint.y - this.moveBasePoint.y;
            
            this.recordState();
            
            this.selectedShapes.forEach(shape => {
                this.translateShape(shape, dx, dy);
            });
            
            this.moveBasePoint = null;
            this.moveTargetPoint = null;
            this.updateStatus('Objects moved');
            this.render();
        }
    }
    
    /**
     * بدء عملية الدوران
     */
    startRotation() {
        if (this.rotateBasePoint && this.selectedShapes.size > 0) {
            this.updateStatus('ROTATE: Specify rotation angle or second point');
            this.isRotating = true;
            // يمكنك إضافة المزيد من المنطق هنا
        }
    }
    
    /**
     * بدء عملية التحجيم
     */
    startScaling() {
        if (this.scaleBasePoint && this.selectedShapes.size > 0) {
            this.updateStatus('SCALE: Specify scale factor or second point');
            this.isScaling = true;
            // يمكنك إضافة المزيد من المنطق هنا
        }
    }
    
    /**
     * تطبيق الانعكاس
     */
    applyMirror() {
        if (this.mirrorFirstPoint && this.mirrorSecondPoint) {
            this.recordState();
            
            const mirrorLine = {
                start: this.mirrorFirstPoint,
                end: this.mirrorSecondPoint
            };
            
            this.selectedShapes.forEach(shape => {
                const mirrored = this.mirrorShapeComplete(shape, mirrorLine);
                if (mirrored) {
                    this.shapes.push(mirrored);
                }
            });
            
            this.mirrorFirstPoint = null;
            this.mirrorSecondPoint = null;
            this.updateStatus('Objects mirrored');
            this.render();
        }
    }
    
    /**
     * انعكاس شكل كامل
     */
    mirrorShapeComplete(shape, mirrorLine) {
        const mirrored = this.cloneShape(shape);
        mirrored.id = this.generateId();
        
        // حساب الانعكاس حسب نوع الشكل
        switch (shape.type) {
            case 'line':
                mirrored.start = this.mirrorPoint(shape.start, mirrorLine);
                mirrored.end = this.mirrorPoint(shape.end, mirrorLine);
                break;
                
            case 'rectangle':
                mirrored.start = this.mirrorPoint(shape.start, mirrorLine);
                mirrored.end = this.mirrorPoint(shape.end, mirrorLine);
                break;
                
            case 'circle':
            case 'arc':
                mirrored.center = this.mirrorPoint(shape.center, mirrorLine);
                if (shape.type === 'arc') {
                    // عكس زوايا القوس
                    const startPoint = {
                        x: shape.center.x + shape.radius * Math.cos(shape.startAngle),
                        y: shape.center.y + shape.radius * Math.sin(shape.startAngle)
                    };
                    const endPoint = {
                        x: shape.center.x + shape.radius * Math.cos(shape.endAngle),
                        y: shape.center.y + shape.radius * Math.sin(shape.endAngle)
                    };
                    
                    const mirroredStart = this.mirrorPoint(startPoint, mirrorLine);
                    const mirroredEnd = this.mirrorPoint(endPoint, mirrorLine);
                    
                    mirrored.startAngle = Math.atan2(
                        mirroredStart.y - mirrored.center.y,
                        mirroredStart.x - mirrored.center.x
                    );
                    mirrored.endAngle = Math.atan2(
                        mirroredEnd.y - mirrored.center.y,
                        mirroredEnd.x - mirrored.center.x
                    );
                }
                break;
                
            case 'polyline':
            case 'polygon':
                mirrored.points = shape.points.map(p => this.mirrorPoint(p, mirrorLine));
                break;
        }
        
        return mirrored;
    }
    
    /**
     * انعكاس نقطة عبر خط
     */
    mirrorPoint(point, mirrorLine) {
        // حساب نقطة الانعكاس عبر خط
        const dx = mirrorLine.end.x - mirrorLine.start.x;
        const dy = mirrorLine.end.y - mirrorLine.start.y;
        const a = dy;
        const b = -dx;
        const c = dx * mirrorLine.start.y - dy * mirrorLine.start.x;
        
        const denom = a * a + b * b;
        if (Math.abs(denom) < 1e-10) return point;
        
        const x = point.x;
        const y = point.y;
        
        const mirroredX = x - 2 * a * (a * x + b * y + c) / denom;
        const mirroredY = y - 2 * b * (a * x + b * y + c) / denom;
        
        return { x: mirroredX, y: mirroredY };
    }
}


// في نهاية الملف
window.TyrexCAD = TyrexCAD;
export { TyrexCAD };