// ################################################################
// الملف 2: js/tools/3d/ExtrudeTool.js
// ################################################################
// أداة البثق التفاعلية لتحويل الأشكال 2D إلى 3D

import { ToolBase } from '../BaseTool.js';

/**
 * أداة البثق (Extrude) - تحويل الأشكال 2D إلى 3D عبر البثق
 */
export class ExtrudeTool extends ToolBase {
    constructor(toolsManager, name) {
        super(toolsManager, name);
        
        this.icon = 'fa-arrow-up';
        this.selectedShapes = [];
        this.previewMesh = null;
        this.isPreviewMode = true;
        
        // إعدادات البثق
        this.settings = {
            depth: 100,
            bevelEnabled: true,
            bevelThickness: 2,
            bevelSize: 1,
            bevelSegments: 3,
            curveSegments: 12
        };
        
        // حالة الأداة
        this.state = {
            panelVisible: false,
            converting: false
        };
    }
    
    /**
     * تفعيل الأداة
     */
    onActivate() {
        // التحقق من وجود محول 3D
        if (!this.cad.shape3DConverter) {
            this.cad.initializeShape3DConverter().then(() => {
                this.startExtrusion();
            });
        } else {
            this.startExtrusion();
        }
    }
    
    /**
     * بدء عملية البثق
     */
    startExtrusion() {
        // التحقق من وجود أشكال محددة
        if (this.cad.selectedShapes.size === 0) {
            this.updateStatus('Select one or more 2D shapes to extrude');
            this.cad.setTool('select');
            return false;
        }
        
        // حفظ الأشكال المحددة
        this.selectedShapes = Array.from(this.cad.selectedShapes);
        
        // التحقق من صلاحية الأشكال للبثق
        const validShapes = this.validateShapes();
        if (validShapes.length === 0) {
            this.updateStatus('Selected shapes cannot be extruded');
            this.deactivate();
            return false;
        }
        
        this.selectedShapes = validShapes;
        
        // عرض لوحة التحكم
        this.showExtrudePanel();
        
        // إنشاء معاينة أولية
        this.updatePreview();
        
        // التبديل لوضع 3D
        if (this.cad.mode !== '3D') {
            this.cad.setViewMode('3D');
        }
        
        this.updateStatus(`Extruding ${this.selectedShapes.length} shape(s). Adjust settings and click Apply.`);
    }
    
