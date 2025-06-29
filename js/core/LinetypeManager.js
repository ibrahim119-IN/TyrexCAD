/**
 * Linetype and Line Weight Management System for TyrexCAD
 * نظام إدارة أنواع وأوزان الخطوط
 */

class LinetypeManager {
    constructor(cad) {
        this.cad = cad;
        
        // أوزان الخطوط القياسية (بالمليمتر)
        this.lineWeights = [
            { value: 'default', label: 'Default', mm: -3 },
            { value: 'bylayer', label: 'ByLayer', mm: -2 },
            { value: 'byblock', label: 'ByBlock', mm: -1 },
            { value: 0.00, label: '0.00 mm', mm: 0.00 },
            { value: 0.05, label: '0.05 mm', mm: 0.05 },
            { value: 0.09, label: '0.09 mm', mm: 0.09 },
            { value: 0.13, label: '0.13 mm', mm: 0.13 },
            { value: 0.15, label: '0.15 mm', mm: 0.15 },
            { value: 0.18, label: '0.18 mm', mm: 0.18 },
            { value: 0.20, label: '0.20 mm', mm: 0.20 },
            { value: 0.25, label: '0.25 mm', mm: 0.25 },
            { value: 0.30, label: '0.30 mm', mm: 0.30 },
            { value: 0.35, label: '0.35 mm', mm: 0.35 },
            { value: 0.40, label: '0.40 mm', mm: 0.40 },
            { value: 0.50, label: '0.50 mm', mm: 0.50 },
            { value: 0.53, label: '0.53 mm', mm: 0.53 },
            { value: 0.60, label: '0.60 mm', mm: 0.60 },
            { value: 0.70, label: '0.70 mm', mm: 0.70 },
            { value: 0.80, label: '0.80 mm', mm: 0.80 },
            { value: 0.90, label: '0.90 mm', mm: 0.90 },
            { value: 1.00, label: '1.00 mm', mm: 1.00 },
            { value: 1.06, label: '1.06 mm', mm: 1.06 },
            { value: 1.20, label: '1.20 mm', mm: 1.20 },
            { value: 1.40, label: '1.40 mm', mm: 1.40 },
            { value: 1.58, label: '1.58 mm', mm: 1.58 },
            { value: 2.00, label: '2.00 mm', mm: 2.00 }
        ];
        
        // أنواع الخطوط القياسية
        this.linetypes = new Map([
            ['continuous', {
                name: 'Continuous',
                description: 'Solid line',
                pattern: [],
                isDefault: true
            }],
            ['hidden', {
                name: 'Hidden',
                description: 'Hidden line - - - -',
                pattern: [6, 3], // [dash, gap]
                scale: 1
            }],
            ['hidden2', {
                name: 'Hidden2',
                description: 'Hidden line (half size)',
                pattern: [3, 1.5],
                scale: 0.5
            }],
            ['hiddenx2', {
                name: 'HiddenX2',
                description: 'Hidden line (double size)',
                pattern: [12, 6],
                scale: 2
            }],
            ['center', {
                name: 'Center',
                description: 'Center line ─ · ─ · ─',
                pattern: [20, 3, 3, 3], // [long dash, gap, dot, gap]
                scale: 1
            }],
            ['center2', {
                name: 'Center2',
                description: 'Center line (half size)',
                pattern: [10, 1.5, 1.5, 1.5],
                scale: 0.5
            }],
            ['centerx2', {
                name: 'CenterX2',
                description: 'Center line (double size)',
                pattern: [40, 6, 6, 6],
                scale: 2
            }],
            ['dashdot', {
                name: 'Dashdot',
                description: 'Dash dot ─ · ─ · ─',
                pattern: [12, 3, 3, 3],
                scale: 1
            }],
            ['dashdot2', {
                name: 'Dashdot2',
                description: 'Dash dot (half size)',
                pattern: [6, 1.5, 1.5, 1.5],
                scale: 0.5
            }],
            ['dashdotx2', {
                name: 'DashdotX2',
                description: 'Dash dot (double size)',
                pattern: [24, 6, 6, 6],
                scale: 2
            }],
            ['dashed', {
                name: 'Dashed',
                description: 'Dashed line ------',
                pattern: [12, 6],
                scale: 1
            }],
            ['dashed2', {
                name: 'Dashed2',
                description: 'Dashed (half size)',
                pattern: [6, 3],
                scale: 0.5
            }],
            ['dashedx2', {
                name: 'DashedX2',
                description: 'Dashed (double size)',
                pattern: [24, 12],
                scale: 2
            }],
            ['phantom', {
                name: 'Phantom',
                description: 'Phantom ─ ─ · ─ ─ ·',
                pattern: [20, 3, 6, 3, 6, 3],
                scale: 1
            }],
            ['phantom2', {
                name: 'Phantom2',
                description: 'Phantom (half size)',
                pattern: [10, 1.5, 3, 1.5, 3, 1.5],
                scale: 0.5
            }],
            ['phantomx2', {
                name: 'PhantomX2',
                description: 'Phantom (double size)',
                pattern: [40, 6, 12, 6, 12, 6],
                scale: 2
            }],
            ['dot', {
                name: 'Dot',
                description: 'Dotted line ·········',
                pattern: [0, 3], // [dot, gap]
                scale: 1
            }],
            ['dot2', {
                name: 'Dot2',
                description: 'Dotted (half size)',
                pattern: [0, 1.5],
                scale: 0.5
            }],
            ['dotx2', {
                name: 'DotX2',
                description: 'Dotted (double size)',
                pattern: [0, 6],
                scale: 2
            }],
            ['divide', {
                name: 'Divide',
                description: 'Divide ─ · · ─ · · ─',
                pattern: [20, 3, 3, 3, 3, 3],
                scale: 1
            }],
            ['divide2', {
                name: 'Divide2',
                description: 'Divide (half size)',
                pattern: [10, 1.5, 1.5, 1.5, 1.5, 1.5],
                scale: 0.5
            }],
            ['dividex2', {
                name: 'DivideX2',
                description: 'Divide (double size)',
                pattern: [40, 6, 6, 6, 6, 6],
                scale: 2
            }]
        ]);
        
        // الحالة الحالية
        this.currentLinetype = 'continuous';
        this.currentLineWeight = 0.25; // الوزن الافتراضي
        this.globalLinetypeScale = 1.0; // مقياس عام لجميع الأنواع
        this.weightDisplayScale = 1.0; // مقياس عرض الأوزان
        
        // خصائص مخصصة لكل نوع
        this.customLinetypes = new Map();
    }
    
