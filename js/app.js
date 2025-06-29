// js/app.js - Updated with Phase 1 Tools Support
import { ToolsManager } from './tools/ToolsManager.js';

/**
 * Initialize TyrexCAD with Phase 1 Tools
 */
export async function initializeApp() {
    try {
        console.log('🚀 Initializing TyrexCAD with Phase 1 Tools...');
        
        // CAD instance already created in main.js
        const cad = window.cad;
        
        // Initialize tools
        const toolsManager = new ToolsManager();
        await toolsManager.init(cad);
        cad.toolsManager = toolsManager;
        
        // Register missing basic tools
        registerMissingTools(cad);
        
        // 🆕 Register Phase 1 specific handlers
        registerPhase1Handlers(cad);
        
        // Simple method binding for HTML
        bindHTMLMethods(cad);
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        // Update status with Phase 1 info
        cad.updateStatus('TyrexCAD v3.0 ready with Phase 1 Tools (11 modify tools)');
        
        // 🆕 Log Phase 1 completion
        console.log('✅ Phase 1 Tools loaded successfully:');
        console.log('  🔧 STRETCH - Advanced stretching with crossing window');
        console.log('  ✂️ BREAK - Object breaking between two points');
        console.log('  📍 BREAK AT POINT - Object splitting at single point');
        console.log(`📊 Total tools available: ${toolsManager.tools.size}`);
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        alert('Failed to start TyrexCAD: ' + error.message);
    }
}

/**
 * 🆕 Register Phase 1 specific handlers and utilities
 */
function registerPhase1Handlers(cad) {
    // Phase 1 tool activation helpers
    window.activateStretch = () => cad.toolsManager?.activateTool('stretch');
    window.activateBreak = () => cad.toolsManager?.activateTool('break');
    window.activateBreakAtPoint = () => cad.toolsManager?.activateTool('break-at-point');
    
    // Enhanced selection handlers for Phase 1 tools
    const originalOnMouseDown = cad.onMouseDown;
    cad.onMouseDown = function(e) {
        const result = originalOnMouseDown.call(this, e);
        
        // Handle Phase 1 tool-specific mouse down events
        if (this.toolsManager && this.toolsManager.activeTool) {
            const toolName = this.toolsManager.activeTool.name;
            
            // Special handling for stretch tool selection window
            if (toolName === 'stretch' && this.toolsManager.activeTool.step === 'select') {
                // Let the stretch tool handle its own selection logic
                return;
            }
            
            // Special handling for break tools object selection
            if ((toolName === 'break' || toolName === 'break-at-point') && 
                this.toolsManager.activeTool.step === 'select-object') {
                // Let the break tools handle their own object selection
                return;
            }
        }
        
        return result;
    };
    
    // Enhanced keyboard shortcuts for Phase 1
    const phase1Shortcuts = {
        'KeyB': 'break',
        'KeyS': 'stretch' // when shift is held
    };
    
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        // Phase 1 specific shortcuts
        if (e.code === 'KeyB' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            if (e.shiftKey) {
                cad.setTool('break-at-point');
            } else {
                cad.setTool('break');
            }
        } else if (e.code === 'KeyS' && e.shiftKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            cad.setTool('stretch');
        }
    });
    
    // Phase 1 tool status helpers
    cad.getPhase1ToolsStatus = function() {
        const tools = ['stretch', 'break', 'break-at-point'];
        return tools.map(tool => ({
            name: tool,
            available: this.toolsManager?.tools.has(tool) || false,
            active: this.toolsManager?.activeTool?.name === tool
        }));
    };
    
    console.log('✅ Phase 1 handlers registered successfully');
}

/**
 * Register missing basic tools
 */
function registerMissingTools(cad) {
    const missingTools = {
        'select': {
            name: 'select',
            activate: function() {
                cad.currentTool = 'select';
                cad.cancelCurrentOperation();
                cad.updateStatus('SELECT mode');
                cad.canvas.style.cursor = 'default';
            },
            deactivate: function() {},
            onMouseDown: function() {},
            onMouseMove: function() {},
            onKeyDown: function() {}
        },
        'pan': {
            name: 'pan',
            activate: function() {
                cad.currentTool = 'pan';
                cad.updateStatus('PAN mode - Click and drag to pan');
                cad.canvas.style.cursor = 'grab';
            },
            deactivate: function() {
                cad.canvas.style.cursor = 'default';
            },
            onMouseDown: function() {},
            onMouseMove: function() {},
            onKeyDown: function() {}
        },
        'dimension': {
            name: 'dimension',
            activate: function() {
                cad.updateStatus('Linear dimension - Select first point');
            },
            deactivate: function() {},
            onMouseDown: function(point) {
                // Placeholder for dimension tool
                cad.updateStatus('Dimension tool coming soon');
            },
            onMouseMove: function() {},
            onKeyDown: function() {}
        },
        'dimension-angular': {
            name: 'dimension-angular',
            activate: function() {
                cad.updateStatus('Angular dimension - Coming soon');
            },
            deactivate: function() {},
            onMouseDown: function() {},
            onMouseMove: function() {},
            onKeyDown: function() {}
        },
        'dimension-radius': {
            name: 'dimension-radius',
            activate: function() {
                cad.updateStatus('Radius dimension - Coming soon');
            },
            deactivate: function() {},
            onMouseDown: function() {},
            onMouseMove: function() {},
            onKeyDown: function() {}
        },
        'dimension-diameter': {
            name: 'dimension-diameter',
            activate: function() {
                cad.updateStatus('Diameter dimension - Coming soon');
            },
            deactivate: function() {},
            onMouseDown: function() {},
            onMouseMove: function() {},
            onKeyDown: function() {}
        }
    };
    
    // Register only if not already exists
    Object.entries(missingTools).forEach(([name, tool]) => {
        if (!cad.toolsManager.tools.has(name)) {
            cad.toolsManager.registerTool(name, tool);
        }
    });
}

