/**
 * TyrexCAD Tools System
 * نظام إدارة أدوات الرسم والتعديل
 * 
 * يحتوي على جميع أدوات الرسم والتعديل الأساسية
 */

const Tools = {
    // مرجع لـ CAD instance
    cad: null,
    
    // حالة خاصة بأدوات التعديل
    modifyState: {
        originalShapes: [],
        baseDistance: 50,
        trimExtendBoundaries: [],
        offsetDistance: 10
    },
    
    /**
     * تهيئة النظام
     * @param {TyrexCAD} cadInstance - مرجع للنظام الرئيسي
     */
    init(cadInstance) {
        this.cad = cadInstance;
    },
    
    /**
     * إعادة تعيين حالة التعديل
     */
    resetModifyState() {
        this.modifyState.originalShapes = [];
        this.modifyState.baseDistance = 50;
        this.modifyState.trimExtendBoundaries = [];
        this.modifyState.offsetDistance = 10;
    },
    
    // ==================== أدوات الرسم ====================
    
    /**
     * رسم خط
     * @param {Object} point - نقطة البداية أو النهاية {x, y}
     */
    drawLine(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            
            if (this.cad.pendingShapeProperties && this.cad.pendingShapeProperties.lineLength > 0) {
                // Create line with specified length and angle
                const length = this.cad.pendingShapeProperties.lineLength; // Already in internal units
                const angle = (this.cad.pendingShapeProperties.lineAngle || 0) * Math.PI / 180;
                
                const endPoint = {
                    x: point.x + length * Math.cos(angle),
                    y: point.y + length * Math.sin(angle)
                };
                
                const shape = {
                    type: 'line',
                    start: point,
                    end: endPoint,
                    color: this.cad.currentColor,
                    lineWidth: this.cad.currentLineWidth,
                    lineType: this.cad.currentLineType,
                    layerId: this.cad.currentLayerId,
                    id: this.cad.generateId()
                };
                
                this.cad.addShape(shape);
                this.cad.finishDrawing();
                this.cad.pendingShapeProperties = null;
            } else {
                this.cad.updateStatus('Specify second point');
            }
        } else {
            const shape = {
                type: 'line',
                start: this.cad.drawingPoints[0],
                end: point,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType,
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
            
            this.cad.addShape(shape);
            this.cad.finishDrawing();
        }
    },
    
    /**
     * رسم خط متعدد النقاط
     * @param {Object} point - نقطة جديدة {x, y}
     */
    drawPolyline(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            this.cad.updateStatus('Specify next point (Enter to finish, Right-click to finish)');
        } else {
            this.cad.drawingPoints.push(point);
            this.cad.updateStatus(`Point ${this.cad.drawingPoints.length} added`);
        }
    },
    
    /**
     * إنهاء رسم الخط المتعدد
     */
    finishPolyline() {
        if (this.cad.drawingPoints.length > 1) {
            const shape = {
                type: 'polyline',
                points: [...this.cad.drawingPoints],
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType,
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
            
            this.cad.addShape(shape);
        }
        this.cad.finishDrawing();
    },
    
    /**
     * رسم مستطيل
     * @param {Object} point - نقطة الزاوية الأولى أو الثانية {x, y}
     */
    drawRectangle(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            
            if (this.cad.pendingShapeProperties && 
                this.cad.pendingShapeProperties.rectWidth > 0 && 
                this.cad.pendingShapeProperties.rectHeight > 0) {
                // Create rectangle with specified dimensions
                const width = this.cad.pendingShapeProperties.rectWidth;  // Already in internal units
                const height = this.cad.pendingShapeProperties.rectHeight; // Already in internal units
                
                const shape = {
                    type: 'rectangle',
                    start: point,
                    end: {
                        x: point.x + width,
                        y: point.y + height
                    },
                    color: this.cad.currentColor,
                    lineWidth: this.cad.currentLineWidth,
                    lineType: this.cad.currentLineType,
                    layerId: this.cad.currentLayerId,
                    id: this.cad.generateId()
                };
                
                this.cad.addShape(shape);
                this.cad.finishDrawing();
                this.cad.pendingShapeProperties = null;
            } else {
                this.cad.updateStatus('Specify opposite corner');
            }
        } else {
            const shape = {
                type: 'rectangle',
                start: this.cad.drawingPoints[0],
                end: point,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType,
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
            
            this.cad.addShape(shape);
            this.cad.finishDrawing();
        }
    },
    
    /**
     * رسم دائرة
     * @param {Object} point - مركز الدائرة أو نقطة على المحيط {x, y}
     */
    drawCircle(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            
            if (this.cad.pendingShapeProperties && this.cad.pendingShapeProperties.circleRadius > 0) {
                // Create circle with specified radius
                const radius = this.cad.pendingShapeProperties.circleRadius; // Already in internal units
                
                const shape = {
                    type: 'circle',
                    center: point,
                    radius: radius,
                    color: this.cad.currentColor,
                    lineWidth: this.cad.currentLineWidth,
                    lineType: this.cad.currentLineType,
                    layerId: this.cad.currentLayerId,
                    id: this.cad.generateId()
                };
                
                this.cad.addShape(shape);
                this.cad.finishDrawing();
                this.cad.pendingShapeProperties = null;
            } else {
                this.cad.updateStatus('Specify radius');
            }
        } else {
            const radius = this.cad.distance(
                this.cad.drawingPoints[0].x,
                this.cad.drawingPoints[0].y,
                point.x,
                point.y
            );
            
            const shape = {
                type: 'circle',
                center: this.cad.drawingPoints[0],
                radius: radius,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType,
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
            
            this.cad.addShape(shape);
            this.cad.finishDrawing();
        }
    },
    
    /**
     * رسم قوس
     * @param {Object} point - نقطة على القوس {x, y}
     */
    drawArc(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            this.cad.updateStatus('Specify second point');
        } else if (this.cad.drawingPoints.length === 1) {
            this.cad.drawingPoints.push(point);
            this.cad.updateStatus('Specify end point');
        } else {
            const arc = this.cad.geo.calculateArcFrom3Points(
                this.cad.drawingPoints[0],
                this.cad.drawingPoints[1],
                point
            );
            
            if (arc) {
                const shape = {
                    type: 'arc',
                    center: arc.center,
                    radius: arc.radius,
                    startAngle: arc.startAngle,
                    endAngle: arc.endAngle,
                    color: this.cad.currentColor,
                    lineWidth: this.cad.currentLineWidth,
                    lineType: this.cad.currentLineType,
                    layerId: this.cad.currentLayerId,
                    id: this.cad.generateId()
                };
                
                this.cad.addShape(shape);
            }
            this.cad.finishDrawing();
        }
    },
    
    /**
     * رسم شكل بيضاوي
     * @param {Object} point - نقطة مرجعية {x, y}
     */
    drawEllipse(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            this.cad.updateStatus('Specify first axis');
        } else if (this.cad.drawingPoints.length === 1) {
            this.cad.drawingPoints.push(point);
            this.cad.updateStatus('Specify second axis');
        } else {
            const center = this.cad.drawingPoints[0];
            const radiusX = Math.abs(this.cad.drawingPoints[1].x - center.x);
            const radiusY = Math.abs(point.y - center.y);
            
            const shape = {
                type: 'ellipse',
                center: center,
                radiusX: radiusX,
                radiusY: radiusY,
                color: this.cad.currentColor,
                lineWidth: this.cad.currentLineWidth,
                lineType: this.cad.currentLineType,
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
            
            this.cad.addShape(shape);
            this.cad.finishDrawing();
        }
    },
    
    /**
     * إضافة نص
     * @param {Object} point - موقع النص {x, y}
     */
    drawText(point) {
        const text = prompt('Enter text:');
        if (text) {
            const shape = {
                type: 'text',
                position: point,
                text: text,
                fontSize: 16,
                color: this.cad.currentColor,
                layerId: this.cad.currentLayerId,
                id: this.cad.generateId()
            };
            
            this.cad.addShape(shape);
        }
    },
    
    // ==================== أدوات التعديل ====================
    
    /**
     * بدء عملية التحريك
     * @param {Object} point - نقطة البداية {x, y}
     */
    moveStart(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            this.modifyState.originalShapes = Array.from(this.cad.selectedShapes).map(s => this.cad.cloneShape(s));
            this.cad.updateStatus('Specify displacement');
        } else {
            const dx = point.x - this.cad.drawingPoints[0].x;
            const dy = point.y - this.cad.drawingPoints[0].y;
            
            this.cad.recordState();
            
            let i = 0;
            this.cad.selectedShapes.forEach(shape => {
                const original = this.modifyState.originalShapes[i++];
                this.cad.copyShapeProperties(shape, original);
                this.cad.translateShape(shape, dx, dy);
            });
            
            this.cad.finishDrawing();
            this.resetModifyState();
        }
    },
    
    /**
     * بدء عملية النسخ
     * @param {Object} point - نقطة البداية {x, y}
     */
    copyStart(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            this.modifyState.originalShapes = Array.from(this.cad.selectedShapes);
            this.cad.updateStatus('Specify displacement');
        } else {
            const dx = point.x - this.cad.drawingPoints[0].x;
            const dy = point.y - this.cad.drawingPoints[0].y;
            
            this.cad.recordState();
            
            const newShapes = [];
            this.modifyState.originalShapes.forEach(shape => {
                const newShape = this.cad.cloneShape(shape);
                newShape.id = this.cad.generateId();
                this.cad.translateShape(newShape, dx, dy);
                this.cad.shapes.push(newShape);
                newShapes.push(newShape);
            });
            
            this.cad.selectedShapes.clear();
            newShapes.forEach(shape => this.cad.selectedShapes.add(shape));
            
            this.cad.finishDrawing();
            this.resetModifyState();
        }
    },
    
    /**
     * بدء عملية التدوير
     * @param {Object} point - نقطة البداية {x, y}
     */
    rotateStart(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            this.modifyState.originalShapes = Array.from(this.cad.selectedShapes).map(s => this.cad.cloneShape(s));
            this.cad.showDynamicInput('Angle:', point);
            this.cad.updateStatus('Specify rotation angle');
        } else {
            const center = this.cad.drawingPoints[0];
            const angle = Math.atan2(
                point.y - center.y,
                point.x - center.x
            );
            
            this.cad.recordState();
            
            let i = 0;
            this.cad.selectedShapes.forEach(shape => {
                const original = this.modifyState.originalShapes[i++];
                this.cad.copyShapeProperties(shape, original);
                this.cad.rotateShape(shape, center, angle);
            });
            
            this.cad.finishDrawing();
            this.resetModifyState();
        }
    },
    
    /**
     * بدء عملية التكبير/التصغير
     * @param {Object} point - نقطة البداية {x, y}
     */
    scaleStart(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            this.modifyState.originalShapes = Array.from(this.cad.selectedShapes).map(s => this.cad.cloneShape(s));
            this.modifyState.baseDistance = 50;
            this.cad.showDynamicInput('Scale:', point);
            this.cad.updateStatus('Specify scale factor');
        } else {
            const center = this.cad.drawingPoints[0];
            const distance = this.cad.distance(center.x, center.y, point.x, point.y);
            const scale = distance / this.modifyState.baseDistance;
            
            this.cad.recordState();
            
            let i = 0;
            this.cad.selectedShapes.forEach(shape => {
                const original = this.modifyState.originalShapes[i++];
                this.cad.copyShapeProperties(shape, original);
                this.cad.scaleShape(shape, center, scale);
            });
            
            this.cad.finishDrawing();
            this.resetModifyState();
        }
    },
    
    /**
     * بدء عملية المرآة
     * @param {Object} point - نقطة البداية {x, y}
     */
    mirrorStart(point) {
        if (!this.cad.isDrawing) {
            this.cad.isDrawing = true;
            this.cad.drawingPoints = [point];
            this.cad.updateStatus('Specify second point of mirror line');
        } else {
            const mirrorLine = {
                start: this.cad.drawingPoints[0],
                end: point
            };
            
            this.cad.recordState();
            
            const selectedArray = Array.from(this.cad.selectedShapes);
            const newShapes = [];
            
            selectedArray.forEach(shape => {
                const newShape = this.cad.cloneShape(shape);
                newShape.id = this.cad.generateId();
                this.cad.mirrorShape(newShape, mirrorLine);
                this.cad.shapes.push(newShape);
                newShapes.push(newShape);
            });
            
            // Keep original shapes selected
            this.cad.render();
            this.cad.finishDrawing();
            this.resetModifyState();
        }
    },
    
    /**
     * معالجة عملية القص (Trim)
     * @param {Object} point - نقطة النقر {x, y}
     */
    handleTrim(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!this.modifyState.trimExtendBoundaries.length) {
            // Select cutting edges
            if (shape) {
                this.modifyState.trimExtendBoundaries.push(shape);
                this.cad.updateStatus('Select object to trim');
            } else {
                this.cad.updateStatus('Select cutting edge');
            }
        } else {
            // Trim the object
            if (shape && shape.type === 'line') {
                this.cad.recordState();
                
                // Find intersection with cutting edges
                for (const boundary of this.modifyState.trimExtendBoundaries) {
                    if (boundary.type === 'line') {
                        const intersection = this.cad.geo.lineLineIntersection(
                            shape.start, shape.end,
                            boundary.start, boundary.end
                        );
                        
                        if (intersection) {
                            // Determine which side to keep
                            const dist1 = this.cad.distance(world.x, world.y, shape.start.x, shape.start.y);
                            const dist2 = this.cad.distance(world.x, world.y, shape.end.x, shape.end.y);
                            
                            if (dist1 < dist2) {
                                shape.end = intersection;
                            } else {
                                shape.start = intersection;
                            }
                            
                            this.cad.render();
                            break;
                        }
                    }
                }
                
                this.modifyState.trimExtendBoundaries = [];
                this.cad.updateStatus('TRIM: Select cutting edge');
            }
        }
    },
    
    /**
     * معالجة عملية التمديد (Extend)
     * @param {Object} point - نقطة النقر {x, y}
     */
    handleExtend(point) {
        const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
        const shape = this.cad.getShapeAt(world.x, world.y);
        
        if (!this.modifyState.trimExtendBoundaries.length) {
            // Select boundary edges
            if (shape) {
                this.modifyState.trimExtendBoundaries.push(shape);
                this.cad.updateStatus('Select object to extend');
            } else {
                this.cad.updateStatus('Select boundary edge');
            }
        } else {
            // Extend the object
            if (shape && shape.type === 'line') {
                this.cad.recordState();
                
                // Find potential extension to boundary
                for (const boundary of this.modifyState.trimExtendBoundaries) {
                    if (boundary.type === 'line') {
                        // Calculate extended line
                        const dx = shape.end.x - shape.start.x;
                        const dy = shape.end.y - shape.start.y;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        
                        if (len > 0) {
                            // Extend line far enough
                            const extendedEnd = {
                                x: shape.start.x + (dx / len) * 10000,
                                y: shape.start.y + (dy / len) * 10000
                            };
                            
                            const intersection = this.cad.geo.lineLineIntersection(
                                shape.start, extendedEnd,
                                boundary.start, boundary.end
                            );
                            
                            if (intersection) {
                                // Check which end is closer to click point
                                const dist1 = this.cad.distance(world.x, world.y, shape.start.x, shape.start.y);
                                const dist2 = this.cad.distance(world.x, world.y, shape.end.x, shape.end.y);
                                
                                if (dist2 < dist1) {
                                    shape.end = intersection;
                                } else {
                                    // Extend from start
                                    const extendedStart = {
                                        x: shape.end.x - (dx / len) * 10000,
                                        y: shape.end.y - (dy / len) * 10000
                                    };
                                    
                                    const intersection2 = this.cad.geo.lineLineIntersection(
                                        extendedStart, shape.end,
                                        boundary.start, boundary.end
                                    );
                                    
                                    if (intersection2) {
                                        shape.start = intersection2;
                                    }
                                }
                                
                                this.cad.render();
                                break;
                            }
                        }
                    }
                }
                
                this.modifyState.trimExtendBoundaries = [];
                this.cad.updateStatus('EXTEND: Select boundary edge');
            }
        }
    },
    
    /**
     * معالجة عملية الإزاحة (Offset)
     * @param {Object} point - نقطة النقر {x, y}
     */
    handleOffset(point) {
        if (!this.cad.isDrawing) {
            const world = this.cad.screenToWorld(this.cad.mouseX, this.cad.mouseY);
            const shape = this.cad.getShapeAt(world.x, world.y);
            
            if (shape) {
                this.cad.isDrawing = true;
                this.modifyState.originalShapes = [shape];
                this.cad.drawingPoints = [point];
                this.cad.showDynamicInput('Offset distance:', point);
                this.cad.updateStatus('Specify offset side');
            } else {
                this.cad.updateStatus('Select object to offset');
            }
        } else {
            const shape = this.modifyState.originalShapes[0];
            const offsetShape = this.cad.cloneShape(shape);
            offsetShape.id = this.cad.generateId();
            
            // Calculate offset direction
            const side = this.determineOffsetSide(shape, point);
            
            switch (shape.type) {
                case 'line':
                    this.offsetLine(offsetShape, this.modifyState.offsetDistance * side);
                    break;
                case 'circle':
                    offsetShape.radius += this.modifyState.offsetDistance * side;
                    if (offsetShape.radius > 0) {
                        this.cad.shapes.push(offsetShape);
                    }
                    break;
                case 'rectangle':
                    // Offset all sides
                    offsetShape.start.x -= this.modifyState.offsetDistance * side;
                    offsetShape.start.y -= this.modifyState.offsetDistance * side;
                    offsetShape.end.x += this.modifyState.offsetDistance * side;
                    offsetShape.end.y += this.modifyState.offsetDistance * side;
                    this.cad.shapes.push(offsetShape);
                    break;
            }
            
            this.cad.recordState();
            this.cad.render();
            this.cad.finishDrawing();
            this.resetModifyState();
        }
    },
    
    /**
     * إزاحة خط
     * @param {Object} line - الخط المراد إزاحته
     * @param {number} distance - مسافة الإزاحة
     */
    offsetLine(line, distance) {
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            
            line.start.x += nx * distance;
            line.start.y += ny * distance;
            line.end.x += nx * distance;
            line.end.y += ny * distance;
            
            this.cad.shapes.push(line);
        }
    },
    
    /**
     * تحديد جانب الإزاحة
     * @param {Object} shape - الشكل
     * @param {Object} point - نقطة تحديد الجانب
     * @returns {number} 1 أو -1 للجانب
     */
    determineOffsetSide(shape, point) {
        switch (shape.type) {
            case 'line':
                const dx = shape.end.x - shape.start.x;
                const dy = shape.end.y - shape.start.y;
                const cross = (point.x - shape.start.x) * dy - (point.y - shape.start.y) * dx;
                return cross > 0 ? 1 : -1;
            case 'circle':
                const dist = this.cad.distance(point.x, point.y, shape.center.x, shape.center.y);
                return dist > shape.radius ? 1 : -1;
            default:
                return 1;
        }
    },
    
    /**
     * تحديث مسافة الإزاحة
     * @param {number} distance - المسافة الجديدة
     */
    updateOffsetDistance(distance) {
        this.modifyState.offsetDistance = distance;
    }
};

// تصدير النظام
window.Tools = Tools;