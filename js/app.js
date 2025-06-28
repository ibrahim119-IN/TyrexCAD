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
 * Bind methods for HTML onclick handlers
 */
function bindHTMLMethods(cad) {
    // Direct method exposure for maximum performance
    window.setTool = (tool) => cad.setTool(tool);
    window.activateTool = (tool) => cad.toolsManager?.activateTool(tool);
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
            's': 'scale'
        };
        
        if (shortcuts[e.key] && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            cad.setTool(shortcuts[e.key]);
        }
    });
}