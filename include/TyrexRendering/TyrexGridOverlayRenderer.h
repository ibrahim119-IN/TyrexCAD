/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_GRID_OVERLAY_RENDERER_H
#define TYREX_GRID_OVERLAY_RENDERER_H

#include <QOpenGLFunctions_3_3_Core>
#include <QOpenGLShaderProgram>
#include <QOpenGLBuffer>
#include <QOpenGLVertexArrayObject>
#include <QColor>
#include <QFont>
#include <QPoint>
#include <vector>
#include <memory>

 // OpenCascade includes
#include <V3d_View.hxx>
#include <Standard_Handle.hxx>

// Include the canvas overlay header which defines GridStyle and GridConfig
#include "TyrexCanvas/TyrexCanvasOverlay.h"

namespace TyrexCAD {

    /**
     * @brief High-performance OpenGL grid overlay renderer
     *
     * Renders AutoCAD-style grid using modern OpenGL with shaders,
     * pixel-aligned and independent from the AIS scene geometry.
     */
    class TyrexGridOverlayRenderer : protected QOpenGLFunctions_3_3_Core
    {
    public:
        /**
         * @brief Constructor
         */
        TyrexGridOverlayRenderer();

        /**
         * @brief Destructor
         */
        ~TyrexGridOverlayRenderer();

        /**
         * @brief Initialize OpenGL resources
         * @param context Current OpenGL context (must be active)
         * @return True if initialization successful
         */
        bool initialize();

        /**
         * @brief Cleanup OpenGL resources
         */
        void cleanup();

        /**
         * @brief Set the V3d_View for coordinate conversion
         * @param view OpenCascade view handle
         */
        void setView(const Handle(V3d_View)& view);

        /**
         * @brief Enable/disable grid rendering
         * @param enabled True to show grid
         */
        void setGridEnabled(bool enabled);

        /**
         * @brief Check if grid is enabled
         * @return True if grid is visible
         */
        bool isGridEnabled() const;

        /**
         * @brief Set grid configuration
         * @param config New grid settings
         */
        void setGridConfig(const GridConfig& config);

        /**
         * @brief Get current grid configuration
         * @return Current grid settings
         */
        const GridConfig& getGridConfig() const;

        /**
         * @brief Set grid rendering style
         * @param style New grid style
         */
        void setGridStyle(GridStyle style);

        /**
         * @brief Get current grid style
         * @return Current grid style
         */
        GridStyle getGridStyle() const;

        /**
         * @brief Main rendering entry point
         *
         * Call this at the end of paintGL() after all scene geometry
         * @param viewportWidth Viewport width in pixels
         * @param viewportHeight Viewport height in pixels
         * @param cursorPos Current cursor position (for coordinate display)
         */
        void render(int viewportWidth, int viewportHeight, const QPoint& cursorPos = QPoint(-1, -1));

        /**
         * @brief Snap point to grid intersection
         * @param worldX World X coordinate
         * @param worldY World Y coordinate
         * @param snappedX Output snapped X
         * @param snappedY Output snapped Y
         * @return True if snapping was applied
         */
        bool snapToGrid(double worldX, double worldY,
            double& snappedX, double& snappedY) const;

        /**
         * @brief Get current effective grid spacing
         * @return Current spacing in world units
         */
        double getCurrentGridSpacing() const;

        /**
         * @brief Convert screen point to world coordinates
         * @param screenX Screen X coordinate
         * @param screenY Screen Y coordinate
         * @param worldX Output world X
         * @param worldY Output world Y
         */
        void screenToWorld(int screenX, int screenY,
            double& worldX, double& worldY) const;

    private:
        // Core state
        Handle(V3d_View) m_view;
        GridConfig m_config;
        bool m_gridEnabled;
        bool m_initialized;

        // Current rendering state
        double m_currentSpacing;
        double m_viewScale;
        double m_worldMinX, m_worldMaxX;
        double m_worldMinY, m_worldMaxY;
        int m_viewportWidth, m_viewportHeight;

        // OpenGL resources
        std::unique_ptr<QOpenGLShaderProgram> m_shaderProgram;
        std::unique_ptr<QOpenGLShaderProgram> m_textShaderProgram;
        std::unique_ptr<QOpenGLBuffer> m_vertexBuffer;
        std::unique_ptr<QOpenGLVertexArrayObject> m_vao;
        std::vector<float> m_vertices;

        // Performance optimization
        GLuint m_gridVBO;
        GLuint m_gridVAO;
        bool m_vboDirty;
        std::vector<float> m_cachedVertices;

        // Internal methods
        void updateViewBounds();
        void calculateAdaptiveSpacing();
        void generateGridVertices();
        void renderGrid();
        void renderAxes();
        void renderOriginMarker();
        void renderCoordinateDisplay(const QPoint& cursorPos);

        // Style-specific rendering
        void renderGridLines();
        void renderGridDots();
        void renderGridCrosses();

        // VBO management
        void updateVBO();
        void createVBOForStyle();

        // OpenGL utilities
        bool createShaders();
        void setupVertexArrays();
        QColor4ub colorToRGBA(const QColor& color) const;

        // Coordinate conversion helpers
        void worldToScreen(double worldX, double worldY,
            float& screenX, float& screenY) const;
        void screenToWorldInternal(float screenX, float screenY,
            double& worldX, double& worldY) const;

        // Performance optimization
        bool shouldRenderGrid() const;
        int clampGridLineCount(int proposedCount, int maxCount) const;
        bool isIntersectionVisible(double x, double y) const;

        // Text rendering
        void renderText(const QString& text, float x, float y, const QColor& color);

        // Helper struct for color with alpha
        struct QColor4ub {
            unsigned char r, g, b, a;
            QColor4ub(unsigned char r = 0, unsigned char g = 0,
                unsigned char b = 0, unsigned char a = 255)
                : r(r), g(g), b(b), a(a) {
            }
        };

        // Vertex structure for VBO
        struct GridVertex {
            float x, y;
            float r, g, b, a;
        };
    };

} // namespace TyrexCAD

#endif // TYREX_GRID_OVERLAY_RENDERER_H