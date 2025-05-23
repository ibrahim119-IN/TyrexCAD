/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexSketch/TyrexSketch.h"
#include <sstream>
#include <iomanip>
#include <random>

namespace TyrexCAD {
    namespace Sketch {
        namespace Utils {

            std::string generateUniqueId(const std::string& prefix)
            {
                static std::random_device rd;
                static std::mt19937 gen(rd());
                static std::uniform_int_distribution<> dis(1000, 9999);
                static int counter = 0;

                std::stringstream ss;
                ss << prefix << "_"
                    << std::setfill('0') << std::setw(6) << ++counter
                    << "_" << dis(gen);
                return ss.str();
            }

        } // namespace Utils
    } // namespace Sketch
} // namespace TyrexCAD