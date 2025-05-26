/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_SKETCH_ENTITY_H
#define TYREX_SKETCH_ENTITY_H

#include <string>
#include <vector>
#include <memory>

#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <gp_Pnt2d.hxx>
#include <gp_Pln.hxx>
#include <TopoDS_Shape.hxx>
#include <AIS_Shape.hxx>
#include <AIS_InteractiveContext.hxx>
#include <Quantity_Color.hxx>
#include <Aspect_TypeOfLine.hxx>

namespace TyrexCAD {

    enum class SketchEntityType {
        Line,
        Circle,
        Arc,
        Point
    };

    class TyrexSketchEntity {
    public:
        TyrexSketchEntity(const std::string& id,
            SketchEntityType type,
            const gp_Pln& plane);

        virtual ~TyrexSketchEntity();

        const std::string& getId() const;
        SketchEntityType getType() const;
        const gp_Pln& getSketchPlane() const;
        void setSketchPlane(const gp_Pln& plane);

        virtual void updateShape() = 0;
        virtual std::vector<gp_Pnt2d> getControlPoints() const = 0;
        virtual bool setControlPoint(int index, const gp_Pnt2d& newPosition) = 0;
        virtual int getControlPointCount() const = 0;
        virtual void moveBy(const gp_Pnt2d& offset) = 0;
        virtual bool isNearPoint(const gp_Pnt2d& point, double tolerance = 5.0) const = 0;
        virtual gp_Pnt2d getClosestPoint(const gp_Pnt2d& point) const = 0;

        virtual void draw(const Handle(AIS_InteractiveContext)& context, bool isSelected = false);
        virtual void undraw(const Handle(AIS_InteractiveContext)& context);

        Handle(AIS_Shape) getAISShape() const;
        const TopoDS_Shape& getShape() const;

        void setColor(const Quantity_Color& color);
        const Quantity_Color& getColor() const;

        void setSelected(bool selected);
        bool isSelected() const;

        void setHighlighted(bool highlighted);
        bool isHighlighted() const;

        void setLineStyle(Aspect_TypeOfLine lineStyle);
        Aspect_TypeOfLine getLineStyle() const;

        gp_Pnt sketchTo3D(const gp_Pnt2d& sketchPoint) const; // Fixed typo
        gp_Pnt2d worldToSketch(const gp_Pnt& worldPoint) const;

        virtual void getBounds2D(gp_Pnt2d& minPt, gp_Pnt2d& maxPt) const = 0;
        virtual std::shared_ptr<TyrexSketchEntity> clone(const std::string& newId) const = 0;
        virtual bool isValid() const = 0;

    protected:
        void updateVisuals();
        void createAISShape();

    protected:
        std::string m_id;
        SketchEntityType m_type;
        gp_Pln m_sketchPlane;

        TopoDS_Shape m_shape;
        Handle(AIS_Shape) m_aisShape;

        Quantity_Color m_color;
        bool m_isSelected;
        bool m_isHighlighted;
        Aspect_TypeOfLine m_lineStyle;

        double m_lineWidth;
        bool m_isVisible;
    };

} // namespace TyrexCAD

#endif // TYREX_SKETCH_ENTITY_H