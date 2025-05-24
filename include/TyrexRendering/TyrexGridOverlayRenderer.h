/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_GRID_OVERLAY_RENDERER_H
#define TYREX_GRID_OVERLAY_RENDERER_H

#include <QOpenGLFunctions>
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

namespace TyrexCAD {

    /**
     * @brief Grid rendering style options
     */
    enum class GridStyle {
        Lines,      ///< Traditional line grid
        Dots,       ///< Dot grid at intersections
        Crosses     ///< Small crosses at intersections
    };

    /**
     * @brief AutoCAD-style grid configuration
     */
    struct GridConfig {
        // Spacing settings
        double baseSpacing = 1.0;           ///< Base grid spacing in world units
        int majorFactor = 10;               ///< Major line every N minor lines

        // Adaptive scaling
        double minPixelSpacing = 20.0;      ///< Minimum spacing in pixels
        double maxPixelSpacing = 100.0;     ///< Maximum spacing in pixels
        bool adaptiveSpacing = true;        ///< Enable adaptive zoom scaling

        // Visual appearance
        QColor minorColor = QColor(80, 80, 80, 120);     ///< Minor grid lines
        QColor majorColor = QColor(120, 120, 120, 200);  ///< Major grid lines
        QColor axisColorX = QColor(255, 100, 100, 255);  ///< X-axis (red)
        QColor axisColorY = QColor(100, 255, 100, 255);  ///< Y-axis (green)

        // Line properties
        float minorLineWidth = 1.0f;        ///< Minor line thickness
        float majorLineWidth = 1.5f;        ///< Major line thickness
        float axisLineWidth = 2.0f;         ///< Axis line thickness

        // Grid style
        GridStyle style = GridStyle::Lines; ///< Grid rendering style
        float dotSize = 3.0f;               ///< Size of dots for dot grid
        float crossSize = 5.0f;             ///< Size of crosses for cross grid

        // Display options
        bool showAxes = true;               ///< Show X/Y axes at origin
        bool showOriginMarker = true;       ///< Show special marker at (0,0)
        float originMarkerSize = 8.0f;      ///< Origin marker size in pixels

        // Coordinate display
        bool showCoordinates = false;       ///< Show cursor coordinates
        QFont coordinateFont = QFont("Arial", 10);
        QColor coordinateColor = QColor(255, 255, 255, 200);
        QPoint coordinateOffset = QPoint(10, 10);

        // Snap settings
        bool snapEnabled = true;            ///< Enable snap to grid
        double snapTolerance = 0.5;         ///< Snap tolerance factor

        // Performance limits
        int maxGridLinesH = 500;            ///< Max horizontal lines
        int maxGridLinesV = 500;            ///< Max vertical lines
        int maxDots = 10000;                ///< Max dots for dot grid
    };

    /**
     * @brief High-performance OpenGL grid overlay renderer
     *
     * Renders AutoCAD-style grid using modern OpenGL with shaders,
     * pixel-aligned and independent from the AIS scene geometry.
     */
    class TyrexGridOverlayRenderer : protected QOpenGLFunctions
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