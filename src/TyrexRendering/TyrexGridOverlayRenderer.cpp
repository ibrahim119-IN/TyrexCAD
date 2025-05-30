/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

 // Fix Windows min/max macro conflicts
#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#endif

#include "TyrexRendering/TyrexGridOverlayRenderer.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"

#include <QDebug>
#include <QOpenGLContext>
#include <QOpenGLShaderProgram>
#include <QOpenGLVertexArrayObject>
#include <QOpenGLBuffer>
#include <QOpenGLFunctions_3_3_Core>
#include <QMatrix4x4>
#include <cmath>
#include <algorithm>

namespace TyrexCAD {

    // Vertex shader with instancing support
    static const char* vertexShaderSource = R"(
        #version 110
        attribute vec2 position;
        attribute vec4 color;
        
        uniform mat4 u_projection;
        uniform mat4 u_view;
        
        varying vec4 v_color;
        
        void main() {
            gl_Position = u_projection * u_view * vec4(position, 0.0, 1.0);
            v_color = color;
        }
    )";

    // Fragment shader with alpha support
    static const char* fragmentShaderSource = R"(
        #version 110
        varying vec4 v_color;
        
        uniform float u_globalOpacity;
        
        void main() {
            gl_FragColor = vec4(v_color.rgb, v_color.a * u_globalOpacity);
        }
    )";

    TyrexGridOverlayRenderer::TyrexGridOverlayRenderer()
        : m_gridEnabled(true)
        , m_initialized(false)
        , m_currentSpacing(1.0)
        , m_viewScale(1.0)
        , m_worldMinX(0), m_worldMaxX(0)
        , m_worldMinY(0), m_worldMaxY(0)
        , m_viewportWidth(800), m_viewportHeight(600)
        , m_gridVBO(0)
        , m_gridVAO(0)
        , m_vboDirty(true)
        , m_vertexShader(0)
        , m_fragmentShader(0)
        , m_vbo(0)
        , m_glFunctions(nullptr)
    {
        m_vertices.reserve(20000);  // Reserve more for complex grids
        m_cachedVertices.reserve(20000);
    }

    TyrexGridOverlayRenderer::~TyrexGridOverlayRenderer()
    {
        if (QOpenGLContext::currentContext()) {
            cleanup();
        }
    }

    bool TyrexGridOverlayRenderer::initialize()
    {
        qDebug() << "=== TyrexGridOverlayRenderer::initialize() BEGIN ===";

        if (m_initialized) {
            qDebug() << "Already initialized, returning true";
            return true;
        }

        // Check if we have ANY valid GL context (from OpenCascade)
        const GLubyte* version = glGetString(GL_VERSION);
        if (!version) {
            qCritical() << "No OpenGL context available (glGetString returned null)";
            return false;
        }

        qDebug() << "OpenGL Version:" << reinterpret_cast<const char*>(version);

        // Don't use any Qt OpenGL classes - OpenCascade manages the context

        // Create shaders
        qDebug() << "Creating shaders...";
        if (!createShaders()) {
            qCritical() << "Failed to create shaders";
            return false;
        }
        qDebug() << "Shaders created successfully";

        // Setup vertex arrays
        qDebug() << "Setting up vertex arrays...";
        setupVertexArrays();
        qDebug() << "Vertex arrays setup complete";

        m_initialized = true;
        qDebug() << "=== TyrexGridOverlayRenderer::initialize() SUCCESS ===";
        return true;
    }

    void TyrexGridOverlayRenderer::cleanup()
    {
        if (!m_initialized) {
            return;
        }

        makeCurrent();

        // Get OpenGL functions if not available
        if (!m_glFunctions) {
            auto* ctx = QOpenGLContext::currentContext();
            if (ctx) {
                m_glFunctions = ctx->versionFunctions<QOpenGLFunctions_3_3_Core>();
                if (m_glFunctions) {
                    m_glFunctions->initializeOpenGLFunctions();
                }
            }
        }

        // Clean up raw OpenGL resources using function pointers
        if (m_glFunctions) {
            if (m_gridVBO != 0) {
                m_glFunctions->glDeleteBuffers(1, &m_gridVBO);
                m_gridVBO = 0;
            }
            if (m_gridVAO != 0) {
                m_glFunctions->glDeleteVertexArrays(1, &m_gridVAO);
                m_gridVAO = 0;
            }

            if (m_vbo != 0) {
                m_glFunctions->glDeleteBuffers(1, &m_vbo);
                m_vbo = 0;
            }

            if (m_vertexShader != 0) {
                m_glFunctions->glDeleteShader(m_vertexShader);
                m_vertexShader = 0;
            }
            if (m_fragmentShader != 0) {
                m_glFunctions->glDeleteShader(m_fragmentShader);
                m_fragmentShader = 0;
            }
        }

        // Clean up Qt OpenGL objects
        if (m_vertexBuffer) {
            m_vertexBuffer.reset();
        }
        if (m_vao) {
            m_vao.reset();
        }

        // Clean up shaders
        if (m_shaderProgram) {
            m_shaderProgram.reset();
        }

        m_initialized = false;
    }

    void TyrexGridOverlayRenderer::renderFromOverlay(TyrexCanvasOverlay* overlay,
        int viewportWidth,
        int viewportHeight,
        const QPoint& cursorPos)
    {
        if (!m_initialized || !m_gridEnabled || !overlay || !overlay->isGridVisible()) {
            return;
        }

        makeCurrent();

        m_viewportWidth = viewportWidth;
        m_viewportHeight = viewportHeight;

        // Get grid configuration
        m_config = overlay->getGridConfig();
        m_currentSpacing = overlay->getCurrentGridSpacing();

        // Save OpenGL state
        GLboolean depthTestEnabled = glIsEnabled(GL_DEPTH_TEST);
        GLboolean blendEnabled = glIsEnabled(GL_BLEND);
        GLint blendSrc, blendDst;
        glGetIntegerv(GL_BLEND_SRC_ALPHA, &blendSrc);
        glGetIntegerv(GL_BLEND_DST_ALPHA, &blendDst);

        // Configure OpenGL state
        glDisable(GL_DEPTH_TEST);
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

        // Clear any previous errors
        while (glGetError() != GL_NO_ERROR);

        // Render based on style
        switch (m_config.style) {
        case GridStyle::Lines:
            renderGridLines(overlay);
            break;
        case GridStyle::Dots:
            renderGridPoints(overlay, true);
            break;
        case GridStyle::Crosses:
            renderGridPoints(overlay, false);
            break;
        }

        // Render axes if enabled
        if (m_config.showAxes) {
            renderAxes(overlay);
        }

        // Render coordinate display
        if (m_config.showCoordinates && cursorPos.x() >= 0 && cursorPos.y() >= 0) {
            renderCoordinateDisplay(cursorPos);
        }

        // Restore OpenGL state
        if (depthTestEnabled) glEnable(GL_DEPTH_TEST);
        if (!blendEnabled) glDisable(GL_BLEND);
        glBlendFunc(blendSrc, blendDst);
    }

    void TyrexGridOverlayRenderer::renderGridLines(TyrexCanvasOverlay* overlay)
    {
        // Get grid lines from overlay
        auto gridLines = overlay->computeGridLines();
        if (gridLines.empty()) return;

        m_vertices.clear();
        m_vertices.reserve(gridLines.size() * 12);  // 2 vertices * 6 floats each

        // Convert to vertex data
        for (const auto& line : gridLines) {
            float r = static_cast<float>(line.color.Red());
            float g = static_cast<float>(line.color.Green());
            float b = static_cast<float>(line.color.Blue());
            float a = line.opacity * m_config.gridOpacity;

            // Start point
            m_vertices.push_back(static_cast<float>(line.startPoint.X()));
            m_vertices.push_back(static_cast<float>(line.startPoint.Y()));
            m_vertices.push_back(r);
            m_vertices.push_back(g);
            m_vertices.push_back(b);
            m_vertices.push_back(a);

            // End point
            m_vertices.push_back(static_cast<float>(line.endPoint.X()));
            m_vertices.push_back(static_cast<float>(line.endPoint.Y()));
            m_vertices.push_back(r);
            m_vertices.push_back(g);
            m_vertices.push_back(b);
            m_vertices.push_back(a);
        }

        // Render using VBO
        renderVertexData(GL_LINES, gridLines.size() * 2);
    }

    void TyrexGridOverlayRenderer::renderGridPoints(TyrexCanvasOverlay* overlay, bool dots)
    {
        // Get grid points from overlay
        auto gridPoints = overlay->computeGridPoints();
        if (gridPoints.empty()) return;

        if (dots) {
            // Render as dots
            m_vertices.clear();
            m_vertices.reserve(gridPoints.size() * 6);

            for (const auto& point : gridPoints) {
                float r = static_cast<float>(point.color.Red());
                float g = static_cast<float>(point.color.Green());
                float b = static_cast<float>(point.color.Blue());
                float a = point.opacity * m_config.gridOpacity;

                m_vertices.push_back(static_cast<float>(point.position.X()));
                m_vertices.push_back(static_cast<float>(point.position.Y()));
                m_vertices.push_back(r);
                m_vertices.push_back(g);
                m_vertices.push_back(b);
                m_vertices.push_back(a);
            }

            // Enable point rendering options
            glEnable(GL_POINT_SMOOTH);
            glHint(GL_POINT_SMOOTH_HINT, GL_NICEST);
            glPointSize(m_config.dotSize);

            renderVertexData(GL_POINTS, gridPoints.size());

            glDisable(GL_POINT_SMOOTH);
        }
        else {
            // Render as crosses
            m_vertices.clear();
            m_vertices.reserve(gridPoints.size() * 24);  // 4 vertices * 6 floats each

            float halfSize = m_config.crossSize * 0.5f / m_viewScale;

            for (const auto& point : gridPoints) {
                float x = static_cast<float>(point.position.X());
                float y = static_cast<float>(point.position.Y());
                float r = static_cast<float>(point.color.Red());
                float g = static_cast<float>(point.color.Green());
                float b = static_cast<float>(point.color.Blue());
                float a = point.opacity * m_config.gridOpacity;

                // Horizontal line
                m_vertices.insert(m_vertices.end(), {
                    x - halfSize, y, r, g, b, a,
                    x + halfSize, y, r, g, b, a
                    });

                // Vertical line
                m_vertices.insert(m_vertices.end(), {
                    x, y - halfSize, r, g, b, a,
                    x, y + halfSize, r, g, b, a
                    });
            }

            renderVertexData(GL_LINES, gridPoints.size() * 4);
        }
    }

    void TyrexGridOverlayRenderer::renderAxes(TyrexCanvasOverlay* overlay)
    {
        auto axisLines = overlay->computeAxisLines();
        if (axisLines.empty()) return;

        m_vertices.clear();

        for (const auto& axis : axisLines) {
            float r = static_cast<float>(axis.color.Red());
            float g = static_cast<float>(axis.color.Green());
            float b = static_cast<float>(axis.color.Blue());
            float a = 1.0f;  // Axes always fully opaque

            m_vertices.insert(m_vertices.end(), {
                static_cast<float>(axis.startPoint.X()),
                static_cast<float>(axis.startPoint.Y()),
                r, g, b, a,
                static_cast<float>(axis.endPoint.X()),
                static_cast<float>(axis.endPoint.Y()),
                r, g, b, a
                });
        }

        glLineWidth(m_config.axisLineWidth);
        renderVertexData(GL_LINES, axisLines.size() * 2);
        glLineWidth(1.0f);
    }

    void TyrexGridOverlayRenderer::renderVertexData(GLenum mode, int vertexCount)
    {
        if (m_vertices.empty() || vertexCount == 0) return;

        // Ensure Qt OpenGL objects are created
        if (!m_shaderProgram) return;
        if (!m_vao || !m_vao->isCreated()) {
            m_vao->create();
        }
        if (!m_vertexBuffer || !m_vertexBuffer->isCreated()) {
            m_vertexBuffer->create();
            m_vertexBuffer->setUsagePattern(QOpenGLBuffer::DynamicDraw);
        }

        // Ensure we have OpenGL functions
        if (!m_glFunctions) {
            makeCurrent();
        }
        if (!m_glFunctions) return;

        m_shaderProgram->bind();
        m_vao->bind();

        // Update VBO with new data
        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(m_vertices.data(),
            static_cast<int>(m_vertices.size() * sizeof(float)));

        // Configure vertex attributes
        m_shaderProgram->enableAttributeArray(0);
        m_shaderProgram->setAttributeBuffer(0, GL_FLOAT, 0, 2, 6 * sizeof(float));

        m_shaderProgram->enableAttributeArray(1);
        m_shaderProgram->setAttributeBuffer(1, GL_FLOAT, 2 * sizeof(float), 4, 6 * sizeof(float));

        // Set uniforms
        QMatrix4x4 projection;
        projection.ortho(m_worldMinX, m_worldMaxX, m_worldMaxY, m_worldMinY, -1, 1);
        m_shaderProgram->setUniformValue("u_projection", projection);

        QMatrix4x4 view;  // Identity for now
        m_shaderProgram->setUniformValue("u_view", view);
        m_shaderProgram->setUniformValue("u_globalOpacity", 1.0f);

        // Draw using OpenGL functions
        m_glFunctions->glDrawArrays(mode, 0, vertexCount);

        m_vao->release();
        m_shaderProgram->release();
    }

    void TyrexGridOverlayRenderer::updateViewBounds()
    {
        if (m_view.IsNull()) {
            m_worldMinX = -500;
            m_worldMaxX = 500;
            m_worldMinY = -500;
            m_worldMaxY = 500;
            return;
        }

        try {
            m_viewScale = m_view->Scale();

            Standard_Real x1, y1, z1, x2, y2, z2;
            m_view->Convert(0, 0, x1, y1, z1);
            m_view->Convert(m_viewportWidth, m_viewportHeight, x2, y2, z2);

            m_worldMinX = (std::min)(x1, x2);
            m_worldMaxX = (std::max)(x1, x2);
            m_worldMinY = (std::min)(y1, y2);
            m_worldMaxY = (std::max)(y1, y2);

            // Add margin
            double marginX = (m_worldMaxX - m_worldMinX) * 0.1;
            double marginY = (m_worldMaxY - m_worldMinY) * 0.1;

            m_worldMinX -= marginX;
            m_worldMaxX += marginX;
            m_worldMinY -= marginY;
            m_worldMaxY += marginY;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating view bounds:" << ex.GetMessageString();
        }
    }

    bool TyrexGridOverlayRenderer::createShaders()
    {
        m_shaderProgram = std::make_unique<QOpenGLShaderProgram>();

        if (!m_shaderProgram->addShaderFromSourceCode(QOpenGLShader::Vertex, vertexShaderSource)) {
            qCritical() << "Failed to compile vertex shader:" << m_shaderProgram->log();
            return false;
        }

        if (!m_shaderProgram->addShaderFromSourceCode(QOpenGLShader::Fragment, fragmentShaderSource)) {
            qCritical() << "Failed to compile fragment shader:" << m_shaderProgram->log();
            return false;
        }

        if (!m_shaderProgram->link()) {
            qCritical() << "Failed to link shader program:" << m_shaderProgram->log();
            return false;
        }

        return true;
    }

    void TyrexGridOverlayRenderer::setupVertexArrays()
    {
        // Create Qt OpenGL objects (but don't initialize them yet)
        m_vao = std::make_unique<QOpenGLVertexArrayObject>();
        m_vertexBuffer = std::make_unique<QOpenGLBuffer>(QOpenGLBuffer::VertexBuffer);
    }

    void TyrexGridOverlayRenderer::makeCurrent()
    {
        if (QOpenGLContext::currentContext()) {
            auto* ctx = QOpenGLContext::currentContext();
            m_glFunctions = ctx->versionFunctions<QOpenGLFunctions_3_3_Core>();
            if (!m_glFunctions) {
                m_glFunctions = new QOpenGLFunctions_3_3_Core();
                m_glFunctions->initializeOpenGLFunctions();
            }
        }
    }

    // Legacy compatibility methods
    void TyrexGridOverlayRenderer::render(int viewportWidth, int viewportHeight, const QPoint& cursorPos)
    {
        qWarning() << "Legacy render() called - use renderFromOverlay() instead";
    }

    void TyrexGridOverlayRenderer::setView(const Handle(V3d_View)& view)
    {
        m_view = view;
        if (!m_view.IsNull()) {
            updateViewBounds();
        }
    }

    void TyrexGridOverlayRenderer::setGridEnabled(bool enabled)
    {
        m_gridEnabled = enabled;
    }

    bool TyrexGridOverlayRenderer::isGridEnabled() const
    {
        return m_gridEnabled;
    }

    void TyrexGridOverlayRenderer::setGridConfig(const GridConfig& config)
    {
        m_config = config;
        m_vboDirty = true;
    }

    const GridConfig& TyrexGridOverlayRenderer::getGridConfig() const
    {
        return m_config;
    }

    void TyrexGridOverlayRenderer::setGridStyle(GridStyle style)
    {
        m_config.style = style;
        m_vboDirty = true;
    }

    GridStyle TyrexGridOverlayRenderer::getGridStyle() const
    {
        return m_config.style;
    }

    double TyrexGridOverlayRenderer::getCurrentGridSpacing() const
    {
        return m_currentSpacing;
    }

    bool TyrexGridOverlayRenderer::snapToGrid(double worldX, double worldY,
        double& snappedX, double& snappedY) const
    {
        if (!m_gridEnabled || !m_config.snapEnabled || m_currentSpacing <= 0.0) {
            snappedX = worldX;
            snappedY = worldY;
            return false;
        }

        double tolerance = m_currentSpacing * m_config.snapTolerance;

        double nearestX = std::round(worldX / m_currentSpacing) * m_currentSpacing;
        double nearestY = std::round(worldY / m_currentSpacing) * m_currentSpacing;

        if (std::abs(worldX - nearestX) <= tolerance &&
            std::abs(worldY - nearestY) <= tolerance) {
            snappedX = nearestX;
            snappedY = nearestY;
            return true;
        }

        snappedX = worldX;
        snappedY = worldY;
        return false;
    }

    void TyrexGridOverlayRenderer::screenToWorld(int screenX, int screenY,
        double& worldX, double& worldY) const
    {
        screenToWorldInternal(static_cast<float>(screenX),
            static_cast<float>(screenY), worldX, worldY);
    }

    void TyrexGridOverlayRenderer::worldToScreen(double worldX, double worldY,
        float& screenX, float& screenY) const
    {
        if (m_view.IsNull()) {
            screenX = static_cast<float>(worldX);
            screenY = static_cast<float>(worldY);
            return;
        }

        try {
            Standard_Integer x, y;
            m_view->Convert(worldX, worldY, 0.0, x, y);
            screenX = static_cast<float>(x);
            screenY = static_cast<float>(y);
        }
        catch (...) {
            screenX = static_cast<float>(worldX);
            screenY = static_cast<float>(worldY);
        }
    }

    void TyrexGridOverlayRenderer::screenToWorldInternal(float screenX, float screenY,
        double& worldX, double& worldY) const
    {
        if (m_view.IsNull()) {
            worldX = static_cast<double>(screenX);
            worldY = static_cast<double>(screenY);
            return;
        }

        try {
            Standard_Real x, y, z;
            m_view->Convert(static_cast<Standard_Integer>(screenX),
                static_cast<Standard_Integer>(screenY), x, y, z);
            worldX = x;
            worldY = y;
        }
        catch (...) {
            worldX = static_cast<double>(screenX);
            worldY = static_cast<double>(screenY);
        }
    }

    void TyrexGridOverlayRenderer::renderCoordinateDisplay(const QPoint& cursorPos)
    {
        // Coordinate display would require text rendering
        // This is a placeholder for future implementation
    }

    void TyrexGridOverlayRenderer::renderText(const QString& text, float x, float y, const QColor& color)
    {
        Q_UNUSED(text);
        Q_UNUSED(x);
        Q_UNUSED(y);
        Q_UNUSED(color);
        // Text rendering requires additional setup with font texture atlas
    }

    void TyrexGridOverlayRenderer::calculateOrthoMatrix(float* matrix)
    {
        Q_UNUSED(matrix);
        // Implementation for ortho matrix calculation
    }

} // namespace TyrexCAD