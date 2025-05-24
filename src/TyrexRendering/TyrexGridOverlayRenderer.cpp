/***************************************************************************
 * Copyright (c) 2025 TyrexCAD development team                          *
 * *
 * This file is part of the TyrexCAD CAx development system.             *
 * *
 ***************************************************************************/

#include "TyrexRendering/TyrexGridOverlayRenderer.h"
#include <QDebug>
#include <QOpenGLContext> 
#include <QOpenGLFunctions> // للتأكد من تضمين دوال OpenGL الأساسية
#include <cmath>
#include <algorithm>
#include <QMatrix4x4> 

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif


namespace TyrexCAD {

    TyrexGridOverlayRenderer::TyrexGridOverlayRenderer()
        : m_view(nullptr)
        , m_gridEnabled(true)
        , m_initialized(false)
        , m_currentSpacing(1.0)
        , m_viewScale(1.0)
        , m_worldMinX(0), m_worldMaxX(0)
        , m_worldMinY(0), m_worldMaxY(0)
        , m_viewportWidth(800), m_viewportHeight(600)
        , m_shaderProgram(nullptr)
        , m_textShaderProgram(nullptr)
        , m_vertexBuffer(nullptr)
        , m_vao(nullptr)
        , m_gridVBO(0)
        , m_gridVAO(0)
        , m_vboDirty(true)
    {
        m_dynamicVertices.reserve(10000);
        m_cachedVertices.reserve(10000);
    }

    TyrexGridOverlayRenderer::~TyrexGridOverlayRenderer()
    {
        // Cleanup should be called by TyrexViewWidget while its context is current.
        // If not, smart pointers will still release memory.
        // Explicit GL cleanup is done in cleanup().
    }

    bool TyrexGridOverlayRenderer::initialize()
    {
        if (m_initialized) {
            return true;
        }

        QOpenGLContext* ctx = QOpenGLContext::currentContext();
        if (!ctx || !ctx->isValid()) {
            qCritical() << "TyrexGridOverlayRenderer::initialize - No current or invalid OpenGL context.";
            return false;
        }

        // initializeOpenGLFunctions() must be called first and its return value checked.
        bool glFuncsInitialized = initializeOpenGLFunctions();
        if (!glFuncsInitialized) {
            qCritical() << "TyrexGridOverlayRenderer::initialize - Failed to initialize OpenGL functions (QOpenGLFunctions).";
            return false;
        }

        if (!createShaders()) {
            qCritical() << "TyrexGridOverlayRenderer::initialize - Failed to create grid shaders";
            m_shaderProgram.reset();
            return false;
        }

        setupVertexArrays();

        // Check for GL errors after each significant GL call if issues persist
        GLenum error;

        glGenBuffers(1, &m_gridVBO);
        error = glGetError();
        if (error != GL_NO_ERROR) qWarning() << "OpenGL Error after glGenBuffers:" << error;

        glGenVertexArrays(1, &m_gridVAO);
        error = glGetError();
        if (error != GL_NO_ERROR) qWarning() << "OpenGL Error after glGenVertexArrays:" << error;


        m_initialized = true;
        qDebug() << "TyrexGridOverlayRenderer initialized successfully";
        return true;
    }

    void TyrexGridOverlayRenderer::cleanup()
    {
        if (!m_initialized) {
            qDebug() << "TyrexGridOverlayRenderer::cleanup - Not initialized, skipping cleanup.";
            return;
        }

        QOpenGLContext* ctx = QOpenGLContext::currentContext();
        // Check if QOpenGLFunctions were successfully initialized for *this* instance
        // and if the current context is valid.
        if (!ctx || !ctx->isValid() || !ctx->functions()) {
            qWarning() << "TyrexGridOverlayRenderer::cleanup - No current, valid, or initialized OpenGL context/functions. Skipping GL calls.";
        }
        else {
            // Only call GL functions if context and QOpenGLFunctions are good for this context
            // It's assumed TyrexViewWidget made its context current before calling this.
            if (m_gridVBO != 0) {
                glDeleteBuffers(1, &m_gridVBO);
                m_gridVBO = 0;
            }
            if (m_gridVAO != 0) {
                glDeleteVertexArrays(1, &m_gridVAO);
                m_gridVAO = 0;
            }
        }

        m_shaderProgram.reset();
        m_textShaderProgram.reset();
        m_vertexBuffer.reset();
        m_vao.reset();

        m_initialized = false;
        qDebug() << "TyrexGridOverlayRenderer cleaned up.";
    }

