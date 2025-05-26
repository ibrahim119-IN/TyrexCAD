#include "TyrexRendering/TyrexGridOverlayRenderer.h"
#include <QDebug>
#include <QOpenGLContext>
#include <QOpenGLFunctions_3_3_Core>
#include <QMatrix4x4>
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
        , m_glFunctions(nullptr)
    {
        m_vertices.reserve(10000);
        m_cachedVertices.reserve(10000);
    }

    TyrexGridOverlayRenderer::~TyrexGridOverlayRenderer()
    {
        // Clean up OpenGL resources properly
        if (QOpenGLContext::currentContext()) {
            cleanup();
        }
        else {
            // Schedule cleanup when context is available
            if (QOpenGLContext* ctx = QOpenGLContext::currentContext()) {
                QObject::connect(ctx, &QOpenGLContext::aboutToBeDestroyed,
                    [this]() { cleanup(); });
            }
        }
    }

    bool TyrexGridOverlayRenderer::initialize()
    {
        if (m_initialized) {
            return true;
        }

        // Ensure we have a valid OpenGL context
        QOpenGLContext* context = QOpenGLContext::currentContext();
        if (!context) {
            qCritical() << "No OpenGL context available";
            return false;
        }

        if (!context->isValid()) {
            qCritical() << "Invalid OpenGL context";
            return false;
        }

        // Get OpenGL 3.3 Core functions
        m_glFunctions = context->versionFunctions<QOpenGLFunctions_3_3_Core>();
        if (!m_glFunctions || !m_glFunctions->initializeOpenGLFunctions()) {
            qCritical() << "Failed to initialize OpenGL 3.3 Core functions";
            return false;
        }

        // Initialize OpenGL functions for QOpenGLFunctions
        if (!initializeOpenGLFunctions()) {
            qCritical() << "Failed to initialize base OpenGL functions";
            return false;
        }

        if (!createShaders()) {
            qCritical() << "Failed to create grid shaders";
            return false;
        }

        setupVertexArrays();

        m_initialized = true;
        qDebug() << "TyrexGridOverlayRenderer initialized successfully";
        return true;
    }

    void TyrexGridOverlayRenderer::cleanup()
    {
        if (!m_initialized || !m_glFunctions) {
            return;
        }

        makeCurrent();

        if (m_gridVBO != 0) {
            m_glFunctions->glDeleteBuffers(1, &m_gridVBO);
            m_gridVBO = 0;
        }
        if (m_gridVAO != 0) {
            m_glFunctions->glDeleteVertexArrays(1, &m_gridVAO);
            m_gridVAO = 0;
        }

        m_shaderProgram.reset();
        m_textShaderProgram.reset();
        m_vertexBuffer.reset();
        m_vao.reset();

        m_initialized = false;
        m_glFunctions = nullptr;
    }

    void TyrexGridOverlayRenderer::makeCurrent()
    {
        // Ensure we have the correct context
        if (QOpenGLContext::currentContext() && m_glFunctions) {
            return; // Already current
        }

        // Try to get functions again if needed
        if (QOpenGLContext* ctx = QOpenGLContext::currentContext()) {
            m_glFunctions = ctx->versionFunctions<QOpenGLFunctions_3_3_Core>();
        }
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
        if (!m_initialized || !m_gridEnabled || m_view.IsNull() || !m_glFunctions) {
            return;
        }

        if (!shouldRenderGrid()) {
            return;
        }

        makeCurrent();

        m_viewportWidth = viewportWidth;
        m_viewportHeight = viewportHeight;

        updateViewBounds();
        calculateAdaptiveSpacing();

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

        // Set required state
        glDisable(GL_DEPTH_TEST);
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

        renderGrid();

        if (m_config.showAxes) {
            renderAxes();
        }

        if (m_config.showOriginMarker) {
            renderOriginMarker();
        }

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
            m_viewScale = m_view->Scale();

            Standard_Real x1, y1, z1, x2, y2, z2;
            m_view->Convert(0, 0, x1, y1, z1);
            m_view->Convert(m_viewportWidth, m_viewportHeight, x2, y2, z2);

            m_worldMinX = std::min(x1, x2);
            m_worldMaxX = std::max(x1, x2);
            m_worldMinY = std::min(y1, y2);
            m_worldMaxY = std::max(y1, y2);

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

        double pixelSpacing = m_config.baseSpacing * m_viewScale;
        double targetSpacing = m_config.baseSpacing;

        while (pixelSpacing < m_config.minPixelSpacing && targetSpacing < 10000.0) {
            targetSpacing *= 10.0;
            pixelSpacing = targetSpacing * m_viewScale;
        }

        while (pixelSpacing > m_config.maxPixelSpacing && targetSpacing > 0.001) {
            targetSpacing *= 0.1;
            pixelSpacing = targetSpacing * m_viewScale;
        }

        m_currentSpacing = targetSpacing;
    }

    void TyrexGridOverlayRenderer::renderGrid()
    {
        if (!m_shaderProgram || !m_vertexBuffer || !m_vao || !m_glFunctions) {
            return;
        }

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
        if (!m_glFunctions) return;

        m_vertices.clear();

        double startX = std::floor(m_worldMinX / m_currentSpacing) * m_currentSpacing;
        double endX = std::ceil(m_worldMaxX / m_currentSpacing) * m_currentSpacing;
        double startY = std::floor(m_worldMinY / m_currentSpacing) * m_currentSpacing;
        double endY = std::ceil(m_worldMaxY / m_currentSpacing) * m_currentSpacing;

        int proposedVLines = static_cast<int>((endX - startX) / m_currentSpacing) + 1;
        int proposedHLines = static_cast<int>((endY - startY) / m_currentSpacing) + 1;

        proposedVLines = clampGridLineCount(proposedVLines, m_config.maxGridLinesV);
        proposedHLines = clampGridLineCount(proposedHLines, m_config.maxGridLinesH);

        double stepX = (endX - startX) / std::max(1, proposedVLines - 1);
        for (int i = 0; i < proposedVLines; ++i) {
            double x = startX + i * stepX;

            bool isMajor = (std::abs(std::fmod(x / m_currentSpacing, m_config.majorGridInterval)) < 0.01);

            if (m_config.showAxes && std::abs(x) < m_currentSpacing * 0.01) {
                continue;
            }

            float screenX1, screenY1, screenX2, screenY2;
            worldToScreen(x, m_worldMinY, screenX1, screenY1);
            worldToScreen(x, m_worldMaxY, screenX2, screenY2);

            QColor4ub color = isMajor ? quantityColorToRGBA(m_config.gridColorMajor) :
                quantityColorToRGBA(m_config.gridColorMinor);

            m_vertices.insert(m_vertices.end(), {
                screenX1, screenY1, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
                screenX2, screenY2, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f
                });
        }

        double stepY = (endY - startY) / std::max(1, proposedHLines - 1);
        for (int i = 0; i < proposedHLines; ++i) {
            double y = startY + i * stepY;

            bool isMajor = (std::abs(std::fmod(y / m_currentSpacing, m_config.majorGridInterval)) < 0.01);

            if (m_config.showAxes && std::abs(y) < m_currentSpacing * 0.01) {
                continue;
            }

            float screenX1, screenY1, screenX2, screenY2;
            worldToScreen(m_worldMinX, y, screenX1, screenY1);
            worldToScreen(m_worldMaxX, y, screenX2, screenY2);

            QColor4ub color = isMajor ? quantityColorToRGBA(m_config.gridColorMajor) :
                quantityColorToRGBA(m_config.gridColorMinor);

            m_vertices.insert(m_vertices.end(), {
                screenX1, screenY1, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
                screenX2, screenY2, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f
                });
        }

        if (m_vertices.empty()) {
            return;
        }

        m_shaderProgram->bind();
        m_vao->bind();

        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(m_vertices.data(),
            static_cast<int>(m_vertices.size() * sizeof(float)));

        m_shaderProgram->enableAttributeArray(0);
        m_shaderProgram->setAttributeBuffer(0, GL_FLOAT, 0, 2, 6 * sizeof(float));

        m_shaderProgram->enableAttributeArray(1);
        m_shaderProgram->setAttributeBuffer(1, GL_FLOAT, 2 * sizeof(float), 4, 6 * sizeof(float));

        QMatrix4x4 projection;
        projection.ortho(0, m_viewportWidth, m_viewportHeight, 0, -1, 1);
        m_shaderProgram->setUniformValue("u_projection", projection);

        m_glFunctions->glLineWidth(m_config.lineWidthMinor);

        m_glFunctions->glDrawArrays(GL_LINES, 0, static_cast<GLsizei>(m_vertices.size() / 6));

        m_vao->release();
        m_shaderProgram->release();
    }

    void TyrexGridOverlayRenderer::renderGridDots()
    {
        if (!m_glFunctions) return;

        m_vertices.clear();

        double startX = std::floor(m_worldMinX / m_currentSpacing) * m_currentSpacing;
        double endX = std::ceil(m_worldMaxX / m_currentSpacing) * m_currentSpacing;
        double startY = std::floor(m_worldMinY / m_currentSpacing) * m_currentSpacing;
        double endY = std::ceil(m_worldMaxY / m_currentSpacing) * m_currentSpacing;

        int dotCount = 0;
        for (double x = startX; x <= endX && dotCount < m_config.maxDots; x += m_currentSpacing) {
            for (double y = startY; y <= endY && dotCount < m_config.maxDots; y += m_currentSpacing) {
                if (!isIntersectionVisible(x, y)) {
                    continue;
                }

                float screenX, screenY;
                worldToScreen(x, y, screenX, screenY);

                bool isMajorX = (std::abs(std::fmod(x / m_currentSpacing, m_config.majorGridInterval)) < 0.01);
                bool isMajorY = (std::abs(std::fmod(y / m_currentSpacing, m_config.majorGridInterval)) < 0.01);
                bool isMajor = isMajorX || isMajorY;

                QColor4ub color = isMajor ? quantityColorToRGBA(m_config.gridColorMajor) :
                    quantityColorToRGBA(m_config.gridColorMinor);

                m_vertices.insert(m_vertices.end(), {
                    screenX, screenY, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f
                    });

                dotCount++;
            }
        }

        if (m_vertices.empty()) {
            return;
        }

        m_shaderProgram->bind();
        m_vao->bind();

        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(m_vertices.data(),
            static_cast<int>(m_vertices.size() * sizeof(float)));

        m_shaderProgram->enableAttributeArray(0);
        m_shaderProgram->setAttributeBuffer(0, GL_FLOAT, 0, 2, 6 * sizeof(float));

        m_shaderProgram->enableAttributeArray(1);
        m_shaderProgram->setAttributeBuffer(1, GL_FLOAT, 2 * sizeof(float), 4, 6 * sizeof(float));

        QMatrix4x4 projection;
        projection.ortho(0, m_viewportWidth, m_viewportHeight, 0, -1, 1);
        m_shaderProgram->setUniformValue("u_projection", projection);

        m_glFunctions->glEnable(GL_POINT_SMOOTH);
        m_glFunctions->glHint(GL_POINT_SMOOTH_HINT, GL_NICEST);
        m_glFunctions->glPointSize(m_config.dotSize);

        m_glFunctions->glDrawArrays(GL_POINTS, 0, static_cast<GLsizei>(m_vertices.size() / 6));

        m_glFunctions->glDisable(GL_POINT_SMOOTH);

        m_vao->release();
        m_shaderProgram->release();
    }

    void TyrexGridOverlayRenderer::renderGridCrosses()
    {
        if (!m_glFunctions) return;

        m_vertices.clear();

        double startX = std::floor(m_worldMinX / m_currentSpacing) * m_currentSpacing;
        double endX = std::ceil(m_worldMaxX / m_currentSpacing) * m_currentSpacing;
        double startY = std::floor(m_worldMinY / m_currentSpacing) * m_currentSpacing;
        double endY = std::ceil(m_worldMaxY / m_currentSpacing) * m_currentSpacing;

        int crossCount = 0;
        float halfSize = m_config.crossSize * 0.5f;

        for (double x = startX; x <= endX && crossCount < m_config.maxDots; x += m_currentSpacing) {
            for (double y = startY; y <= endY && crossCount < m_config.maxDots; y += m_currentSpacing) {
                if (!isIntersectionVisible(x, y)) {
                    continue;
                }

                float screenX, screenY;
                worldToScreen(x, y, screenX, screenY);

                bool isMajorX = (std::abs(std::fmod(x / m_currentSpacing, m_config.majorGridInterval)) < 0.01);
                bool isMajorY = (std::abs(std::fmod(y / m_currentSpacing, m_config.majorGridInterval)) < 0.01);
                bool isMajor = isMajorX || isMajorY;

                QColor4ub color = isMajor ? quantityColorToRGBA(m_config.gridColorMajor) :
                    quantityColorToRGBA(m_config.gridColorMinor);

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

        m_shaderProgram->bind();
        m_vao->bind();

        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(m_vertices.data(),
            static_cast<int>(m_vertices.size() * sizeof(float)));

        m_shaderProgram->enableAttributeArray(0);
        m_shaderProgram->setAttributeBuffer(0, GL_FLOAT, 0, 2, 6 * sizeof(float));

        m_shaderProgram->enableAttributeArray(1);
        m_shaderProgram->setAttributeBuffer(1, GL_FLOAT, 2 * sizeof(float), 4, 6 * sizeof(float));

        QMatrix4x4 projection;
        projection.ortho(0, m_viewportWidth, m_viewportHeight, 0, -1, 1);
        m_shaderProgram->setUniformValue("u_projection", projection);

        m_glFunctions->glLineWidth(1.0f);

        m_glFunctions->glDrawArrays(GL_LINES, 0, static_cast<GLsizei>(m_vertices.size() / 6));

        m_vao->release();
        m_shaderProgram->release();
    }

    void TyrexGridOverlayRenderer::renderAxes()
    {
        if (!m_glFunctions) return;

        if (m_worldMinX > 0 || m_worldMaxX < 0 || m_worldMinY > 0 || m_worldMaxY < 0) {
            return;
        }

        std::vector<float> axisVertices;

        float screenX1, screenY1, screenX2, screenY2;
        worldToScreen(m_worldMinX, 0, screenX1, screenY1);
        worldToScreen(m_worldMaxX, 0, screenX2, screenY2);

        QColor4ub xColor = quantityColorToRGBA(m_config.axisColorX);
        axisVertices.insert(axisVertices.end(), {
            screenX1, screenY1, xColor.r / 255.0f, xColor.g / 255.0f, xColor.b / 255.0f, xColor.a / 255.0f,
            screenX2, screenY2, xColor.r / 255.0f, xColor.g / 255.0f, xColor.b / 255.0f, xColor.a / 255.0f
            });

        worldToScreen(0, m_worldMinY, screenX1, screenY1);
        worldToScreen(0, m_worldMaxY, screenX2, screenY2);

        QColor4ub yColor = quantityColorToRGBA(m_config.axisColorY);
        axisVertices.insert(axisVertices.end(), {
            screenX1, screenY1, yColor.r / 255.0f, yColor.g / 255.0f, yColor.b / 255.0f, yColor.a / 255.0f,
            screenX2, screenY2, yColor.r / 255.0f, yColor.g / 255.0f, yColor.b / 255.0f, yColor.a / 255.0f
            });

        m_glFunctions->glLineWidth(m_config.axisLineWidth);

        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(axisVertices.data(),
            static_cast<int>(axisVertices.size() * sizeof(float)));

        m_glFunctions->glDrawArrays(GL_LINES, 0, static_cast<GLsizei>(axisVertices.size() / 6));

        m_glFunctions->glLineWidth(1.0f);
    }

    void TyrexGridOverlayRenderer::renderOriginMarker()
    {
        if (!m_glFunctions) return;

        float originScreenX, originScreenY;
        worldToScreen(0, 0, originScreenX, originScreenY);

        if (originScreenX < 0 || originScreenX > m_viewportWidth ||
            originScreenY < 0 || originScreenY > m_viewportHeight) {
            return;
        }

        float size = m_config.originMarkerSize;
        QColor4ub color = QColor4ub(255, 255, 255, 255);

        std::vector<float> markerVertices = {
            originScreenX - size, originScreenY, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
            originScreenX + size, originScreenY, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
            originScreenX, originScreenY - size, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f,
            originScreenX, originScreenY + size, color.r / 255.0f, color.g / 255.0f, color.b / 255.0f, color.a / 255.0f
        };

        m_glFunctions->glLineWidth(2.0f);

        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(markerVertices.data(),
            static_cast<int>(markerVertices.size() * sizeof(float)));

        m_glFunctions->glDrawArrays(GL_LINES, 0, 4);

        m_glFunctions->glLineWidth(1.0f);
    }

    void TyrexGridOverlayRenderer::renderCoordinateDisplay(const QPoint& cursorPos)
    {
        double worldX, worldY;
        screenToWorld(cursorPos.x(), cursorPos.y(), worldX, worldY);

        if (m_config.snapEnabled) {
            snapToGrid(worldX, worldY, worldX, worldY);
        }

        QString coordText = QString("X: %1, Y: %2")
            .arg(worldX, 0, 'f', 2)
            .arg(worldY, 0, 'f', 2);

        float renderX = cursorPos.x() + m_config.coordinateOffset.x();
        float renderY = cursorPos.y() + m_config.coordinateOffset.y();

        if (renderX + 150 > m_viewportWidth) {
            renderX = cursorPos.x() - 150 - m_config.coordinateOffset.x();
        }
        if (renderY + 20 > m_viewportHeight) {
            renderY = cursorPos.y() - 20 - m_config.coordinateOffset.y();
        }

        renderText(coordText, renderX, renderY, m_config.coordinateColor);
    }

    void TyrexGridOverlayRenderer::updateVBO()
    {
        createVBOForStyle();
    }

    void TyrexGridOverlayRenderer::createVBOForStyle()
    {
        m_cachedVertices.clear();
    }

    bool TyrexGridOverlayRenderer::createShaders()
    {
        m_shaderProgram = std::make_unique<QOpenGLShaderProgram>();

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
        if (!m_glFunctions) return;

        m_vao = std::make_unique<QOpenGLVertexArrayObject>();
        m_vao->create();
        m_vao->bind();

        m_vertexBuffer = std::make_unique<QOpenGLBuffer>(QOpenGLBuffer::VertexBuffer);
        m_vertexBuffer->create();

        m_glFunctions->glGenBuffers(1, &m_gridVBO);
        m_glFunctions->glGenVertexArrays(1, &m_gridVAO);

        m_vao->release();
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
        if (m_viewportWidth < 50 || m_viewportHeight < 50) {
            return false;
        }

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
        Q_UNUSED(text);
        Q_UNUSED(x);
        Q_UNUSED(y);
        Q_UNUSED(color);
        // Text rendering implementation would go here
    }

}