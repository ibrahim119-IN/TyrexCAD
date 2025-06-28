// ==================== js/tools/ToolsManager.js ====================

/**
 * TyrexCAD Tools Manager
 * مدير الأدوات المركزي - نسخة محدثة ومحسنة
 */

export class ToolsManager {
    constructor() {
        // مرجع لـ CAD instance
        this.cad = null;
        
        // الأدوات المسجلة
        this.tools = new Map();
        
        // cache للأدوات المستخدمة بكثرة
        this.frequentTools = new Map();
        
        // الأداة النشطة حالياً
        this.activeTool = null;
        
        // حالة خاصة بأدوات التعديل (للتوافق مع الكود القديم)
        this.modifyState = {
            originalShapes: [],
            baseDistance: 50,
            trimExtendBoundaries: [],
            offsetDistance: 10
        };
        
        // حالة التحميل
        this.loadingStatus = {
            attempted: false,
            successful: false,
            errors: []
        };
    }
    
    /**
     * تهيئة النظام
     * @param {TyrexCAD} cadInstance - مرجع للنظام الرئيسي
     */
    async init(cadInstance) {
        this.cad = cadInstance;
        console.log('🔧 Initializing Tools Manager...');
        
        try {
            // محاولة تحميل الأدوات المعيارية
            await this.loadModularTools();
        } catch (error) {
            console.warn('⚠️ Failed to load modular tools, using built-in tools:', error);
            // استخدم الأدوات المدمجة كـ fallback
            this.loadBuiltInTools();
        }
        
        console.log(`✅ Tools Manager ready with ${this.tools.size} tools`);
    }
    
    /**
     * تحميل الأدوات المعيارية - نسخة محسنة
     */
    async loadModularTools() {
        this.loadingStatus.attempted = true;
        
        try {
            // Static imports - أسرع بكثير
            const { tools: drawingTools } = await import('./drawing/index.js');
            const { tools: modifyTools } = await import('./modify/index.js');
            const { tools: advancedTools } = await import('./advanced/index.js');
            
            let loadedCount = 0;
            
            // Register drawing tools
            if (drawingTools) {
                Object.entries(drawingTools).forEach(([name, ToolClass]) => {
                    if (ToolClass) {
                        try {
                            this.registerTool(name, new ToolClass(this, name));
                            loadedCount++;
                        } catch (err) {
                            console.warn(`Failed to register ${name}:`, err);
                        }
                    }
                });
                console.log(`✅ Loaded ${Object.keys(drawingTools).length} drawing tools`);
            }
            
            // Register modify tools
            if (modifyTools) {
                Object.entries(modifyTools).forEach(([name, ToolClass]) => {
                    if (ToolClass) {
                        try {
                            this.registerTool(name, new ToolClass(this, name));
                            loadedCount++;
                        } catch (err) {
                            console.warn(`Failed to register ${name}:`, err);
                        }
                    }
                });
                console.log(`✅ Loaded ${Object.keys(modifyTools).length} modify tools`);
            }
            
            // Register advanced tools
            if (advancedTools) {
                Object.entries(advancedTools).forEach(([name, ToolClass]) => {
                    if (ToolClass) {
                        try {
                            this.registerTool(name, new ToolClass(this, name));
                            loadedCount++;
                        } catch (err) {
                            console.warn(`Failed to register ${name}:`, err);
                        }
                    }
                });
                console.log(`✅ Loaded ${Object.keys(advancedTools).length} advanced tools`);
            }
            
            // إذا لم يتم تحميل أي أدوات، استخدم المدمجة
            if (loadedCount === 0) {
                throw new Error('No modular tools loaded successfully');
            }
            
            this.loadingStatus.successful = true;
            
        } catch (error) {
            console.error('Failed to load modular tools:', error);
            throw error;
        }
    }
    
