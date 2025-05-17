/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexInteraction/TyrexTypeBasedFilter.h"
#include "TyrexCore/TyrexEntityManager.h"

namespace Tyrex {
    namespace Interaction {

        TyrexTypeBasedFilter::TyrexTypeBasedFilter(const std::unordered_set<std::string>& allowedTypes)
            : m_allowedTypes(allowedTypes)
        {
        }

        TyrexTypeBasedFilter::~TyrexTypeBasedFilter()
        {
            // Virtual destructor implementation
        }

        bool TyrexTypeBasedFilter::allowSelection(const std::string& entityId,
            const std::string& /*subElementName*/) const
        {
            // Get entity type through TyrexCAD's entity manager
            auto& entityManager = Tyrex::Core::TyrexEntityManager::getInstance();

            if (!entityManager.hasEntity(entityId)) {
                m_lastRejectionReason = "Entity not found";
                return false;
            }

            std::string entityType = entityManager.getEntityType(entityId);

            // If no types specified, allow all types
            if (m_allowedTypes.empty()) {
                return true;
            }

            // Check if type is in allowed set
            if (m_allowedTypes.find(entityType) != m_allowedTypes.end()) {
                return true;
            }

            // Not allowed, set rejection reason
            m_lastRejectionReason = "Entity type '" + entityType + "' is not in the allowed types list";
            return false;
        }

        std::string TyrexTypeBasedFilter::getNotAllowedReason() const
        {
            return m_lastRejectionReason;
        }

        void TyrexTypeBasedFilter::setAllowedTypes(const std::unordered_set<std::string>& types)
        {
            m_allowedTypes = types;
        }

        std::unordered_set<std::string> TyrexTypeBasedFilter::getAllowedTypes() const
        {
            return m_allowedTypes;
        }

    } // namespace Interaction
} // namespace Tyrex