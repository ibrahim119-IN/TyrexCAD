/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexInteraction/TyrexSelectionManager.h"
#include "TyrexInteraction/TyrexSelectionFilter.h"
#include "TyrexEntities/TyrexEntity.h"

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>

namespace Tyrex {
    namespace Interaction {

        TyrexSelectionManager::TyrexSelectionManager()
            : m_preselection("", "")
        {
        }

        TyrexSelectionManager::~TyrexSelectionManager() = default;

        bool TyrexSelectionManager::addSelection(const std::string& entityId,
            const std::string& subElementName,
            const gp_Pnt* clickPosition,
            bool clearPreselection)
        {
            // Check selection filter if set
            if (!checkSelectionFilter(entityId, subElementName)) {
                return false;
            }

            // Create a selection object
            gp_Pnt position = clickPosition ? *clickPosition : gp_Pnt(0, 0, 0);
            TyrexSelectionObject selObj(entityId, subElementName, position);

            // Check if already selected
            if (isSelected(entityId, subElementName)) {
                return true; // Already selected
            }

            // Add to selection list
            m_selectionList.push_back(selObj);

            // Update selection map
            size_t index = m_selectionList.size() - 1;
            m_selectionMap[entityId].push_back(index);

            // Clear preselection if requested
            if (clearPreselection) {
                this->clearPreselection();
            }

            // Notify observers
            SelectionEvent event{ SelectionEventType::Add, selObj, true };
            notifyObservers(event);

            return true;
        }

        bool TyrexSelectionManager::addSelection(const TyrexCAD::TyrexEntity* entity,
            const std::string& subElementName,
            const gp_Pnt* clickPosition,
            bool clearPreselection)
        {
            if (!entity) {
                return false;
            }

            return addSelection(entity->getId(), subElementName, clickPosition, clearPreselection);
        }

        bool TyrexSelectionManager::addSelections(const std::string& entityId,
            const std::vector<std::string>& subElementNames)
        {
            bool success = true;

            for (const auto& subName : subElementNames) {
                success &= addSelection(entityId, subName, nullptr, false);
            }

            return success;
        }

        bool TyrexSelectionManager::removeSelection(const std::string& entityId,
            const std::string& subElementName)
        {
            // Check if the entity is in the selection map
            auto mapIt = m_selectionMap.find(entityId);
            if (mapIt == m_selectionMap.end()) {
                return false;
            }

            bool removed = false;
            auto& indices = mapIt->second;

            // If we need to remove specific subelement
            if (!subElementName.empty()) {
                // Find and remove matching selections
                for (auto it = indices.begin(); it != indices.end();) {
                    size_t index = *it;
                    if (index < m_selectionList.size() &&
                        m_selectionList[index].getSubElementName() == subElementName)
                    {
                        SelectionEvent event{ SelectionEventType::Remove, m_selectionList[index], true };

                        // Replace with the last element in the list
                        if (index < m_selectionList.size() - 1) {
                            m_selectionList[index] = m_selectionList.back();

                            // Update the index in the map for the moved element
                            const std::string& movedId = m_selectionList[index].getEntityId();
                            auto movedIt = m_selectionMap.find(movedId);
                            if (movedIt != m_selectionMap.end()) {
                                for (auto& movedIndex : movedIt->second) {
                                    if (movedIndex == m_selectionList.size() - 1) {
                                        movedIndex = index;
                                        break;
                                    }
                                }
                            }
                        }

                        // Remove the last element
                        m_selectionList.pop_back();

                        // Remove the index from indices
                        it = indices.erase(it);
                        removed = true;

                        // Notify observers
                        notifyObservers(event);
                    }
                    else {
                        ++it;
                    }
                }
            }
            else {
                // Remove all selections for this entity
                for (size_t index : indices) {
                    if (index < m_selectionList.size()) {
                        SelectionEvent event{ SelectionEventType::Remove, m_selectionList[index], true };

                        // Notify observers
                        notifyObservers(event);
                    }
                }

                // Remove all indices
                m_selectionMap.erase(mapIt);
                removed = !indices.empty();

                // Remove all corresponding entries from the selection list
                // This is a more complex operation that requires rebuilding the list
                auto newEnd = std::remove_if(m_selectionList.begin(), m_selectionList.end(),
                    [&entityId](const TyrexSelectionObject& obj) {
                        return obj.getEntityId() == entityId;
                    });
                m_selectionList.erase(newEnd, m_selectionList.end());

                // Rebuild the selection map
                m_selectionMap.clear();
                for (size_t i = 0; i < m_selectionList.size(); ++i) {
                    const std::string& id = m_selectionList[i].getEntityId();
                    m_selectionMap[id].push_back(i);
                }
            }

            return removed;
        }

