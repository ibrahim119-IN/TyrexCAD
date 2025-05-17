/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_CIRCLE_ENTITY_H
#define TYREX_CIRCLE_ENTITY_H

#include "TyrexEntities/TyrexEntity.h"
#include <gp_Pnt.hxx>
#include <Standard_Real.hxx>

namespace TyrexCAD {

    /**
     * @class TyrexCircleEntity
     * @brief A class representing a circle in 3D space in the TyrexCAD system.
     */
    class TyrexCircleEntity : public TyrexEntity {
    public:
        /**
         * @brief Construct a new circle entity
         *
         * @param id The unique identifier for this entity
         * @param layerName The name of the layer this entity belongs to
         * @param color The color of this entity
         * @param center The center point of the circle
         * @param radius The radius of the circle
         */
        TyrexCircleEntity(const std::string& id,
            const std::string& layerName,
            const Quantity_Color& color,
            const gp_Pnt& center,
            Standard_Real radius);

        /**
         * @brief Virtual destructor
         */
        virtual ~TyrexCircleEntity() override;

        /**
         * @brief Update the circle's shape and visualization objects
         */
        virtual void updateShape() override;

        /**
         * @brief Draw the circle in the given context
         *
         * @param context The interactive context to draw in
         * @param isSelected Whether the entity is currently selected
         */
        virtual void draw(const Handle(AIS_InteractiveContext)& context,
            Standard_Boolean isSelected) override;

        /**
         * @brief Calculate the shortest distance from the circle to a point
         *
         * @param point The point to calculate distance to
         * @return Standard_Real The shortest distance
         */
        virtual Standard_Real distanceToPoint(const gp_Pnt& point) const override;

        /**
         * @brief Get the center point of the circle
         * @return The center point
         */
        const gp_Pnt& center() const;

        /**
         * @brief Set the center point of the circle
         * @param center The new center point
         */
        void setCenter(const gp_Pnt& center);

        /**
         * @brief Get the radius of the circle
         * @return The radius
         */
        Standard_Real radius() const;

        /**
         * @brief Set the radius of the circle
         * @param radius The new radius
         */
        void setRadius(Standard_Real radius);

    private:
        gp_Pnt m_center;        ///< The center point of the circle
        Standard_Real m_radius;  ///< The radius of the circle
    };

} // namespace TyrexCAD

#endif // TYREX_CIRCLE_ENTITY_H