/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexInteraction/TyrexSelectionObject.h"

namespace Tyrex {
    namespace Interaction {

        TyrexSelectionObject::TyrexSelectionObject(const std::string& entityId,
            const std::string& subElementName,
            const gp_Pnt& clickPosition)
            : m_entityId(entityId)
            , m_subElementName(subElementName)
            , m_clickPosition(clickPosition)
        {
        }

        const std::string& TyrexSelectionObject::getEntityId() const
        {
            return m_entityId;
        }

        const std::string& TyrexSelectionObject::getSubElementName() const
        {
            return m_subElementName;
        }

        bool TyrexSelectionObject::hasSubElement() const
        {
            return !m_subElementName.empty();
        }

        const gp_Pnt& TyrexSelectionObject::getClickPosition() const
        {
            return m_clickPosition;
        }

        void TyrexSelectionObject::setClickPosition(const gp_Pnt& position)
        {
            m_clickPosition = position;
        }

        bool TyrexSelectionObject::operator==(const TyrexSelectionObject& other) const
        {
            // Intentionally not comparing click position for selection identity
            // This allows matching selections regardless of where the entity was clicked
            return m_entityId == other.m_entityId && m_subElementName == other.m_subElementName;
        }

        bool TyrexSelectionObject::equalsExact(const TyrexSelectionObject& other) const
        {
            if (m_entityId != other.m_entityId || m_subElementName != other.m_subElementName) {
                return false;
            }

            // Compare click positions within a small tolerance
            const double tolerance = 1.0e-6;
            return m_clickPosition.Distance(other.m_clickPosition) < tolerance;
        }

    } // namespace Interaction
} // namespace Tyrex