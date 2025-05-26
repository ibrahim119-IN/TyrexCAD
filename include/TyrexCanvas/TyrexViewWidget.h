#ifndef TYREXVIEWWIDGET_H
#define TYREXVIEWWIDGET_H

#include <QOpenGLWidget>
#include <QOpenGLFunctions>
#include <QPoint>
#include <memory>

#include "TyrexCanvas/TyrexGridConfig.h"

QT_BEGIN_NAMESPACE
class QEnterEvent;
QT_END_NAMESPACE

namespace TyrexCAD {

    // Forward declarations
    class TyrexViewerManager;
    class TyrexGridOverlayRenderer;
    class TyrexCanvasOverlay;

    /**
     * @brief Main 3D view widget for TyrexCAD
     *
     * This widget combines OpenGL rendering with OpenCascade visualization
     * to provide a complete CAD viewport with grid overlay support.
     */
    class TyrexViewWidget : public QOpenGLWidget, protected QOpenGLFunctions
    {
        Q_OBJECT

    public:
        explicit TyrexViewWidget(QWidget* parent = nullptr);
        ~TyrexViewWidget();

        // Accessors
        std::shared_ptr<TyrexViewerManager> viewerManager() const;
        std::shared_ptr<TyrexCanvasOverlay> canvasOverlay() const;

        // Grid control
        void setGridEnabled(bool enabled);
        void setAxisVisible(bool visible);
        void setGridStyle(GridStyle style);
        void setGridSpacing(double spacing);
        void setSnapToGrid(bool enabled);
        void setSketchModeGrid(bool enabled);
        void refreshGrid();  // Force grid refresh

        // Grid system selection
        void setUseOpenGLGrid(bool use) { m_useOpenGLGrid = use; }
        bool isUsingOpenGLGrid() const { return m_useOpenGLGrid; }

        // Force redraw
        void update() { QOpenGLWidget::update(); }

    signals:
        void viewerInitialized();
        void cursorWorldPosition(double x, double y);
        void gridSpacingChanged(double spacing);
        void gridConfigChanged(const GridConfig& config);
        void snapToGridChanged(bool enabled);

    protected:
        // OpenGL events
        void initializeGL() override;
        void paintGL() override;
        void resizeGL(int width, int height) override;

        // Mouse events
        void mousePressEvent(QMouseEvent* event) override;
        void mouseMoveEvent(QMouseEvent* event) override;
        void mouseReleaseEvent(QMouseEvent* event) override;
        void wheelEvent(QWheelEvent* event) override;

        // Widget events
#if QT_VERSION >= QT_VERSION_CHECK(6, 0, 0)
        void enterEvent(QEnterEvent* event) override;
#else
        void enterEvent(QEvent* event) override;
#endif
        void leaveEvent(QEvent* event) override;

    private:
        void initializeOverlay();

    private:
        // Core components
        std::shared_ptr<TyrexViewerManager> m_viewerManager;
        std::unique_ptr<TyrexGridOverlayRenderer> m_gridRenderer;
        std::shared_ptr<TyrexCanvasOverlay> m_canvasOverlay;

        // State
        bool m_gridInitialized;
        bool m_cursorInWidget;
        bool m_useOpenGLGrid;  // Choose between OpenGL or OpenCascade grid
        QPoint m_currentCursorPos;
    };

} // namespace TyrexCAD

#endif // TYREXVIEWWIDGET_H