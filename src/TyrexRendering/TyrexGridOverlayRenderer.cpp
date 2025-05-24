/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexRendering/TyrexGridOverlayRenderer.h"
#include <QDebug>
#include <QOpenGLContext>
#include <cmath>
#include <algorithm>

namespace TyrexCAD {

    TyrexGridOverlayRenderer::TyrexGridOverlayRenderer()
        : m_gridEnabled(true)
        , m_initialized(false)
        , m_currentSpacing(1.0)
        , m_viewScale(1.0)
        , m_worldMinX(0), m_worldMaxX(0)
        , m_worldMinY(0), m_worldMaxY(0)
        , m_viewportWidth(800), m_viewportHeight(600)
        , m_shaderProgram(nullptr)
        , m_vertexBuffer(nullptr)
        , m_vao(nullptr)
    {
        // Reserve space for vertices (optimization)
        m_vertices.reserve(4000); // Enough for ~500 lines
    }

    TyrexGridOverlayRenderer::~TyrexGridOverlayRenderer()
    {
        cleanup();
    }

    bool TyrexGridOverlayRenderer::initialize()
    {
        if (m_initialized) {
            return true;
        }

        // Initialize OpenGL functions
        if (!initializeOpenGLFunctions()) {
            qCritical() << "Failed to initialize OpenGL functions";
            return false;
        }

        // Create shader program
        if (!createShaders()) {
            qCritical() << "Failed to create grid shaders";
            return false;
        }

        // Create vertex buffer and VAO
        setupVertexArrays();

        m_initialized = true;
        qDebug() << "TyrexGridOverlayRenderer initialized successfully";
        return true;
    }

    void TyrexGridOverlayRenderer::cleanup()
    {
        if (!m_initialized) {
            return;
        }

        delete m_shaderProgram;
        delete m_vertexBuffer;
        delete m_vao;

        m_shaderProgram = nullptr;
        m_vertexBuffer = nullptr;
        m_vao = nullptr;
        m_initialized = false;
    }

    void TyrexGridOverlayRenderer::setView(const Handle(V3d_View)& view)
    {
        m_view = view;
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
    }

    const GridConfig& TyrexGridOverlayRenderer::getGridConfig() const
    {
        return m_config;
    }

    void TyrexGridOverlayRenderer::render(int viewportWidth, int viewportHeight)
    {
        if (!m_initialized || !m_gridEnabled || m_view.IsNull()) {
            return;
        }

        if (!shouldRenderGrid()) {
            return;
        }

        // Store viewport dimensions
        m_viewportWidth = viewportWidth;
        m_viewportHeight = viewportHeight;

        // Update view-dependent calculations
        updateViewBounds();
        calculateAdaptiveSpacing();

        // Generate grid geometry
        generateGridVertices();

        // Render grid components
        renderGrid();

        if (m_config.showAxes) {
            renderAxes();
        }

        if (m_config.showOriginMarker) {
            renderOriginMarker();
        }
    }

    bool TyrexGridOverlayRenderer::snapToGrid(double worldX, double worldY,
        double& snappedX, double& snappedY) const
    {
        if (!m_gridEnabled || m_currentSpacing <= 0.0) {
            snappedX = worldX;
            snappedY = worldY;
            return false;
        }

        // Snap to nearest grid intersection
        snappedX = std::round(worldX / m_currentSpacing) * m_currentSpacing;
        snappedY = std::round(worldY / m_currentSpacing) * m_currentSpacing;

        return true;
    }

    double TyrexGridOverlayRenderer::getCurrentGridSpacing() const
    {
        return m_currentSpacing;
    }

