#include "TyrexEntities/TyrexLineEntity.h"

#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepExtrema_DistShapeShape.hxx>
#include <TopoDS_Vertex.hxx>
#include <BRepBuilderAPI_MakeVertex.hxx>
#include <limits>

namespace TyrexCAD {

    TyrexLineEntity::TyrexLineEntity(const std::string& id,
        const std::string& layerName,
        const Quantity_Color& color,
        const gp_Pnt& start,
        const gp_Pnt& end)
        : TyrexEntity(id, layerName, color)
        , m_start(start)
        , m_end(end)
    {
        updateShape();
    }

    TyrexLineEntity::~TyrexLineEntity()
    {
        // Base class destructor will handle common cleanup
    }

    void TyrexLineEntity::updateShape()
    {
        // Create an edge (line) from start to end points
        BRepBuilderAPI_MakeEdge edgeMaker(m_start, m_end);
        if (edgeMaker.IsDone()) {
            m_shape = edgeMaker.Edge();

            // Create AIS_Shape for visualization
            m_aisShape = new AIS_Shape(m_shape);

            // Set the color for visualization
            m_aisShape->SetColor(m_color);
        }
    }

    void TyrexLineEntity::draw(const Handle(AIS_InteractiveContext)& context,
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

    Standard_Real TyrexLineEntity::distanceToPoint(const gp_Pnt& point) const
    {
        // Create a vertex (point) from the input point
        TopoDS_Vertex vertex = BRepBuilderAPI_MakeVertex(point);

        // Calculate distance between the line shape and the point
        BRepExtrema_DistShapeShape distCalculator(m_shape, vertex);
        if (distCalculator.Perform() && distCalculator.IsDone()) {
            return distCalculator.Value();
        }

        // Return a large value if calculation fails
        return std::numeric_limits<Standard_Real>::max();
    }

    const gp_Pnt& TyrexLineEntity::start() const
    {
        return m_start;
    }

    void TyrexLineEntity::setStart(const gp_Pnt& start)
    {
        m_start = start;
        updateShape();
    }

    const gp_Pnt& TyrexLineEntity::end() const
    {
        return m_end;
    }

    void TyrexLineEntity::setEnd(const gp_Pnt& end)
    {
        m_end = end;
        updateShape();
    }

} // namespace TyrexCAD