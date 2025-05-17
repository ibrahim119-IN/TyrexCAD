#ifndef TYREX_VIEW_WIDGET_H
#define TYREX_VIEW_WIDGET_H

#include <QWidget>
#include <memory>

// OpenCascade forward declarations
class V3d_View;

namespace TyrexCAD {
    // Forward declarations
    class TyrexViewerManager;
    class TyrexInteractionManager;

    /**
     * @class TyrexViewWidget
     * @brief A specialized Qt widget that hosts the OpenCascade 3D viewer.
     *
     * This widget serves as the primary rendering window for the CAD application.
     * It integrates the viewer manager for rendering and the interaction manager
     * for handling user input.
     */
    class TyrexViewWidget : public QWidget
    {
        Q_OBJECT

    public:
        /**
         * @brief Constructor
         * @param parent Parent widget
         */
        explicit TyrexViewWidget(QWidget* parent = nullptr);

        /**
         * @brief Destructor
         */
        ~TyrexViewWidget();

        /**
         * @brief Get the viewer manager instance
         * @return Shared pointer to the viewer manager
         */
        std::shared_ptr<TyrexViewerManager> viewerManager() const;

        /**
         * @brief Get the interaction manager instance
         * @return Raw pointer to the interaction manager
         */
        TyrexInteractionManager* interactionManager() const;

    signals:
        /**
         * @brief Signal emitted when the viewer is initialized and ready
         */
        void viewerInitialized();

    protected:
        // Override Qt events to delegate to interaction manager
        void mousePressEvent(QMouseEvent* e) override;
        void mouseMoveEvent(QMouseEvent* e) override;
        void mouseReleaseEvent(QMouseEvent* e) override;
        void wheelEvent(QWheelEvent* e) override;
        void resizeEvent(QResizeEvent* e) override;
        void showEvent(QShowEvent* e) override;

    private:
        /**
         * @brief Initialize viewer and interaction managers
         */
        void initializeManagers();

    private:
        // The viewer manager - shared because it might be accessed by other components
        std::shared_ptr<TyrexViewerManager> m_viewerManager;

        // The interaction manager - unique because it's owned exclusively by this widget
        std::unique_ptr<TyrexInteractionManager> m_interactionManager;
    };

} // namespace TyrexCAD

#endif // TYREX_VIEW_WIDGET_H