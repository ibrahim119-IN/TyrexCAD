#include "TyrexLayers/TyrexLayerManager.h"
#include <Standard_Failure.hxx>
#include <QDebug>
#include <V3d_Viewer.hxx>
#include <Graphic3d_ZLayerSettings.hxx>
#include <map>
#include <vector>
#include <string>

namespace TyrexCAD {

    TyrexLayerManager::TyrexLayerManager(QObject* parent)
        : QObject(parent)
        , m_initialized(false)
    {
        // Initialize visibility states
        for (auto layerId : getAllLayers()) {
            m_layerVisibility[layerId] = true;
        }
    }

    TyrexLayerManager::~TyrexLayerManager() = default;

    bool TyrexLayerManager::setupLayers(const Handle(V3d_Viewer)& viewer)
    {
        if (viewer.IsNull()) {
            qCritical() << "Cannot setup layers - viewer is null";
            return false;
        }

        m_viewer = viewer;

        try {
            // Create all predefined layers
            for (auto layerId : getAllLayers()) {
                int actualId = static_cast<int>(layerId);

                // Add Z-layer to viewer
                m_viewer->AddZLayer(actualId);
                m_layerIdMap[layerId] = actualId;

                // Configure layer settings
                Graphic3d_ZLayerSettings settings;
                configureLayer(layerId, settings);
                m_viewer->SetZLayerSettings(actualId, settings);

                qDebug() << "Created layer" << actualId << "with settings";
            }

            m_initialized = true;
            qDebug() << "Layer manager initialized with" << m_layerIdMap.size() << "layers";
            return true;

        }
        catch (const Standard_Failure& e) {
            qCritical() << "Failed to setup layers:" << e.GetMessageString();
            return false;
        }
    }

    int TyrexLayerManager::getLayerId(LayerId layerId) const
    {
        auto it = m_layerIdMap.find(layerId);
        return (it != m_layerIdMap.end()) ? it->second : 0;
    }

    int TyrexLayerManager::addCustomLayer(const std::string& name, int zOrder, const LayerConfig& config)
    {
        if (m_viewer.IsNull()) {
            return -1;
        }

        try {
            // Add the layer
            m_viewer->AddZLayer(zOrder);

            // Configure settings
            Graphic3d_ZLayerSettings settings;
            settings.SetEnableDepthTest(config.enableDepthTest);
            settings.SetEnableDepthWrite(config.enableDepthWrite);

            // Note: Polygon offset functionality removed for OpenCascade 7.9.0 compatibility
            // TODO: Find alternative approach for polygon offset if needed

            m_viewer->SetZLayerSettings(zOrder, settings);

            // Store configuration
            m_customLayers[zOrder] = config;

            emit layerAdded(zOrder);
            return zOrder;

        }
        catch (const Standard_Failure& e) {
            qCritical() << "Failed to add custom layer:" << e.GetMessageString();
            return -1;
        }
    }

    bool TyrexLayerManager::removeCustomLayer(int layerId)
    {
        if (m_viewer.IsNull()) {
            return false;
        }

        auto it = m_customLayers.find(layerId);
        if (it == m_customLayers.end()) {
            return false; // Not a custom layer
        }

        try {
            m_viewer->RemoveZLayer(layerId);
            m_customLayers.erase(it);
            emit layerRemoved(layerId);
            return true;

        }
        catch (const Standard_Failure& e) {
            qCritical() << "Failed to remove layer:" << e.GetMessageString();
            return false;
        }
    }

    void TyrexLayerManager::setLayerVisible(LayerId layerId, bool visible)
    {
        if (m_layerVisibility[layerId] != visible) {
            m_layerVisibility[layerId] = visible;
            emit layerVisibilityChanged(layerId, visible);

            // TODO: Implement actual visibility control
            // This would require iterating through objects in the layer
        }
    }

    bool TyrexLayerManager::isLayerVisible(LayerId layerId) const
    {
        auto it = m_layerVisibility.find(layerId);
        return (it != m_layerVisibility.end()) ? it->second : true;
    }

