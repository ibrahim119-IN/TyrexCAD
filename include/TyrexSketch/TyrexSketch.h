/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_SKETCH_H
#define TYREX_SKETCH_H

 /**
  * @file TyrexSketch.h
  * @brief Convenience header for including all sketch-related components
  *
  * This header provides a single include point for all sketching functionality
  * in TyrexCAD, making it easier to use the sketching system.
  *
  * LOCATION: include/TyrexSketch/TyrexSketch.h
  */

  // Core sketch management
#include "TyrexSketch/TyrexSketchManager.h"

// Base sketch entity
#include "TyrexSketch/TyrexSketchEntity.h"

// Specific sketch entities
#include "TyrexSketch/TyrexSketchLineEntity.h"
#include "TyrexSketch/TyrexSketchCircleEntity.h"

// Sketch commands
#include "TyrexSketch/TyrexSketchLineCommand.h"
#include "TyrexSketch/TyrexSketchCircleCommand.h"

// Required includes for helper functions
#include <memory>
#include <string>
#include <gp_Pln.hxx>
#include <gp_Pnt.hxx>
#include <gp_Pnt2d.hxx>
#include <gp_Dir.hxx>

// Forward declarations
class AIS_InteractiveContext;

namespace TyrexCAD {
    class TyrexViewerManager;

    /**
     * @namespace TyrexCAD
     * @brief Main namespace for all TyrexCAD components
     */

     /**
      * @namespace TyrexCAD::Sketch
      * @brief Namespace for sketching-specific utilities and helpers
      */
    namespace Sketch {

        /**
         * @brief Helper function to create a sketch manager
         * @param context OpenCascade interactive context
         * @param viewerManager Viewer manager for coordinate conversion
         * @param parent Parent QObject
         * @return Shared pointer to sketch manager
         */
        inline std::shared_ptr<TyrexSketchManager> createSketchManager(
            const Handle(AIS_InteractiveContext)& context,
            TyrexViewerManager* viewerManager,
            QObject* parent = nullptr)
        {
            return std::make_shared<TyrexSketchManager>(context, viewerManager, parent);
        }

        /**
         * @brief Helper function to create a line entity
         * @param id Unique identifier
         * @param plane Sketch plane
         * @param start Start point
         * @param end End point
         * @return Shared pointer to line entity
         */
        inline std::shared_ptr<TyrexSketchLineEntity> createLine(
            const std::string& id,
            const gp_Pln& plane,
            const gp_Pnt2d& start,
            const gp_Pnt2d& end)
        {
            return std::make_shared<TyrexSketchLineEntity>(id, plane, start, end);
        }

        /**
         * @brief Helper function to create a circle entity
         * @param id Unique identifier
         * @param plane Sketch plane
         * @param center Center point
         * @param radius Radius
         * @return Shared pointer to circle entity
         */
        inline std::shared_ptr<TyrexSketchCircleEntity> createCircle(
            const std::string& id,
            const gp_Pln& plane,
            const gp_Pnt2d& center,
            double radius)
        {
            return std::make_shared<TyrexSketchCircleEntity>(id, plane, center, radius);
        }

        /**
         * @brief Helper function to create a circle entity by center and point
         * @param id Unique identifier
         * @param plane Sketch plane
         * @param center Center point
         * @param pointOnCircle Point on circumference
         * @return Shared pointer to circle entity
         */
        inline std::shared_ptr<TyrexSketchCircleEntity> createCircleByPoints(
            const std::string& id,
            const gp_Pln& plane,
            const gp_Pnt2d& center,
            const gp_Pnt2d& pointOnCircle)
        {
            return std::make_shared<TyrexSketchCircleEntity>(id, plane, center, pointOnCircle);
        }

        /**
         * @brief Create a default XY sketch plane at origin
         * @return Default sketch plane (XY plane at Z=0)
         */
        inline gp_Pln createDefaultSketchPlane()
        {
            return gp_Pln(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1));
        }

        /**
         * @brief Create a sketch plane at specified Z height
         * @param z Z coordinate for the plane
         * @return Sketch plane at Z height
         */
        inline gp_Pln createSketchPlaneAtZ(double z)
        {
            return gp_Pln(gp_Pnt(0, 0, z), gp_Dir(0, 0, 1));
        }

        /**
         * @brief Create a sketch plane with custom origin and normal
         * @param origin Origin point of the plane
         * @param normal Normal vector of the plane
         * @return Custom sketch plane
         */
        inline gp_Pln createCustomSketchPlane(const gp_Pnt& origin, const gp_Dir& normal)
        {
            return gp_Pln(origin, normal);
        }

        /**
         * @brief Common sketch plane presets
         */
        namespace Planes {
            /// XY plane (Z = 0)
            inline gp_Pln XY() { return createDefaultSketchPlane(); }

            /// XZ plane (Y = 0)
            inline gp_Pln XZ() { return gp_Pln(gp_Pnt(0, 0, 0), gp_Dir(0, 1, 0)); }

            /// YZ plane (X = 0)
            inline gp_Pln YZ() { return gp_Pln(gp_Pnt(0, 0, 0), gp_Dir(1, 0, 0)); }
        }

        /**
         * @brief Utility functions for sketch operations
         */
        namespace Utils {
            /**
             * @brief Generate a unique entity ID with prefix
             * @param prefix Prefix for the ID (default: "sketch_entity")
             * @return Unique ID string
             */
            std::string generateUniqueId(const std::string& prefix = "sketch_entity");

            /**
             * @brief Calculate distance between two 2D points
             * @param p1 First point
             * @param p2 Second point
             * @return Distance
             */
            inline double distance2D(const gp_Pnt2d& p1, const gp_Pnt2d& p2)
            {
                return p1.Distance(p2);
            }

            /**
             * @brief Calculate midpoint between two 2D points
             * @param p1 First point
             * @param p2 Second point
             * @return Midpoint
             */
            inline gp_Pnt2d midpoint2D(const gp_Pnt2d& p1, const gp_Pnt2d& p2)
            {
                return gp_Pnt2d((p1.X() + p2.X()) * 0.5, (p1.Y() + p2.Y()) * 0.5);
            }

            /**
             * @brief Check if two 2D points are nearly equal within tolerance
             * @param p1 First point
             * @param p2 Second point
             * @param tolerance Distance tolerance (default: 1e-6)
             * @return True if points are nearly equal
             */
            inline bool isNearlyEqual2D(const gp_Pnt2d& p1, const gp_Pnt2d& p2, double tolerance = 1e-6)
            {
                return distance2D(p1, p2) <= tolerance;
            }
        }

    } // namespace Sketch

} // namespace TyrexCAD

#endif // TYREX_SKETCH_H