/**
 * Layer Management System for TyrexCAD
 * نظام إدارة الطبقات المتكامل
 */
class LayerManager {
    constructor(cad) {
        this.cad = cad;
        this.layers = new Map();
        this.currentLayerId = 0;
        this.layerStates = new Map(); // لحفظ حالات الطبقات
        
        // إنشاء الطبقة الافتراضية
        this.createDefaultLayer();
    }
    
    /**
     * إنشاء الطبقة الافتراضية
     */
    createDefaultLayer() {
        this.addLayer({
            id: 0,
            name: 'Layer 0',
            color: '#ffffff',
            visible: true,
            frozen: false,
            locked: false,
            plot: true,
            transparency: 0,
            lineWidth: 2,
            lineType: 'solid'
        });
    }
    
    /**
     * إضافة طبقة جديدة
     */
    addLayer(layerData = {}) {
        const id = layerData.id ?? Date.now();
        const layer = {
            id: id,
            name: layerData.name || `Layer ${this.layers.size}`,
            color: layerData.color || '#ffffff',
            visible: layerData.visible ?? true,
            frozen: layerData.frozen ?? false,
            locked: layerData.locked ?? false,
            plot: layerData.plot ?? true,
            transparency: layerData.transparency || 0, // 0-100
            lineWidth: layerData.lineWidth || 2,
            lineType: layerData.lineType || 'solid',
            // خصائص إضافية
            lockedFading: layerData.lockedFading ?? true,
            description: layerData.description || ''
        };
        
        this.layers.set(id, layer);
        
        // إذا كانت أول طبقة، اجعلها الحالية
        if (this.layers.size === 1) {
            this.currentLayerId = id;
        }
        
        // تحديث UI
        if (this.cad.ui) {
            this.cad.ui.updateLayersList();
        }
        
        return layer;
    }
    
    /**
     * حذف طبقة
     */
    deleteLayer(id) {
        // لا يمكن حذف الطبقة 0
        if (id === 0) {
            this.cad.updateStatus('Cannot delete Layer 0');
            return false;
        }
        
        // لا يمكن حذف الطبقة الحالية إذا كانت الوحيدة
        if (this.layers.size <= 1) {
            this.cad.updateStatus('Cannot delete the only layer');
            return false;
        }
        
        // نقل الأشكال من الطبقة المحذوفة إلى الطبقة 0
        this.cad.shapes.forEach(shape => {
            if (shape.layerId === id) {
                shape.layerId = 0;
            }
        });
        
        this.layers.delete(id);
        
        // إذا كانت الطبقة المحذوفة هي الحالية، انتقل للطبقة 0
        if (this.currentLayerId === id) {
            this.setCurrentLayer(0);
        }
        
        this.cad.render();
        if (this.cad.ui) {
            this.cad.ui.updateLayersList();
        }
        
        return true;
    }
    
    /**
     * تعيين الطبقة الحالية
     */
    setCurrentLayer(id) {
        if (!this.layers.has(id)) {
            console.warn(`Layer ${id} not found`);
            return false;
        }
        
        const layer = this.layers.get(id);
        
        // لا يمكن جعل طبقة مجمدة كطبقة حالية
        if (layer.frozen) {
            this.cad.updateStatus('Cannot set frozen layer as current');
            return false;
        }
        
        this.currentLayerId = id;
        
        // تحديث خصائص الرسم الحالية من الطبقة
        this.cad.currentColor = layer.color;
        this.cad.currentLineWidth = layer.lineWidth;
        this.cad.currentLineType = layer.lineType;
        
        // تحديث UI
        if (this.cad.ui) {
            this.cad.ui.updateLayersList();
            this.cad.ui.updateDrawingSettings();
        }
        
        return true;
    }
    
    /**
     * الحصول على الطبقة الحالية
     */
    getCurrentLayer() {
        return this.layers.get(this.currentLayerId);
    }
    
    /**
     * الحصول على طبقة بالاسم
     */
    getLayerByName(name) {
        for (const [id, layer] of this.layers) {
            if (layer.name === name) {
                return layer;
            }
        }
        return null;
    }
    