    void TyrexGridOverlayRenderer::updateViewBounds()
    {
        if (m_view.IsNull()) {
            return;
        }

        try {
            // Get current view scale
            m_viewScale = m_view->Scale();

            // Convert viewport corners to world coordinates
            Standard_Real x1, y1, z1, x2, y2, z2;
            m_view->Convert(0, 0, x1, y1, z1);
            m_view->Convert(m_viewportWidth, m_viewportHeight, x2, y2, z2);

            m_worldMinX = std::min(x1, x2);
            m_worldMaxX = std::max(x1, x2);
            m_worldMinY = std::min(y1, y2);
            m_worldMaxY = std::max(y1, y2);

            // Add small margin for smooth panning
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

    void TyrexGridOverlayRenderer::calculateAdaptiveSpacing()
    {
        if (!m_config.adaptiveSpacing) {
            m_currentSpacing = m_config.baseSpacing;
            return;
        }

        // Calculate current pixel spacing for base grid
        double pixelSpacing = m_config.baseSpacing * m_viewScale;

        // AutoCAD-style adaptive scaling using powers of 10
        double targetSpacing = m_config.baseSpacing;

        // Scale down if too dense
        while (pixelSpacing < m_config.minPixelSpacing && targetSpacing > 0.001) {
            targetSpacing *= 10.0;
            pixelSpacing = targetSpacing * m_viewScale;
        }

        // Scale up if too sparse  
        while (pixelSpacing > m_config.maxPixelSpacing && targetSpacing < 10000.0) {
            targetSpacing *= 0.1;
            pixelSpacing = targetSpacing * m_viewScale;
        }

        m_currentSpacing = targetSpacing;

        qDebug() << "Grid spacing adapted to:" << m_currentSpacing
            << "pixels:" << pixelSpacing << "scale:" << m_viewScale;
    }

    void TyrexGridOverlayRenderer::generateGridVertices()
    {
        m_vertices.clear();

        if (m_currentSpacing <= 0.0) {
            return;
        }

        // Calculate grid line positions
        double startX = std::floor(m_worldMinX / m_currentSpacing) * m_currentSpacing;
        double endX = std::ceil(m_worldMaxX / m_currentSpacing) * m_currentSpacing;
        double startY = std::floor(m_worldMinY / m_currentSpacing) * m_currentSpacing;
        double endY = std::ceil(m_worldMaxY / m_currentSpacing) * m_currentSpacing;

        // Count proposed lines and clamp if necessary
        int proposedVLines = static_cast<int>((endX - startX) / m_currentSpacing) + 1;
        int proposedHLines = static_cast<int>((endY - startY) / m_currentSpacing) + 1;

        proposedVLines = clampGridLineCount(proposedVLines, m_config.maxGridLinesV);
        proposedHLines = clampGridLineCount(proposedHLines, m_config.maxGridLinesH);

        // Generate vertical lines
        double stepX = (endX - startX) / std::max(1, proposedVLines - 1);
        for (int i = 0; i < proposedVLines; ++i) {
            double x = startX + i * stepX;

            // Determine if this is a major line
            bool isMajor = (std::abs(std::fmod(x / m_currentSpacing, m_config.majorFactor)) < 0.01);

            // Skip origin lines (will be drawn separately as axes)
            if (m_config.showAxes && std::abs(x) < m_currentSpacing * 0.01) {
                continue;
            }

            // Convert to screen coordinates
            float screenX1, screenY1, screenX2, screenY2;
            worldToScreen(x, m_worldMinY, screenX1, screenY1);
            worldToScreen(x, m_worldMaxY, screenX2, screenY2);

            // Add line color (R,G,B,A as separate floats for shader)
            QColor4ub color = isMajor ? colorToRGBA(m_config.majorColor) :
                colorToRGBA(m_config.minorColor);

            // Line vertices: x1,y1,r,g,b,a,  x2,y2,r,g,b,a
            m_vertices.insert(m_vertices.end(), {
                screenX1, screenY1, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
                screenX2, screenY2, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f
                });
        }

        // Generate horizontal lines
        double stepY = (endY - startY) / std::max(1, proposedHLines - 1);
        for (int i = 0; i < proposedHLines; ++i) {
            double y = startY + i * stepY;

            // Determine if this is a major line
            bool isMajor = (std::abs(std::fmod(y / m_currentSpacing, m_config.majorFactor)) < 0.01);

            // Skip origin lines (will be drawn separately as axes)
            if (m_config.showAxes && std::abs(y) < m_currentSpacing * 0.01) {
                continue;
            }

            // Convert to screen coordinates
            float screenX1, screenY1, screenX2, screenY2;
            worldToScreen(m_worldMinX, y, screenX1, screenY1);
            worldToScreen(m_worldMaxX, y, screenX2, screenY2);

            // Add line color
            QColor4ub color = isMajor ? colorToRGBA(m_config.majorColor) :
                colorToRGBA(m_config.minorColor);

            // Line vertices
            m_vertices.insert(m_vertices.end(), {
                screenX1, screenY1, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
                screenX2, screenY2, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f
                });
        }
    }

    void TyrexGridOverlayRenderer::renderGrid()
    {
        if (m_vertices.empty() || !m_shaderProgram || !m_vertexBuffer || !m_vao) {
            return;
        }

        // Save OpenGL state
        GLboolean depthTestEnabled = glIsEnabled(GL_DEPTH_TEST);
        GLboolean blendEnabled = glIsEnabled(GL_BLEND);
        GLint blendSrc, blendDst;
        glGetIntegerv(GL_BLEND_SRC_ALPHA, &blendSrc);
        glGetIntegerv(GL_BLEND_DST_ALPHA, &blendDst);

        // Setup for overlay rendering
        glDisable(GL_DEPTH_TEST);
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        glEnable(GL_LINE_SMOOTH);
        glHint(GL_LINE_SMOOTH_HINT, GL_NICEST);

        // Setup projection matrix for screen coordinates
        glMatrixMode(GL_PROJECTION);
        glPushMatrix();
        glLoadIdentity();
        glOrtho(0, m_viewportWidth, m_viewportHeight, 0, -1, 1);

        glMatrixMode(GL_MODELVIEW);
        glPushMatrix();
        glLoadIdentity();

        // Bind shader and upload vertex data
        m_shaderProgram->bind();
        m_vao->bind();

        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(m_vertices.data(),
            static_cast<int>(m_vertices.size() * sizeof(float)));

        // Set vertex attributes (position + color)
        m_shaderProgram->enableAttributeArray(0); // position
        m_shaderProgram->setAttributeBuffer(0, GL_FLOAT, 0, 2, 6 * sizeof(float));

        m_shaderProgram->enableAttributeArray(1); // color
        m_shaderProgram->setAttributeBuffer(1, GL_FLOAT, 2 * sizeof(float), 4, 6 * sizeof(float));

        // Set uniforms
        m_shaderProgram->setUniformValue("u_projection",
            QMatrix4x4(2.0f / m_viewportWidth, 0, 0, -1,
                0, -2.0f / m_viewportHeight, 0, 1,
                0, 0, -1, 0,
                0, 0, 0, 1));

        // Render lines
        glDrawArrays(GL_LINES, 0, static_cast<GLsizei>(m_vertices.size() / 6));

        // Cleanup
        m_vao->release();
        m_shaderProgram->release();

        // Restore matrices
        glPopMatrix(); // modelview
        glMatrixMode(GL_PROJECTION);
        glPopMatrix();
        glMatrixMode(GL_MODELVIEW);

        // Restore OpenGL state
        if (depthTestEnabled) glEnable(GL_DEPTH_TEST);
        if (!blendEnabled) glDisable(GL_BLEND);
        glBlendFunc(blendSrc, blendDst);
        glDisable(GL_LINE_SMOOTH);
    }

    void TyrexGridOverlayRenderer::renderAxes()
    {
        // Render X and Y axes at origin if visible
        if (m_worldMinX > 0 || m_worldMaxX < 0 || m_worldMinY > 0 || m_worldMaxY < 0) {
            return; // Origin not visible
        }

        std::vector<float> axisVertices;

        // X-axis (horizontal red line)
        float screenX1, screenY1, screenX2, screenY2;
        worldToScreen(m_worldMinX, 0, screenX1, screenY1);
        worldToScreen(m_worldMaxX, 0, screenX2, screenY2);

        QColor4ub xColor = colorToRGBA(m_config.axisColorX);
        axisVertices.insert(axisVertices.end(), {
            screenX1, screenY1, xColor.r / 255.0f, xColor.g / 255.0f, xColor.b / 255.0f, xColor.a / 255.0f,
            screenX2, screenY2, xColor.r / 255.0f, xColor.g / 255.0f, xColor.b / 255.0f, xColor.a / 255.0f
            });

        // Y-axis (vertical green line)
        worldToScreen(0, m_worldMinY, screenX1, screenY1);
        worldToScreen(0, m_worldMaxY, screenX2, screenY2);

        QColor4ub yColor = colorToRGBA(m_config.axisColorY);
        axisVertices.insert(axisVertices.end(), {
            screenX1, screenY1, yColor.r / 255.0f, yColor.g / 255.0f, yColor.b / 255.0f, yColor.a / 255.0f,
            screenX2, screenY2, yColor.r / 255.0f, yColor.g / 255.0f, yColor.b / 255.0f, yColor.a / 255.0f
            });

        // Render axes with thicker lines
        glLineWidth(m_config.axisLineWidth);

        // Use same rendering setup as grid
        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(axisVertices.data(),
            static_cast<int>(axisVertices.size() * sizeof(float)));

        glDrawArrays(GL_LINES, 0, static_cast<GLsizei>(axisVertices.size() / 6));

        glLineWidth(1.0f); // Reset line width
    }

    void TyrexGridOverlayRenderer::renderOriginMarker()
    {
        // Draw a small cross or circle at (0,0) if visible
        float originScreenX, originScreenY;
        worldToScreen(0, 0, originScreenX, originScreenY);

        // Check if origin is within viewport
        if (originScreenX < 0 || originScreenX > m_viewportWidth ||
            originScreenY < 0 || originScreenY > m_viewportHeight) {
            return;
        }

        // Draw a small cross marker
        float size = m_config.originMarkerSize;
        QColor4ub color = colorToRGBA(QColor(255, 255, 255, 255)); // White

        std::vector<float> markerVertices = {
            // Horizontal line
            originScreenX - size, originScreenY, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
            originScreenX + size, originScreenY, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
            // Vertical line
            originScreenX, originScreenY - size, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
            originScreenX, originScreenY + size, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f
        };

        glLineWidth(2.0f);

        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(markerVertices.data(),
            static_cast<int>(markerVertices.size() * sizeof(float)));

        glDrawArrays(GL_LINES, 0, 4);

        glLineWidth(1.0f);
    }

    bool TyrexGridOverlayRenderer::createShaders()
    {
        m_shaderProgram = new QOpenGLShaderProgram();

        // Simple vertex shader for 2D lines with color
        const char* vertexShader = R"(
            #version 330 core
            layout(location = 0) in vec2 position;
            layout(location = 1) in vec4 color;
            
            uniform mat4 u_projection;
            out vec4 v_color;
            
            void main() {
                gl_Position = u_projection * vec4(position, 0.0, 1.0);
                v_color = color;
            }
        )";

        // Simple fragment shader
        const char* fragmentShader = R"(
            #version 330 core
            in vec4 v_color;
            out vec4 fragColor;
            
            void main() {
                fragColor = v_color;
            }
        )";

        if (!m_shaderProgram->addShaderFromSourceCode(QOpenGLShader::Vertex, vertexShader)) {
            qCritical() << "Failed to compile vertex shader:" << m_shaderProgram->log();
            return false;
        }

        if (!m_shaderProgram->addShaderFromSourceCode(QOpenGLShader::Fragment, fragmentShader)) {
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
        m_vao = new QOpenGLVertexArrayObject();
        m_vao->create();
        m_vao->bind();

        m_vertexBuffer = new QOpenGLBuffer(QOpenGLBuffer::VertexBuffer);
        m_vertexBuffer->create();

        m_vao->release();
    }

    TyrexGridOverlayRenderer::QColor4ub TyrexGridOverlayRenderer::colorToRGBA(const QColor& color) const
    {
        return QColor4ub(
            static_cast<unsigned char>(color.red()),
            static_cast<unsigned char>(color.green()),
            static_cast<unsigned char>(color.blue()),
            static_cast<unsigned char>(color.alpha())
        );
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

    void TyrexGridOverlayRenderer::screenToWorld(float screenX, float screenY,
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

    bool TyrexGridOverlayRenderer::shouldRenderGrid() const
    {
        // Don't render if viewport is too small
        if (m_viewportWidth < 50 || m_viewportHeight < 50) {
            return false;
        }

        // Don't render if zoom is extreme
        if (m_viewScale < 0.001 || m_viewScale > 10000.0) {
            return false;
        }

        return true;
    }

    int TyrexGridOverlayRenderer::clampGridLineCount(int proposedCount, int maxCount) const
    {
        return std::min(std::max(proposedCount, 2), maxCount);
    }

} // namespace TyrexCAD