    /**
     * الحصول على نوع الخط الحالي
     * @returns {Object} معلومات نوع الخط الحالي
     */
    getCurrentLinetype() {
        const linetypeInfo = this.linetypes.get(this.currentLinetype);
        if (!linetypeInfo) {
            // إذا لم يوجد، ارجع للنوع الافتراضي
            return {
                id: 'continuous',
                name: 'Continuous',
                description: 'Solid line',
                pattern: []
            };
        }
        
        return {
            id: this.currentLinetype,
            name: linetypeInfo.name,
            description: linetypeInfo.description,
            pattern: linetypeInfo.pattern || []
        };
    }
    
    /**
     * الحصول على وزن الخط الفعلي
     * @param {number|string} weight - وزن الخط
     * @returns {number} الوزن الفعلي بالمليمتر
     */
    getActualLineWeight(weight) {
        // معالجة القيم الخاصة
        if (weight === 'default' || weight === -3) {
            return 0.25; // الوزن الافتراضي
        } else if (weight === 'bylayer' || weight === -2) {
            // استخدم وزن الطبقة
            const layer = this.cad.layerManager?.getCurrentLayer();
            return layer?.lineWeight || 0.25;
        } else if (weight === 'byblock' || weight === -1) {
            // للكتل (Blocks) - غير مدعوم حالياً
            return 0.25;
        }
        
        return parseFloat(weight) || 0.25;
    }
    
