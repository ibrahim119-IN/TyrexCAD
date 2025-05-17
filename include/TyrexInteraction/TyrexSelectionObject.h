/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#pragma once

#include <string>
#include <gp_Pnt.hxx> // OpenCascade point type

namespace Tyrex {
    namespace Interaction {

        /**
         * @brief Represents a selected entity in the TyrexCAD system
         *
         * The TyrexSelectionObject stores information about a selected entity,
         * including its unique ID, optional subelement name, and the 3D position
         * where the selection occurred.
         */
        class TyrexSelectionObject {
        public:
            /**
             * @brief Construct a selection object
             *
             * @param entityId The unique identifier of the selected entity
             * @param subElementName Optional name of the selected subelement (face, edge, etc.)
             * @param clickPosition The 3D coordinates where the selection occurred
             */
            TyrexSelectionObject(const std::string& entityId,
                const std::string& subElementName = "",
                const gp_Pnt& clickPosition = gp_Pnt(0, 0, 0));

            /**
             * @brief Get the entity ID
             * @return The entity's unique identifier
             */
            const std::string& getEntityId() const;

            /**
             * @brief Get the subelement name
             * @return The subelement name
             */
            const std::string& getSubElementName() const;

            /**
             * @brief Check if this selection includes a subelement
             * @return True if a subelement is selected
             */
            bool hasSubElement() const;

            /**
             * @brief Get the 3D position where selection occurred
             * @return The selection point
             */
            const gp_Pnt& getClickPosition() const;

            /**
             * @brief Set the 3D position where selection occurred
             * @param position The new selection point
             */
            void setClickPosition(const gp_Pnt& position);

            /**
             * @brief Equality comparison operator
             *
             * Compares entity ID and subElement for equality.
             * Note: Click position is NOT considered for equality to allow
             * for selection matching regardless of where the entity was clicked.
             *
             * @param other Another selection object to compare with
             * @return True if both objects have same entity ID and subelement
             */
            bool operator==(const TyrexSelectionObject& other) const;

            /**
             * @brief Full equality comparison including click position
             *
             * Use this when you need to check if selections are identical
             * including the exact position where they were clicked.
             *
             * @param other Another selection object to compare with
             * @return True if all properties match, including click position
             */
            bool equalsExact(const TyrexSelectionObject& other) const;

        private:
            std::string m_entityId;
            std::string m_subElementName;
            gp_Pnt m_clickPosition;
        };

    } // namespace Interaction
} // namespace Tyrex