    /**
     * التحقق من صلاحية الأشكال للبثق
     */
    validateShapes() {
        const validTypes = ['rectangle', 'circle', 'ellipse', 'polygon', 'polyline'];
        
        return this.selectedShapes.filter(shape => {
            // التحقق من النوع
            if (!validTypes.includes(shape.type)) {
                console.warn(`Shape type '${shape.type}' cannot be extruded`);
                return false;
            }
            
            // التحقق من الخطوط المتعددة
            if (shape.type === 'polyline' && !shape.closed && shape.points.length < 3) {
                console.warn('Open polylines need at least 3 points');
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * عرض لوحة التحكم
     */
    showExtrudePanel() {
        const panelHTML = `
            <div class="tool-panel extrude-panel" id="extrudePanel">
                <div class="panel-header">
                    <h3><i class="fas fa-arrow-up"></i> Extrude Settings</h3>
                    <button class="close-btn" onclick="window.cad.toolsManager.activeTool.hidePanel()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="panel-content">
                    <!-- عمق البثق -->
                    <div class="form-group">
                        <label>Depth:</label>
                        <div class="input-group">
                            <input type="range" id="extrudeDepth" 
                                   min="1" max="500" value="${this.settings.depth}"
                                   oninput="window.cad.toolsManager.activeTool.onDepthChange(this.value)">
                            <input type="number" id="extrudeDepthValue" 
                                   value="${this.settings.depth}" min="1" max="500"
                                   onchange="window.cad.toolsManager.activeTool.onDepthChange(this.value)">
                            <span class="unit">mm</span>
                        </div>
                    </div>
                    
                    <!-- خيارات الحواف -->
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="extrudeBevel" 
                                   ${this.settings.bevelEnabled ? 'checked' : ''}
                                   onchange="window.cad.toolsManager.activeTool.onBevelToggle(this.checked)">
                            Enable Bevel
                        </label>
                    </div>
                    
                    <div class="bevel-options ${this.settings.bevelEnabled ? '' : 'hidden'}" id="bevelOptions">
                        <!-- سماكة الحافة -->
                        <div class="form-group">
                            <label>Bevel Thickness:</label>
                            <div class="input-group">
                                <input type="range" id="bevelThickness" 
                                       min="0" max="20" value="${this.settings.bevelThickness}"
                                       oninput="window.cad.toolsManager.activeTool.onBevelThicknessChange(this.value)">
                                <input type="number" id="bevelThicknessValue" 
                                       value="${this.settings.bevelThickness}" min="0" max="20" step="0.5"
                                       onchange="window.cad.toolsManager.activeTool.onBevelThicknessChange(this.value)">
                            </div>
                        </div>
                        
                        <!-- حجم الحافة -->
                        <div class="form-group">
                            <label>Bevel Size:</label>
                            <div class="input-group">
                                <input type="range" id="bevelSize" 
                                       min="0" max="20" value="${this.settings.bevelSize}"
                                       oninput="window.cad.toolsManager.activeTool.onBevelSizeChange(this.value)">
                                <input type="number" id="bevelSizeValue" 
                                       value="${this.settings.bevelSize}" min="0" max="20" step="0.5"
                                       onchange="window.cad.toolsManager.activeTool.onBevelSizeChange(this.value)">
                            </div>
                        </div>
                        
                        <!-- أقسام الحافة -->
                        <div class="form-group">
                            <label>Bevel Segments:</label>
                            <div class="input-group">
                                <input type="range" id="bevelSegments" 
                                       min="1" max="10" value="${this.settings.bevelSegments}"
                                       oninput="window.cad.toolsManager.activeTool.onBevelSegmentsChange(this.value)">
                                <input type="number" id="bevelSegmentsValue" 
                                       value="${this.settings.bevelSegments}" min="1" max="10"
                                       onchange="window.cad.toolsManager.activeTool.onBevelSegmentsChange(this.value)">
                            </div>
                        </div>
                    </div>
                    
                    <!-- دقة المنحنيات -->
                    <div class="form-group">
                        <label>Curve Quality:</label>
                        <select id="curveQuality" onchange="window.cad.toolsManager.activeTool.onQualityChange(this.value)">
                            <option value="low">Low (Fast)</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High (Slow)</option>
                        </select>
                    </div>
                    
                    <!-- معلومات -->
                    <div class="info-section">
                        <p><i class="fas fa-info-circle"></i> ${this.selectedShapes.length} shape(s) selected</p>
                    </div>
                </div>
                
                <div class="panel-footer">
                    <button class="btn btn-primary" onclick="window.cad.toolsManager.activeTool.applyExtrusion()">
                        <i class="fas fa-check"></i> Apply
                    </button>
                    <button class="btn" onclick="window.cad.toolsManager.activeTool.cancel()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
        
        // إضافة اللوحة للصفحة
        this.removeExistingPanel();
        document.body.insertAdjacentHTML('beforeend', panelHTML);
        
        // تطبيق الأنماط
        this.applyPanelStyles();
        
        this.state.panelVisible = true;
    }
    
    /**
     * إزالة اللوحة الموجودة
     */
    removeExistingPanel() {
        const existingPanel = document.getElementById('extrudePanel');
        if (existingPanel) {
            existingPanel.remove();
        }
    }
    
    /**
     * تطبيق أنماط اللوحة
     */
    applyPanelStyles() {
        // إضافة أنماط CSS إذا لم تكن موجودة
        if (!document.getElementById('extrudePanelStyles')) {
            const styles = `
                <style id="extrudePanelStyles">
                    .extrude-panel {
                        position: fixed;
                        right: 20px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 320px;
                        background: var(--bg-panel, #1a1a1a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 8px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                        z-index: 1000;
                        font-family: Arial, sans-serif;
                    }
                    
                    .extrude-panel .panel-header {
                        padding: 15px;
                        border-bottom: 1px solid var(--border-color, #333);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .extrude-panel h3 {
                        margin: 0;
                        font-size: 16px;
                        color: var(--accent-primary, #00d4aa);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .extrude-panel .close-btn {
                        background: none;
                        border: none;
                        color: var(--text-secondary, #999);
                        cursor: pointer;
                        font-size: 18px;
                        padding: 4px 8px;
                        transition: color 0.2s;
                    }
                    
                    .extrude-panel .close-btn:hover {
                        color: var(--text-primary, #fff);
                    }
                    
                    .extrude-panel .panel-content {
                        padding: 20px;
                    }
                    
                    .extrude-panel .form-group {
                        margin-bottom: 15px;
                    }
                    
                    .extrude-panel label {
                        display: block;
                        margin-bottom: 5px;
                        color: var(--text-secondary, #999);
                        font-size: 13px;
                    }
                    
                    .extrude-panel .input-group {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .extrude-panel input[type="range"] {
                        flex: 1;
                        -webkit-appearance: none;
                        height: 4px;
                        background: var(--bg-tertiary, #2a2a2a);
                        border-radius: 2px;
                        outline: none;
                    }
                    
                    .extrude-panel input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 16px;
                        height: 16px;
                        background: var(--accent-primary, #00d4aa);
                        border-radius: 50%;
                        cursor: pointer;
                    }
                    
                    .extrude-panel input[type="number"] {
                        width: 60px;
                        padding: 5px 8px;
                        background: var(--bg-tertiary, #2a2a2a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 4px;
                        color: var(--text-primary, #fff);
                        font-size: 13px;
                    }
                    
                    .extrude-panel .unit {
                        color: var(--text-dim, #666);
                        font-size: 12px;
                    }
                    
                    .extrude-panel select {
                        width: 100%;
                        padding: 6px 10px;
                        background: var(--bg-tertiary, #2a2a2a);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 4px;
                        color: var(--text-primary, #fff);
                        font-size: 13px;
                    }
                    
                    .extrude-panel .bevel-options {
                        padding-left: 20px;
                        transition: all 0.3s ease;
                    }
                    
                    .extrude-panel .bevel-options.hidden {
                        opacity: 0.5;
                        pointer-events: none;
                    }
                    
                    .extrude-panel .info-section {
                        margin-top: 20px;
                        padding: 10px;
                        background: var(--bg-tertiary, #2a2a2a);
                        border-radius: 4px;
                        font-size: 12px;
                        color: var(--text-secondary, #999);
                    }
                    
                    .extrude-panel .panel-footer {
                        padding: 15px;
                        border-top: 1px solid var(--border-color, #333);
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    }
                    
                    .extrude-panel .btn {
                        padding: 8px 16px;
                        border: 1px solid var(--border-color, #333);
                        border-radius: 4px;
                        background: var(--bg-secondary, #2a2a2a);
                        color: var(--text-primary, #fff);
                        font-size: 13px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        transition: all 0.2s;
                    }
                    
                    .extrude-panel .btn:hover {
                        background: var(--bg-hover, #333);
                    }
                    
                    .extrude-panel .btn-primary {
                        background: var(--accent-primary, #00d4aa);
                        border-color: var(--accent-primary, #00d4aa);
                        color: #000;
                    }
                    
                    .extrude-panel .btn-primary:hover {
                        background: var(--accent-secondary, #00b894);
                    }
                </style>
            `;
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }
    
    /**
     * معالجات تغيير القيم
     */
    onDepthChange(value) {
        this.settings.depth = parseFloat(value);
        
        // تحديث العناصر المرتبطة
        document.getElementById('extrudeDepth').value = value;
        document.getElementById('extrudeDepthValue').value = value;
        
        // تحديث المعاينة
        this.updatePreview();
    }
    
    onBevelToggle(enabled) {
        this.settings.bevelEnabled = enabled;
        
        // إظهار/إخفاء خيارات الحواف
        const bevelOptions = document.getElementById('bevelOptions');
        if (bevelOptions) {
            if (enabled) {
                bevelOptions.classList.remove('hidden');
            } else {
                bevelOptions.classList.add('hidden');
            }
        }
        
        this.updatePreview();
    }
    
    onBevelThicknessChange(value) {
        this.settings.bevelThickness = parseFloat(value);
        document.getElementById('bevelThickness').value = value;
        document.getElementById('bevelThicknessValue').value = value;
        this.updatePreview();
    }
    
    onBevelSizeChange(value) {
        this.settings.bevelSize = parseFloat(value);
        document.getElementById('bevelSize').value = value;
        document.getElementById('bevelSizeValue').value = value;
        this.updatePreview();
    }
    
    onBevelSegmentsChange(value) {
        this.settings.bevelSegments = parseInt(value);
        document.getElementById('bevelSegments').value = value;
        document.getElementById('bevelSegmentsValue').value = value;
        this.updatePreview();
    }
    
    onQualityChange(quality) {
        switch (quality) {
            case 'low':
                this.settings.curveSegments = 6;
                break;
            case 'medium':
                this.settings.curveSegments = 12;
                break;
            case 'high':
                this.settings.curveSegments = 24;
                break;
        }
        this.updatePreview();
    }
    
    /**
     * تحديث المعاينة
     */
    updatePreview() {
        if (!this.isPreviewMode || this.state.converting) return;
        
        // إزالة المعاينة السابقة
        this.clearPreview();
        
        // إنشاء مجموعة للمعاينة
        const previewGroup = new THREE.Group();
        
        // تحويل كل شكل
        this.selectedShapes.forEach(shape => {
            const mesh = this.cad.shape3DConverter.extrude(shape, this.settings);
            
            if (mesh) {
                // جعل المعاينة شفافة
                mesh.material = mesh.material.clone();
                mesh.material.opacity = 0.7;
                mesh.material.transparent = true;
                
                previewGroup.add(mesh);
            }
        });
        
        if (previewGroup.children.length > 0) {
            this.previewMesh = previewGroup;
            this.cad.scene3D.add(previewGroup);
            this.cad.render3D();
        }
    }
    
    /**
     * مسح المعاينة
     */
    clearPreview() {
        if (this.previewMesh) {
            // تنظيف الموارد
            this.previewMesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            
            this.cad.scene3D.remove(this.previewMesh);
            this.previewMesh = null;
            this.cad.render3D();
        }
    }
    
    /**
     * تطبيق البثق النهائي
     */
    applyExtrusion() {
        if (this.state.converting) return;
        
        this.state.converting = true;
        this.updateStatus('Converting shapes to 3D...');
        
        // تسجيل حالة للتراجع
        this.cad.recordState();
        
        // مسح المعاينة
        this.clearPreview();
        
        // تحويل الأشكال
        let successCount = 0;
        
        this.selectedShapes.forEach(shape => {
            const mesh = this.cad.shape3DConverter.extrude(shape, this.settings);
            
            if (mesh) {
                // إضافة النموذج للمشهد
                this.cad.add3DShape(shape, mesh);
                successCount++;
                
                // اختياري: إخفاء الشكل 2D الأصلي
                shape.visible = false;
            }
        });
        
        // تحديث الحالة
        if (successCount > 0) {
            this.updateStatus(`Successfully extruded ${successCount} shape(s)`);
            
            // تحديد النماذج الجديدة
            this.cad.selectedShapes.clear();
            // يمكن إضافة منطق لتحديد النماذج 3D الجديدة
        } else {
            this.updateStatus('Failed to extrude shapes');
        }
        
        // إنهاء الأداة
        this.cleanup();
        this.cad.render();
        this.cad.render3D();
        
        // العودة لأداة التحديد
        setTimeout(() => {
            this.cad.setTool('select');
        }, 1000);
    }
    
    /**
     * إلغاء العملية
     */
    cancel() {
        this.updateStatus('Extrusion cancelled');
        this.cleanup();
        this.cad.setTool('select');
    }
    
    /**
     * إخفاء اللوحة
     */
    hidePanel() {
        this.removeExistingPanel();
        this.state.panelVisible = false;
    }
    
    /**
     * تنظيف عند إلغاء التفعيل
     */
    onDeactivate() {
        this.cleanup();
    }
    
    /**
     * تنظيف الموارد
     */
    cleanup() {
        // مسح المعاينة
        this.clearPreview();
        
        // إزالة اللوحة
        this.hidePanel();
        
        // إعادة تعيين الحالة
        this.selectedShapes = [];
        this.state.converting = false;
    }
    
    /**
     * معالجة ضغطات المفاتيح
     */
    onKeyPress(key) {
        switch (key) {
            case 'Enter':
                if (this.state.panelVisible) {
                    this.applyExtrusion();
                }
                break;
            case 'Escape':
                this.cancel();
                break;
        }
    }
}

// تصدير الأداة
export { ExtrudeTool };
