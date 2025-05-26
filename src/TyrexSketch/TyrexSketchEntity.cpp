/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexSketch/TyrexSketchEntity.h"

#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <AIS_InteractiveContext.hxx>
#include <ElSLib.hxx>
#include <gp_Vec.hxx>
#include <Quantity_NameOfColor.hxx>
#include <Prs3d_LineAspect.hxx>
#include <Aspect_TypeOfLine.hxx>
#include <TopoDS.hxx>

#include <QDebug>

namespace TyrexCAD {

    TyrexSketchEntity::TyrexSketchEntity(const std::string& id,
        SketchEntityType type,
        const gp_Pln& plane)
        : m_id(id)
        , m_type(type)
        , m_sketchPlane(plane)
        , m_color(Quantity_NOC_WHITE)
        , m_isSelected(false)
        , m_isHighlighted(false)
        , m_lineStyle(Aspect_TOL_SOLID)
        , m_lineWidth(2.0)
        , m_isVisible(true)
    {
        switch (m_type) {
        case SketchEntityType::Line:
            m_color = Quantity_Color(0.8, 0.8, 0.8, Quantity_TOC_RGB);
            break;
        case SketchEntityType::Circle:
            m_color = Quantity_Color(0.7, 0.7, 0.9, Quantity_TOC_RGB);
            break;
        case SketchEntityType::Arc:
            m_color = Quantity_Color(0.9, 0.7, 0.7, Quantity_TOC_RGB);
            break;
        case SketchEntityType::Point:
            m_color = Quantity_Color(0.9, 0.9, 0.7, Quantity_TOC_RGB);
            break;
        }
    }

    TyrexSketchEntity::~TyrexSketchEntity() = default;

    const std::string& TyrexSketchEntity::getId() const
    {
        return m_id;
    }

    SketchEntityType TyrexSketchEntity::getType() const
    {
        return m_type;
    }

    const gp_Pln& TyrexSketchEntity::getSketchPlane() const
    {
        return m_sketchPlane;
    }

    void TyrexSketchEntity::setSketchPlane(const gp_Pln& plane)
    {
        m_sketchPlane = plane;
        updateShape();
    }

    void TyrexSketchEntity::draw(const Handle(AIS_InteractiveContext)& context, bool isSelected)
    {
        if (context.IsNull() || !m_isVisible) {
            return;
        }

        updateShape();

        if (m_aisShape.IsNull()) {
            createAISShape();
        }

        if (!m_aisShape.IsNull()) {
            updateVisuals();

            context->Display(m_aisShape, Standard_False);

            if (isSelected) {
                context->SetSelected(m_aisShape, Standard_False);
            }

            if (m_isHighlighted) {
                context->HilightWithColor(m_aisShape,
                    context->HighlightStyle(Prs3d_TypeOfHighlight_Dynamic),
                    Standard_False);
            }
        }
    }

    void TyrexSketchEntity::undraw(const Handle(AIS_InteractiveContext)& context)
    {
        if (context.IsNull() || m_aisShape.IsNull()) {
            return;
        }

        context->Remove(m_aisShape, Standard_False);
    }

    Handle(AIS_Shape) TyrexSketchEntity::getAISShape() const
    {
        return m_aisShape;
    }

    const TopoDS_Shape& TyrexSketchEntity::getShape() const
    {
        return m_shape;
    }

    void TyrexSketchEntity::setColor(const Quantity_Color& color)
    {
        m_color = color;
        updateVisuals();
    }

    const Quantity_Color& TyrexSketchEntity::getColor() const
    {
        return m_color;
    }

    void TyrexSketchEntity::setSelected(bool selected)
    {
        m_isSelected = selected;
        updateVisuals();
    }

    bool TyrexSketchEntity::isSelected() const
    {
        return m_isSelected;
    }

    void TyrexSketchEntity::setHighlighted(bool highlighted)
    {
        m_isHighlighted = highlighted;
        updateVisuals();
    }

    bool TyrexSketchEntity::isHighlighted() const
    {
        return m_isHighlighted;
    }

    void TyrexSketchEntity::setLineStyle(Aspect_TypeOfLine lineStyle)
    {
        m_lineStyle = lineStyle;
        updateVisuals();
    }

    Aspect_TypeOfLine TyrexSketchEntity::getLineStyle() const
    {
        return m_lineStyle;
    }

    gp_Pnt TyrexSketchEntity::sketchTo3D(const gp_Pnt2d& sketchPoint) const
    {
        return ElSLib::Value(sketchPoint.X(), sketchPoint.Y(), m_sketchPlane);
    }

    gp_Pnt2d TyrexSketchEntity::worldToSketch(const gp_Pnt& worldPoint) const
    {
        Standard_Real u, v;
        ElSLib::Parameters(m_sketchPlane, worldPoint, u, v);
        return gp_Pnt2d(u, v);
    }

    void TyrexSketchEntity::updateVisuals()
    {
        if (m_aisShape.IsNull()) {
            return;
        }

        Quantity_Color displayColor = m_color;

        if (m_isSelected) {
            displayColor = Quantity_Color(
                std::min(1.0, m_color.Red() + 0.3),
                std::min(1.0, m_color.Green() + 0.3),
                std::min(1.0, m_color.Blue() + 0.3),
                Quantity_TOC_RGB
            );
        }
        else if (m_isHighlighted) {
            displayColor = Quantity_Color(
                std::min(1.0, m_color.Red() + 0.1),
                std::min(1.0, m_color.Green() + 0.1),
                std::min(1.0, m_color.Blue() + 0.1),
                Quantity_TOC_RGB
            );
        }

        m_aisShape->SetColor(displayColor);
        m_aisShape->SetWidth(m_isSelected ? m_lineWidth + 1.0 : m_lineWidth);

        if (m_isHighlighted && !m_isSelected) {
            Handle(Prs3d_LineAspect) lineAspect = new Prs3d_LineAspect(
                displayColor, Aspect_TOL_DASH, m_lineWidth);
            m_aisShape->Attributes()->SetLineAspect(lineAspect);
        }
        else {
            Handle(Prs3d_LineAspect) lineAspect = new Prs3d_LineAspect(
                displayColor, m_lineStyle, m_lineWidth);
            m_aisShape->Attributes()->SetLineAspect(lineAspect);
        }
    }

    void TyrexSketchEntity::createAISShape()
    {
        if (!m_shape.IsNull()) {
            m_aisShape = new AIS_Shape(m_shape);
            updateVisuals();
        }
    }

} // namespace TyrexCAD