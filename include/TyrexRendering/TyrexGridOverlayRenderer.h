#ifndef TYREX_GRID_OVERLAY_RENDERER_H
#define TYREX_GRID_OVERLAY_RENDERER_H

#include <QOpenGLFunctions_3_3_Core> // Include the correct OpenGL functions header
#include <QOpenGLShaderProgram>
#include <QOpenGLBuffer>
#include <QOpenGLVertexArrayObject>
#include <QColor>
#include <QFont>
#include <QPoint>
#include <vector>
#include <memory>

#include <V3d_View.hxx>
#include <Standard_Handle.hxx>

#include "TyrexCanvas/TyrexGridConfig.h"

namespace TyrexCAD {

    class TyrexGridOverlayRenderer : protected QOpenGLFunctions_3_3_Core // Use QOpenGLFunctions_3_3_Core
    {
    public:
        TyrexGridOverlayRenderer();
        ~TyrexGridOverlayRenderer();

        bool initialize();
        void cleanup();

        void setView(const Handle(V3d_View)& view);

        void setGridEnabled(bool enabled);
        bool isGridEnabled() const;

        void setGridConfig(const GridConfig& config);
        const GridConfig& getGridConfig() const;

        void setGridStyle(GridStyle style);
        GridStyle getGridStyle() const;

        void render(int viewportWidth, int viewportHeight, const QPoint& cursorPos = QPoint(-1, -1));

        bool snapToGrid(double worldX, double worldY,
            double& snappedX, double& snappedY) const;

        double getCurrentGridSpacing() const;

        void screenToWorld(int screenX, int screenY,
            double& worldX, double& worldY) const;

    private:
        Handle(V3d_View) m_view;
        GridConfig m_config;
        bool m_gridEnabled;
        bool m_initialized;

        double m_currentSpacing;
        double m_viewScale;
        double m_worldMinX, m_worldMaxX;
        double m_worldMinY, m_worldMaxY;
        int m_viewportWidth, m_viewportHeight;

        std::unique_ptr<QOpenGLShaderProgram> m_shaderProgram;
        std::unique_ptr<QOpenGLShaderProgram> m_textShaderProgram;
        std::unique_ptr<QOpenGLBuffer> m_vertexBuffer;
        std::unique_ptr<QOpenGLVertexArrayObject> m_vao;
        std::vector<float> m_vertices;

        GLuint m_gridVBO;
        GLuint m_gridVAO;
        bool m_vboDirty;
        std::vector<float> m_cachedVertices;

        void updateViewBounds();
        void calculateAdaptiveSpacing();
        void generateGridVertices();
        void renderGrid();
        void renderAxes();
        void renderOriginMarker();
        void renderCoordinateDisplay(const QPoint& cursorPos);

        void renderGridLines();
        void renderGridDots();
        void renderGridCrosses();

        void updateVBO();
        void createVBOForStyle();

        bool createShaders();
        void setupVertexArrays();

        void worldToScreen(double worldX, double worldY,
            float& screenX, float& screenY) const;
        void screenToWorldInternal(float screenX, float screenY,
            double& worldX, double& worldY) const;

        bool shouldRenderGrid() const;
        int clampGridLineCount(int proposedCount, int maxCount) const;
        bool isIntersectionVisible(double x, double y) const;

        void renderText(const QString& text, float x, float y, const QColor& color);

        struct QColor4ub {
            unsigned char r, g, b, a;
            QColor4ub(unsigned char r = 0, unsigned char g = 0,
                unsigned char b = 0, unsigned char a = 255)
                : r(r), g(g), b(b), a(a) {
            }
        };

        struct GridVertex {
            float x, y;
            float r, g, b, a;
        };

        QColor convertQuantityToQColor(const Quantity_Color& color) const {
            return QColor(
                static_cast<int>(color.Red() * 255),
                static_cast<int>(color.Green() * 255),
                static_cast<int>(color.Blue() * 255)
            );
        }

        QColor4ub quantityColorToRGBA(const Quantity_Color& color) const {
            return QColor4ub(
                static_cast<unsigned char>(color.Red() * 255),
                static_cast<unsigned char>(color.Green() * 255),
                static_cast<unsigned char>(color.Blue() * 255),
                255
            );
        }
    };

}

#endif // TYREX_GRID_OVERLAY_RENDERER_H