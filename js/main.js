// js/main.js - Entry point for Vite
import * as THREE from 'three';

// Import core files as side effects (they register themselves globally)
import './core/Geometry.js';
import './core/Units.js';
import './ui/UI.js';
import './core/TyrexCAD.js';

// Make THREE global for legacy code
window.THREE = THREE;

// Create CAD instance immediately
window.cad = new window.TyrexCAD();

// Import and initialize app
import { initializeApp } from './app.js';

// Initialize immediately
initializeApp();