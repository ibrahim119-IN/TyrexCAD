/**
 * TyrexCAD Geometry Library
 * Core geometric calculations and algorithms
 * 
 * All methods are static and pure functions (no side effects)
 */

class Geometry {
    /**
     * Calculate intersection point of two line segments
     * @param {Object} p1 - First point of line 1 {x, y}
     * @param {Object} p2 - Second point of line 1 {x, y}
     * @param {Object} p3 - First point of line 2 {x, y}
     * @param {Object} p4 - Second point of line 2 {x, y}
     * @returns {Object|null} Intersection point {x, y} or null if no intersection
     */
    static lineLineIntersection(p1, p2, p3, p4) {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return null;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }
        
        return null;
    }
    
    /**
     * Calculate intersection points of a line segment and a circle
     * @param {Object} p1 - First point of line {x, y}
     * @param {Object} p2 - Second point of line {x, y}
     * @param {Object} center - Center of circle {x, y}
     * @param {number} radius - Radius of circle
     * @returns {Array} Array of intersection points (0, 1, or 2 points)
     */
    static lineCircleIntersection(p1, p2, center, radius) {
        const intersections = [];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const fx = p1.x - center.x;
        const fy = p1.y - center.y;
        
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - radius * radius;
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return intersections;
        
        const sqrt_discriminant = Math.sqrt(discriminant);
        const t1 = (-b - sqrt_discriminant) / (2 * a);
        const t2 = (-b + sqrt_discriminant) / (2 * a);
        
        if (t1 >= 0 && t1 <= 1) {
            intersections.push({
                x: p1.x + t1 * dx,
                y: p1.y + t1 * dy
            });
        }
        
        if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 0.0001) {
            intersections.push({
                x: p1.x + t2 * dx,
                y: p1.y + t2 * dy
            });
        }
        
        return intersections;
    }
    
    /**
     * Calculate intersection points of two circles
     * @param {Object} c1 - Center of first circle {x, y}
     * @param {number} r1 - Radius of first circle
     * @param {Object} c2 - Center of second circle {x, y}
     * @param {number} r2 - Radius of second circle
     * @returns {Array} Array of intersection points (0, 1, or 2 points)
     */
    static circleCircleIntersection(c1, r1, c2, r2) {
        const intersections = [];
        
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        
        // No intersection cases
        if (d > r1 + r2 || d < Math.abs(r1 - r2) || d === 0) {
            return intersections;
        }
        
        const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
        const h = Math.sqrt(r1 * r1 - a * a);
        
        // Point on line between centers
        const px = c1.x + a * (c2.x - c1.x) / d;
        const py = c1.y + a * (c2.y - c1.y) / d;
        
        // Perpendicular offset
        const perpX = h * (c2.y - c1.y) / d;
        const perpY = h * (c1.x - c2.x) / d;
        
        // First intersection point
        intersections.push({
            x: px + perpX,
            y: py + perpY
        });
        
        // Second intersection point (if exists)
        if (Math.abs(h) > 0.0001) {
            intersections.push({
                x: px - perpX,
                y: py - perpY
            });
        }
        
        return intersections;
    }
    
    /**
     * Check if a point lies on a line segment within tolerance
     * @param {number} px - X coordinate of point
     * @param {number} py - Y coordinate of point
     * @param {Object} p1 - First point of line segment {x, y}
     * @param {Object} p2 - Second point of line segment {x, y}
     * @param {number} tolerance - Distance tolerance
     * @returns {boolean} True if point is on line segment
     */
    static isPointOnLine(px, py, p1, p2, tolerance) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);
        
        if (lineLength === 0) {
            // Line is actually a point
            const dist = Math.sqrt((px - p1.x) * (px - p1.x) + (py - p1.y) * (py - p1.y));
            return dist < tolerance;
        }
        
        // Calculate parameter t for closest point on line
        const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (py - p1.y) * dy) / (lineLength * lineLength)));
        
        // Find closest point on line segment
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        
        // Check distance from point to closest point on line
        const dist = Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
        return dist < tolerance;
    }
    
    /**
     * Calculate arc parameters from three points
     * @param {Object} p1 - First point {x, y}
     * @param {Object} p2 - Second point {x, y}
     * @param {Object} p3 - Third point {x, y}
     * @returns {Object|null} Arc parameters {center, radius, startAngle, endAngle} or null if collinear
     */
    static calculateArcFrom3Points(p1, p2, p3) {
        const ax = p1.x, ay = p1.y;
        const bx = p2.x, by = p2.y;
        const cx = p3.x, cy = p3.y;
        
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        
        // Check if points are collinear
        if (Math.abs(d) < 0.001) return null;
        
        // Calculate center of circle
        const ux = ((ax * ax + ay * ay) * (by - cy) + 
                   (bx * bx + by * by) * (cy - ay) + 
                   (cx * cx + cy * cy) * (ay - by)) / d;
        const uy = ((ax * ax + ay * ay) * (cx - bx) + 
                   (bx * bx + by * by) * (ax - cx) + 
                   (cx * cx + cy * cy) * (bx - ax)) / d;
        
        const center = { x: ux, y: uy };
        
        // Calculate radius
        const radius = Math.sqrt((ax - ux) * (ax - ux) + (ay - uy) * (ay - uy));
        
        // Calculate angles
        const startAngle = Math.atan2(ay - uy, ax - ux);
        const endAngle = Math.atan2(cy - uy, cx - ux);
        
        return { center, radius, startAngle, endAngle };
    }
    
    /**
     * Find the nearest point on a line segment to a given point
     * @param {Object} point - The point to find nearest point to {x, y}
     * @param {Object} lineStart - Start point of line segment {x, y}
     * @param {Object} lineEnd - End point of line segment {x, y}
     * @returns {Object} Nearest point on line segment {x, y}
     */
    static getNearestPointOnLine(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const len = dx * dx + dy * dy;
        
        // Handle degenerate case where line is actually a point
        if (len === 0) return { x: lineStart.x, y: lineStart.y };
        
        // Calculate parameter t for projection
        const t = Math.max(0, Math.min(1, 
            ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / len
        ));
        
        // Return nearest point
        return {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };
    }
    
    /**
     * Find perpendicular point from a point to a line (if exists within line segment)
     * @param {Object} fromPoint - The point to project from {x, y}
     * @param {Object} toPoint - Not used in original implementation
     * @param {Object} shape - Shape object with line information
     * @returns {Object|null} Perpendicular point on line or null if outside segment
     */
    static getPerpendicularPoint(fromPoint, toPoint, shape) {
        // This implementation assumes shape.type === 'line' with start and end points
        if (!shape || shape.type !== 'line') return null;
        
        const dx = shape.end.x - shape.start.x;
        const dy = shape.end.y - shape.start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len === 0) return null;
        
        // Calculate parameter t for perpendicular projection
        const t = ((fromPoint.x - shape.start.x) * dx + (fromPoint.y - shape.start.y) * dy) / (len * len);
        
        // Check if perpendicular point is within line segment
        if (t >= 0 && t <= 1) {
            return {
                x: shape.start.x + t * dx,
                y: shape.start.y + t * dy
            };
        }
        
        return null;
    }
    
    /**
     * Calculate distance between two points
     * @param {number} x1 - X coordinate of first point
     * @param {number} y1 - Y coordinate of first point
     * @param {number} x2 - X coordinate of second point
     * @param {number} y2 - Y coordinate of second point
     * @returns {number} Distance between points
     */
    static distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }
    
    /**
     * Calculate angle between two points
     * @param {number} x1 - X coordinate of first point
     * @param {number} y1 - Y coordinate of first point
     * @param {number} x2 - X coordinate of second point
     * @param {number} y2 - Y coordinate of second point
     * @returns {number} Angle in radians
     */
    static angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
}

// Make available globally
window.Geometry = Geometry;