// ################################################################
// الملف 1: js/3d/Shape3DConverter.js
// ################################################################
// محول الأشكال من 2D إلى 3D لـ TyrexCAD

/**
 * محول الأشكال الأساسي من 2D إلى 3D
 * يدعم تحويل جميع أنواع الأشكال المدعومة في TyrexCAD
 */
class Shape3DConverter {
    constructor(cad) {
        this.cad = cad;
        this.THREE = window.THREE;
        
        // محركات التحويل
        this.engines = {
            extrude: null,
            revolve: null,
            loft: null,
            sweep: null
        };
        
        // إعدادات افتراضية
        this.defaultSettings = {
            extrude: {
                depth: 100,
                bevelEnabled: true,
                bevelThickness: 2,
                bevelSize: 1,
                bevelSegments: 3,
                curveSegments: 12
            },
            revolve: {
                segments: 32,
                phiStart: 0,
                phiLength: Math.PI * 2
            },
            material: {
                color: '#00d4aa',
                shininess: 100,
                opacity: 1,
                transparent: false,
                side: this.THREE.DoubleSide
            }
        };
        
        // تهيئة المحركات
        this.initializeEngines();
    }
    
    /**
     * تهيئة محركات التحويل
     */
    async initializeEngines() {
        try {
            // تحميل المحركات بشكل ديناميكي عند الحاجة
            console.log('Shape3DConverter initialized');
        } catch (error) {
            console.error('Failed to initialize 3D engines:', error);
        }
    }
    
    /**
     * تحويل شكل 2D إلى مسار Three.js Shape
     * @param {Object} shape - شكل TyrexCAD
     * @returns {THREE.Shape} مسار Three.js
     */
    shapeToPath(shape) {
        const path = new this.THREE.Shape();
        
        switch(shape.type) {
            case 'line':
                // الخط المستقيم يحتاج لتحويل إلى شكل مغلق للبثق
                return this.lineToPath(shape);
                
            case 'rectangle':
                return this.rectangleToPath(shape);
                
            case 'circle':
                return this.circleToPath(shape);
                
            case 'arc':
                return this.arcToPath(shape);
                
            case 'ellipse':
                return this.ellipseToPath(shape);
                
            case 'polyline':
                return this.polylineToPath(shape);
                
            case 'polygon':
                return this.polygonToPath(shape);
                
            default:
                console.warn(`Unsupported shape type for 3D conversion: ${shape.type}`);
                return null;
        }
    }
    
    /**
     * تحويل خط إلى مسار (يحتاج لسماكة)
     */
    lineToPath(line) {
        // إنشاء مستطيل رفيع حول الخط
        const thickness = 1; // سماكة افتراضية
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return null;
        
        // حساب النقاط العمودية
        const nx = -dy / length * thickness;
        const ny = dx / length * thickness;
        
        const path = new this.THREE.Shape();
        path.moveTo(line.start.x + nx, line.start.y + ny);
        path.lineTo(line.end.x + nx, line.end.y + ny);
        path.lineTo(line.end.x - nx, line.end.y - ny);
        path.lineTo(line.start.x - nx, line.start.y - ny);
        path.closePath();
        
        return path;
    }
    
    /**
     * تحويل مستطيل إلى مسار
     */
    rectangleToPath(rect) {
        const path = new this.THREE.Shape();
        const minX = Math.min(rect.start.x, rect.end.x);
        const minY = Math.min(rect.start.y, rect.end.y);
        const maxX = Math.max(rect.start.x, rect.end.x);
        const maxY = Math.max(rect.start.y, rect.end.y);
        
        path.moveTo(minX, minY);
        path.lineTo(maxX, minY);
        path.lineTo(maxX, maxY);
        path.lineTo(minX, maxY);
        path.closePath();
        
        return path;
    }
    
    /**
     * تحويل دائرة إلى مسار
     */
    circleToPath(circle) {
        const path = new this.THREE.Shape();
        path.absarc(
            circle.center.x, 
            circle.center.y,
            circle.radius,
            0,
            Math.PI * 2,
            false
        );
        return path;
    }
    
    /**
     * تحويل قوس إلى مسار
     */
    arcToPath(arc) {
        const path = new this.THREE.Shape();
        
        // نحتاج لإغلاق القوس لجعله قابل للبثق
        path.moveTo(arc.center.x, arc.center.y);
        path.absarc(
            arc.center.x,
            arc.center.y,
            arc.radius,
            arc.startAngle,
            arc.endAngle,
            false
        );
        path.closePath();
        
        return path;
    }
    
