// js/main.js - Entry point for Vite
import * as THREE from 'three';

// Import core files as side effects (they register themselves globally)
import './core/Geometry.js';
import './core/Units.js';
import './core/GripsController.js';
import './ui/UI.js';
import './core/TyrexCAD.js';
import './geometry/GeometryAdvanced.js'; // ← تحميل GeometryAdvanced

// Make THREE global for legacy code
window.THREE = THREE;

// Create CAD instance early
window.cad = new window.TyrexCAD();
console.log('📐 Creating TyrexCAD instance...');

// Import and run app
import { initializeApp } from './app.js';

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}