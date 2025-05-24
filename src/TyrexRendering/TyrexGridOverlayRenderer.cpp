/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexRendering/TyrexGridOverlayRenderer.h"
#include <QDebug>
#include <QOpenGLContext>
#include <QOpenGLFunctions>
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
        , m_gridVBO(0)
        , m_gridVAO(0)
        , m_vboDirty(true)
    {
        // Reserve space for vertices (optimization)
        m_vertices.reserve(10000);
        m_cachedVertices.reserve(10000);
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

        // Get current OpenGL context
        QOpenGLContext* context = QOpenGLContext::currentContext();
        if (!context) {
            qCritical() << "No OpenGL context available";
            return false;
        }

        // Initialize OpenGL functions
        QOpenGLFunctions* glFuncs = context->functions();
        if (!glFuncs) {
            qCritical() << "Failed to get OpenGL functions";
            return false;
        }

        // Initialize the functions for this object
        initializeOpenGLFunctions();

        // Create shader programs
        if (!createShaders()) {
            qCritical() << "Failed to create grid shaders";
            return false;
        }

        // Create vertex buffer objects
        setupVertexArrays();

        // Generate VBO and VAO for performance
        glGenBuffers(1, &m_gridVBO);
        glGenVertexArrays(1, &m_gridVAO);

        m_initialized = true;
        qDebug() << "TyrexGridOverlayRenderer initialized successfully";
        return true;
    }

    void TyrexGridOverlayRenderer::cleanup()
    {
        if (!m_initialized) {
            return;
        }

        // Make sure we have the right context
        QOpenGLContext* context = QOpenGLContext::currentContext();
        if (context) {
            // Cleanup VBO/VAO
            if (m_gridVBO != 0) {
                glDeleteBuffers(1, &m_gridVBO);
                m_gridVBO = 0;
            }
            if (m_gridVAO != 0) {
                glDeleteVertexArrays(1, &m_gridVAO);
                m_gridVAO = 0;
            }
        }

        // Cleanup shader programs and buffers
        m_shaderProgram.reset();
        m_textShaderProgram.reset();
        m_vertexBuffer.reset();
        m_vao.reset();

        m_initialized = false;
    }

    void TyrexGridOverlayRenderer::setView(const Handle(V3d_View)& view)
    {
        m_view = view;
        m_vboDirty = true;
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

    void TyrexGridOverlayRenderer::render(int viewportWidth, int viewportHeight, const QPoint& cursorPos)
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

        // Update VBO if needed
        if (m_vboDirty) {
            updateVBO();
            m_vboDirty = false;
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

        // Render grid based on style
        renderGrid();

        // Render axes if enabled
        if (m_config.showAxes) {
            renderAxes();
        }

        // Render origin marker if enabled
        if (m_config.showOriginMarker) {
            renderOriginMarker();
        }

        // Render coordinate display if enabled
        if (m_config.showCoordinates && cursorPos.x() >= 0 && cursorPos.y() >= 0) {
            renderCoordinateDisplay(cursorPos);
        }

        // Restore OpenGL state
        if (depthTestEnabled) glEnable(GL_DEPTH_TEST);
        if (!blendEnabled) glDisable(GL_BLEND);
        glBlendFunc(blendSrc, blendDst);
    }

    bool TyrexGridOverlayRenderer::snapToGrid(double worldX, double worldY,
        double& snappedX, double& snappedY) const
    {
        if (!m_gridEnabled || !m_config.snapEnabled || m_currentSpacing <= 0.0) {
            snappedX = worldX;
            snappedY = worldY;
            return false;
        }

        // Snap to nearest grid intersection with tolerance
        double tolerance = m_currentSpacing * m_config.snapTolerance;

        double nearestX = std::round(worldX / m_currentSpacing) * m_currentSpacing;
        double nearestY = std::round(worldY / m_currentSpacing) * m_currentSpacing;

        // Check if within snap tolerance
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

    double TyrexGridOverlayRenderer::getCurrentGridSpacing() const
    {
        return m_currentSpacing;
    }

    void TyrexGridOverlayRenderer::screenToWorld(int screenX, int screenY,
        double& worldX, double& worldY) const
    {
        screenToWorldInternal(static_cast<float>(screenX), static_cast<float>(screenY),
            worldX, worldY);
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
    }

    void TyrexGridOverlayRenderer::generateGridVertices()
    {
        m_vertices.clear();

        if (m_currentSpacing <= 0.0) {
            return;
        }

        // Generate vertices based on current style
        switch (m_config.style) {
        case GridStyle::Lines:
            // Already generated in renderGridLines
            break;
        case GridStyle::Dots:
            // Generated in renderGridDots
            break;
        case GridStyle::Crosses:
            // Generated in renderGridCrosses
            break;
        }
    }

    void TyrexGridOverlayRenderer::renderGrid()
    {
        if (!m_shaderProgram || !m_vertexBuffer || !m_vao) {
            return;
        }

        // Render based on style
        switch (m_config.style) {
        case GridStyle::Lines:
            renderGridLines();
            break;
        case GridStyle::Dots:
            renderGridDots();
            break;
        case GridStyle::Crosses:
            renderGridCrosses();
            break;
        }
    }

    void TyrexGridOverlayRenderer::renderGridLines()
    {
        m_vertices.clear();

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

            // Add line color
            QColor4ub color = isMajor ? colorToRGBA(m_config.majorColor) :
                colorToRGBA(m_config.minorColor);

            // Line vertices
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

            // Skip origin lines
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

        if (m_vertices.empty()) {
            return;
        }

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

        // Set vertex attributes
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

        // Set line width
        glLineWidth(m_config.minorLineWidth);

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
    }

    void TyrexGridOverlayRenderer::renderGridDots()
    {
        m_vertices.clear();

        // Calculate grid intersection positions
        double startX = std::floor(m_worldMinX / m_currentSpacing) * m_currentSpacing;
        double endX = std::ceil(m_worldMaxX / m_currentSpacing) * m_currentSpacing;
        double startY = std::floor(m_worldMinY / m_currentSpacing) * m_currentSpacing;
        double endY = std::ceil(m_worldMaxY / m_currentSpacing) * m_currentSpacing;

        // Generate dots at grid intersections
        int dotCount = 0;
        for (double x = startX; x <= endX && dotCount < m_config.maxDots; x += m_currentSpacing) {
            for (double y = startY; y <= endY && dotCount < m_config.maxDots; y += m_currentSpacing) {
                if (!isIntersectionVisible(x, y)) {
                    continue;
                }

                float screenX, screenY;
                worldToScreen(x, y, screenX, screenY);

                // Determine if this is a major intersection
                bool isMajorX = (std::abs(std::fmod(x / m_currentSpacing, m_config.majorFactor)) < 0.01);
                bool isMajorY = (std::abs(std::fmod(y / m_currentSpacing, m_config.majorFactor)) < 0.01);
                bool isMajor = isMajorX || isMajorY;

                // Add dot color
                QColor4ub color = isMajor ? colorToRGBA(m_config.majorColor) :
                    colorToRGBA(m_config.minorColor);

                // Dot vertex
                m_vertices.insert(m_vertices.end(), {
                    screenX, screenY, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f
                    });

                dotCount++;
            }
        }

        if (m_vertices.empty()) {
            return;
        }

        // Setup projection
        glMatrixMode(GL_PROJECTION);
        glPushMatrix();
        glLoadIdentity();
        glOrtho(0, m_viewportWidth, m_viewportHeight, 0, -1, 1);

        glMatrixMode(GL_MODELVIEW);
        glPushMatrix();
        glLoadIdentity();

        // Enable point smoothing
        glEnable(GL_POINT_SMOOTH);
        glHint(GL_POINT_SMOOTH_HINT, GL_NICEST);
        glPointSize(m_config.dotSize);

        // Bind shader and render
        m_shaderProgram->bind();
        m_vao->bind();

        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(m_vertices.data(),
            static_cast<int>(m_vertices.size() * sizeof(float)));

        m_shaderProgram->enableAttributeArray(0);
        m_shaderProgram->setAttributeBuffer(0, GL_FLOAT, 0, 2, 6 * sizeof(float));

        m_shaderProgram->enableAttributeArray(1);
        m_shaderProgram->setAttributeBuffer(1, GL_FLOAT, 2 * sizeof(float), 4, 6 * sizeof(float));

        // Set uniforms
        m_shaderProgram->setUniformValue("u_projection",
            QMatrix4x4(2.0f / m_viewportWidth, 0, 0, -1,
                0, -2.0f / m_viewportHeight, 0, 1,
                0, 0, -1, 0,
                0, 0, 0, 1));

        // Render dots
        glDrawArrays(GL_POINTS, 0, static_cast<GLsizei>(m_vertices.size() / 6));

        // Cleanup
        m_vao->release();
        m_shaderProgram->release();

        glDisable(GL_POINT_SMOOTH);

        // Restore matrices
        glPopMatrix();
        glMatrixMode(GL_PROJECTION);
        glPopMatrix();
        glMatrixMode(GL_MODELVIEW);
    }

    void TyrexGridOverlayRenderer::renderGridCrosses()
    {
        m_vertices.clear();

        // Calculate grid intersection positions
        double startX = std::floor(m_worldMinX / m_currentSpacing) * m_currentSpacing;
        double endX = std::ceil(m_worldMaxX / m_currentSpacing) * m_currentSpacing;
        double startY = std::floor(m_worldMinY / m_currentSpacing) * m_currentSpacing;
        double endY = std::ceil(m_worldMaxY / m_currentSpacing) * m_currentSpacing;

        // Generate crosses at grid intersections
        int crossCount = 0;
        float halfSize = m_config.crossSize * 0.5f;

        for (double x = startX; x <= endX && crossCount < m_config.maxDots; x += m_currentSpacing) {
            for (double y = startY; y <= endY && crossCount < m_config.maxDots; y += m_currentSpacing) {
                if (!isIntersectionVisible(x, y)) {
                    continue;
                }

                float screenX, screenY;
                worldToScreen(x, y, screenX, screenY);

                // Determine if this is a major intersection
                bool isMajorX = (std::abs(std::fmod(x / m_currentSpacing, m_config.majorFactor)) < 0.01);
                bool isMajorY = (std::abs(std::fmod(y / m_currentSpacing, m_config.majorFactor)) < 0.01);
                bool isMajor = isMajorX || isMajorY;

                // Add cross color
                QColor4ub color = isMajor ? colorToRGBA(m_config.majorColor) :
                    colorToRGBA(m_config.minorColor);

                // Horizontal line of cross
                m_vertices.insert(m_vertices.end(), {
                    screenX - halfSize, screenY, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
                    screenX + halfSize, screenY, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f
                    });

                // Vertical line of cross
                m_vertices.insert(m_vertices.end(), {
                    screenX, screenY - halfSize, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
                    screenX, screenY + halfSize, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f
                    });

                crossCount++;
            }
        }

        if (m_vertices.empty()) {
            return;
        }

        // Setup projection
        glMatrixMode(GL_PROJECTION);
        glPushMatrix();
        glLoadIdentity();
        glOrtho(0, m_viewportWidth, m_viewportHeight, 0, -1, 1);

        glMatrixMode(GL_MODELVIEW);
        glPushMatrix();
        glLoadIdentity();

        // Bind shader and render
        m_shaderProgram->bind();
        m_vao->bind();

        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(m_vertices.data(),
            static_cast<int>(m_vertices.size() * sizeof(float)));

        m_shaderProgram->enableAttributeArray(0);
        m_shaderProgram->setAttributeBuffer(0, GL_FLOAT, 0, 2, 6 * sizeof(float));

        m_shaderProgram->enableAttributeArray(1);
        m_shaderProgram->setAttributeBuffer(1, GL_FLOAT, 2 * sizeof(float), 4, 6 * sizeof(float));

        // Set uniforms
        m_shaderProgram->setUniformValue("u_projection",
            QMatrix4x4(2.0f / m_viewportWidth, 0, 0, -1,
                0, -2.0f / m_viewportHeight, 0, 1,
                0, 0, -1, 0,
                0, 0, 0, 1));

        glLineWidth(1.0f);

        // Render crosses
        glDrawArrays(GL_LINES, 0, static_cast<GLsizei>(m_vertices.size() / 6));

        // Cleanup
        m_vao->release();
        m_shaderProgram->release();

        // Restore matrices
        glPopMatrix();
        glMatrixMode(GL_PROJECTION);
        glPopMatrix();
        glMatrixMode(GL_MODELVIEW);
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

    void TyrexGridOverlayRenderer::renderCoordinateDisplay(const QPoint& cursorPos)
    {
        // Get world coordinates
        double worldX, worldY;
        screenToWorld(cursorPos.x(), cursorPos.y(), worldX, worldY);

        // Snap to grid if enabled
        if (m_config.snapEnabled) {
            snapToGrid(worldX, worldY, worldX, worldY);
        }

        // Format coordinate text
        QString coordText = QString("X: %1, Y: %2")
            .arg(worldX, 0, 'f', 2)
            .arg(worldY, 0, 'f', 2);

        // Calculate render position
        float renderX = cursorPos.x() + m_config.coordinateOffset.x();
        float renderY = cursorPos.y() + m_config.coordinateOffset.y();

        // Ensure text stays within viewport
        if (renderX + 150 > m_viewportWidth) {
            renderX = cursorPos.x() - 150 - m_config.coordinateOffset.x();
        }
        if (renderY + 20 > m_viewportHeight) {
            renderY = cursorPos.y() - 20 - m_config.coordinateOffset.y();
        }

        // Render text (simple version - in real implementation would use proper text rendering)
        renderText(coordText, renderX, renderY, m_config.coordinateColor);
    }

    void TyrexGridOverlayRenderer::updateVBO()
    {
        // Create optimized vertex data based on current style
        createVBOForStyle();
    }

    void TyrexGridOverlayRenderer::createVBOForStyle()
    {
        m_cachedVertices.clear();

        // Pre-generate vertices for current view to avoid regenerating each frame
        switch (m_config.style) {
        case GridStyle::Lines:
            // Lines are generated dynamically
            break;
        case GridStyle::Dots:
        case GridStyle::Crosses:
            // Could pre-cache intersection points here
            break;
        }
    }

    bool TyrexGridOverlayRenderer::createShaders()
    {
        m_shaderProgram = std::make_unique<QOpenGLShaderProgram>();

        // OpenGL 2.1 compatible vertex shader
        const char* vertexShader = R"(
            #version 120
            attribute vec2 position;
            attribute vec4 color;
            
            uniform mat4 u_projection;
            varying vec4 v_color;
            
            void main() {
                gl_Position = u_projection * vec4(position, 0.0, 1.0);
                v_color = color;
            }
        )";

        // OpenGL 2.1 compatible fragment shader
        const char* fragmentShader = R"(
            #version 120
            varying vec4 v_color;
            
            void main() {
                gl_FragColor = v_color;
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
        m_vao = std::make_unique<QOpenGLVertexArrayObject>();
        m_vao->create();
        m_vao->bind();

        m_vertexBuffer = std::make_unique<QOpenGLBuffer>(QOpenGLBuffer::VertexBuffer);
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

    bool TyrexGridOverlayRenderer::isIntersectionVisible(double x, double y) const
    {
        float screenX, screenY;
        worldToScreen(x, y, screenX, screenY);

        return screenX >= -10 && screenX <= m_viewportWidth + 10 &&
            screenY >= -10 && screenY <= m_viewportHeight + 10;
    }

    void TyrexGridOverlayRenderer::renderText(const QString& text, float x, float y, const QColor& color)
    {
        // This is a placeholder - in a real implementation, you would use:
        // 1. QPainter for overlay text (simpler but requires careful integration)
        // 2. FreeType + OpenGL for proper text rendering
        // 3. Pre-rendered text atlas for performance

        // For now, just debug output
        Q_UNUSED(text);
        Q_UNUSED(x);
        Q_UNUSED(y);
        Q_UNUSED(color);
    }

} // namespace TyrexCAD