    /**
     * تحويل شكل بيضاوي إلى مسار
     */
    ellipseToPath(ellipse) {
        const path = new this.THREE.Shape();
        path.absellipse(
            ellipse.center.x,
            ellipse.center.y,
            ellipse.radiusX,
            ellipse.radiusY,
            0,
            Math.PI * 2,
            false,
            0
        );
        return path;
    }
    
    /**
     * تحويل خط متعدد إلى مسار
     */
    polylineToPath(polyline) {
        if (polyline.points.length < 2) return null;
        
        const path = new this.THREE.Shape();
        
        polyline.points.forEach((point, index) => {
            if (index === 0) {
                path.moveTo(point.x, point.y);
            } else {
                path.lineTo(point.x, point.y);
            }
        });
        
        // إغلاق المسار إذا كان مطلوباً
        if (polyline.closed || polyline.type === 'polygon') {
            path.closePath();
        } else {
            // للخطوط المفتوحة، نحتاج لإنشاء شكل مغلق
            // نضيف خط رجوع بسماكة صغيرة
            const lastPoint = polyline.points[polyline.points.length - 1];
            const firstPoint = polyline.points[0];
            
            // إضافة سماكة صغيرة
            const thickness = 0.1;
            for (let i = polyline.points.length - 1; i >= 0; i--) {
                const point = polyline.points[i];
                path.lineTo(point.x + thickness, point.y + thickness);
            }
            path.closePath();
        }
        
        return path;
    }
    
    /**
     * تحويل مضلع إلى مسار
     */
    polygonToPath(polygon) {
        // المضلع هو خط متعدد مغلق
        return this.polylineToPath({ ...polygon, closed: true });
    }
    
    /**
     * إنشاء مادة من خصائص الشكل
     */
    createMaterial(shape, options = {}) {
        const settings = {
            ...this.defaultSettings.material,
            color: shape.color || this.defaultSettings.material.color,
            ...options
        };
        
        return new this.THREE.MeshPhongMaterial(settings);
    }
    
    /**
     * بثق شكل 2D إلى 3D
     * @param {Object} shape - الشكل المراد بثقه
     * @param {Object} options - خيارات البثق
     * @returns {THREE.Mesh} النموذج ثلاثي الأبعاد
     */
    extrude(shape, options = {}) {
        const path = this.shapeToPath(shape);
        if (!path) {
            console.warn('Cannot convert shape to path:', shape);
            return null;
        }
        
        // دمج الإعدادات
        const settings = {
            ...this.defaultSettings.extrude,
            ...options
        };
        
        try {
            // إنشاء الهندسة
            const geometry = new this.THREE.ExtrudeGeometry(path, settings);
            
            // إنشاء المادة
            const material = this.createMaterial(shape, options.material);
            
            // إنشاء الشبكة
            const mesh = new this.THREE.Mesh(geometry, material);
            
            // توسيط النموذج
            this.centerMesh(mesh);
            
            // إضافة معلومات الشكل الأصلي
            mesh.userData = {
                shape2D: shape,
                conversionType: 'extrude',
                settings: settings
            };
            
            return mesh;
            
        } catch (error) {
            console.error('Error extruding shape:', error);
            return null;
        }
    }
    
    /**
     * دوران شكل 2D حول محور
     * @param {Object} shape - الشكل المراد دورانه
     * @param {Object} options - خيارات الدوران
     * @returns {THREE.Mesh} النموذج ثلاثي الأبعاد
     */
    revolve(shape, options = {}) {
        // الحصول على نقاط الشكل للدوران
        const points = this.getRevolutionPoints(shape);
        if (!points || points.length < 2) {
            console.warn('Cannot get revolution points:', shape);
            return null;
        }
        
        // دمج الإعدادات
        const settings = {
            ...this.defaultSettings.revolve,
            ...options
        };
        
        try {
            // إنشاء الهندسة
            const geometry = new this.THREE.LatheGeometry(
                points,
                settings.segments,
                settings.phiStart,
                settings.phiLength
            );
            
            // إنشاء المادة
            const material = this.createMaterial(shape, options.material);
            
            // إنشاء الشبكة
            const mesh = new this.THREE.Mesh(geometry, material);
            
            // توسيط النموذج
            this.centerMesh(mesh);
            
            // إضافة معلومات الشكل الأصلي
            mesh.userData = {
                shape2D: shape,
                conversionType: 'revolve',
                settings: settings
            };
            
            return mesh;
            
        } catch (error) {
            console.error('Error revolving shape:', error);
            return null;
        }
    }
    
