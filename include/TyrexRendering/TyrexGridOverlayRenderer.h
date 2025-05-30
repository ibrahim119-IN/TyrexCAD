/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_GRID_OVERLAY_RENDERER_H
#define TYREX_GRID_OVERLAY_RENDERER_H

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#endif
#include <GL/gl.h>
#include <QColor>
#include <QFont>
#include <QPoint>
#include <vector>
#include <memory>

#include <V3d_View.hxx>
#include <Standard_Handle.hxx>

#include "TyrexCanvas/TyrexGridConfig.h"

namespace TyrexCAD {

    // Forward declaration
    class TyrexCanvasOverlay;

    /**
     * @brief High-performance OpenGL grid renderer
     *
     * This class is responsible for rendering grid geometry using OpenGL.
     * It receives geometry data from TyrexCanvasOverlay and renders it
     * efficiently using VBOs and modern OpenGL techniques.
     */
    class TyrexGridOverlayRenderer
    {
    public:
        TyrexGridOverlayRenderer();
        ~TyrexGridOverlayRenderer();

        /**
         * @brief Initialize OpenGL resources
         * @return True if successful
         */
        bool initialize();

        /**
         * @brief Clean up OpenGL resources
         */
        void cleanup();

        /**
         * @brief Render grid using data from overlay
         * @param overlay Canvas overlay providing grid geometry
         * @param viewportWidth Viewport width in pixels
         * @param viewportHeight Viewport height in pixels
         * @param cursorPos Current cursor position (optional)
         */
        void renderFromOverlay(TyrexCanvasOverlay* overlay,
            int viewportWidth,
            int viewportHeight,
            const QPoint& cursorPos = QPoint(-1, -1));

        // Legacy compatibility methods
        void setView(const Handle(V3d_View)& view);
        void setGridEnabled(bool enabled);
        bool isGridEnabled() const;
        void setGridConfig(const GridConfig& config);
        const GridConfig& getGridConfig() const;
        void setGridStyle(GridStyle style);
        GridStyle getGridStyle() const;
        double getCurrentGridSpacing() const;

        bool snapToGrid(double worldX, double worldY,
            double& snappedX, double& snappedY) const;

        void screenToWorld(int screenX, int screenY,
            double& worldX, double& worldY) const;

        // Legacy render method (deprecated)
        void render(int viewportWidth, int viewportHeight,
            const QPoint& cursorPos = QPoint(-1, -1));

    private:
        // OpenGL context management
        void makeCurrent();

        // Rendering methods
        void renderGridLines(TyrexCanvasOverlay* overlay);
        void renderGridPoints(TyrexCanvasOverlay* overlay, bool dots);
        void renderAxes(TyrexCanvasOverlay* overlay);
        void renderVertexData(GLenum mode, int vertexCount);

        // Shader and vertex setup
        bool createShaders();
        void setupVertexArrays();

        // View calculations
        void updateViewBounds();
        void worldToScreen(double worldX, double worldY,
            float& screenX, float& screenY) const;
        void screenToWorldInternal(float screenX, float screenY,
            double& worldX, double& worldY) const;

        // Utility methods
        void renderCoordinateDisplay(const QPoint& cursorPos);
        void renderText(const QString& text, float x, float y, const QColor& color);
        void calculateOrthoMatrix(float* matrix);

        QColor convertQuantityToQColor(const Quantity_Color& color) const {
            return QColor(
                static_cast<int>(color.Red() * 255),
                static_cast<int>(color.Green() * 255),
                static_cast<int>(color.Blue() * 255)
            );
        }

    private:
        // View reference
        Handle(V3d_View) m_view;

        // Configuration
        GridConfig m_config;
        bool m_gridEnabled;
        bool m_initialized;

        // OpenGL resources - using raw handles instead of Qt classes
        GLuint m_shaderProgram;
        GLuint m_vertexShader;
        GLuint m_fragmentShader;
        GLuint m_vao;
        GLuint m_vbo;

        // Additional VBO/VAO for optimization
        GLuint m_gridVBO;
        GLuint m_gridVAO;

        // Vertex data
        std::vector<float> m_vertices;
        std::vector<float> m_cachedVertices;
        bool m_vboDirty;

        // View parameters
        double m_currentSpacing;
        double m_viewScale;
        double m_worldMinX, m_worldMaxX;
        double m_worldMinY, m_worldMaxY;
        int m_viewportWidth, m_viewportHeight;
    };

} // namespace TyrexCAD

#endif // TYREX_GRID_OVERLAY_RENDERER_H