    /**
     * الحصول على وزن الخط الفعلي بالبكسل
     */
    getLineWeightInPixels(weight, zoom = 1) {
        // الحصول على الوزن الفعلي بالمليمتر
        const actualWeight = this.getActualLineWeight(weight);
        
        // تحويل من مليمتر إلى بكسل
        // افتراض: 1mm = 3.78 pixels (96 DPI)
        const mmToPixels = 3.78;
        let pixels = actualWeight * mmToPixels * this.weightDisplayScale;
        
        // تطبيق حد أدنى للرؤية
        pixels = Math.max(pixels, 0.5);
        
        // تعويض الزوم
        return pixels / zoom;
    }
    
    /**
     * تطبيق نوع الخط على السياق
     */
    applyLinetype(ctx, linetype, scale = 1, zoom = 1) {
        const type = this.linetypes.get(linetype) || this.linetypes.get('continuous');
        
        if (type.pattern && type.pattern.length > 0) {
            // حساب نمط الخط مع المقياس
            const pattern = type.pattern.map(segment => {
                const value = segment * scale * this.globalLinetypeScale;
                // تعويض الزوم
                return value / zoom;
            });
            
            ctx.setLineDash(pattern);
        } else {
            // خط متصل
            ctx.setLineDash([]);
        }
    }
    
    /**
     * إضافة نوع خط مخصص
     */
    addCustomLinetype(id, config) {
        if (this.linetypes.has(id)) {
            console.warn(`Linetype '${id}' already exists`);
            return false;
        }
        
        this.customLinetypes.set(id, {
            name: config.name,
            description: config.description || '',
            pattern: config.pattern || [],
            scale: config.scale || 1,
            isCustom: true
        });
        
        this.linetypes.set(id, this.customLinetypes.get(id));
        
        if (this.cad.ui) {
            this.cad.ui.updateLinetypesList();
        }
        
        return id;
    }
    
    /**
     * حذف نوع خط مخصص
     */
    removeCustomLinetype(id) {
        if (!this.customLinetypes.has(id)) {
            return false;
        }
        
        this.customLinetypes.delete(id);
        this.linetypes.delete(id);
        
        // إذا كان النوع المحذوف هو الحالي، ارجع للافتراضي
        if (this.currentLinetype === id) {
            this.setCurrentLinetype('continuous');
        }
        
        if (this.cad.ui) {
            this.cad.ui.updateLinetypesList();
        }
        
        return true;
    }
    
    /**
     * تعيين نوع الخط الحالي
     */
    setCurrentLinetype(linetypeId) {
        if (!this.linetypes.has(linetypeId)) {
            console.warn(`Linetype '${linetypeId}' not found`);
            return false;
        }
        
        this.currentLinetype = linetypeId;
        this.cad.currentLineType = linetypeId;
        
        // تحديث الطبقة الحالية إذا لزم الأمر
        if (this.cad.layerManager) {
            const currentLayer = this.cad.layerManager.getCurrentLayer();
            if (currentLayer) {
                currentLayer.lineType = linetypeId;
            }
        }
        
        if (this.cad.ui) {
            this.cad.ui.updateLinetypeDisplay();
        }
        
        return true;
    }
    
    /**
     * تعيين وزن الخط الحالي
     */
    setCurrentLineWeight(weight) {
        this.currentLineWeight = weight;
        
        // حساب الوزن بالبكسل
        const pixels = this.getLineWeightInPixels(weight);
        this.cad.currentLineWidth = pixels;
        
        // تحديث الطبقة الحالية
        if (this.cad.layerManager) {
            const currentLayer = this.cad.layerManager.getCurrentLayer();
            if (currentLayer) {
                currentLayer.lineWeight = weight;
            }
        }
        
        if (this.cad.ui) {
            this.cad.ui.updateLineWeightDisplay();
        }
        
        return true;
    }
    
    /**
     * تعيين مقياس نوع الخط العام
     */
    setGlobalLinetypeScale(scale) {
        this.globalLinetypeScale = Math.max(0.01, scale);
        this.cad.render();
    }
    
    /**
     * تعيين مقياس عرض الأوزان
     */
    setWeightDisplayScale(scale) {
        this.weightDisplayScale = Math.max(0.1, scale);
        this.cad.render();
    }
    
    /**
     * الحصول على معلومات نوع الخط
     */
    getLinetypeInfo(linetypeId) {
        return this.linetypes.get(linetypeId) || null;
    }
    
