/***************************************************************************
 * TyrexViewWidget Integration with Grid Overlay System
 *
 * This shows how to integrate TyrexGridOverlayRenderer with the existing
 * TyrexViewWidget to achieve AutoCAD-style grid rendering.
 ***************************************************************************/

 // === HEADER MODIFICATIONS (TyrexViewWidget.h) ===

#ifndef TYREX_VIEW_WIDGET_H
#define TYREX_VIEW_WIDGET_H

#include <QOpenGLWidget>
#include <QOpenGLFunctions>
#include <memory>
#include "TyrexGridOverlayRenderer.h" // Add this include

// Forward declarations
class V3d_View;

namespace TyrexCAD {
    class TyrexViewerManager;
    class TyrexInteractionManager;

    class TyrexViewWidget : public QOpenGLWidget, protected QOpenGLFunctions
    {
        Q_OBJECT

    public:
        explicit TyrexViewWidget(QWidget* parent = nullptr);
        ~TyrexViewWidget();

        std::shared_ptr<TyrexViewerManager> viewerManager() const;
        TyrexInteractionManager* interactionManager() const;

        // === NEW: Grid control methods ===
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
         * @param config Grid settings
         */
        void setGridConfig(const GridConfig& config);

        /**
         * @brief Get current grid configuration
         * @return Grid settings
         */
        const GridConfig& getGridConfig() const;

        /**
         * @brief Snap point to grid
         * @param worldX Input world X coordinate
         * @param worldY Input world Y coordinate
         * @param snappedX Output snapped X
         * @param snappedY Output snapped Y
         * @return True if snapping was applied
         */
        bool snapToGrid(double worldX, double worldY,
            double& snappedX, double& snappedY) const;

    signals:
        void viewerInitialized();
        void gridConfigChanged(); // New signal

    protected:
        // OpenGL rendering
        void initializeGL() override;
        void paintGL() override;
        void resizeGL(int w, int h) override;

        // Event handling
        void mousePressEvent(QMouseEvent* e) override;
        void mouseMoveEvent(QMouseEvent* e) override;
        void mouseReleaseEvent(QMouseEvent* e) override;
        void wheelEvent(QWheelEvent* e) override;

    private:
        void initializeManagers();
        void setupGridRenderer(); // New method

    private:
        std::shared_ptr<TyrexViewerManager> m_viewerManager;
        std::unique_ptr<TyrexInteractionManager> m_interactionManager;

        // === NEW: Grid overlay renderer ===
        std::unique_ptr<TyrexGridOverlayRenderer> m_gridRenderer;
        bool m_gridInitialized;
    };

} // namespace TyrexCAD

#endif // TYREX_VIEW_WIDGET_H




// === USAGE EXAMPLE IN MAIN WINDOW ===

// In TyrexMainWindow.cpp, add grid controls:

void TyrexMainWindow::createAdvancedSketchActions()
{
    // Grid toggle action  
    m_toggleGridAction = new QAction(tr("Toggle &Grid"), this);
    m_toggleGridAction->setShortcut(QKeySequence(tr("F7")));
    m_toggleGridAction->setCheckable(true);
    m_toggleGridAction->setChecked(true);
    m_toggleGridAction->setStatusTip(tr("Toggle grid visibility"));

    connect(m_toggleGridAction, &QAction::triggered, this, [this](bool checked) {
        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget) {
            viewWidget->setGridEnabled(checked);
            statusBar()->showMessage(checked ? "Grid ON" : "Grid OFF", 2000);
        }
        });

    // Grid spacing controls
    m_gridSpacingAction = new QAction(tr("Grid &Spacing..."), this);
    connect(m_gridSpacingAction, &QAction::triggered, this, [this]() {
        auto viewWidget = qobject_cast<TyrexViewWidget*>(centralWidget());
        if (viewWidget) {
            GridConfig config = viewWidget->getGridConfig();

            // Show grid configuration dialog
            bool ok;
            double newSpacing = QInputDialog::getDouble(this,
                tr("Grid Spacing"),
                tr("Enter grid spacing:"),
                config.baseSpacing, 0.1, 1000.0, 2, &ok);

            if (ok) {
                config.baseSpacing = newSpacing;
                viewWidget->setGridConfig(config);
                statusBar()->showMessage(
                    QString("Grid spacing set to %1").arg(newSpacing), 2000);
            }
        }
        });
}

/