    /**
     * تبديل رؤية الطبقة
     */
    toggleVisibility(id) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.visible = !layer.visible;
            this.cad.render();
            if (this.cad.ui) {
                this.cad.ui.updateLayersList();
            }
        }
    }
    
    /**
     * تبديل تجميد الطبقة
     */
    toggleFreeze(id) {
        const layer = this.layers.get(id);
        if (!layer) return;
        
        // لا يمكن تجميد الطبقة الحالية
        if (id === this.currentLayerId) {
            this.cad.updateStatus('Cannot freeze current layer');
            return;
        }
        
        layer.frozen = !layer.frozen;
        
        // إذا تم تجميد الطبقة، قم بإلغاء تحديد أشكالها
        if (layer.frozen) {
            const shapesToDeselect = [];
            this.cad.selectedShapes.forEach(shape => {
                if (shape.layerId === id) {
                    shapesToDeselect.push(shape);
                }
            });
            shapesToDeselect.forEach(shape => {
                this.cad.selectedShapes.delete(shape);
            });
        }
        
        this.cad.render();
        if (this.cad.ui) {
            this.cad.ui.updateLayersList();
        }
    }
    
    /**
     * تبديل قفل الطبقة
     */
    toggleLock(id) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.locked = !layer.locked;
            
            // إذا تم قفل الطبقة، قم بإلغاء تحديد أشكالها
            if (layer.locked) {
                const shapesToDeselect = [];
                this.cad.selectedShapes.forEach(shape => {
                    if (shape.layerId === id) {
                        shapesToDeselect.push(shape);
                    }
                });
                shapesToDeselect.forEach(shape => {
                    this.cad.selectedShapes.delete(shape);
                });
            }
            
            this.cad.render();
            if (this.cad.ui) {
                this.cad.ui.updateLayersList();
            }
        }
    }
    
    /**
     * تبديل طباعة الطبقة
     */
    togglePlot(id) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.plot = !layer.plot;
            if (this.cad.ui) {
                this.cad.ui.updateLayersList();
            }
        }
    }
    
    /**
     * تغيير لون الطبقة
     */
    setLayerColor(id, color) {
        const layer = this.layers.get(id);
        if (layer && /^#[0-9A-F]{6}$/i.test(color)) {
            layer.color = color;
            
            // إذا كانت الطبقة الحالية، حدث اللون الحالي
            if (id === this.currentLayerId) {
                this.cad.currentColor = color;
                this.cad.setColor(color);
            }
            
            this.cad.render();
            if (this.cad.ui) {
                this.cad.ui.updateLayersList();
            }
        }
    }
    
    /**
     * تغيير شفافية الطبقة
     */
    setLayerTransparency(id, transparency) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.transparency = Math.max(0, Math.min(100, transparency));
            this.cad.render();
        }
    }
    
    /**
     * إعادة تسمية الطبقة
     */
    renameLayer(id, newName) {
        const layer = this.layers.get(id);
        if (layer && newName.trim()) {
            layer.name = newName.trim();
            if (this.cad.ui) {
                this.cad.ui.updateLayersList();
            }
        }
    }
    
    /**
     * Match Layer - نسخ خصائص طبقة من عنصر
     */
    matchLayer(shape) {
        if (!shape || shape.layerId === undefined) return false;
        
        const layer = this.layers.get(shape.layerId);
        if (layer && !layer.frozen) {
            this.setCurrentLayer(shape.layerId);
            this.cad.updateStatus(`Current layer: ${layer.name}`);
            return true;
        }
        return false;
    }
    
    /**
     * حفظ حالة الطبقات
     */
    saveLayerState(stateName) {
        const state = {
            name: stateName,
            timestamp: Date.now(),
            layers: new Map()
        };
        
        // نسخ حالة كل طبقة
        this.layers.forEach((layer, id) => {
            state.layers.set(id, {
                ...layer
            });
        });
        
        this.layerStates.set(stateName, state);
        this.cad.updateStatus(`Layer state "${stateName}" saved`);
    }
    
    /**
     * استرجاع حالة الطبقات
     */
    restoreLayerState(stateName) {
        const state = this.layerStates.get(stateName);
        if (!state) {
            this.cad.updateStatus(`Layer state "${stateName}" not found`);
            return false;
        }
        
        // استرجاع حالة كل طبقة
        state.layers.forEach((savedLayer, id) => {
            const currentLayer = this.layers.get(id);
            if (currentLayer) {
                Object.assign(currentLayer, savedLayer);
            }
        });
        
        this.cad.render();
        if (this.cad.ui) {
            this.cad.ui.updateLayersList();
        }
        
        this.cad.updateStatus(`Layer state "${stateName}" restored`);
        return true;
    }
    
    /**
     * الحصول على قائمة حالات الطبقات المحفوظة
     */
    getLayerStates() {
        return Array.from(this.layerStates.keys());
    }
    
    /**
     * تطبيق خصائص الطبقة على شكل
     */
    applyLayerProperties(shape) {
        const layer = this.layers.get(shape.layerId);
        if (!layer) return shape;
        
        // إذا لم يكن للشكل لون خاص، استخدم لون الطبقة
        if (!shape.color || shape.color === '#ffffff') {
            shape.color = layer.color;
        }
        
        // إذا لم يكن للشكل سمك خط خاص، استخدم سمك الطبقة
        if (!shape.lineWidth || shape.lineWidth === 2) {
            shape.lineWidth = layer.lineWidth;
        }
        
        // إذا لم يكن للشكل نوع خط خاص، استخدم نوع الطبقة
        if (!shape.lineType || shape.lineType === 'solid') {
            shape.lineType = layer.lineType;
        }
        
        return shape;
    }
    
    /**
     * فحص إمكانية التعديل على طبقة
     */
    canModifyLayer(id) {
        const layer = this.layers.get(id);
        if (!layer) return false;
        
        return layer.visible && !layer.frozen && !layer.locked;
    }
    
    /**
     * فحص إمكانية الرسم على طبقة
     */
    canDrawOnLayer(id) {
        const layer = this.layers.get(id);
        if (!layer) return false;
        
        return layer.visible && !layer.frozen;
    }
    
    /**
     * الحصول على معلومات الطبقة للعرض
     */
    getLayerInfo(id) {
        const layer = this.layers.get(id);
        if (!layer) return null;
        
        const shapeCount = this.cad.shapes.filter(s => s.layerId === id).length;
        
        return {
            ...layer,
            shapeCount: shapeCount,
            isCurrent: id === this.currentLayerId
        };
    }
    
    /**
     * تصدير بيانات الطبقات
     */
    exportLayers() {
        const data = {
            currentLayerId: this.currentLayerId,
            layers: []
        };
        
        this.layers.forEach((layer, id) => {
            data.layers.push([id, layer]);
        });
        
        return data;
    }
    
    /**
     * استيراد بيانات الطبقات
     */
    importLayers(data) {
        if (!data || !data.layers) return false;
        
        this.layers.clear();
        
        data.layers.forEach(([id, layer]) => {
            this.layers.set(id, layer);
        });
        
        if (data.currentLayerId !== undefined) {
            this.currentLayerId = data.currentLayerId;
        }
        
        // تأكد من وجود طبقة افتراضية
        if (!this.layers.has(0)) {
            this.createDefaultLayer();
        }
        
        if (this.cad.ui) {
            this.cad.ui.updateLayersList();
        }
        
        return true;
    }
    
    /**
     * إيقاف/تشغيل جميع الطبقات
     */
    toggleAllLayers(visible) {
        this.layers.forEach((layer, id) => {
            // لا تخفي الطبقة الحالية
            if (id !== this.currentLayerId) {
                layer.visible = visible;
            }
        });
        
        this.cad.render();
        if (this.cad.ui) {
            this.cad.ui.updateLayersList();
        }
    }
    
    /**
     * عزل طبقة (إظهارها وإخفاء الباقي)
     */
    isolateLayer(id) {
        this.layers.forEach((layer, layerId) => {
            layer.visible = (layerId === id);
        });
        
        this.cad.render();
        if (this.cad.ui) {
            this.cad.ui.updateLayersList();
        }
    }
    
    /**
     * دمج طبقات
     */
    mergeLayers(sourceIds, targetId) {
        if (!this.layers.has(targetId)) return false;
        
        let mergedCount = 0;
        
        sourceIds.forEach(sourceId => {
            if (sourceId === targetId) return;
            
            // نقل الأشكال
            this.cad.shapes.forEach(shape => {
                if (shape.layerId === sourceId) {
                    shape.layerId = targetId;
                    mergedCount++;
                }
            });
            
            // حذف الطبقة المصدر
            this.layers.delete(sourceId);
        });
        
        this.cad.render();
        if (this.cad.ui) {
            this.cad.ui.updateLayersList();
        }
        
        this.cad.updateStatus(`Merged ${mergedCount} objects into layer`);
        return true;
    }
}

// تصدير للاستخدام
window.LayerManager = LayerManager;