    /**
     * الحصول على قائمة أنواع الخطوط
     */
    getLinetypesList() {
        const list = [];
        
        // الأنواع القياسية أولاً
        this.linetypes.forEach((type, id) => {
            if (!type.isCustom) {
                list.push({
                    id: id,
                    ...type
                });
            }
        });
        
        // ثم الأنواع المخصصة
        this.customLinetypes.forEach((type, id) => {
            list.push({
                id: id,
                ...type
            });
        });
        
        return list;
    }
    
    /**
     * الحصول على قائمة أوزان الخطوط
     */
    getLineWeightsList() {
        return this.lineWeights.slice(); // نسخة من المصفوفة
    }
    
    /**
     * تحميل أنواع خطوط من ملف (LIN format)
     */
    async loadLinetypesFromFile(fileContent) {
        // تحليل ملف .lin
        const lines = fileContent.split('\n');
        let currentType = null;
        
        lines.forEach(line => {
            line = line.trim();
            
            // تجاهل التعليقات والأسطر الفارغة
            if (!line || line.startsWith(';')) return;
            
            // نوع جديد
            if (line.startsWith('*')) {
                const parts = line.substring(1).split(',');
                const name = parts[0].trim();
                const description = parts.slice(1).join(',').trim();
                
                currentType = {
                    name: name,
                    description: description,
                    pattern: []
                };
            } else if (currentType && line.startsWith('A,')) {
                // نمط الخط
                const patternStr = line.substring(2);
                const pattern = patternStr.split(',').map(v => parseFloat(v.trim()));
                
                currentType.pattern = pattern.filter(v => !isNaN(v));
                
                // إضافة النوع
                const id = currentType.name.toLowerCase().replace(/\s+/g, '');
                this.addCustomLinetype(id, currentType);
                
                currentType = null;
            }
        });
        
        return true;
    }
    
    /**
     * تصدير أنواع الخطوط المخصصة
     */
    exportCustomLinetypes() {
        let content = ';; Custom Linetypes for TyrexCAD\n';
        content += ';; Generated on ' + new Date().toISOString() + '\n\n';
        
        this.customLinetypes.forEach((type, id) => {
            content += `*${type.name},${type.description}\n`;
            content += `A,${type.pattern.join(',')}\n\n`;
        });
        
        return content;
    }
    
    /**
     * تطبيق خصائص الخط على شكل
     */
    applyLineProperties(shape) {
        // إذا لم يكن للشكل نوع خط، استخدم الحالي
        if (!shape.lineType) {
            shape.lineType = this.currentLinetype;
        }
        
        // إذا لم يكن للشكل وزن، استخدم الحالي
        if (shape.lineWeight === undefined) {
            shape.lineWeight = this.currentLineWeight;
        }
        
        return shape;
    }
    
    /**
     * حساب طول نمط الخط
     */
    getPatternLength(linetypeId, scale = 1) {
        const type = this.linetypes.get(linetypeId);
        if (!type || !type.pattern) return 0;
        
        const totalLength = type.pattern.reduce((sum, segment) => sum + Math.abs(segment), 0);
        return totalLength * scale * this.globalLinetypeScale;
    }
    
    /**
     * معاينة نوع الخط
     */
    previewLinetype(ctx, linetypeId, x, y, width, height) {
        ctx.save();
        
        // خلفية
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x, y, width, height);
        
        // الخط
        ctx.strokeStyle = '#00d4aa';
        ctx.lineWidth = 2;
        
        this.applyLinetype(ctx, linetypeId, 1, 1);
        
        ctx.beginPath();
        ctx.moveTo(x + 10, y + height / 2);
        ctx.lineTo(x + width - 10, y + height / 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * إعادة تعيين للقيم الافتراضية
     */
    reset() {
        this.currentLinetype = 'continuous';
        this.currentLineWeight = 0.25;
        this.globalLinetypeScale = 1.0;
        
        if (this.cad.ui) {
            this.cad.ui.updateLinetypeDisplay();
            this.cad.ui.updateLineWeightDisplay();
        }
    }
}

// تصدير للاستخدام
window.LinetypeManager = LinetypeManager;