        void TyrexSelectionManager::clearSelection(bool clearPreselection)
        {
            if (m_selectionList.empty() && (!clearPreselection || !m_hasPreselection)) {
                return; // Nothing to clear
            }

            // Clear selection
            if (!m_selectionList.empty()) {
                m_selectionList.clear();
                m_selectionMap.clear();

                // Notify observers
                SelectionEvent event{ SelectionEventType::Clear, TyrexSelectionObject(""), false };
                notifyObservers(event);
            }

            // Clear preselection if requested
            if (clearPreselection) {
                this->clearPreselection();
            }
        }

        bool TyrexSelectionManager::isSelected(const std::string& entityId,
            const std::string& subElementName) const
        {
            auto mapIt = m_selectionMap.find(entityId);
            if (mapIt == m_selectionMap.end()) {
                return false;
            }

            // If no subelement specified, entity is selected
            if (subElementName.empty()) {
                return true;
            }

            // Check if the specific subelement is selected
            for (size_t index : mapIt->second) {
                if (index < m_selectionList.size() &&
                    m_selectionList[index].getSubElementName() == subElementName) {
                    return true;
                }
            }

            return false;
        }

        bool TyrexSelectionManager::hasSubSelection(const std::string& entityId) const
        {
            auto mapIt = m_selectionMap.find(entityId);
            if (mapIt == m_selectionMap.end()) {
                return false;
            }

            // Check if any selection for this entity has a subelement
            for (size_t index : mapIt->second) {
                if (index < m_selectionList.size() &&
                    m_selectionList[index].hasSubElement()) {
                    return true;
                }
            }

            return false;
        }

        std::vector<TyrexSelectionObject> TyrexSelectionManager::getSelectionList() const
        {
            return m_selectionList;
        }

        size_t TyrexSelectionManager::getSelectionCount() const
        {
            return m_selectionList.size();
        }

        bool TyrexSelectionManager::hasSelection() const
        {
            return !m_selectionList.empty();
        }

        bool TyrexSelectionManager::setPreselection(const std::string& entityId,
            const std::string& subElementName,
            const gp_Pnt* position)
        {
            // Check selection filter
            if (!checkSelectionFilter(entityId, subElementName)) {
                return false;
            }

            // Create preselection object
            gp_Pnt pos = position ? *position : gp_Pnt(0, 0, 0);
            TyrexSelectionObject preselObj(entityId, subElementName, pos);

            // Check if same as current preselection
            if (m_hasPreselection && m_preselection == preselObj) {
                // Just update position if needed
                if (position) {
                    m_preselection.setClickPosition(pos);
                }
                return true;
            }

            // Clear current preselection first
            clearPreselection();

            // Set new preselection
            m_preselection = preselObj;
            m_hasPreselection = true;

            // Notify observers
            SelectionEvent event{ SelectionEventType::Preselect, m_preselection, true };
            notifyObservers(event);

            return true;
        }

        void TyrexSelectionManager::clearPreselection()
        {
            if (!m_hasPreselection) {
                return; // No preselection to clear
            }

            // Store preselection for notification
            TyrexSelectionObject oldPreselection = m_preselection;

            // Clear preselection
            m_hasPreselection = false;

            // Notify observers
            SelectionEvent event{ SelectionEventType::ClearPreselect, oldPreselection, true };
            notifyObservers(event);
        }

        bool TyrexSelectionManager::hasPreselection() const
        {
            return m_hasPreselection;
        }

        TyrexSelectionObject TyrexSelectionManager::getPreselection() const
        {
            return m_hasPreselection ? m_preselection : TyrexSelectionObject("", "");
        }

        uint32_t TyrexSelectionManager::addSelectionObserver(SelectionObserverCallback callback)
        {
            uint32_t id = m_nextObserverId++;
            m_observers[id] = std::move(callback);
            return id;
        }

        bool TyrexSelectionManager::removeSelectionObserver(uint32_t observerId)
        {
            return m_observers.erase(observerId) > 0;
        }

        void TyrexSelectionManager::removeSelectionObserverAll()
        {
            m_observers.clear();
        }

        void TyrexSelectionManager::setSelectionFilter(std::unique_ptr<TyrexSelectionFilter> filter)
        {
            m_selectionFilter = std::move(filter);
        }

        void TyrexSelectionManager::clearSelectionFilter()
        {
            m_selectionFilter.reset();
            m_lastRejectionReason.clear();
        }

        bool TyrexSelectionManager::hasSelectionFilter() const
        {
            return m_selectionFilter != nullptr;
        }

        std::string TyrexSelectionManager::getLastSelectionRejectionReason() const
        {
            return m_lastRejectionReason;
        }

        void TyrexSelectionManager::notifyObservers(const SelectionEvent& event)
        {
            for (const auto& pair : m_observers) {
                pair.second(event);
            }
        }

        bool TyrexSelectionManager::checkSelectionFilter(const std::string& entityId,
            const std::string& subElementName)
        {
            if (!m_selectionFilter) {
                return true; // No filter, everything is allowed
            }

            if (!m_selectionFilter->allowSelection(entityId, subElementName)) {
                m_lastRejectionReason = m_selectionFilter->getNotAllowedReason();
                return false;
            }

            return true;
        }

    } // namespace Interaction
} // namespace Tyrex