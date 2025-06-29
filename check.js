// ========== TyrexCAD Complete Diagnostic Script ==========
console.clear();
console.log('%c🔍 Starting TyrexCAD Comprehensive Diagnostic...', 'color: #00d4aa; font-size: 16px; font-weight: bold');

// Test Results Storage
const diagnostics = {
    core: {},
    managers: {},
    tools: {},
    rendering: {},
    events: {},
    errors: []
};

// ========== 1. Core Systems Check ==========
console.log('\n%c1️⃣ Checking Core Systems...', 'color: #ffaa00; font-weight: bold');

// Check if CAD exists
diagnostics.core.cadExists = !!window.cad;
console.log(`✓ CAD Instance: ${diagnostics.core.cadExists ? '✅ Found' : '❌ Missing'}`);

if (!window.cad) {
    console.error('❌ CRITICAL: No CAD instance found! Trying to create one...');
    try {
        window.cad = new window.TyrexCAD();
        console.log('✅ Created new CAD instance');
    } catch (e) {
        console.error('❌ Failed to create CAD:', e);
        diagnostics.errors.push(e);
    }
}

// Check essential properties
const essentialProps = ['canvas', 'ctx', 'shapes', 'render', 'drawShape'];
essentialProps.forEach(prop => {
    diagnostics.core[prop] = !!cad[prop];
    console.log(`✓ cad.${prop}: ${cad[prop] ? '✅' : '❌'}`);
});

// ========== 2. Managers Check ==========
console.log('\n%c2️⃣ Checking Managers...', 'color: #ffaa00; font-weight: bold');

// Layer Manager
diagnostics.managers.layerManager = !!cad.layerManager;
console.log(`✓ Layer Manager: ${cad.layerManager ? '✅' : '❌'}`);

if (cad.layerManager) {
    console.log(`  - Layers count: ${cad.layerManager.layers?.size || 0}`);
    console.log(`  - Current layer ID: ${cad.layerManager.currentLayerId}`);
    console.log(`  - getLayer method: ${typeof cad.layerManager.getLayer === 'function' ? '✅' : '❌'}`);
    
    // Test getLayer
    try {
        const layer0 = cad.layerManager.getLayer(0);
        console.log(`  - Layer 0 exists: ${layer0 ? '✅' : '❌'}`);
    } catch (e) {
        console.error('  - Error calling getLayer:', e);
        diagnostics.errors.push(e);
    }
}

// Linetype Manager
diagnostics.managers.linetypeManager = !!cad.linetypeManager;
console.log(`✓ Linetype Manager: ${cad.linetypeManager ? '✅' : '❌'}`);

if (cad.linetypeManager) {
    console.log(`  - getCurrentLinetype: ${typeof cad.linetypeManager.getCurrentLinetype === 'function' ? '✅' : '❌'}`);
}

// Tools Manager
diagnostics.managers.toolsManager = !!cad.toolsManager;
console.log(`✓ Tools Manager: ${cad.toolsManager ? '✅' : '❌'}`);

if (cad.toolsManager) {
    console.log(`  - Tools count: ${cad.toolsManager.tools?.size || 0}`);
    console.log(`  - Active tool: ${cad.toolsManager.activeTool?.name || 'none'}`);
}

// ========== 3. UI System Check ==========
console.log('\n%c3️⃣ Checking UI System...', 'color: #ffaa00; font-weight: bold');

diagnostics.core.ui = !!cad.ui;
console.log(`✓ UI System: ${cad.ui ? '✅' : '❌'}`);

if (cad.ui) {
    console.log(`  - updateDynamicInput: ${typeof cad.ui.updateDynamicInput === 'function' ? '✅' : '❌'}`);
    console.log(`  - showDynamicInput: ${typeof cad.ui.showDynamicInput === 'function' ? '✅' : '❌'}`);
}

// ========== 4. Drawing Test ==========
console.log('\n%c4️⃣ Testing Drawing Functions...', 'color: #ffaa00; font-weight: bold');

// Test direct shape drawing
try {
    console.log('Testing direct shape addition...');
    const testShape = {
        type: 'line',
        start: {x: 50, y: 50},
        end: {x: 150, y: 150},
        color: '#ff0000',
        lineWidth: 3,
        layerId: 0,
        id: 'test_' + Date.now()
    };
    
    const shapesBefore = cad.shapes.length;
    cad.shapes.push(testShape);
    const shapesAfter = cad.shapes.length;
    
    console.log(`  - Shapes before: ${shapesBefore}`);
    console.log(`  - Shapes after: ${shapesAfter}`);
    console.log(`  - Shape added: ${shapesAfter > shapesBefore ? '✅' : '❌'}`);
    
    // Test render
    console.log('Testing render...');
    cad.render();
    console.log('  - Render completed: ✅');
    
} catch (e) {
    console.error('❌ Drawing test failed:', e);
    diagnostics.errors.push(e);
}

// ========== 5. Event Handlers Check ==========
console.log('\n%c5️⃣ Checking Event Handlers...', 'color: #ffaa00; font-weight: bold');

const eventHandlers = ['onmousedown', 'onmousemove', 'onmouseup', 'onclick'];
eventHandlers.forEach(handler => {
    diagnostics.events[handler] = !!cad.canvas[handler];
    console.log(`✓ canvas.${handler}: ${cad.canvas[handler] ? '✅' : '❌'}`);
});

