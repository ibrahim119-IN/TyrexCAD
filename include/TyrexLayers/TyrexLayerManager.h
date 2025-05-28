#ifndef TYREX_LAYER_MANAGER_H
#define TYREX_LAYER_MANAGER_H

#include <QObject>
#include <memory>
#include <map>
#include <V3d_Viewer.hxx>
#include <Graphic3d_ZLayerSettings.hxx>

namespace TyrexCAD {

    /**
     * @brief Manages Z-layers for proper rendering order
     *
     * Ensures that different types of content are rendered in the correct order
     * with appropriate depth test and transparency settings.
     */
    class TyrexLayerManager : public QObject {
        Q_OBJECT

    public:
        /**
         * @brief Predefined layer IDs with proper ordering
         */
        enum LayerId {
            BACKGROUND = -1000,      ///< Background elements
            GRID_MAJOR = -100,      ///< Major grid lines
            GRID_MINOR = -90,       ///< Minor grid lines
            CONSTRUCTION = -50,     ///< Construction geometry
            MAIN_GEOMETRY = 0,      ///< Main 3D geometry
            SKETCH_GEOMETRY = 10,   ///< 2D sketch elements
            DIMENSIONS = 50,        ///< Dimensions and annotations
            ANNOTATIONS = 100,      ///< Text annotations
            OVERLAY = 200,          ///< Temporary overlay elements
            UI_ELEMENTS = 300,      ///< UI overlay elements
            SNAP_INDICATORS = 400   ///< Snap indicators (topmost)
        };

        /**
         * @brief Layer configuration structure
         */
        struct LayerConfig {
            bool enableDepthTest = true;
            bool enableDepthWrite = true;
            bool enablePolygonOffset = false;
            float polygonOffsetFactor = 1.0f;
            float polygonOffsetUnits = 1.0f;
            bool isImmediate = false;
            int renderingPriority = 0;
        };

        /**
         * @brief Constructor
         * @param parent Parent QObject
         */
        explicit TyrexLayerManager(QObject* parent = nullptr);

        /**
         * @brief Destructor
         */
        ~TyrexLayerManager();

        /**
         * @brief Setup all layers in the viewer
         * @param viewer OpenCascade viewer
         * @return True if setup successful
         */
        bool setupLayers(const Handle(V3d_Viewer)& viewer);

        /**
         * @brief Get layer ID by enum
         * @param layerId Layer enum value
         * @return Z-layer ID for OpenCascade
         */
        int getLayerId(LayerId layerId) const;

        /**
         * @brief Add custom layer
         * @param name Layer name
         * @param zOrder Z-order value
         * @param config Layer configuration
         * @return Layer ID or -1 if failed
         */
        int addCustomLayer(const std::string& name, int zOrder, const LayerConfig& config);

        /**
         * @brief Remove custom layer
         * @param layerId Layer ID to remove
         * @return True if removed successfully
         */
        bool removeCustomLayer(int layerId);

        /**
         * @brief Set layer visibility
         * @param layerId Layer ID
         * @param visible Visibility state
         */
        void setLayerVisible(LayerId layerId, bool visible);

        /**
         * @brief Check if layer is visible
         * @param layerId Layer ID
         * @return True if visible
         */
        bool isLayerVisible(LayerId layerId) const;

        /**
         * @brief Update layer settings
         * @param layerId Layer ID
         * @param config New configuration
         */
        void updateLayerConfig(LayerId layerId, const LayerConfig& config);

        /**
         * @brief Get appropriate layer for object type
         * @param objectType Type name of object
         * @return Recommended layer ID
         */
        LayerId getLayerForObjectType(const std::string& objectType) const;

        /**
         * @brief Clear all objects from a layer
         * @param layerId Layer to clear
         */
        void clearLayer(LayerId layerId);

    signals:
        /**
         * @brief Emitted when layer visibility changes
         * @param layerId Changed layer
         * @param visible New visibility state
         */
        void layerVisibilityChanged(LayerId layerId, bool visible);

        /**
         * @brief Emitted when layer is added
         * @param layerId New layer ID
         */
        void layerAdded(int layerId);

        /**
         * @brief Emitted when layer is removed
         * @param layerId Removed layer ID
         */
        void layerRemoved(int layerId);

    private:
        /**
         * @brief Configure layer settings
         * @param layerId Layer ID enum
         * @param settings Settings to configure
         */
        void configureLayer(LayerId layerId, Graphic3d_ZLayerSettings& settings);

        /**
         * @brief Get all predefined layers
         * @return List of all layer IDs
         */
        std::vector<LayerId> getAllLayers() const;

        /**
         * @brief Create default configuration for layer type
         * @param layerId Layer ID
         * @return Default configuration
         */
        LayerConfig getDefaultConfig(LayerId layerId) const;

    private:
        Handle(V3d_Viewer) m_viewer;
        std::map<LayerId, int> m_layerIdMap;        ///< Maps enum to actual layer ID
        std::map<LayerId, bool> m_layerVisibility;  ///< Layer visibility states
        std::map<int, LayerConfig> m_customLayers;  ///< Custom layer configurations
        bool m_initialized;
    };

} // namespace TyrexCAD

#endif // TYREX_LAYER_MANAGER_H