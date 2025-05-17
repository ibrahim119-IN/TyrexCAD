/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#pragma once

#include <string>
#include <AIS_Shape.hxx>
#include <AIS_InteractiveContext.hxx>
#include <TopoDS_Shape.hxx>
#include <gp_Pnt.hxx>
#include <Quantity_Color.hxx>

namespace TyrexCAD {

    /**
     * @brief Base class for all entities in TyrexCAD
     */
    class TyrexEntity {
    public:
        /**
         * @brief Virtual destructor
         */
        virtual ~TyrexEntity();

        /**
         * @brief Get the unique ID of this entity
         * @return Entity ID
         */
        const std::string& getId() const;

        /**
         * @brief Get the name of the layer this entity belongs to
         * @return Layer name
         */
        const std::string& getLayerName() const;

        /**
         * @brief Get the type name of this entity
         * @return Type name
         */
        const std::string& getTypeName() const;

        /**
         * @brief Update the entity's shape representation
         */
        virtual void updateShape() = 0;

        /**
         * @brief Draw the entity in the given context
         *
         * @param context OpenCascade interactive context
         * @param isSelected Whether the entity is currently selected
         */
        virtual void draw(const Handle(AIS_InteractiveContext)& context,
            Standard_Boolean isSelected) = 0;

        /**
         * @brief Calculate the distance from this entity to a point
         *
         * @param point Point to calculate distance to
         * @return Distance to the point
         */
        virtual Standard_Real distanceToPoint(const gp_Pnt& point) const = 0;

        /**
         * @brief Get the AIS shape for this entity
         * @return OpenCascade AIS shape handle
         */
        Handle(AIS_Shape) getAISShape() const;

        /**
         * @brief Get the TopoDS shape for this entity
         * @return OpenCascade shape
         */
        const TopoDS_Shape& getShape() const;

        /**
         * @brief Set whether this entity is highlighted
         * @param highlighted Highlight state
         */
        void setHighlighted(bool highlighted);

        /**
         * @brief Check if entity is highlighted
         * @return True if highlighted
         */
        bool isHighlighted() const;

        /**
         * @brief Check if entity is selected
         * @return True if selected
         */
        bool isSelected() const;

        /**
         * @brief Set the selection state of this entity
         * @param selected Selection state
         */
        void setSelected(bool selected);

    protected:
        /**
         * @brief Construct a new entity
         *
         * @param id Unique identifier
         * @param layerName Name of the layer
         * @param color Color for visualization
         */
        TyrexEntity(const std::string& id, const std::string& layerName, const Quantity_Color& color);

        std::string m_id;                     ///< Unique identifier
        std::string m_layerName;              ///< Layer name
        std::string m_typeName;               ///< Entity type name
        Quantity_Color m_color;               ///< Entity color
        TopoDS_Shape m_shape;                 ///< OpenCascade shape representation
        Handle(AIS_Shape) m_aisShape;         ///< OpenCascade interactive shape
        bool m_highlighted;                   ///< Highlight state
        bool m_selected;                      ///< Selection state
    };

} // namespace TyrexCAD