    /**
     * الحصول على نقاط للدوران
     */
    getRevolutionPoints(shape) {
        const points = [];
        
        switch (shape.type) {
            case 'polyline':
                shape.points.forEach(p => {
                    // نأخذ المسافة من المحور كـ x والارتفاع كـ y
                    points.push(new this.THREE.Vector2(
                        Math.abs(p.x), // المسافة من المحور
                        p.y            // الارتفاع
                    ));
                });
                break;
                
            case 'line':
                points.push(new this.THREE.Vector2(
                    Math.abs(shape.start.x),
                    shape.start.y
                ));
                points.push(new this.THREE.Vector2(
                    Math.abs(shape.end.x),
                    shape.end.y
                ));
                break;
                
            case 'rectangle':
                // نأخذ الحافة اليمنى من المستطيل
                const maxX = Math.max(shape.start.x, shape.end.x);
                const minY = Math.min(shape.start.y, shape.end.y);
                const maxY = Math.max(shape.start.y, shape.end.y);
                
                points.push(new this.THREE.Vector2(0, minY));
                points.push(new this.THREE.Vector2(maxX, minY));
                points.push(new this.THREE.Vector2(maxX, maxY));
                points.push(new this.THREE.Vector2(0, maxY));
                break;
                
            default:
                console.warn('Shape type not supported for revolution:', shape.type);
        }
        
        return points;
    }
    
    /**
     * توسيط الشبكة حول نقطة الأصل
     */
    centerMesh(mesh) {
        mesh.geometry.computeBoundingBox();
        const center = mesh.geometry.boundingBox.getCenter(new this.THREE.Vector3());
        mesh.geometry.translate(-center.x, -center.y, -center.z);
    }
    
    /**
     * تحديث نموذج 3D موجود
     */
    updateMesh(mesh, shape, options = {}) {
        // التحقق من نوع التحويل
        const conversionType = mesh.userData.conversionType;
        
        // حذف الهندسة القديمة
        mesh.geometry.dispose();
        
        // إنشاء هندسة جديدة
        let newMesh;
        switch (conversionType) {
            case 'extrude':
                newMesh = this.extrude(shape, options);
                break;
            case 'revolve':
                newMesh = this.revolve(shape, options);
                break;
        }
        
        if (newMesh) {
            mesh.geometry = newMesh.geometry;
            mesh.material = newMesh.material;
            newMesh.geometry = null; // منع التنظيف المزدوج
            newMesh.material = null;
        }
    }
    
    /**
     * تحويل مجموعة من الأشكال
     */
    convertMultiple(shapes, method = 'extrude', options = {}) {
        const meshes = [];
        
        shapes.forEach(shape => {
            let mesh;
            switch (method) {
                case 'extrude':
                    mesh = this.extrude(shape, options);
                    break;
                case 'revolve':
                    mesh = this.revolve(shape, options);
                    break;
            }
            
            if (mesh) {
                meshes.push(mesh);
            }
        });
        
        return meshes;
    }
    
    /**
     * دمج عدة أشكال في نموذج واحد
     */
    mergeShapes(shapes, method = 'extrude', options = {}) {
        const meshes = this.convertMultiple(shapes, method, options);
        
        if (meshes.length === 0) return null;
        if (meshes.length === 1) return meshes[0];
        
        // دمج الهندسات
        const geometries = meshes.map(mesh => mesh.geometry);
        const mergedGeometry = this.THREE.BufferGeometryUtils.mergeBufferGeometries(
            geometries
        );
        
        // استخدام مادة الشكل الأول
        const material = meshes[0].material;
        
        // تنظيف الذاكرة
        meshes.forEach(mesh => {
            mesh.geometry.dispose();
            if (mesh.material !== material) {
                mesh.material.dispose();
            }
        });
        
        return new this.THREE.Mesh(mergedGeometry, material);
    }
}

// تصدير الكلاس
export { Shape3DConverter };

// جعله متاح globally للتوافق
window.Shape3DConverter = Shape3DConverter;