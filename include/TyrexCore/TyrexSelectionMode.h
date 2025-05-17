#ifndef TYREX_SELECTION_MODE_SCHEMA_H
#define TYREX_SELECTION_MODE_SCHEMA_H

namespace TyrexCAD {

    /**
     * @enum AIS_SelectionModeSchema
     * @brief Selection modes for AIS context
     */
    enum AIS_SelectionModeSchema {
        AIS_SelectionModeSchema_None = 0,           ///< No selection mode
        AIS_SelectionModeSchema_OnlyTopLevel = 1,   ///< Only top level objects
        AIS_SelectionModeSchema_AllowSubElements = 2 ///< Allow sub-elements
    };

} // namespace TyrexCAD

#endif // TYREX_SELECTION_MODE_SCHEMA_H