    /**
     * تحميل الأدوات المدمجة (Fallback)
     */
    loadBuiltInTools() {
        console.log('📦 Loading built-in tools...');
        
        // Base Tool Class
        class BaseTool {
            constructor(cad) {
                this.cad = cad;
                this.name = 'base';
                this.active = false;
                this.isDrawing = false;
                this.cursor = 'crosshair';
            }
            
            activate() {
                this.active = true;
                this.reset();
                console.log(`${this.name} tool activated`);
            }
            
            deactivate() {
                this.active = false;
                this.reset();
            }
            
            reset() {
                this.isDrawing = false;
                this.cad.isDrawing = false;
                this.cad.tempShape = null;
                this.cad.drawingPoints = [];
            }
            
            onMouseDown(point) {}
            onMouseMove(point) {}
            onMouseUp(point) {}
            onKeyDown(e) {
                if (e.key === 'Escape') {
                    this.reset();
                    this.cad.render();
                }
            }
        }
        
        // Line Tool
        class LineTool extends BaseTool {
            constructor(cad) {
                super(cad);
                this.name = 'line';
                this.startPoint = null;
            }
            
            reset() {
                super.reset();
                this.startPoint = null;
            }
            
            onMouseDown(point) {
                if (!this.startPoint) {
                    this.startPoint = point;
                    this.cad.isDrawing = true;
                    this.cad.drawingPoints = [point];
                    this.cad.updateStatus('Specify second point');
                } else {
                    const shape = {
                        type: 'line',
                        start: this.startPoint,
                        end: point,
                        color: this.cad.currentColor,
                        lineWidth: this.cad.currentLineWidth,
                        lineType: this.cad.currentLineType,
                        layerId: this.cad.currentLayerId,
                        id: this.cad.generateId()
                    };
                    
                    this.cad.addShape(shape);
                    this.reset();
                    this.cad.updateStatus('Line created');
                }
            }
            
            onMouseMove(point) {
                if (this.startPoint && this.cad.isDrawing) {
                    this.cad.tempShape = {
                        type: 'line',
                        start: this.startPoint,
                        end: point,
                        color: this.cad.currentColor,
                        lineWidth: this.cad.currentLineWidth,
                        lineType: this.cad.currentLineType
                    };
                    this.cad.render();
                }
            }
        }
        
        // Circle Tool
        class CircleTool extends BaseTool {
            constructor(cad) {
                super(cad);
                this.name = 'circle';
                this.centerPoint = null;
            }
            
            reset() {
                super.reset();
                this.centerPoint = null;
            }
            
            onMouseDown(point) {
                if (!this.centerPoint) {
                    this.centerPoint = point;
                    this.cad.isDrawing = true;
                    this.cad.drawingPoints = [point];
                    this.cad.updateStatus('Specify radius');
                } else {
                    const radius = this.cad.distance(
                        this.centerPoint.x, this.centerPoint.y,
                        point.x, point.y
                    );
                    
                    if (radius > 0.1) {
                        const shape = {
                            type: 'circle',
                            center: this.centerPoint,
                            radius: radius,
                            color: this.cad.currentColor,
                            lineWidth: this.cad.currentLineWidth,
                            lineType: this.cad.currentLineType,
                            layerId: this.cad.currentLayerId,
                            id: this.cad.generateId()
                        };
                        
                        this.cad.addShape(shape);
                    }
                    
                    this.reset();
                    this.cad.updateStatus('Circle created');
                }
            }
            
            onMouseMove(point) {
                if (this.centerPoint && this.cad.isDrawing) {
                    const radius = this.cad.distance(
                        this.centerPoint.x, this.centerPoint.y,
                        point.x, point.y
                    );
                    
                    this.cad.tempShape = {
                        type: 'circle',
                        center: this.centerPoint,
                        radius: radius,
                        color: this.cad.currentColor,
                        lineWidth: this.cad.currentLineWidth,
                        lineType: this.cad.currentLineType
                    };
                    this.cad.render();
                }
            }
        }
        
        // Rectangle Tool
        class RectangleTool extends BaseTool {
            constructor(cad) {
                super(cad);
                this.name = 'rectangle';
                this.startPoint = null;
            }
            
            reset() {
                super.reset();
                this.startPoint = null;
            }
            
            onMouseDown(point) {
                if (!this.startPoint) {
                    this.startPoint = point;
                    this.cad.isDrawing = true;
                    this.cad.drawingPoints = [point];
                    this.cad.updateStatus('Specify opposite corner');
                } else {
                    const shape = {
                        type: 'rectangle',
                        start: this.startPoint,
                        end: point,
                        color: this.cad.currentColor,
                        lineWidth: this.cad.currentLineWidth,
                        lineType: this.cad.currentLineType,
                        layerId: this.cad.currentLayerId,
                        id: this.cad.generateId()
                    };
                    
                    this.cad.addShape(shape);
                    this.reset();
                    this.cad.updateStatus('Rectangle created');
                }
            }
            
            onMouseMove(point) {
                if (this.startPoint && this.cad.isDrawing) {
                    this.cad.tempShape = {
                        type: 'rectangle',
                        start: this.startPoint,
                        end: point,
                        color: this.cad.currentColor,
                        lineWidth: this.cad.currentLineWidth,
                        lineType: this.cad.currentLineType
                    };
                    this.cad.render();
                }
            }
        }
        
        // Polyline Tool
        class PolylineTool extends BaseTool {
            constructor(cad) {
                super(cad);
                this.name = 'polyline';
                this.points = [];
            }
            
            reset() {
                super.reset();
                this.points = [];
            }
            
            onMouseDown(point) {
                this.points.push(point);
                this.cad.isDrawing = true;
                this.cad.drawingPoints = [...this.points];
                
                if (this.points.length === 1) {
                    this.cad.updateStatus('Specify next point (Enter to finish, Esc to cancel)');
                } else {
                    this.cad.updateStatus(`Point ${this.points.length} added`);
                }
            }
            
            onMouseMove(point) {
                if (this.points.length > 0 && this.cad.isDrawing) {
                    this.cad.tempShape = {
                        type: 'polyline',
                        points: [...this.points, point],
                        color: this.cad.currentColor,
                        lineWidth: this.cad.currentLineWidth,
                        lineType: this.cad.currentLineType
                    };
                    this.cad.render();
                }
            }
            
            onKeyDown(e) {
                if (e.key === 'Enter' && this.points.length > 1) {
                    this.finishPolyline();
                } else if (e.key === 'Escape') {
                    this.reset();
                    this.cad.render();
                    this.cad.updateStatus('Polyline cancelled');
                }
            }
            
            finishPolyline() {
                if (this.points.length > 1) {
                    const shape = {
                        type: 'polyline',
                        points: [...this.points],
                        color: this.cad.currentColor,
                        lineWidth: this.cad.currentLineWidth,
                        lineType: this.cad.currentLineType,
                        layerId: this.cad.currentLayerId,
                        id: this.cad.generateId()
                    };
                    
                    this.cad.addShape(shape);
                    this.reset();
                    this.cad.updateStatus('Polyline created');
                }
            }
        }
        
        // تسجيل الأدوات المدمجة
        this.registerTool('line', new LineTool(this.cad));
        this.registerTool('circle', new CircleTool(this.cad));
        this.registerTool('rectangle', new RectangleTool(this.cad));
        this.registerTool('polyline', new PolylineTool(this.cad));
        
        console.log('✅ Loaded 4 built-in tools');
    }
    
