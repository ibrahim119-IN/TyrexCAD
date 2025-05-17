/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexInteraction/TyrexLayerBasedFilter.h"
#include "TyrexCore/TyrexEntityManager.h"

namespace Tyrex {
    namespace Interaction {

        TyrexLayerBasedFilter::TyrexLayerBasedFilter(const std::unordered_set<std::string>& allowedLayers,
            bool includeLockedLayers)
            : m_allowedLayers(allowedLayers)
            , m_includeLockedLayers(includeLockedLayers)
        {
        }

        bool TyrexLayerBasedFilter::allowSelection(const std::string& entityId,
            const std::string& /*subElementName*/) const
        {
            // Get entity info through TyrexCAD's entity manager
            auto& entityManager = Tyrex::Core::TyrexEntityManager::getInstance();

            if (!entityManager.hasEntity(entityId)) {
                m_lastRejectionReason = "Entity not found";
                return false;
            }

            // Get the layer of the entity
            std::string layerName = entityManager.getEntityLayer(entityId);

            // Check if layer is locked and we don't allow locked layers
            if (!m_includeLockedLayers && isLayerLocked(layerName)) {
                m_lastRejectionReason = "Layer '" + layerName + "' is locked";
                return false;
            }

            // If no layers specified, allow all layers
            if (m_allowedLayers.empty()) {
                return true;
            }

            // Check if layer is in allowed set
            if (m_allowedLayers.find(layerName) != m_allowedLayers.end()) {
                return true;
            }

            // Not allowed, set rejection reason
            m_lastRejectionReason = "Layer '" + layerName + "' is not in the allowed layers list";
            return false;
        }

        std::string TyrexLayerBasedFilter::getNotAllowedReason() const
        {
            return m_lastRejectionReason;
        }

        void TyrexLayerBasedFilter::setAllowedLayers(const std::unordered_set<std::string>& layers)
        {
            m_allowedLayers = layers;
        }

        std::unordered_set<std::string> TyrexLayerBasedFilter::getAllowedLayers() const
        {
            return m_allowedLayers;
        }

        void TyrexLayerBasedFilter::setIncludeLockedLayers(bool include)
        {
            m_includeLockedLayers = include;
        }

        bool TyrexLayerBasedFilter::getIncludeLockedLayers() const
        {
            return m_includeLockedLayers;
        }

        void TyrexLayerBasedFilter::setLayerLockStatus(const std::string& layerName, bool locked)
        {
            m_layerLockStatus[layerName] = locked;
        }

        bool TyrexLayerBasedFilter::isLayerLocked(const std::string& layerName) const
        {
            auto it = m_layerLockStatus.find(layerName);
            if (it != m_layerLockStatus.end()) {
                return it->second;
            }
            return false; // Default to unlocked if not found
        }

    } // namespace Interaction
} // namespace Tyrex