    // ... (rest of the TyrexGridOverlayRenderer.cpp from previous response,
    //      especially ensure quantityColorToRGBA uses .Alpha() and other fixes) ...
    // The key changes are in initialize() and cleanup() regarding OpenGL context and function checks.

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
        if (m_config.style != style) {
            m_config.style = style;
            m_vboDirty = true;
        }
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

        QOpenGLContext* ctx = QOpenGLContext::currentContext();
        if (!ctx || !ctx->isValid() || !ctx->functions()) {
            qWarning() << "TyrexGridOverlayRenderer::render - No current, valid or initialized OpenGL context/functions.";
            return;
        }
        // TyrexViewWidget is responsible for makeCurrent() before calling this.

        m_viewportWidth = viewportWidth;
        m_viewportHeight = viewportHeight;

        updateViewBounds();
        calculateAdaptiveSpacing();

        if (m_vboDirty) {
            updateVBO();
            m_vboDirty = false;
        }

        GLboolean depthTestEnabledCurrent = glIsEnabled(GL_DEPTH_TEST);
        GLboolean blendEnabledCurrent = glIsEnabled(GL_BLEND);
        GLint blendSrcAlphaCurrent, blendDstAlphaCurrent;
        glGetIntegerv(GL_BLEND_SRC_ALPHA, &blendSrcAlphaCurrent);
        glGetIntegerv(GL_BLEND_DST_ALPHA, &blendDstAlphaCurrent);
        GLfloat currentLineWidthValue;
        glGetFloatv(GL_LINE_WIDTH, &currentLineWidthValue);

        glDisable(GL_DEPTH_TEST);
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        glEnable(GL_LINE_SMOOTH);
        glHint(GL_LINE_SMOOTH_HINT, GL_NICEST);

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

        if (depthTestEnabledCurrent) glEnable(GL_DEPTH_TEST); else glDisable(GL_DEPTH_TEST);
        if (blendEnabledCurrent) glEnable(GL_BLEND); else glDisable(GL_BLEND);
        glBlendFunc(blendSrcAlphaCurrent, blendDstAlphaCurrent);
        glLineWidth(currentLineWidthValue);
        glDisable(GL_LINE_SMOOTH);

