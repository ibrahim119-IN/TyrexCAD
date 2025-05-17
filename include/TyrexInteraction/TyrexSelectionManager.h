/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#pragma once

#include "TyrexInteraction/TyrexSelectionObject.h"
#include <functional>
#include <vector>
#include <unordered_map>
#include <memory>
#include <string>

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <Standard_DefineHandle.hxx>
#include <gp_Pnt.hxx>

// Forward declarations for OpenCascade
class AIS_InteractiveContext;

// Forward declarations for TyrexCAD
namespace TyrexCAD {
    class TyrexEntity;
}

namespace Tyrex {
    namespace Interaction {

        // Forward declaration
        class TyrexSelectionFilter;

        /**
         * @brief Enum for selection events
         */
        enum class SelectionEventType {
            Add,          ///< An entity was added to selection
            Remove,       ///< An entity was removed from selection
            Clear,        ///< Selection was cleared
            Preselect,    ///< Entity was preselected (hovered)
            ClearPreselect ///< Preselection was cleared
        };

        /**
         * @brief Information about a selection change event
         */
        struct SelectionEvent {
            SelectionEventType type;
            TyrexSelectionObject object; // Non-optional for simplicity
            bool hasObject = false;      // Flag if object is valid
        };

        /**
         * @brief Selection observer callback type
         */
        using SelectionObserverCallback = std::function<void(const SelectionEvent&)>;

        /**
         * @brief Selection manager for TyrexCAD
         *
         * Handles selection state, filtering, and notifications
         */
        class TyrexSelectionManager {
        public:
            /**
             * @brief Constructor
             */
            TyrexSelectionManager();

            /**
             * @brief Destructor
             */
            ~TyrexSelectionManager();

            /**
             * @brief Add an entity to the selection
             *
             * @param entityId The entity ID to select
             * @param subElementName Optional subelement name
             * @param clickPosition 3D point where selection occurred
             * @param clearPreselection Whether to clear preselection
             * @return True if selection was successful
             */
            bool addSelection(const std::string& entityId,
                const std::string& subElementName = "",
                const gp_Pnt* clickPosition = nullptr,
                bool clearPreselection = true);

            /**
             * @brief Add an entity to the selection
             *
             * @param entity Pointer to entity
             * @param subElementName Optional subelement name
             * @param clickPosition 3D point where selection occurred
             * @param clearPreselection Whether to clear preselection
             * @return True if selection was successful
             */
            bool addSelection(const TyrexCAD::TyrexEntity* entity,
                const std::string& subElementName = "",
                const gp_Pnt* clickPosition = nullptr,
                bool clearPreselection = true);

            /**
             * @brief Add multiple selections in one operation
             *
             * @param entityId The entity ID
             * @param subElementNames List of subelement names
             * @return True if all selections were successful
             */
            bool addSelections(const std::string& entityId,
                const std::vector<std::string>& subElementNames);

            /**
             * @brief Remove an entity from selection
             *
             * @param entityId The entity ID to deselect
             * @param subElementName Optional subelement to deselect (if empty, deselects whole entity)
             * @return True if entity was found and removed
             */
            bool removeSelection(const std::string& entityId,
                const std::string& subElementName = "");

            /**
             * @brief Clear all selections
             *
             * @param clearPreselection Whether to also clear preselection
             */
            void clearSelection(bool clearPreselection = true);

            /**
             * @brief Check if an entity is selected
             *
             * @param entityId The entity ID to check
             * @param subElementName Optional subelement name to check
             * @return True if entity is selected
             */
            bool isSelected(const std::string& entityId,
                const std::string& subElementName = "") const;

            /**
             * @brief Check if entity has any selected subelements
             *
             * @param entityId The entity ID to check
             * @return True if entity has any selected subelement
             */
            bool hasSubSelection(const std::string& entityId) const;

            /**
             * @brief Get all selected objects
             *
             * @return Vector of selection objects
             */
            std::vector<TyrexSelectionObject> getSelectionList() const;

            /**
             * @brief Get count of selected entities (not including subelements)
             *
             * @return Number of selected entities
             */
            size_t getSelectionCount() const;

            /**
             * @brief Check if anything is selected
             *
             * @return True if selection is not empty
             */
            bool hasSelection() const;

            /**
             * @brief Set preselection (hover)
             *
             * @param entityId The entity ID to preselect
             * @param subElementName Optional subelement name
             * @param position 3D position of cursor
             * @return True if preselection was successful
             */
            bool setPreselection(const std::string& entityId,
                const std::string& subElementName = "",
                const gp_Pnt* position = nullptr);

            /**
             * @brief Clear current preselection
             */
            void clearPreselection();

            /**
             * @brief Check if there is currently a preselection
             *
             * @return True if an entity is preselected
             */
            bool hasPreselection() const;

            /**
             * @brief Get the current preselection
             *
             * @return Preselection object or empty object if none
             */
            TyrexSelectionObject getPreselection() const;

            /**
             * @brief Register an observer for selection changes
             *
             * @param callback Function to call when selection changes
             * @return Observer ID used for removal
             */
            uint32_t addSelectionObserver(SelectionObserverCallback callback);

            /**
             * @brief Remove a selection observer
             *
             * @param observerId The ID returned from addSelectionObserver
             * @return True if observer was found and removed
             */
            bool removeSelectionObserver(uint32_t observerId);

            /**
             * @brief Remove all selection observers
             *
             * This is a convenience method for quick cleanup of all observers
             * during document closing or application shutdown.
             */
            void removeSelectionObserverAll();

            /**
             * @brief Set a selection filter
             *
             * @param filter Unique pointer to filter implementation
             */
            void setSelectionFilter(std::unique_ptr<TyrexSelectionFilter> filter);

            /**
             * @brief Clear the current selection filter
             */
            void clearSelectionFilter();

            /**
             * @brief Check if a selection filter is active
             *
             * @return True if filter is set
             */
            bool hasSelectionFilter() const;

            /**
             * @brief Get reason why last selection was rejected
             *
             * @return Rejection reason from filter
             */
            std::string getLastSelectionRejectionReason() const;

        private:
            // Selection storage
            std::vector<TyrexSelectionObject> m_selectionList;

            // Maps entity IDs to indices in selection list for faster lookups
            std::unordered_map<std::string, std::vector<size_t>> m_selectionMap;

            // Current preselection
            bool m_hasPreselection = false;
            TyrexSelectionObject m_preselection;

            // Selection filter
            std::unique_ptr<TyrexSelectionFilter> m_selectionFilter;

            // Last rejection reason
            std::string m_lastRejectionReason;

            // Observer management
            uint32_t m_nextObserverId{ 1 };
            std::unordered_map<uint32_t, SelectionObserverCallback> m_observers;

            // Helper methods
            void notifyObservers(const SelectionEvent& event);
            bool checkSelectionFilter(const std::string& entityId,
                const std::string& subElementName);
        };

    } // namespace Interaction
} // namespace Tyrex