    /**
     * تسجيل أداة جديدة مع cache للأدوات المستخدمة بكثرة
     */
    registerTool(name, tool) {
        if (!tool || typeof tool !== 'object') {
            console.error(`Invalid tool for ${name}:`, tool);
            return;
        }
        
        this.tools.set(name, tool);
        
        // Cache للأدوات المستخدمة بكثرة
        const frequentToolNames = ['line', 'circle', 'rectangle', 'move', 'select', 'polyline'];
        if (frequentToolNames.includes(name)) {
            this.frequentTools.set(name, tool);
        }
        
        console.log(`📌 Registered tool: ${name}`);
    }
    
    /**
     * تفعيل أداة - نسخة محسنة
     */
    activateTool(name, options = {}) {
        // Fast path للأدوات المستخدمة بكثرة
        let tool = this.frequentTools.get(name) || this.tools.get(name);
        
        if (!tool) {
            console.warn(`Tool not found: ${name}`);
            return false;
        }
        
        // إلغاء تفعيل الأداة الحالية إذا كانت مختلفة
        if (this.activeTool && this.activeTool !== tool) {
            this.activeTool.deactivate();
        }
        
        this.activeTool = tool;
        
        // تمرير الخيارات إذا كانت الأداة تدعمها
        if (tool.setOptions && typeof tool.setOptions === 'function') {
            tool.setOptions(options);
        }
        
        // تفعيل الأداة
        tool.activate();
        
        // تحديث المؤشر إذا كان مدعوماً
        if (this.cad && this.cad.canvas) {
            this.cad.canvas.style.cursor = tool.cursor || 'crosshair';
        }
        
        return true;
    }
    
    /**
     * إلغاء تفعيل الأداة الحالية
     */
    deactivateCurrentTool() {
        if (this.activeTool) {
            this.activeTool.deactivate();
            this.activeTool = null;
        }
    }
    
    /**
     * الحصول على قائمة الأدوات المتاحة
     */
    getAvailableTools() {
        return Array.from(this.tools.keys());
    }
    
    /**
     * الحصول على معلومات الأداة
     */
    getToolInfo(name) {
        const tool = this.tools.get(name);
        if (tool) {
            return {
                name: tool.name || name,
                active: tool === this.activeTool,
                hasOptions: typeof tool.getOptions === 'function',
                options: tool.getOptions ? tool.getOptions() : null
            };
        }
        return null;
    }
    
