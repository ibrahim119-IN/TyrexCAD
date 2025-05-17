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

namespace Tyrex {
    namespace Interaction {

        /**
         * @brief Selection filter based on entity types
         *
         * This filter allows selection of entities based on their types.
         * Only entities of types included in the allowed types set can be selected.
         */
        class TyrexTypeBasedFilter : public TyrexSelectionFilter {
        public:
            /**
             * @brief Constructor with optional initial allowed types
             *
             * @param allowedTypes Set of allowed entity type names
             */
            explicit TyrexTypeBasedFilter(const std::unordered_set<std::string>& allowedTypes = std::unordered_set<std::string>());

            /**
             * @brief Destructor
             */
            virtual ~TyrexTypeBasedFilter() override;

            /**
             * @brief Check if the entity's type is allowed for selection
             *
             * @param entityId ID of the entity to check
             * @param subElementName Optional subelement name (not used in this filter)
             * @return True if entity's type is in the allowed set or if allowed set is empty
             */
            virtual bool allowSelection(const std::string& entityId,
                const std::string& subElementName = "") const override;

            /**
             * @brief Get reason why selection is not allowed
             *
             * @return Explanation string with the rejected entity type
             */
            virtual std::string getNotAllowedReason() const override;

            /**
             * @brief Set the allowed entity types
             *
             * @param types Set of allowed entity type names
             */
            void setAllowedTypes(const std::unordered_set<std::string>& types);

            /**
             * @brief Get the current set of allowed entity types
             *
             * @return Set of allowed entity type names
             */
            std::unordered_set<std::string> getAllowedTypes() const;

        private:
            /// Set of allowed entity type names
            std::unordered_set<std::string> m_allowedTypes;

            /// Last rejection reason
            mutable std::string m_lastRejectionReason;
        };

    } // namespace Interaction
} // namespace Tyrex