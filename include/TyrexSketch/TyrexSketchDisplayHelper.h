#pragma once
/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_SKETCH_DISPLAY_HELPER_H
#define TYREX_SKETCH_DISPLAY_HELPER_H

#include <V3d_View.hxx>
#include <AIS_InteractiveContext.hxx>
#include <Graphic3d_GraphicDriver.hxx>
#include <OpenGl_Context.hxx>

namespace TyrexCAD {

    /**
     * @brief Helper class for optimizing sketch display
     */
    class TyrexSketchDisplayHelper {
    public:
        /**
         * @brief Setup optimal 2D rendering parameters
         */
        static void setupOptimal2DRendering(const Handle(V3d_View)& view) {
            if (view.IsNull()) return;

            // Get rendering parameters
            Graphic3d_RenderingParams& params = view->ChangeRenderingParams();

            // Disable unnecessary 3D features for better 2D performance
            params.IsShadowEnabled = Standard_False;
            params.IsReflectionEnabled = Standard_False;
            params.IsAntialiasingEnabled = Standard_True;
            params.NbMsaaSamples = 4;
            params.IsTransparentShadowEnabled = Standard_False;
            params.Method = Graphic3d_RM_RASTERIZATION;

            // Optimize depth buffer for 2D
            params.ToEnableDepthTest = Standard_False;
            params.ToEnableDepthWrite = Standard_False;

            // Set resolution for better line quality
            params.Resolution = 96.0; // Standard screen DPI

            // Disable stereo for 2D
            params.StereoMode = Graphic3d_StereoMode_QuadBuffer;
            params.ToReverseStereo = Standard_False;

            // Enable fast hidden line removal
            view->SetComputedMode(Standard_False);

            // Optimize redraw
            view->SetImmediateUpdate(Standard_False);
        }

        /**
         * @brief Create optimized grid display list
         */
        static void createGridDisplayList(const Handle(V3d_View)& view,
            double spacing,
            const gp_Pnt2d& min,
            const gp_Pnt2d& max) {
            // This would create an OpenGL display list for the grid
            // For better performance on repeated redraws
        }

        /**
         * @brief Setup view for pixel-perfect 2D display
         */
        static void setupPixelPerfectView(const Handle(V3d_View)& view) {
            if (view.IsNull()) return;

            // Get window dimensions
            Standard_Integer width, height;
            view->Window()->Size(width, height);

            // Calculate orthographic projection to match pixels
            Standard_Real halfWidth = width / 2.0;
            Standard_Real halfHeight = height / 2.0;

            // Set view volume to match window pixels
            view->Camera()->SetOrthographicProjection(
                -halfWidth, halfWidth,
                -halfHeight, halfHeight,
                -1000.0, 1000.0
            );

            // Center at origin
            view->Camera()->SetCenter(gp_Pnt(0, 0, 0));

            // Look down Z axis
            view->Camera()->SetDirection(gp_Dir(0, 0, -1));
            view->Camera()->SetUp(gp_Dir(0, 1, 0));
        }

        /**
         * @brief Calculate optimal grid spacing for current zoom
         */
        static double calculateOptimalGridSpacing(const Handle(V3d_View)& view,
            double baseSpacing,
            double minPixels,
            double maxPixels) {
            if (view.IsNull()) return baseSpacing;

            double scale = view->Scale();
            double pixelSpacing = baseSpacing * scale;
            double resultSpacing = baseSpacing;

            // AutoCAD-style grid scaling
            static const double scalingFactors[] = { 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0 };

            // Find best scaling factor
            for (double factor : scalingFactors) {
                double testSpacing = baseSpacing * factor;
                double testPixels = testSpacing * scale;

                if (testPixels >= minPixels && testPixels <= maxPixels) {
                    resultSpacing = testSpacing;
                    break;
                }
            }

            return resultSpacing;
        }

        /**
         * @brief Draw smooth anti-aliased line
         */
        static void drawSmoothLine(const Handle(AIS_InteractiveContext)& context,
            const gp_Pnt& start,
            const gp_Pnt& end,
            const Quantity_Color& color,
            double width) {
            // Implementation would use OpenGL smooth lines
        }

        /**
         * @brief Batch draw grid for performance
         */
        static void batchDrawGrid(const Handle(AIS_InteractiveContext)& context,
            const std::vector<gp_Pnt>& points,
            const Quantity_Color& color) {
            // Batch drawing implementation for better performance
        }
    };

} // namespace TyrexCAD

#endif // TYREX_SKETCH_DISPLAY_HELPER_H