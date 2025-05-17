/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#pragma once

#include <string>

namespace Tyrex {
    namespace Interaction {

        /**
         * @brief Abstract interface for selection filtering in TyrexCAD
         *
         * This interface defines methods to control what entities can be selected
         * in the TyrexCAD system based on various filtering criteria.
         */
        class TyrexSelectionFilter {
        public:
            /**
             * @brief Virtual destructor
             */
            virtual ~TyrexSelectionFilter();

            /**
             * @brief Check if the entity can be selected
             *
             * @param entityId ID of the entity to check
             * @param subElementName Optional subelement name
             * @return True if selection is allowed
             */
            virtual bool allowSelection(const std::string& entityId,
                const std::string& subElementName = "") const = 0;

            /**
             * @brief Get reason why selection is not allowed
             *
             * @return Explanation string or empty if selection is allowed
             */
            virtual std::string getNotAllowedReason() const;
        };

    } // namespace Interaction
} // namespace Tyrex