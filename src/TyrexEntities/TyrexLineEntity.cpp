#include "TyrexEntities/TyrexLineEntity.h"

#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepExtrema_DistShapeShape.hxx>
#include <TopoDS_Vertex.hxx>
#include <BRepBuilderAPI_MakeVertex.hxx>
#include <QDebug>
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
        m_typeName = "TyrexLineEntity";
        qDebug() << QString("Creating TyrexLineEntity with ID: %1").arg(QString::fromStdString(id));
        updateShape();
    }

    TyrexLineEntity::~TyrexLineEntity()
    {
        // Base class destructor will handle common cleanup
    }

    void TyrexLineEntity::updateShape()
    {
        try {
            // Create an edge (line) from start to end points
            BRepBuilderAPI_MakeEdge edgeMaker(m_start, m_end);
            if (edgeMaker.IsDone()) {
                m_shape = edgeMaker.Edge();

                // Create AIS_Shape for visualization
                m_aisShape = new AIS_Shape(m_shape);
                m_aisShape->SetColor(m_color);
                m_aisShape->SetWidth(3.0);  // Thicker line

                qDebug() << QString("Shape updated for line entity: %1").arg(QString::fromStdString(m_id));
            }
            else {
                qWarning() << "Failed to create line edge";
            }
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating line shape:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error updating line shape";
        }
    }

    void TyrexLineEntity::draw(const Handle(AIS_InteractiveContext)& context,
        Standard_Boolean isSelected)
    {
        if (context.IsNull()) {
            qWarning() << "Cannot draw line - context is null";
            return;
        }

        if (m_aisShape.IsNull()) {
            qWarning() << "Cannot draw line - shape is null";
            updateShape();
            if (m_aisShape.IsNull()) {
                qWarning() << "Failed to create shape for line entity";
                return;
            }
        }

        // Display the shape
        context->Display(m_aisShape, Standard_False);
        qDebug() << QString("Line entity displayed: %1").arg(QString::fromStdString(m_id));

        // Handle selection state
        if (isSelected) {
            context->SetSelected(m_aisShape, Standard_False);
        }
    }

    Standard_Real TyrexLineEntity::distanceToPoint(const gp_Pnt& point) const
    {
        // Simple distance calculation
        Standard_Real dist = point.Distance(m_start);
        Standard_Real dist2 = point.Distance(m_end);
        return std::min(dist, dist2);
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