/**
 * Bind methods for HTML onclick handlers
 */
function bindHTMLMethods(cad) {
    // Direct method exposure for maximum performance
    window.cad = cad; // Ensure global access
    window.setTool = (tool) => cad.setTool(tool);
    window.activateTool = (tool, options) => cad.toolsManager?.activateTool(tool, options);
    
    // File operations
    window.newFile = () => cad.newFile();
    window.openFile = () => cad.openFile();
    window.saveFile = () => cad.saveFile();
    window.exportFile = () => cad.exportFile();
    
    // Selection operations
    window.selectAll = () => cad.selectAll();
    window.deselectAll = () => cad.deselectAll();
    window.deleteSelected = () => cad.deleteSelected();
    
    // History operations
    window.undo = () => cad.undo();
    window.redo = () => cad.redo();
    
    // View operations
    window.zoomExtents = () => cad.zoomExtents();
    window.zoomWindow = () => cad.zoomWindow();
    window.setViewMode = (mode) => cad.setViewMode(mode);
    window.set3DView = (view) => cad.set3DView(view);
    
    // Settings
    window.toggleSnapMenu = () => cad.toggleSnapMenu();
    window.toggleOrtho = () => cad.toggleOrtho();
    window.togglePolar = () => cad.togglePolar();
    window.toggleGrid = () => cad.toggleGrid();
    window.changeUnits = (unit) => cad.changeUnits(unit);
    window.toggleSnapSetting = (setting) => cad.toggleSnapSetting(setting);
    window.setLineWidth = (width) => cad.setLineWidth(width);
    window.setLineType = (type) => cad.setLineType(type);
    window.toggleColorDropdown = () => cad.toggleColorDropdown();
    
    // Layer operations
    window.addLayer = () => cad.addLayer();
    window.togglePropertiesPanel = () => cad.togglePropertiesPanel();
    
    // Dialog operations
    window.cancelInputDialog = () => cad.cancelInputDialog();
    window.confirmInputDialog = () => cad.confirmInputDialog();
    
    // Utility operations
    window.repeatLastCommand = () => cad.repeatLastCommand();
    window.copySelected = () => cad.copySelected();
    window.pasteClipboard = () => cad.pasteClipboard();
    window.selectSimilar = () => cad.selectSimilar();
    window.showProperties = () => cad.showProperties();
    
    // UI specific methods that might be called from tools
    window.showRibbon = (tab) => {
        document.querySelectorAll('.ribbon-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.ribbon-content').forEach(c => c.classList.remove('active'));
        
        const tabElement = Array.from(document.querySelectorAll('.ribbon-tab'))
            .find(t => t.textContent.toLowerCase() === tab.toLowerCase());
        if (tabElement) {
            tabElement.classList.add('active');
            document.getElementById(`ribbon-${tab}`).classList.add('active');
        }
    };
    
    // 🆕 Phase 1 specific tool bindings
    window.stretchObjects = () => cad.setTool('stretch');
    window.breakObjects = () => cad.setTool('break');
    window.breakAtPoint = () => cad.setTool('break-at-point');
    
    // Enhanced keyboard shortcuts including Phase 1
    document.addEventListener('keypress', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        const shortcuts = {
            // Drawing tools
            'l': 'line',
            'c': 'circle',
            'r': 'rectangle',
            'p': 'polyline',
            'a': 'arc',
            'e': 'ellipse',
            't': 'text',
            
            // Modify tools
            'm': 'move',
            'o': 'copy',
            's': 'scale',
            'b': 'break', // 🆕 Phase 1
            
            // Other tools
            'd': 'dimension'
        };
        
        if (shortcuts[e.key] && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            cad.setTool(shortcuts[e.key]);
        }
    });
    
    // Enhanced keyboard handlers including Phase 1
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            cad.undo();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            cad.redo();
        } else if (e.key === 'Delete') {
            cad.deleteSelected();
        } else if (e.key === 'Escape') {
            cad.cancelCurrentOperation();
        } else if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            cad.selectAll();
        }
        
        // 🆕 Phase 1 tool shortcuts (handled in registerPhase1Handlers)
    });
    
    // 🆕 Phase 1 status reporting
    window.getPhase1Status = () => {
        const phase1Tools = ['stretch', 'break', 'break-at-point'];
        const status = {
            phase: 1,
            completed: true,
            tools: phase1Tools.map(tool => ({
                name: tool,
                available: cad.toolsManager?.tools.has(tool) || false,
                loaded: true
            })),
            totalModifyTools: cad.toolsManager?.tools ? 
                Array.from(cad.toolsManager.tools.keys()).filter(name => 
                    ['move', 'copy', 'rotate', 'scale', 'mirror', 'trim', 'extend', 'offset', 'stretch', 'break', 'break-at-point'].includes(name)
                ).length : 0
        };
        return status;
    };
    
    console.log('✅ HTML method bindings completed with Phase 1 support');
}