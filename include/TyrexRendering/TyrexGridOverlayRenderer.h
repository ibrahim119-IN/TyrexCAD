/***************************************************************************
 * Copyright (c) 2025 TyrexCAD development team                          *
 * *
 * This file is part of the TyrexCAD CAx development system.             *
 * *
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
#include <Quantity_Color.hxx> 

// Include the canvas overlay header which defines GridStyle and GridConfig
#include "TyrexCanvas/TyrexCanvasOverlay.h"

namespace TyrexCAD {

    class TyrexGridOverlayRenderer : protected QOpenGLFunctions
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

        bool m_vboDirty; // Made public for easier access if needed, can be private

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

        GLuint m_gridVBO;
        GLuint m_gridVAO;
        std::vector<float> m_cachedVertices;
        std::vector<float> m_dynamicVertices;

        void updateViewBounds();
        void calculateAdaptiveSpacing();
        void renderGrid();
        void renderAxes();
        void renderOriginMarker();
        void renderCoordinateDisplay(const QPoint& cursorPos);
        void prepareGridLinesVertices();
        void prepareGridDotsVertices();
        void prepareGridCrossesVertices();
        void updateVBO();
        void createVBOForStyle();
        bool createShaders();
        void setupVertexArrays();

        struct QColor4ub {
            unsigned char r, g, b, a;
            QColor4ub(unsigned char r_ = 0, unsigned char g_ = 0,
                unsigned char b_ = 0, unsigned char a_ = 255)
                : r(r_), g(g_), b(b_), a(a_) {
            }
        };
        QColor4ub quantityColorToRGBA(const Quantity_Color& color) const;

        void worldToScreen(double worldX, double worldY,
            float& screenX, float& screenY) const;
        void screenToWorldInternal(float screenX, float screenY,
            double& worldX, double& worldY) const;

        bool shouldRenderGrid() const;
        int clampGridLineCount(int proposedCount, int maxCount) const;
        bool isIntersectionVisible(double x, double y) const;
        void renderText(const QString& text, float x, float y, const Quantity_Color& color);

        struct GridVertex {
            float x, y;
            float r, g, b, a;
        };
    };

} // namespace TyrexCAD

#endif // TYREX_GRID_OVERLAY_RENDERER_H