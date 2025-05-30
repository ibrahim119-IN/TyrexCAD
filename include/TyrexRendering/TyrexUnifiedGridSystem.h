/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_UNIFIED_GRID_SYSTEM_H
#define TYREX_UNIFIED_GRID_SYSTEM_H

#include <QObject>
#include <memory>
#include <chrono>
#include "TyrexCanvas/TyrexGridConfig.h"
#include "TyrexCore/UpdateManager.h"
#include <gp_Pnt2d.hxx>

 // Forward declarations
class QPoint;

namespace TyrexCAD {

    // Forward declarations
    class TyrexCanvasOverlay;
    class TyrexGridOverlayRenderer;
    class TyrexViewerManager;

    /**
     * @brief Unified grid system coordinator
     *
     * This class coordinates between TyrexCanvasOverlay (geometry computation)
     * and TyrexGridOverlayRenderer (OpenGL rendering) to provide a unified,
     * high-performance grid system.
     *
     * Architecture:
     * - TyrexCanvasOverlay: Computes grid geometry based on view state
     * - TyrexGridOverlayRenderer: Renders geometry using OpenGL
     * - TyrexUnifiedGridSystem: Coordinates and manages the overall system
     */
    class TyrexUnifiedGridSystem : public QObject {
        Q_OBJECT

    public:
        /**
         * @brief Constructor
         * @param parent Parent QObject
         */
        explicit TyrexUnifiedGridSystem(QObject* parent = nullptr);

        /**
         * @brief Destructor
         */
        ~TyrexUnifiedGridSystem();

        /**
         * @brief Initialize the unified grid system
         * @param viewerManager Viewer manager for view access
         * @param gridLayerId Z-layer ID for grid rendering (optional)
         * @return True if initialization successful
         */
        bool initialize(std::shared_ptr<TyrexViewerManager> viewerManager,
            int gridLayerId = -1);

        /**
         * @brief Render the grid
         * @param viewportWidth Viewport width in pixels
         * @param viewportHeight Viewport height in pixels
         * @param cursorPos Current cursor position (optional)
         */
        void render(int viewportWidth, int viewportHeight,
            const QPoint& cursorPos = QPoint(-1, -1));

        /**
         * @brief Update grid state (batched)
         */
        void update();

        /**
         * @brief Force immediate complete redraw
         */
        void forceRedraw();

        /**
         * @brief Set grid visibility
         * @param visible True to show grid
         */
        void setGridVisible(bool visible);

        /**
         * @brief Check if grid is visible
         * @return True if grid is shown
         */
        bool isGridVisible() const;

        /**
         * @brief Set grid configuration
         * @param config New grid settings
         */
        void setGridConfig(const GridConfig& config);

        /**
         * @brief Get current grid configuration
         * @return Current grid settings
         */
        const GridConfig& getGridConfig() const;

        /**
         * @brief Set grid style
         * @param style New grid style
         */
        void setGridStyle(GridStyle style);

        /**
         * @brief Get current grid style
         * @return Current grid style
         */
        GridStyle getGridStyle() const;

        /**
         * @brief Set grid spacing
         * @param spacing New grid spacing
         */
        void setGridSpacing(double spacing);

        /**
         * @brief Get current effective grid spacing
         * @return Current grid spacing
         */
        double getCurrentGridSpacing() const;

        /**
         * @brief Set snap enabled state
         * @param enabled True to enable snap
         */
        void setSnapEnabled(bool enabled);

        /**
         * @brief Check if snap is enabled
         * @return True if snap is enabled
         */
        bool isSnapEnabled() const;

        /**
         * @brief Convert screen coordinates to world coordinates
         * @param screenPos Screen position
         * @return World coordinates as 2D point
         */
        gp_Pnt2d screenToWorld(const QPoint& screenPos) const;

        /**
         * @brief Snap point to grid
         * @param point Input point
         * @return Snapped point
         */
        gp_Pnt2d snapToGrid(const gp_Pnt2d& point) const;

        /**
         * @brief Get canvas overlay component
         * @return Pointer to canvas overlay
         */
        TyrexCanvasOverlay* overlay() const;

        /**
         * @brief Get grid renderer component
         * @return Pointer to grid renderer
         */
        TyrexGridOverlayRenderer* renderer() const;

        /**
         * @brief Debug grid state
         */
        void debugState() const;

    signals:
        /**
         * @brief Emitted when grid spacing changes
         * @param spacing New grid spacing
         */
        void gridSpacingChanged(double spacing);

        /**
         * @brief Emitted when grid configuration changes
         */
        void gridConfigChanged();

        /**
         * @brief Emitted when grid visibility changes
         * @param visible New visibility state
         */
        void gridVisibilityChanged(bool visible);

    private slots:
        /**
         * @brief Perform actual update (called by UpdateManager)
         */
        void performUpdate();

    private:
        /**
         * @brief Connect internal signals
         */
        void connectSignals();

        /**
         * @brief Handle overlay configuration changes
         */
        void onOverlayConfigChanged();

        /**
         * @brief Handle spacing changes
         * @param spacing New spacing value
         */
        void onSpacingChanged(double spacing);

    private:
        // Core components
        std::unique_ptr<TyrexCanvasOverlay> m_overlay;
        std::unique_ptr<TyrexGridOverlayRenderer> m_renderer;
        std::unique_ptr<UpdateManager> m_updateManager;

        // State
        GridConfig m_config;
        bool m_isActive;
        bool m_initialized;
        bool m_pendingUpdate;

        // References
        std::shared_ptr<TyrexViewerManager> m_viewerManager;
        int m_gridLayerId;
    };

} // namespace TyrexCAD

#endif // TYREX_UNIFIED_GRID_SYSTEM_H