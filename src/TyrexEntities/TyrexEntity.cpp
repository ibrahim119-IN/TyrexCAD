/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexEntities/TyrexEntity.h"

namespace TyrexCAD {

    TyrexEntity::TyrexEntity(const std::string& id, const std::string& layerName, const Quantity_Color& color)
        : m_id(id)
        , m_layerName(layerName)
        , m_typeName("TyrexEntity")
        , m_color(color)
        , m_highlighted(false)
        , m_selected(false)
    {
    }

    TyrexEntity::~TyrexEntity()
    {
        // Virtual destructor implementation
    }

    const std::string& TyrexEntity::getId() const
    {
        return m_id;
    }

    const std::string& TyrexEntity::getLayerName() const
    {
        return m_layerName;
    }

    const std::string& TyrexEntity::getTypeName() const
    {
        return m_typeName;
    }

    Handle(AIS_Shape) TyrexEntity::getAISShape() const
    {
        return m_aisShape;
    }

    const TopoDS_Shape& TyrexEntity::getShape() const
    {
        return m_shape;
    }

    void TyrexEntity::setHighlighted(bool highlighted)
    {
        m_highlighted = highlighted;
    }

    bool TyrexEntity::isHighlighted() const
    {
        return m_highlighted;
    }

    bool TyrexEntity::isSelected() const
    {
        return m_selected;
    }

    void TyrexEntity::setSelected(bool selected)
    {
        m_selected = selected;
    }

} // namespace TyrexCAD