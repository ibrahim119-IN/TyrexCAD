// js/main.js - Entry point for Vite
import * as THREE from 'three';

// Make THREE global immediately
window.THREE = THREE;

// Import core files in correct order (they register themselves globally)
// 1. Core geometry functions first
import './core/Geometry.js';

// 2. Units system
import './core/Units.js';

// 3. Layer and Linetype managers (before UI and TyrexCAD)
import './core/LayerManager.js';
import './core/LinetypeManager.js';

// 4. Grips controller
import './core/GripsController.js';

// 5. UI system (depends on managers)
import './ui/UI.js';

// 6. Main CAD system (depends on everything above)
import './core/TyrexCAD.js';

// 7. Advanced geometry (optional, loaded after core)
import './geometry/GeometryAdvanced.js';

// Wait a bit to ensure all modules are loaded
setTimeout(() => {
    // Create CAD instance after all dependencies are loaded
    if (window.TyrexCAD) {
        window.cad = new window.TyrexCAD();
        console.log('✅ TyrexCAD instance created successfully');
    } else {
        console.error('❌ TyrexCAD class not found!');
    }
}, 100);

// Import and prepare app initialization
import { initializeApp } from './app.js';

// Enhanced initialization with retry logic
function startApp() {
    if (window.cad && window.cad.ready) {
        console.log('✅ CAD is ready, initializing app...');
        initializeApp();
    } else {
        console.log('⏳ Waiting for CAD to be ready...');
        setTimeout(startApp, 100);
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(startApp, 200); // Give time for CAD creation
    });
} else {
    setTimeout(startApp, 200); // Give time for CAD creation
}