        // TyrexViewWidget is responsible for doneCurrent() after this.
    }

    bool TyrexGridOverlayRenderer::snapToGrid(double worldX, double worldY,
        double& snappedX, double& snappedY) const
    {
        if (!m_gridEnabled || !m_config.snapEnabled || m_currentSpacing <= 1e-9) {
            snappedX = worldX;
            snappedY = worldY;
            return false;
        }

        snappedX = std::round(worldX / m_currentSpacing) * m_currentSpacing;
        snappedY = std::round(worldY / m_currentSpacing) * m_currentSpacing;

        return true;
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
            if (m_viewScale < 1e-9) m_viewScale = 1e-9;

            Standard_Real x1_3d, y1_3d, z1_3d, x2_3d, y2_3d, z2_3d;
            m_view->Convert(0, m_viewportHeight, x1_3d, y1_3d, z1_3d);
            m_view->Convert(m_viewportWidth, 0, x2_3d, y2_3d, z2_3d);

            m_worldMinX = std::min(x1_3d, x2_3d);
            m_worldMaxX = std::max(x1_3d, x2_3d);
            m_worldMinY = std::min(y1_3d, y2_3d);
            m_worldMaxY = std::max(y1_3d, y2_3d);

            double marginFactor = m_config.gridExtensionFactor > 1.0 ? (m_config.gridExtensionFactor - 1.0) : 0.1;
            double marginX = (m_worldMaxX - m_worldMinX) * marginFactor;
            double marginY = (m_worldMaxY - m_worldMinY) * marginFactor;

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
        if (!m_config.adaptiveSpacing || m_viewScale < 1e-9) {
            m_currentSpacing = m_config.baseSpacing;
            return;
        }

        double pixelSpacing = m_config.baseSpacing * m_viewScale;
        double targetSpacing = m_config.baseSpacing;

        const double min_target_spacing = 1e-6;
        const double max_target_spacing = 1e6;

        int iterations = 0;
        const int max_iterations = 20;

        while (pixelSpacing < m_config.minSpacingPixels && targetSpacing < max_target_spacing && ++iterations < max_iterations) {
            targetSpacing *= (m_config.majorLineInterval > 1 ? static_cast<double>(m_config.majorLineInterval) : 2.0);
            pixelSpacing = targetSpacing * m_viewScale;
        }

        iterations = 0;
        while (pixelSpacing > m_config.maxSpacingPixels && targetSpacing > min_target_spacing && ++iterations < max_iterations) {
            targetSpacing /= (m_config.majorLineInterval > 1 ? static_cast<double>(m_config.majorLineInterval) : 2.0);
            pixelSpacing = targetSpacing * m_viewScale;
        }

        m_currentSpacing = std::max(min_target_spacing, std::min(max_target_spacing, targetSpacing));
        if (m_currentSpacing <= 1e-9) m_currentSpacing = 1e-9;
    }

    void TyrexGridOverlayRenderer::prepareGridLinesVertices() {
        m_dynamicVertices.clear();
        if (m_currentSpacing <= 1e-9) return;

        double startX = std::floor(m_worldMinX / m_currentSpacing) * m_currentSpacing;
        double endX = std::ceil(m_worldMaxX / m_currentSpacing) * m_currentSpacing;
        double startY = std::floor(m_worldMinY / m_currentSpacing) * m_currentSpacing;
        double endY = std::ceil(m_worldMaxY / m_currentSpacing) * m_currentSpacing;

        int numVLines = static_cast<int>(std::round((endX - startX) / m_currentSpacing));
        int numHLines = static_cast<int>(std::round((endY - startY) / m_currentSpacing));

        numVLines = clampGridLineCount(numVLines + 1, m_config.maxGridLinesV);
        numHLines = clampGridLineCount(numHLines + 1, m_config.maxGridLinesH);

        for (int i = 0; i < numVLines; ++i) {
            double x = startX + i * m_currentSpacing;
            bool isMajor = (m_config.majorLineInterval > 0 && (std::abs(std::fmod(std::round(x / m_currentSpacing), m_config.majorLineInterval)) < 1e-3));
            if (m_config.showAxes && std::abs(x) < m_currentSpacing * 0.01) continue;

            float sx1, sy1, sx2, sy2;
            worldToScreen(x, m_worldMinY, sx1, sy1);
            worldToScreen(x, m_worldMaxY, sx2, sy2);
            QColor4ub color = isMajor ? quantityColorToRGBA(m_config.gridColorMajor) : quantityColorToRGBA(m_config.gridColorMinor);
            m_dynamicVertices.insert(m_dynamicVertices.end(), { sx1, sy1, color.r / 255.f, color.g / 255.f, color.b / 255.f, color.a / 255.f });
            m_dynamicVertices.insert(m_dynamicVertices.end(), { sx2, sy2, color.r / 255.f, color.g / 255.f, color.b / 255.f, color.a / 255.f });
        }

        for (int i = 0; i < numHLines; ++i) {
            double y = startY + i * m_currentSpacing;
            bool isMajor = (m_config.majorLineInterval > 0 && (std::abs(std::fmod(std::round(y / m_currentSpacing), m_config.majorLineInterval)) < 1e-3));
            if (m_config.showAxes && std::abs(y) < m_currentSpacing * 0.01) continue;

            float sx1, sy1, sx2, sy2;
            worldToScreen(m_worldMinX, y, sx1, sy1);
            worldToScreen(m_worldMaxX, y, sx2, sy2);
            QColor4ub color = isMajor ? quantityColorToRGBA(m_config.gridColorMajor) : quantityColorToRGBA(m_config.gridColorMinor);
            m_dynamicVertices.insert(m_dynamicVertices.end(), { sx1, sy1, color.r / 255.f, color.g / 255.f, color.b / 255.f, color.a / 255.f });
            m_dynamicVertices.insert(m_dynamicVertices.end(), { sx2, sy2, color.r / 255.f, color.g / 255.f, color.b / 255.f, color.a / 255.f });
        }
    }

    void TyrexGridOverlayRenderer::prepareGridDotsVertices() {
        m_dynamicVertices.clear();
        if (m_currentSpacing <= 1e-9) return;

        double startX = std::floor(m_worldMinX / m_currentSpacing) * m_currentSpacing;
        double endX = std::ceil(m_worldMaxX / m_currentSpacing) * m_currentSpacing;
        double startY = std::floor(m_worldMinY / m_currentSpacing) * m_currentSpacing;
        double endY = std::ceil(m_worldMaxY / m_currentSpacing) * m_currentSpacing;

        int count = 0;
        for (double x = startX; x <= endX && count < m_config.maxDots; x += m_currentSpacing) {
            for (double y = startY; y <= endY && count < m_config.maxDots; y += m_currentSpacing) {
                if (!isIntersectionVisible(x, y)) continue;
                bool isMajor = (m_config.majorLineInterval > 0 && (std::abs(std::fmod(std::round(x / m_currentSpacing), m_config.majorLineInterval)) < 1e-3 ||
                    std::abs(std::fmod(std::round(y / m_currentSpacing), m_config.majorLineInterval)) < 1e-3));
                if (m_config.showAxes && std::abs(x) < 1e-9 && std::abs(y) < 1e-9) continue;

                float sx, sy;
                worldToScreen(x, y, sx, sy);
                QColor4ub color = isMajor ? quantityColorToRGBA(m_config.gridColorMajor) : quantityColorToRGBA(m_config.gridColorMinor);
                m_dynamicVertices.insert(m_dynamicVertices.end(), { sx, sy, color.r / 255.f, color.g / 255.f, color.b / 255.f, color.a / 255.f });
                count++;
            }
        }
    }

    void TyrexGridOverlayRenderer::prepareGridCrossesVertices() {
        m_dynamicVertices.clear();
        if (m_currentSpacing <= 1e-9) return;

        float halfSize = m_config.crossSize * 0.5f;
        double startX = std::floor(m_worldMinX / m_currentSpacing) * m_currentSpacing;
        double endX = std::ceil(m_worldMaxX / m_currentSpacing) * m_currentSpacing;
        double startY = std::floor(m_worldMinY / m_currentSpacing) * m_currentSpacing;
        double endY = std::ceil(m_worldMaxY / m_currentSpacing) * m_currentSpacing;

        int count = 0;
        for (double x_world = startX; x_world <= endX && count < m_config.maxDots; x_world += m_currentSpacing) {
            for (double y_world = startY; y_world <= endY && count < m_config.maxDots; y_world += m_currentSpacing) {
                if (!isIntersectionVisible(x_world, y_world)) continue;
                bool isMajor = (m_config.majorLineInterval > 0 && (std::abs(std::fmod(std::round(x_world / m_currentSpacing), m_config.majorLineInterval)) < 1e-3 ||
                    std::abs(std::fmod(std::round(y_world / m_currentSpacing), m_config.majorLineInterval)) < 1e-3));
                if (m_config.showAxes && std::abs(x_world) < 1e-9 && std::abs(y_world) < 1e-9) continue;

                float sx, sy;
                worldToScreen(x_world, y_world, sx, sy);
                QColor4ub color = isMajor ? quantityColorToRGBA(m_config.gridColorMajor) : quantityColorToRGBA(m_config.gridColorMinor);

                m_dynamicVertices.insert(m_dynamicVertices.end(), { sx - halfSize, sy, color.r / 255.f, color.g / 255.f, color.b / 255.f, color.a / 255.f });
                m_dynamicVertices.insert(m_dynamicVertices.end(), { sx + halfSize, sy, color.r / 255.f, color.g / 255.f, color.b / 255.f, color.a / 255.f });
                m_dynamicVertices.insert(m_dynamicVertices.end(), { sx, sy - halfSize, color.r / 255.f, color.g / 255.f, color.b / 255.f, color.a / 255.f });
                m_dynamicVertices.insert(m_dynamicVertices.end(), { sx, sy + halfSize, color.r / 255.f, color.g / 255.f, color.b / 255.f, color.a / 255.f });
                count++;
            }
        }
    }

    void TyrexGridOverlayRenderer::renderGrid() {
        if (!m_initialized || !m_shaderProgram || !m_vertexBuffer || !m_vao || m_viewportWidth == 0 || m_viewportHeight == 0) {
            return;
        }

        GLenum mode = GL_LINES;
        float pointOrLineWidth = m_config.lineWidthMinor;

        switch (m_config.style) {
        case GridStyle::Lines:
            prepareGridLinesVertices();
            pointOrLineWidth = (m_config.lineWidthMinor > 0) ? m_config.lineWidthMinor : 1.0f;
            break;
        case GridStyle::Dots:
            prepareGridDotsVertices();
            mode = GL_POINTS;
            pointOrLineWidth = (m_config.dotSize > 0) ? m_config.dotSize : 1.0f;
            break;
        case GridStyle::Crosses:
            prepareGridCrossesVertices();
            mode = GL_LINES;
            pointOrLineWidth = (m_config.lineWidthMinor > 0) ? m_config.lineWidthMinor : 1.0f;
            break;
        }

        if (m_dynamicVertices.empty()) {
            return;
        }

        glMatrixMode(GL_PROJECTION); glPushMatrix(); glLoadIdentity();
        glOrtho(0, static_cast<GLdouble>(m_viewportWidth), static_cast<GLdouble>(m_viewportHeight), 0, -1, 1);
        glMatrixMode(GL_MODELVIEW); glPushMatrix(); glLoadIdentity();

        m_shaderProgram->bind();
        m_vao->bind();
        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(m_dynamicVertices.data(), static_cast<int>(m_dynamicVertices.size() * sizeof(float)));

        m_shaderProgram->enableAttributeArray(0);
        m_shaderProgram->setAttributeBuffer(0, GL_FLOAT, 0, 2, 6 * sizeof(float));
        m_shaderProgram->enableAttributeArray(1);
        m_shaderProgram->setAttributeBuffer(1, GL_FLOAT, 2 * sizeof(float), 4, 6 * sizeof(float));

        QMatrix4x4 projectionMatrix;
        projectionMatrix.ortho(0, static_cast<float>(m_viewportWidth), static_cast<float>(m_viewportHeight), 0, -1.0f, 1.0f);
        m_shaderProgram->setUniformValue("u_projection", projectionMatrix);

        if (mode == GL_POINTS) {
            glPointSize(pointOrLineWidth);
        }
        else {
            glLineWidth(pointOrLineWidth);
        }

        glDrawArrays(mode, 0, static_cast<GLsizei>(m_dynamicVertices.size() / 6));

        m_vao->release();
        if (m_vertexBuffer && m_vertexBuffer->isCreated()) m_vertexBuffer->release();
        m_shaderProgram->release();

        glMatrixMode(GL_PROJECTION); glPopMatrix();
        glMatrixMode(GL_MODELVIEW); glPopMatrix();
    }

    void TyrexGridOverlayRenderer::renderAxes() {
        if (!m_initialized || (m_worldMinX > 1e-9 && m_worldMaxX < -1e-9 && m_worldMinY > 1e-9 && m_worldMaxY < -1e-9)) {
            return;
        }
        m_dynamicVertices.clear();
        float sx1, sy1, sx2, sy2;

        worldToScreen(m_worldMinX, 0, sx1, sy1);
        worldToScreen(m_worldMaxX, 0, sx2, sy2);
        QColor4ub xColor = quantityColorToRGBA(m_config.axisColorX);
        m_dynamicVertices.insert(m_dynamicVertices.end(), { sx1, sy1, xColor.r / 255.f, xColor.g / 255.f, xColor.b / 255.f, xColor.a / 255.f });
        m_dynamicVertices.insert(m_dynamicVertices.end(), { sx2, sy2, xColor.r / 255.f, xColor.g / 255.f, xColor.b / 255.f, xColor.a / 255.f });

        worldToScreen(0, m_worldMinY, sx1, sy1);
        worldToScreen(0, m_worldMaxY, sx2, sy2);
        QColor4ub yColor = quantityColorToRGBA(m_config.axisColorY);
        m_dynamicVertices.insert(m_dynamicVertices.end(), { sx1, sy1, yColor.r / 255.f, yColor.g / 255.f, yColor.b / 255.f, yColor.a / 255.f });
        m_dynamicVertices.insert(m_dynamicVertices.end(), { sx2, sy2, yColor.r / 255.f, yColor.g / 255.f, yColor.b / 255.f, yColor.a / 255.f });

        if (m_dynamicVertices.empty()) return;

        glMatrixMode(GL_PROJECTION); glPushMatrix(); glLoadIdentity();
        glOrtho(0, static_cast<GLdouble>(m_viewportWidth), static_cast<GLdouble>(m_viewportHeight), 0, -1, 1);
        glMatrixMode(GL_MODELVIEW); glPushMatrix(); glLoadIdentity();

        m_shaderProgram->bind();
        m_vao->bind();
        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(m_dynamicVertices.data(), static_cast<int>(m_dynamicVertices.size() * sizeof(float)));
        m_shaderProgram->enableAttributeArray(0);
        m_shaderProgram->setAttributeBuffer(0, GL_FLOAT, 0, 2, 6 * sizeof(float));
        m_shaderProgram->enableAttributeArray(1);
        m_shaderProgram->setAttributeBuffer(1, GL_FLOAT, 2 * sizeof(float), 4, 6 * sizeof(float));

        QMatrix4x4 projectionMatrix;
        projectionMatrix.ortho(0, static_cast<float>(m_viewportWidth), static_cast<float>(m_viewportHeight), 0, -1.0f, 1.0f);
        m_shaderProgram->setUniformValue("u_projection", projectionMatrix);

        glLineWidth(m_config.axisLineWidth > 0 ? m_config.axisLineWidth : 1.0f);
        glDrawArrays(GL_LINES, 0, static_cast<GLsizei>(m_dynamicVertices.size() / 6));

        m_vao->release();
        if (m_vertexBuffer && m_vertexBuffer->isCreated()) m_vertexBuffer->release();
        m_shaderProgram->release();

        glMatrixMode(GL_PROJECTION); glPopMatrix();
        glMatrixMode(GL_MODELVIEW); glPopMatrix();
    }

    void TyrexGridOverlayRenderer::renderOriginMarker() {
        if (!m_initialized) return;

        float originScreenX, originScreenY;
        worldToScreen(0, 0, originScreenX, originScreenY);

        if (originScreenX < 0 || originScreenX > m_viewportWidth || originScreenY < 0 || originScreenY > m_viewportHeight) {
            return;
        }
        m_dynamicVertices.clear();
        float size = m_config.originMarkerSize;
        QColor4ub colorX = quantityColorToRGBA(m_config.axisColorX);
        QColor4ub colorY = quantityColorToRGBA(m_config.axisColorY);

        m_dynamicVertices.insert(m_dynamicVertices.end(), { originScreenX - size, originScreenY, colorX.r / 255.f, colorX.g / 255.f, colorX.b / 255.f, colorX.a / 255.f });
        m_dynamicVertices.insert(m_dynamicVertices.end(), { originScreenX + size, originScreenY, colorX.r / 255.f, colorX.g / 255.f, colorX.b / 255.f, colorX.a / 255.f });
        m_dynamicVertices.insert(m_dynamicVertices.end(), { originScreenX, originScreenY - size, colorY.r / 255.f, colorY.g / 255.f, colorY.b / 255.f, colorY.a / 255.f });
        m_dynamicVertices.insert(m_dynamicVertices.end(), { originScreenX, originScreenY + size, colorY.r / 255.f, colorY.g / 255.f, colorY.b / 255.f, colorY.a / 255.f });

        if (m_dynamicVertices.empty()) return;

        glMatrixMode(GL_PROJECTION); glPushMatrix(); glLoadIdentity();
        glOrtho(0, static_cast<GLdouble>(m_viewportWidth), static_cast<GLdouble>(m_viewportHeight), 0, -1, 1);
        glMatrixMode(GL_MODELVIEW); glPushMatrix(); glLoadIdentity();

        m_shaderProgram->bind();
        m_vao->bind();
        m_vertexBuffer->bind();
        m_vertexBuffer->allocate(m_dynamicVertices.data(), static_cast<int>(m_dynamicVertices.size() * sizeof(float)));
        m_shaderProgram->enableAttributeArray(0);
        m_shaderProgram->setAttributeBuffer(0, GL_FLOAT, 0, 2, 6 * sizeof(float));
        m_shaderProgram->enableAttributeArray(1);
        m_shaderProgram->setAttributeBuffer(1, GL_FLOAT, 2 * sizeof(float), 4, 6 * sizeof(float));

        QMatrix4x4 projectionMatrix;
        projectionMatrix.ortho(0, static_cast<float>(m_viewportWidth), static_cast<float>(m_viewportHeight), 0, -1.0f, 1.0f);
        m_shaderProgram->setUniformValue("u_projection", projectionMatrix);

        glLineWidth(m_config.axisLineWidth > 0 ? m_config.axisLineWidth : 1.0f);
        glDrawArrays(GL_LINES, 0, static_cast<GLsizei>(m_dynamicVertices.size() / 6));

        m_vao->release();
        if (m_vertexBuffer && m_vertexBuffer->isCreated()) m_vertexBuffer->release();
        m_shaderProgram->release();

        glMatrixMode(GL_PROJECTION); glPopMatrix();
        glMatrixMode(GL_MODELVIEW); glPopMatrix();
    }

    void TyrexGridOverlayRenderer::renderCoordinateDisplay(const QPoint& cursorPos) {
        if (!m_initialized) return;

        double worldX, worldY;
        screenToWorldInternal(static_cast<float>(cursorPos.x()), static_cast<float>(cursorPos.y()), worldX, worldY);

        if (m_config.snapEnabled && m_gridEnabled) {
            snapToGrid(worldX, worldY, worldX, worldY);
        }

        QString coordText = QString("X: %1, Y: %2")
            .arg(worldX, 0, 'f', 2)
            .arg(worldY, 0, 'f', 2);

        renderText(coordText,
            cursorPos.x() + m_config.coordinateOffset.x(),
            cursorPos.y() + m_config.coordinateOffset.y(),
            m_config.coordinateColor);
    }

    void TyrexGridOverlayRenderer::updateVBO() {
        createVBOForStyle();
        if (!m_cachedVertices.empty() && m_gridVAO != 0 && m_gridVBO != 0 && m_initialized) {
            glBindVertexArray(m_gridVAO);
            glBindBuffer(GL_ARRAY_BUFFER, m_gridVBO);
            glBufferData(GL_ARRAY_BUFFER, m_cachedVertices.size() * sizeof(float), m_cachedVertices.data(), GL_STATIC_DRAW);
            glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)0);
            glEnableVertexAttribArray(0);
            glVertexAttribPointer(1, 4, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)(2 * sizeof(float)));
            glEnableVertexAttribArray(1);
            glBindBuffer(GL_ARRAY_BUFFER, 0);
            glBindVertexArray(0);
        }
    }

    void TyrexGridOverlayRenderer::createVBOForStyle() {
        m_cachedVertices.clear();
    }

    bool TyrexGridOverlayRenderer::createShaders() {
        m_shaderProgram = std::make_unique<QOpenGLShaderProgram>();
        const char* vertexShaderSrc = R"(
            #version 330 core
            layout(location = 0) in vec2 aPos;
            layout(location = 1) in vec4 aColor;
            uniform mat4 u_projection;
            out vec4 vColor;
            void main() {
                gl_Position = u_projection * vec4(aPos.x, aPos.y, 0.0, 1.0);
                vColor = aColor;
            }
        )";
        const char* fragmentShaderSrc = R"(
            #version 330 core
            in vec4 vColor;
            out vec4 FragColor;
            void main() {
                FragColor = vColor;
            }
        )";

        if (!m_shaderProgram->addShaderFromSourceCode(QOpenGLShader::Vertex, vertexShaderSrc)) {
            qCritical() << "Grid Vertex Shader Compilation Error:" << m_shaderProgram->log();
            return false;
        }
        if (!m_shaderProgram->addShaderFromSourceCode(QOpenGLShader::Fragment, fragmentShaderSrc)) {
            qCritical() << "Grid Fragment Shader Compilation Error:" << m_shaderProgram->log();
            return false;
        }
        if (!m_shaderProgram->link()) {
            qCritical() << "Grid Shader Linking Error:" << m_shaderProgram->log();
            return false;
        }

        m_textShaderProgram = std::make_unique<QOpenGLShaderProgram>();
        const char* textVertexShaderSrc = R"(
            #version 330 core
            layout(location = 0) in vec4 vertex; 
            out vec2 TexCoords;
            uniform mat4 projection;
            void main() {
                gl_Position = projection * vec4(vertex.xy, 0.0, 1.0);
                TexCoords = vertex.zw;
            }
        )";
        const char* textFragmentShaderSrc = R"(
            #version 330 core
            in vec2 TexCoords;
            out vec4 FragColor; 
            uniform sampler2D textTexture; 
            uniform vec3 textColorValue;   
            void main() {    
                vec4 sampled = vec4(1.0, 1.0, 1.0, texture(textTexture, TexCoords).r);
                FragColor = vec4(textColorValue, 1.0) * sampled;
            }
        )";
        if (!m_textShaderProgram->addShaderFromSourceCode(QOpenGLShader::Vertex, textVertexShaderSrc) ||
            !m_textShaderProgram->addShaderFromSourceCode(QOpenGLShader::Fragment, textFragmentShaderSrc) ||
            !m_textShaderProgram->link()) {
            qWarning() << "Text Shader Program Error:" << m_textShaderProgram->log();
        }
        return true;
    }

    void TyrexGridOverlayRenderer::setupVertexArrays() {
        if (!m_initialized) {
            qWarning("TyrexGridOverlayRenderer::setupVertexArrays - OpenGL functions not fully initialized (called from constructor or before initializeOpenGLFunctions).");
            // Defer VAO/VBO creation to initialize() where context is confirmed.
            return;
        }

        m_vao = std::make_unique<QOpenGLVertexArrayObject>();
        if (!m_vao->create()) { // This create() call relies on a current context AND initialized functions
            qCritical() << "Failed to create VAO for dynamic grid data.";
            return;
        }
        m_vao->bind();

        m_vertexBuffer = std::make_unique<QOpenGLBuffer>(QOpenGLBuffer::VertexBuffer);
        if (!m_vertexBuffer->create()) {
            qCritical() << "Failed to create VBO for dynamic grid data.";
            if (m_vao && m_vao->isCreated()) m_vao->release();
            return;
        }
        m_vertexBuffer->bind();
        m_vertexBuffer->setUsagePattern(QOpenGLBuffer::DynamicDraw);

        glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)0);
        glEnableVertexAttribArray(0);
        glVertexAttribPointer(1, 4, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)(2 * sizeof(float)));
        glEnableVertexAttribArray(1);

        if (m_vertexBuffer && m_vertexBuffer->isCreated()) m_vertexBuffer->release();
        if (m_vao && m_vao->isCreated()) m_vao->release();
    }

    TyrexGridOverlayRenderer::QColor4ub TyrexGridOverlayRenderer::quantityColorToRGBA(const Quantity_Color& color) const {
        return QColor4ub(
            static_cast<unsigned char>(color.Red() * 255.99f),
            static_cast<unsigned char>(color.Green() * 255.99f),
            static_cast<unsigned char>(color.Blue() * 255.99f),
            static_cast<unsigned char>((1.0f - color.Alpha()) * 255.99f) // Use Alpha() method
        );
    }

    void TyrexGridOverlayRenderer::worldToScreen(double worldX, double worldY,
        float& screenX, float& screenY) const {
        if (m_view.IsNull()) {
            screenX = static_cast<float>(worldX);
            screenY = static_cast<float>(m_viewportHeight - worldY);
            return;
        }
        Standard_Integer x_out, y_out;
        try {
            m_view->Convert(worldX, worldY, 0.0, x_out, y_out);
            screenX = static_cast<float>(x_out);
            screenY = static_cast<float>(y_out);
        }
        catch (const Standard_Failure& e) {
            qWarning() << "TyrexGridOverlayRenderer::worldToScreen - V3d_View::Convert failed:" << e.GetMessageString();
            screenX = 0; screenY = 0;
        }
    }

    void TyrexGridOverlayRenderer::screenToWorldInternal(float screenX, float screenY,
        double& worldX, double& worldY) const {
        if (m_view.IsNull()) {
            worldX = static_cast<double>(screenX);
            worldY = static_cast<double>(m_viewportHeight - screenY);
            return;
        }
        Standard_Real wx, wy, wz;
        try {
            m_view->Convert(static_cast<Standard_Integer>(screenX), static_cast<Standard_Integer>(screenY), wx, wy, wz);
            worldX = wx;
            worldY = wy;
        }
        catch (const Standard_Failure& e) {
            qWarning() << "TyrexGridOverlayRenderer::screenToWorldInternal - V3d_View::Convert failed:" << e.GetMessageString();
            worldX = 0; worldY = 0;
        }
    }

    bool TyrexGridOverlayRenderer::shouldRenderGrid() const {
        if (m_viewportWidth < 10 || m_viewportHeight < 10) return false;
        if (m_viewScale < 1e-6 || m_viewScale > 1e6) return false;
        return true;
    }

    int TyrexGridOverlayRenderer::clampGridLineCount(int proposedCount, int maxCount) const {
        return std::min(std::max(proposedCount, 0), maxCount);
    }

    bool TyrexGridOverlayRenderer::isIntersectionVisible(double x, double y) const {
        return x >= m_worldMinX && x <= m_worldMaxX && y >= m_worldMinY && y <= m_worldMaxY;
    }

    void TyrexGridOverlayRenderer::renderText(const QString& text, float x, float y, const Quantity_Color& qc_color) {
        Q_UNUSED(text);
        Q_UNUSED(x);
        Q_UNUSED(y);
        Q_UNUSED(qc_color);
        // qDebug() << "RenderText (Placeholder):" << text << "@" << x << "," << y << "Color:" << qc_color.Red() << qc_color.Green() << qc_color.Blue();
    }

} // namespace TyrexCAD