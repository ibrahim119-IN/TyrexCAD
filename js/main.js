// js/main.js - Updated for split UI files
import * as THREE from 'three';

// Make THREE global immediately
window.THREE = THREE;

// Import core files in correct order
import './core/Geometry.js';
import './core/Units.js';
import './core/LayerManager.js';
import './core/LinetypeManager.js';
import './core/GripsController.js';
import './ui/UI.js'; // Updated path for UI
import './core/TyrexCAD.js';
import './geometry/GeometryAdvanced.js';

// Import app
import { initializeApp } from './app.js';

// Create CAD when everything is loaded (same as before)
function createCAD() {
    const required = ['Geometry', 'UI', 'LayerManager', 'LinetypeManager', 'TyrexCAD'];
    const missing = required.filter(mod => !window[mod]);
    
    if (missing.length > 0) {
        console.warn('Waiting for modules:', missing);
        setTimeout(createCAD, 50);
        return;
    }
    
    try {
        window.cad = new window.TyrexCAD();
        console.log('✅ TyrexCAD created successfully');
        waitForCAD();
    } catch (error) {
        console.error('❌ Failed to create TyrexCAD:', error);
    }
}

function waitForCAD() {
    if (window.cad && window.cad.ready) {
        console.log('✅ CAD is ready, initializing app...');
        initializeApp();
    } else {
        setTimeout(waitForCAD, 50);
    }
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createCAD, 100);
    });
} else {
    setTimeout(createCAD, 100);
}