#ifndef TYREXVIEWWIDGET_H
#define TYREXVIEWWIDGET_H

#include <QWidget>
#include <QPoint>
#include <QTimer>
#include <QElapsedTimer>
#include <memory>

#include "TyrexCanvas/TyrexGridConfig.h"

QT_BEGIN_NAMESPACE
class QEnterEvent;
class QPaintEvent;
class QResizeEvent;
QT_END_NAMESPACE

namespace TyrexCAD {

    // Forward declarations
    class TyrexViewerManager;
    class TyrexGridOverlayRenderer;
    class TyrexCanvasOverlay;

    /**
     * @brief Main 3D view widget for TyrexCAD
     *
     * This widget combines OpenCascade visualization with grid overlay support.
     */
    class TyrexViewWidget : public QWidget
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

        // Debug functions
        void debugGridState();
        void enableDebugMode(bool enable) { m_debugMode = enable; }

    signals:
        void viewerInitialized();
        void cursorWorldPosition(double x, double y);
        void gridSpacingChanged(double spacing);
        void gridConfigChanged(const GridConfig& config);
        void snapToGridChanged(bool enabled);

    protected:
        // Widget events
        void paintEvent(QPaintEvent* event) override;
        void resizeEvent(QResizeEvent* event) override;

        // Mouse events
        void mousePressEvent(QMouseEvent* event) override;
        void mouseMoveEvent(QMouseEvent* event) override;
        void mouseReleaseEvent(QMouseEvent* event) override;
        void wheelEvent(QWheelEvent* event) override;

#if QT_VERSION >= QT_VERSION_CHECK(6, 0, 0)
        void enterEvent(QEnterEvent* event) override;
#else
        void enterEvent(QEvent* event) override;
#endif
        void leaveEvent(QEvent* event) override;

    private:
        void initialize();
        void initializeOverlay();

    private:
        // Core components
        std::shared_ptr<TyrexViewerManager> m_viewerManager;
        std::unique_ptr<TyrexGridOverlayRenderer> m_gridRenderer;
        std::shared_ptr<TyrexCanvasOverlay> m_canvasOverlay;

        // State
        bool m_gridInitialized;
        bool m_cursorInWidget;
        bool m_useOpenGLGrid;
        bool m_needsResize;
        QPoint m_currentCursorPos;

        // Update management
        QTimer* m_updateTimer;

        // Debug
        bool m_debugMode;
        int m_paintEventCount;
        QElapsedTimer m_paintTimer;
    };

} // namespace TyrexCAD

#endif // TYREXVIEWWIDGET_H