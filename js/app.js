// js/app.js - Simplified initialization
import { ToolsManager } from './tools/ToolsManager.js';

/**
 * Initialize TyrexCAD
 */
export async function initializeApp() {
    try {
        console.log('🚀 Initializing TyrexCAD...');
        
        // CAD instance already created in main.js
        const cad = window.cad;
        
        // Initialize tools
        const toolsManager = new ToolsManager();
        await toolsManager.init(cad);
        cad.toolsManager = toolsManager;
        
        // Register missing basic tools
        registerMissingTools(cad);
        
        // Simple method binding for HTML
        bindHTMLMethods(cad);
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        // Update status
        cad.updateStatus('Welcome to TyrexCAD Professional v3.0');
        
        console.log('✅ TyrexCAD ready!');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        alert('Failed to start TyrexCAD: ' + error.message);
    }
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
    window.newFile = () => cad.newFile();
    window.openFile = () => cad.openFile();
    window.saveFile = () => cad.saveFile();
    window.exportFile = () => cad.exportFile();
    window.selectAll = () => cad.selectAll();
    window.deselectAll = () => cad.deselectAll();
    window.deleteSelected = () => cad.deleteSelected();
    window.undo = () => cad.undo();
    window.redo = () => cad.redo();
    window.zoomExtents = () => cad.zoomExtents();
    window.zoomWindow = () => cad.zoomWindow();
    window.setViewMode = (mode) => cad.setViewMode(mode);
    window.set3DView = (view) => cad.set3DView(view);
    window.toggleSnapMenu = () => cad.toggleSnapMenu();
    window.toggleOrtho = () => cad.toggleOrtho();
    window.togglePolar = () => cad.togglePolar();
    window.toggleGrid = () => cad.toggleGrid();
    window.changeUnits = (unit) => cad.changeUnits(unit);
    window.toggleSnapSetting = (setting) => cad.toggleSnapSetting(setting);
    window.setLineWidth = (width) => cad.setLineWidth(width);
    window.setLineType = (type) => cad.setLineType(type);
    window.toggleColorDropdown = () => cad.toggleColorDropdown();
    window.addLayer = () => cad.addLayer();
    window.togglePropertiesPanel = () => cad.togglePropertiesPanel();
    window.cancelInputDialog = () => cad.cancelInputDialog();
    window.confirmInputDialog = () => cad.confirmInputDialog();
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
    
    // Keyboard shortcuts
    document.addEventListener('keypress', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        const shortcuts = {
            'l': 'line',
            'c': 'circle',
            'r': 'rectangle',
            'p': 'polyline',
            'a': 'arc',
            'e': 'ellipse',
            't': 'text',
            'm': 'move',
            'o': 'copy',
            's': 'scale',
            'd': 'dimension'
        };
        
        if (shortcuts[e.key] && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            cad.setTool(shortcuts[e.key]);
        }
    });
    
    // Additional keyboard handlers
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
    });
}