    void TyrexLayerManager::updateLayerConfig(LayerId layerId, const LayerConfig& config)
    {
        int actualId = getLayerId(layerId);
        if (actualId == 0 || m_viewer.IsNull()) {
            return;
        }

        try {
            Graphic3d_ZLayerSettings settings;
            settings.SetEnableDepthTest(config.enableDepthTest);
            settings.SetEnableDepthWrite(config.enableDepthWrite);

            // Note: Polygon offset functionality removed for OpenCascade 7.9.0 compatibility

            m_viewer->SetZLayerSettings(actualId, settings);

        }
        catch (const Standard_Failure& e) {
            qCritical() << "Failed to update layer config:" << e.GetMessageString();
        }
    }

    TyrexLayerManager::LayerId TyrexLayerManager::getLayerForObjectType(const std::string& objectType) const
    {
        // Map object types to appropriate layers
        if (objectType == "grid_major" || objectType == "grid_minor") {
            return objectType == "grid_major" ? GRID_MAJOR : GRID_MINOR;
        }
        else if (objectType == "sketch" || objectType == "sketch_entity") {
            return SKETCH_GEOMETRY;
        }
        else if (objectType == "dimension" || objectType == "measurement") {
            return DIMENSIONS;
        }
        else if (objectType == "annotation" || objectType == "text") {
            return ANNOTATIONS;
        }
        else if (objectType == "construction" || objectType == "guide") {
            return CONSTRUCTION;
        }
        else if (objectType == "preview" || objectType == "temporary") {
            return OVERLAY;
        }
        else if (objectType == "snap" || objectType == "indicator") {
            return SNAP_INDICATORS;
        }
        else {
            return MAIN_GEOMETRY; // Default
        }
    }

    void TyrexLayerManager::clearLayer(LayerId layerId)
    {
        // TODO: Implement clearing all objects from a specific layer
        // This would require access to the AIS context and iterating through objects
        qDebug() << "Clear layer" << static_cast<int>(layerId) << "(not implemented)";
    }

    void TyrexLayerManager::configureLayer(LayerId layerId, Graphic3d_ZLayerSettings& settings)
    {
        LayerConfig config = getDefaultConfig(layerId);

        settings.SetEnableDepthTest(config.enableDepthTest);
        settings.SetEnableDepthWrite(config.enableDepthWrite);

        // Note: Polygon offset functionality removed for OpenCascade 7.9.0 compatibility
    }

    std::vector<TyrexLayerManager::LayerId> TyrexLayerManager::getAllLayers() const
    {
        return {
            BACKGROUND,
            GRID_MAJOR,
            GRID_MINOR,
            CONSTRUCTION,
            MAIN_GEOMETRY,
            SKETCH_GEOMETRY,
            DIMENSIONS,
            ANNOTATIONS,
            OVERLAY,
            UI_ELEMENTS,
            SNAP_INDICATORS
        };
    }

    TyrexLayerManager::LayerConfig TyrexLayerManager::getDefaultConfig(LayerId layerId) const
    {
        LayerConfig config;

        switch (layerId) {
        case BACKGROUND:
            config.enableDepthTest = false;
            config.enableDepthWrite = false;
            config.renderingPriority = -1000;
            break;

        case GRID_MAJOR:
        case GRID_MINOR:
            config.enableDepthTest = false;
            config.enableDepthWrite = false;
            config.isImmediate = true;
            config.renderingPriority = -100;
            break;

        case CONSTRUCTION:
            config.enableDepthTest = true;
            config.enableDepthWrite = false;
            config.renderingPriority = -50;
            break;

        case MAIN_GEOMETRY:
        case SKETCH_GEOMETRY:
            config.enableDepthTest = true;
            config.enableDepthWrite = true;
            config.renderingPriority = 0;
            break;

        case DIMENSIONS:
        case ANNOTATIONS:
            config.enableDepthTest = false;
            config.enableDepthWrite = false;
            config.enablePolygonOffset = true;
            config.renderingPriority = 100;
            break;

        case OVERLAY:
        case UI_ELEMENTS:
        case SNAP_INDICATORS:
            config.enableDepthTest = false;
            config.enableDepthWrite = false;
            config.isImmediate = true;
            config.renderingPriority = 200;
            break;
        }

        return config;
    }

} // namespace TyrexCAD