/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexInteraction/TyrexSelectionFilter.h"

namespace Tyrex {
    namespace Interaction {

        TyrexSelectionFilter::~TyrexSelectionFilter()
        {
            // Virtual destructor implementation
        }

        std::string TyrexSelectionFilter::getNotAllowedReason() const
        {
            return {}; // Default implementation returns an empty string
        }

    } // namespace Interaction
} // namespace Tyrex