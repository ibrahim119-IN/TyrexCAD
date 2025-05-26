#ifndef TYREX_RENDERING_MANAGER_H
#define TYREX_RENDERING_MANAGER_H

#include <memory>
#include <QObject>
#include <TyrexCanvas/TyrexModelSpace.h>
#include <V3d_Viewer.hxx>
#include <TyrexCore/UpdateManager.h>
#include <OpenGl_GraphicDriver.hxx>
#include <TyrexCanvas/TyrexGridConfig.h>
#include "TyrexGridOverlayRenderer.h"

namespace TyrexCAD {

    // Forward declarations
    class OpenCascadeRenderer;
    class OpenGLOverlayRenderer;
    
    class GridRenderer;
    
    class UpdateManager;

    /**
     * @brief Manages all rendering operations with proper separation of concerns
     */
    class TyrexRenderingManager : public QObject {
        Q_OBJECT

    public:
        explicit TyrexRenderingManager(QObject* parent = nullptr);
        ~TyrexRenderingManager();

        /**
         * @brief Initialize all rendering subsystems
         * @param glWidget OpenGL widget for rendering
         * @return true if initialization successful
         */
        bool initialize(QWidget* glWidget);

        /**
         * @brief Main render function
         */
        void render();

        /**
         * @brief Handle viewport resize
         * @param width New viewport width
         * @param height New viewport height
         */
        void resizeViewport(int width, int height);

        /**
         * @brief Enable/disable grid rendering
         * @param enabled Grid visibility state
         */
        void setGridEnabled(bool enabled);

        /**
         * @brief Get grid enabled state
         * @return true if grid is enabled
         */
        bool isGridEnabled() const { return m_gridEnabled; }

        /**
         * @brief Get OpenCascade renderer
         * @return Pointer to OpenCascade renderer
         */
        OpenCascadeRenderer* occRenderer() const { return m_occRenderer.get(); }

        /**
         * @brief Get overlay renderer
         * @return Pointer to overlay renderer
         */
        OpenGLOverlayRenderer* overlayRenderer() const { return m_overlayRenderer.get(); }

        /**
         * @brief Get grid renderer
         * @return Pointer to grid renderer
         */
        GridRenderer* gridRenderer() const { return m_gridRenderer.get(); }

        /**
         * @brief Request render update
         * @param priority Update priority
         */
        void requestUpdate(UpdateManager::Priority priority = UpdateManager::Priority::Normal);

    signals:
        /**
         * @brief Emitted when rendering is complete
         */
        void renderComplete();

        /**
         * @brief Emitted when viewport changes
         * @param width New width
         * @param height New height
         */
        void viewportResized(int width, int height);

        /**
         * @brief Emitted when grid visibility changes
         * @param enabled New visibility state
         */
        void gridVisibilityChanged(bool enabled);

    private slots:
        /**
         * @brief Perform actual rendering
         */
        void performRender();

        /**
         * @brief Update grid visibility
         * @param enabled New visibility state
         */
        void updateGridVisibility(bool enabled);
        
        /**
         * @brief Emit signal when grid visibility changes
         * @param enabled New visibility state
         */
        void onGridVisibilityChanged(bool enabled);

        /**
         * @brief Handle changes to grid visibility
         * @param enabled New visibility state
         */
        void handleGridVisibilityChanged(bool enabled);
                            
        
    private:
        // Rendering subsystems
        std::unique_ptr<OpenCascadeRenderer> m_occRenderer;
        std::unique_ptr<OpenGLOverlayRenderer> m_overlayRenderer;
        std::unique_ptr<GridRenderer> m_gridRenderer;

        // Update management
        std::unique_ptr<UpdateManager> m_updateManager;

        // State
        bool m_initialized;
        bool m_gridEnabled;
        int m_viewportWidth;
        int m_viewportHeight;
    };

    /**
     * @brief Handles OpenCascade 3D rendering
     */
    class OpenCascadeRenderer {
    public:
        OpenCascadeRenderer();
        ~OpenCascadeRenderer();

        bool initialize(QWidget* glWidget);
        void render();
        void resize(int width, int height);

        // Getters for viewer components
        Handle(AIS_InteractiveContext) context() const { return m_context; }
        Handle(V3d_View) view() const { return m_view; }
        Handle(V3d_Viewer) viewer() const { return m_viewer; }

    private:
        Handle(OpenGl_GraphicDriver) m_graphicDriver;
        Handle(V3d_Viewer) m_viewer;
        Handle(V3d_View) m_view;
        Handle(AIS_InteractiveContext) m_context;
        Handle(Aspect_Window) m_window;
    };

    /**
     * @brief Handles OpenGL overlay rendering
     */
    class OpenGLOverlayRenderer {
    public:
        OpenGLOverlayRenderer();
        ~OpenGLOverlayRenderer();

        bool initialize();
        void render(int width, int height);
        void cleanup();

        void setOverlayEnabled(bool enabled) { m_enabled = enabled; }
        bool isOverlayEnabled() const { return m_enabled; }

    private:
        bool m_initialized;
        bool m_enabled;
    };

    /**
     * @brief Specialized grid renderer
     */
    class GridRenderer {
    public:
        GridRenderer();
        ~GridRenderer();

        bool initialize();
        void render(int width, int height, const Handle(V3d_View)& view);
        void cleanup();

        void setGridConfig(const GridConfig& config);
        const GridConfig& getGridConfig() const { return m_config; }

        void setEnabled(bool enabled) { m_enabled = enabled; }
        bool isEnabled() const { return m_enabled; }

    private:
        GridConfig m_config;
        bool m_initialized;
        bool m_enabled;
        std::unique_ptr<TyrexGridOverlayRenderer> m_gridImpl;
    };

} // namespace TyrexCAD

#endif // TYREX_RENDERING_MANAGER_H