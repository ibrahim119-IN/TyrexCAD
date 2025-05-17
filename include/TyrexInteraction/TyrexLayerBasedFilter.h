/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#pragma once

#include "TyrexInteraction/TyrexSelectionFilter.h"
#include <string>
#include <unordered_set>
#include <unordered_map>

namespace Tyrex {
    namespace Interaction {

        /**
         * @brief Selection filter based on entity layers
         *
         * This filter allows selection of entities based on the layer they belong to.
         * Only entities on layers included in the allowed layers set can be selected.
         */
        class TyrexLayerBasedFilter : public TyrexSelectionFilter {
        public:
            /**
             * @brief Constructor with optional initial allowed layers
             *
             * @param allowedLayers Set of allowed layer names
             * @param includeLockedLayers Whether to allow selection on locked layers
             */
            explicit TyrexLayerBasedFilter(const std::unordered_set<std::string>& allowedLayers = {},
                bool includeLockedLayers = false);

            /**
             * @brief Check if the entity's layer is allowed for selection
             *
             * @param entityId ID of the entity to check
             * @param subElementName Optional subelement name (not used in this filter)
             * @return True if entity's layer is in the allowed set or if allowed set is empty
             */
            bool allowSelection(const std::string& entityId,
                const std::string& subElementName = "") const override;

            /**
             * @brief Get reason why selection is not allowed
             *
             * @return Explanation string with the rejected layer name or lock status
             */
            std::string getNotAllowedReason() const override;

            /**
             * @brief Set the allowed layer names
             *
             * @param layers Set of allowed layer names
             */
            void setAllowedLayers(const std::unordered_set<std::string>& layers);

            /**
             * @brief Get the current set of allowed layer names
             *
             * @return Set of allowed layer names
             */
            std::unordered_set<std::string> getAllowedLayers() const;

            /**
             * @brief Set whether locked layers should be allowed
             *
             * @param include True to include locked layers in selection
             */
            void setIncludeLockedLayers(bool include);

            /**
             * @brief Check if locked layers are allowed for selection
             *
             * @return True if locked layers are allowed
             */
            bool getIncludeLockedLayers() const;

            /**
             * @brief Set lock status for a layer
             *
             * @param layerName Name of the layer
             * @param locked Lock status to set
             */
            void setLayerLockStatus(const std::string& layerName, bool locked);

            /**
             * @brief Check if a layer is locked
             *
             * @param layerName Name of the layer to check
             * @return True if the layer is locked, false otherwise or if not found
             */
            bool isLayerLocked(const std::string& layerName) const;

        private:
            /// Set of allowed layer names
            std::unordered_set<std::string> m_allowedLayers;

            /// Whether to allow selection on locked layers
            bool m_includeLockedLayers;

            /// Map of layer lock status
            mutable std::unordered_map<std::string, bool> m_layerLockStatus;

            /// Last rejection reason
            mutable std::string m_lastRejectionReason;
        };

    } // namespace Interaction
} // namespace Tyrex