// ========== 6. Test drawShape Method ==========
console.log('\n%c6️⃣ Testing drawShape Method...', 'color: #ffaa00; font-weight: bold');

try {
    // Check method signature
    console.log(`drawShape parameters expected: ${cad.drawShape.length}`);
    
    // Test with a simple shape
    const ctx = cad.ctx;
    const testShape = {
        type: 'line',
        start: {x: 0, y: 0},
        end: {x: 100, y: 100},
        color: '#00ff00',
        layerId: 0
    };
    
    console.log('Calling drawShape...');
    cad.drawShape(ctx, testShape);
    console.log('✅ drawShape executed without errors');
    
} catch (e) {
    console.error('❌ drawShape test failed:', e);
    diagnostics.errors.push(e);
}

// ========== 7. Fix Attempt ==========
console.log('\n%c7️⃣ Attempting Quick Fixes...', 'color: #00ff00; font-weight: bold');

// Fix missing getLayer if needed
if (cad.layerManager && typeof cad.layerManager.getLayer !== 'function') {
    console.log('Adding missing getLayer method...');
    cad.layerManager.getLayer = function(id) {
        return this.layers.get(id);
    };
    console.log('✅ Added getLayer method');
}

// Fix missing updateDynamicInput
if (cad.ui && typeof cad.ui.updateDynamicInput !== 'function') {
    console.log('Adding missing updateDynamicInput method...');
    cad.ui.updateDynamicInput = function(value) {
        const field = document.getElementById('dynamicField');
        if (field) field.value = value;
    };
    console.log('✅ Added updateDynamicInput method');
}

// Re-bind events if missing
if (!cad.canvas.onmousedown) {
    console.log('Re-binding mouse events...');
    cad.canvas.onmousedown = (e) => cad.onMouseDown(e);
    cad.canvas.onmousemove = (e) => cad.onMouseMove(e);
    cad.canvas.onmouseup = (e) => cad.onMouseUp(e);
    console.log('✅ Mouse events re-bound');
}

// ========== 8. Final Test ==========
console.log('\n%c8️⃣ Final Drawing Test...', 'color: #00ff00; font-weight: bold');

try {
    // Clear and redraw
    cad.ctx.clearRect(0, 0, cad.canvas.width, cad.canvas.height);
    cad.drawGrid();
    
    // Try to activate line tool
    console.log('Activating line tool...');
    cad.setTool('line');
    console.log(`✅ Current tool: ${cad.currentTool}`);
    
    // Simulate a line drawing
    console.log('Simulating line drawing...');
    const startPoint = cad.screenToWorld(100, 100);
    const endPoint = cad.screenToWorld(200, 200);
    
    if (cad.toolsManager && cad.toolsManager.activeTool) {
        cad.toolsManager.handleClick(startPoint);
        cad.toolsManager.handleClick(endPoint);
        console.log('✅ Line drawing simulated');
    }
    
} catch (e) {
    console.error('❌ Final test failed:', e);
    diagnostics.errors.push(e);
}

// ========== Summary Report ==========
console.log('\n%c📊 DIAGNOSTIC SUMMARY', 'color: #00d4aa; font-size: 16px; font-weight: bold');
console.log('================================');

// Count issues
let issues = 0;
Object.values(diagnostics.core).forEach(v => { if (!v) issues++; });
Object.values(diagnostics.managers).forEach(v => { if (!v) issues++; });
Object.values(diagnostics.events).forEach(v => { if (!v) issues++; });

console.log(`Total Issues Found: ${issues + diagnostics.errors.length}`);
console.log(`Errors Encountered: ${diagnostics.errors.length}`);

// Recommendations
console.log('\n%c💡 RECOMMENDATIONS:', 'color: #ffff00; font-weight: bold');

if (!cad.toolsManager) {
    console.log('1. Tools Manager is missing - need to initialize it in app.js');
}

if (!cad.layerManager?.getLayer) {
    console.log('2. LayerManager.getLayer is missing - add the method');
}

if (diagnostics.errors.length > 0) {
    console.log('3. Fix the following errors:');
    diagnostics.errors.forEach((e, i) => {
        console.error(`   Error ${i+1}:`, e.message);
    });
}

console.log('\n%c🔧 Quick Fix Command:', 'color: #00ff00; font-weight: bold');
console.log('Copy and run this to apply all fixes:');
console.log(`
// Quick Fix
if (cad.layerManager && !cad.layerManager.getLayer) {
    cad.layerManager.getLayer = function(id) { return this.layers.get(id); };
}
if (cad.ui && !cad.ui.updateDynamicInput) {
    cad.ui.updateDynamicInput = function(v) { 
        const f = document.getElementById('dynamicField'); 
        if (f) f.value = v; 
    };
}
if (!cad.canvas.onmousedown) {
    cad.canvas.onmousedown = (e) => cad.onMouseDown(e);
    cad.canvas.onmousemove = (e) => cad.onMouseMove(e);
    cad.canvas.onmouseup = (e) => cad.onMouseUp(e);
}
console.log('✅ Fixes applied! Try drawing now.');
`);

console.log('\n%c✅ Diagnostic Complete!', 'color: #00d4aa; font-size: 14px; font-weight: bold');

// Return diagnostic data
diagnostics;