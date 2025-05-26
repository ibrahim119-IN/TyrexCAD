#ifndef TYREX_COORDINATE_CONVERTER_H
#define TYREX_COORDINATE_CONVERTER_H

#include <QPoint>
#include <gp_Pnt2d.hxx>
#include <gp_Pnt.hxx>
#include <V3d_View.hxx>
#include <ElSLib.hxx>
#include <gp_Pln.hxx>

namespace TyrexCAD {

    /**
     * @brief Unified coordinate conversion utility class
     *
     * This class provides consistent coordinate transformations between
     * screen space, world space, and sketch plane coordinates.
     */
    class CoordinateConverter {
    public:
        /**
         * @brief Convert screen coordinates to 2D world coordinates
         * @param screenPos Screen position in pixels
         * @param view OpenCascade 3D view
         * @return 2D point in world coordinates
         */
        static gp_Pnt2d screenToWorld2D(const QPoint& screenPos,
            const Handle(V3d_View)& view) {
            if (view.IsNull()) {
                return gp_Pnt2d(screenPos.x(), screenPos.y());
            }

            try {
                Standard_Real xv, yv, zv;
                view->Convert(screenPos.x(), screenPos.y(), xv, yv, zv);
                return gp_Pnt2d(xv, yv);
            }
            catch (const Standard_Failure&) {
                return gp_Pnt2d(screenPos.x(), screenPos.y());
            }
        }

        /**
         * @brief Convert screen coordinates to 3D world coordinates
         * @param screenPos Screen position in pixels
         * @param view OpenCascade 3D view
         * @return 3D point in world coordinates
         */
        static gp_Pnt screenToWorld3D(const QPoint& screenPos,
            const Handle(V3d_View)& view) {
            if (view.IsNull()) {
                return gp_Pnt(screenPos.x(), screenPos.y(), 0);
            }

            try {
                Standard_Real xv, yv, zv;
                view->Convert(screenPos.x(), screenPos.y(), xv, yv, zv);
                return gp_Pnt(xv, yv, zv);
            }
            catch (const Standard_Failure&) {
                return gp_Pnt(screenPos.x(), screenPos.y(), 0);
            }
        }

        /**
         * @brief Convert world coordinates to screen coordinates
         * @param worldPoint 3D point in world coordinates
         * @param view OpenCascade 3D view
         * @return Screen position in pixels
         */
        static QPoint worldToScreen(const gp_Pnt& worldPoint,
            const Handle(V3d_View)& view) {
            if (view.IsNull()) {
                return QPoint(static_cast<int>(worldPoint.X()),
                    static_cast<int>(worldPoint.Y()));
            }

            try {
                Standard_Integer x, y;
                view->Convert(worldPoint.X(), worldPoint.Y(), worldPoint.Z(), x, y);
                return QPoint(x, y);
            }
            catch (const Standard_Failure&) {
                return QPoint(static_cast<int>(worldPoint.X()),
                    static_cast<int>(worldPoint.Y()));
            }
        }

        /**
         * @brief Convert screen coordinates to sketch plane coordinates
         * @param screenPos Screen position in pixels
         * @param view OpenCascade 3D view
         * @param sketchPlane The sketch plane
         * @return 2D point on sketch plane
         */
        static gp_Pnt2d screenToSketch(const QPoint& screenPos,
            const Handle(V3d_View)& view,
            const gp_Pln& sketchPlane) {
            gp_Pnt worldPoint = screenToWorld3D(screenPos, view);

            Standard_Real u, v;
            ElSLib::Parameters(sketchPlane, worldPoint, u, v);

            return gp_Pnt2d(u, v);
        }

        /**
         * @brief Convert sketch plane coordinates to world coordinates
         * @param sketchPoint 2D point on sketch plane
         * @param sketchPlane The sketch plane
         * @return 3D point in world coordinates
         */
        static gp_Pnt sketchToWorld(const gp_Pnt2d& sketchPoint,
            const gp_Pln& sketchPlane) {
            return ElSLib::Value(sketchPoint.X(), sketchPoint.Y(), sketchPlane);
        }

        /**
         * @brief Convert sketch plane coordinates to screen coordinates
         * @param sketchPoint 2D point on sketch plane
         * @param sketchPlane The sketch plane
         * @param view OpenCascade 3D view
         * @return Screen position in pixels
         */
        static QPoint sketchToScreen(const gp_Pnt2d& sketchPoint,
            const gp_Pln& sketchPlane,
            const Handle(V3d_View)& view) {
            gp_Pnt worldPoint = sketchToWorld(sketchPoint, sketchPlane);
            return worldToScreen(worldPoint, view);
        }
    };

} // namespace TyrexCAD

#endif // TYREX_COORDINATE_CONVERTER_H