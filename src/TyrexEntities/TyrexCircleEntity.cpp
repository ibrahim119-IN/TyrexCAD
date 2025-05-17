#include "TyrexEntities/TyrexCircleEntity.h"

#include <gp_Ax2.hxx>
#include <gp_Dir.hxx>
#include <gp_Circ.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepExtrema_DistShapeShape.hxx>
#include <TopoDS_Vertex.hxx>
#include <BRepBuilderAPI_MakeVertex.hxx>

#include <limits>

namespace TyrexCAD {

    TyrexCircleEntity::TyrexCircleEntity(const std::string& id,
        const std::string& layerName,
        const Quantity_Color& color,
        const gp_Pnt& center,
        Standard_Real radius)
        : TyrexEntity(id, layerName, color)
        , m_center(center)
        , m_radius(radius)
    {
        updateShape();
    }

    TyrexCircleEntity::~TyrexCircleEntity() = default;

    void TyrexCircleEntity::updateShape()
    {
        // Create a coordinate system with Z as normal direction
        gp_Dir zDir(0, 0, 1);
        gp_Ax2 axis(m_center, zDir);

        // Create a circle using the center, axis and radius
        gp_Circ circle(axis, m_radius);

        // Create an edge (circle) from the gp_Circ
        BRepBuilderAPI_MakeEdge edgeMaker(circle);
        if (edgeMaker.IsDone()) {
            m_shape = edgeMaker.Edge();

            // Create AIS_Shape for visualization
            m_aisShape = new AIS_Shape(m_shape);

            // Set the color for visualization
            m_aisShape->SetColor(m_color);

            // أزلنا سطر ضبط عرض الخط الذي كان يسبب الخطأ
        }
    }

    void TyrexCircleEntity::draw(const Handle(AIS_InteractiveContext)& context,
        Standard_Boolean isSelected)
    {
        if (!m_aisShape.IsNull()) {
            // Display the shape in the context
            context->Display(m_aisShape, Standard_False);

            // Handle selection state
            if (isSelected) {
                context->SetSelected(m_aisShape, Standard_False);
            }
        }
    }

    Standard_Real TyrexCircleEntity::distanceToPoint(const gp_Pnt& point) const
    {
        // Create a vertex (point) from the input point
        TopoDS_Vertex vertex = BRepBuilderAPI_MakeVertex(point);

        // Calculate distance between the circle shape and the point
        BRepExtrema_DistShapeShape distCalculator(m_shape, vertex);
        if (distCalculator.Perform() && distCalculator.IsDone()) {
            return distCalculator.Value();
        }

        // Alternative direct calculation if the above fails
        Standard_Real distToCenter = point.Distance(m_center);
        return std::abs(distToCenter - m_radius);
    }

    const gp_Pnt& TyrexCircleEntity::center() const
    {
        return m_center;
    }

    void TyrexCircleEntity::setCenter(const gp_Pnt& center)
    {
        m_center = center;
        updateShape();
    }

    Standard_Real TyrexCircleEntity::radius() const
    {
        return m_radius;
    }

    void TyrexCircleEntity::setRadius(Standard_Real radius)
    {
        if (radius > 0) {
            m_radius = radius;
            updateShape();
        }
    }

} // namespace TyrexCAD