    // ==================== دوال التوافق مع TyrexCAD ====================
    
    /**
     * معالج حركة الماوس (مطلوب من TyrexCAD.js)
     */
    handleMouseMove(point) {
        if (this.activeTool) {
            if (this.activeTool.onMouseMove) {
                this.activeTool.onMouseMove(point);
            } else if (this.activeTool.handleMouseMove) {
                this.activeTool.handleMouseMove(point);
            }
        }
        
        // تحديث المعاينة إذا كان هناك رسم جاري
        if (this.cad && this.cad.isDrawing) {
            this.cad.render();
        }
    }
    
    /**
     * معالج ضغط المفاتيح (مطلوب من TyrexCAD.js)
     */
    handleKeyPress(key) {
        if (this.activeTool) {
            // Handle special keys
            if (key === 'Enter') {
                if (this.activeTool.name === 'polyline' && this.activeTool.finishPolyline) {
                    this.activeTool.finishPolyline();
                } else if (this.activeTool.onKeyPress) {
                    this.activeTool.onKeyPress(key);
                } else if (this.activeTool.onKeyDown) {
                    this.activeTool.onKeyDown({ key: key });
                }
            } else if (key === 'Escape') {
                if (this.activeTool.onKeyPress) {
                    this.activeTool.onKeyPress(key);
                } else if (this.activeTool.onKeyDown) {
                    this.activeTool.onKeyDown({ key: key });
                }
            } else {
                // Regular keys
                if (this.activeTool.onKeyPress) {
                    this.activeTool.onKeyPress(key);
                } else if (this.activeTool.onKeyDown) {
                    this.activeTool.onKeyDown({ key: key });
                }
            }
        }
    }
    
    /**
     * معالج النقر (للتوافق مع handleDrawing في TyrexCAD)
     */
    handleClick(point) {
        if (this.activeTool) {
            if (this.activeTool.onClick) {
                this.activeTool.onClick(point);
            } else if (this.activeTool.onMouseDown) {
                this.activeTool.onMouseDown(point);
            } else if (this.activeTool.handleClick) {
                this.activeTool.handleClick(point);
            }
        }
    }
    
    /**
     * معالج رفع الماوس
     */
    handleMouseUp(point) {
        if (this.activeTool && this.activeTool.onMouseUp) {
            this.activeTool.onMouseUp(point);
        }
    }
    
    /**
     * الحصول على الأداة النشطة
     */
    getActiveTool() {
        return this.activeTool;
    }
    
    /**
     * التحقق من وجود أداة نشطة
     */
    hasActiveTool() {
        return this.activeTool !== null;
    }
    
    /**
     * إلغاء العملية الحالية
     */
    cancelCurrentOperation() {
        this.deactivateCurrentTool();
        if (this.cad) {
            this.cad.isDrawing = false;
            this.cad.tempShape = null;
            this.cad.drawingPoints = [];
            this.cad.render();
        }
    }
    
    /**
     * إعادة تعيين حالة الرسم
     */
    resetDrawingState() {
        if (this.cad) {
            this.cad.isDrawing = false;
            this.cad.tempShape = null;
            this.cad.drawingPoints = [];
        }
    }
    
    /**
     * تحديث معاينة الرسم
     */
    updateDrawingPreview() {
        if (this.activeTool && this.cad && this.cad.isDrawing) {
            const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
            const snapPoint = this.cad.getSnapPoint(world.x, world.y);
            this.handleMouseMove(snapPoint);
        }
    }
    
    /**
     * delegateToTool - للتوافق مع TyrexCAD
     */
    delegateToTool(methodName, ...args) {
        if (this.activeTool && typeof this.activeTool[methodName] === 'function') {
            return this.activeTool[methodName](...args);
        }
        
        // محاولة استدعاء الدالة من wrapper functions
        if (typeof this[methodName] === 'function') {
            return this[methodName](...args);
        }
        
        console.warn(`Method ${methodName} not found in active tool or manager`);
    }
    
    // ==================== Wrapper Functions للتوافق مع الكود القديم ====================
    
