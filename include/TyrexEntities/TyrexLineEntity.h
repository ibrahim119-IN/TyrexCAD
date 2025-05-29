/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_LINE_ENTITY_H
#define TYREX_LINE_ENTITY_H

#include "TyrexEntities/TyrexEntity.h"
#include <gp_Pnt.hxx>

namespace TyrexCAD {

    /**
     * @class TyrexLineEntity
     * @brief A class representing a line in 3D space in the TyrexCAD system.
     */
    class TyrexLineEntity : public TyrexEntity {
    public:
        /**
         * @brief Construct a new line entity
         *
         * @param id The unique identifier for this entity
         * @param layerName The name of the layer this entity belongs to
         * @param color The color of this entity
         * @param start The start point of the line
         * @param end The end point of the line
         */
        TyrexLineEntity(const std::string& id,
            const std::string& layerName,
            const Quantity_Color& color,
            const gp_Pnt& start,
            const gp_Pnt& end);

        /**
         * @brief Virtual destructor
         */
        virtual ~TyrexLineEntity() override;

        /**
         * @brief Update the line's shape and visualization objects
         */
        virtual void updateShape() override;

        /**
         * @brief Draw the line in the given context
         *
         * @param context The interactive context to draw in
         * @param isSelected Whether the entity is currently selected
         */
        virtual void draw(const Handle(AIS_InteractiveContext)& context,
            Standard_Boolean isSelected) override;

        /**
         * @brief Calculate the shortest distance from the line to a point
         *
         * @param point The point to calculate distance to
         * @return Standard_Real The shortest distance
         */
        virtual Standard_Real distanceToPoint(const gp_Pnt& point) const override;

        /**
         * @brief Get the start point of the line
         * @return The start point
         */
        const gp_Pnt& start() const;

        /**
         * @brief Set the start point of the line
         * @param start The new start point
         */
        void setStart(const gp_Pnt& start);

        /**
         * @brief Get the end point of the line
         * @return The end point
         */
        const gp_Pnt& end() const;

        /**
         * @brief Set the end point of the line
         * @param end The new end point
         */
        void setEnd(const gp_Pnt& end);

        /**
         * @brief Get the start point (for snap manager compatibility)
         * @return The start point
         */
        gp_Pnt getStartPoint() const { return m_start; }

        /**
         * @brief Get the end point (for snap manager compatibility)
         * @return The end point
         */
        gp_Pnt getEndPoint() const { return m_end; }

    private:
        gp_Pnt m_start;        ///< The start point of the line
        gp_Pnt m_end;          ///< The end point of the line
    };

} // namespace TyrexCAD

#endif // TYREX_LINE_ENTITY_H