    // أدوات الرسم
    drawLine(point) {
        if (!this.activeTool || this.activeTool.name !== 'line') {
            this.activateTool('line');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    drawPolyline(point) {
        if (!this.activeTool || this.activeTool.name !== 'polyline') {
            this.activateTool('polyline');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    finishPolyline() {
        if (this.activeTool && this.activeTool.name === 'polyline') {
            if (this.activeTool.finishPolyline) {
                this.activeTool.finishPolyline();
            } else if (this.activeTool.onKeyDown) {
                this.activeTool.onKeyDown({ key: 'Enter' });
            }
        }
    }
    
    drawRectangle(point) {
        if (!this.activeTool || this.activeTool.name !== 'rectangle') {
            this.activateTool('rectangle');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    drawCircle(point) {
        if (!this.activeTool || this.activeTool.name !== 'circle') {
            this.activateTool('circle');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    drawArc(point) {
        if (!this.activeTool || this.activeTool.name !== 'arc') {
            this.activateTool('arc');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    drawEllipse(point) {
        if (!this.activeTool || this.activeTool.name !== 'ellipse') {
            this.activateTool('ellipse');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    drawText(point) {
        if (!this.activeTool || this.activeTool.name !== 'text') {
            this.activateTool('text');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    drawPolygon(point) {
        if (!this.activeTool || this.activeTool.name !== 'polygon') {
            this.activateTool('polygon');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    // أدوات التعديل
    moveStart(point) {
        if (!this.activeTool || this.activeTool.name !== 'move') {
            this.activateTool('move');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    copyStart(point) {
        if (!this.activeTool || this.activeTool.name !== 'copy') {
            this.activateTool('copy');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    rotateStart(point) {
        if (!this.activeTool || this.activeTool.name !== 'rotate') {
            this.activateTool('rotate');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    scaleStart(point) {
        if (!this.activeTool || this.activeTool.name !== 'scale') {
            this.activateTool('scale');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    mirrorStart(point) {
        if (!this.activeTool || this.activeTool.name !== 'mirror') {
            this.activateTool('mirror');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    handleTrim(point) {
        if (!this.activeTool || this.activeTool.name !== 'trim') {
            this.activateTool('trim');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    handleExtend(point) {
        if (!this.activeTool || this.activeTool.name !== 'extend') {
            this.activateTool('extend');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    handleOffset(point) {
        if (!this.activeTool || this.activeTool.name !== 'offset') {
            this.activateTool('offset');
        }
        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(point);
        }
    }
    
    updateOffsetDistance(distance) {
        this.modifyState.offsetDistance = distance;
        if (this.activeTool && this.activeTool.name === 'offset' && this.activeTool.setOptions) {
            this.activeTool.setOptions({ distance: distance });
        }
    }
    
    // دوال للتوافق مع TyrexCAD.js
    performUnion() {
        this.activateTool('union');
    }
    
    performDifference() {
        this.activateTool('difference');
    }
    
    performIntersection() {
        this.activateTool('intersection');
    }
    
    analyzeDistance() {
        this.activateTool('distance-analysis');
    }
    
    analyzeArea() {
        this.activateTool('area-analysis');
    }
    
    analyzeProperties() {
        this.activateTool('properties-analysis');
    }
    
    convertToPolyline() {
        this.activateTool('convert-to-polyline');
    }
    
    simplifyPolyline(tolerance) {
        this.activateTool('simplify-polyline', { tolerance });
    }
    
    smoothPolyline(iterations) {
        this.activateTool('smooth-polyline', { iterations });
    }
    
    // أدوات إضافية
    createFillet() {
        this.activateTool('fillet');
    }
    
    createChamfer() {
        this.activateTool('chamfer');
    }
    
    createRectangularArray() {
        this.activateTool('rectangular-array');
    }
    
    createPolarArray() {
        this.activateTool('polar-array');
    }
    
    createPathArray() {
        this.activateTool('path-array');
    }
    
    // ==================== معلومات التطوير ====================
    
    /**
     * الحصول على معلومات حالة النظام
     */
    getSystemInfo() {
        return {
            totalTools: this.tools.size,
            frequentToolsCount: this.frequentTools.size,
            activeTool: this.activeTool ? this.activeTool.name : 'none',
            loadingStatus: this.loadingStatus,
            availableTools: this.getAvailableTools(),
            modifyState: this.modifyState
        };
    }
    
    /**
     * إعادة تعيين حالة النظام
     */
    resetSystem() {
        this.deactivateCurrentTool();
        this.resetModifyState();
        if (this.cad && this.cad.cancelCurrentOperation) {
            this.cad.cancelCurrentOperation();
        }
        console.log('🔄 Tools system reset');
    }
    
    /**
     * إعادة تعيين حالة التعديل
     */
    resetModifyState() {
        this.modifyState = {
            originalShapes: [],
            baseDistance: 50,
            trimExtendBoundaries: [],
            offsetDistance: 10
        };
    }
}