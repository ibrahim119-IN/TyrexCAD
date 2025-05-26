#include "TyrexCore/TyrexLineCommand.h"
#include "TyrexCanvas/TyrexModelSpace.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexEntities/TyrexLineEntity.h"
#include "TyrexCore/CoordinateConverter.h"
#include "TyrexCore/SafeHandleUtils.h"

#include <chrono>

#include <BRepBuilderAPI_MakeEdge.hxx>
#include <TopoDS_Edge.hxx>
#include <AIS_Shape.hxx>
#include <Quantity_Color.hxx>
#include <AIS_InteractiveContext.hxx>
#include <V3d_View.hxx>
#include <QDebug>

namespace TyrexCAD {

    TyrexLineCommand::TyrexLineCommand(TyrexModelSpace* modelSpace, TyrexViewerManager* viewerManager)
        : TyrexCommand("Line")
        , m_modelSpace(modelSpace)
        , m_viewerManager(viewerManager)
        , m_firstPointSet(false)
    {
        qDebug() << "TyrexLineCommand created";
    }

    TyrexLineCommand::~TyrexLineCommand()
    {
        cleanupPreview();
        qDebug() << "TyrexLineCommand destroyed";
    }

    void TyrexLineCommand::start()
    {
        m_isStarted = true;
        m_isFinished = false;
        m_firstPointSet = false;
        cleanupPreview();

        qDebug() << "Line command started - click to set first point";
    }

    void TyrexLineCommand::cancel()
    {
        cleanupPreview();
        m_firstPointSet = false;
        m_isFinished = true;

        qDebug() << "Line command cancelled";
    }

    bool TyrexLineCommand::isFinished() const
    {
        return m_isFinished;
    }

    void TyrexLineCommand::onMousePress(const QPoint& point)
    {
        if (!m_modelSpace || !m_viewerManager) {
            qWarning() << "TyrexLineCommand: Missing model space or viewer manager";
            return;
        }

        Handle(V3d_View) view = m_viewerManager->view();
        if (view.IsNull()) {
            qWarning() << "TyrexLineCommand: View is null";
            return;
        }

        // Convert screen to world coordinates
        gp_Pnt worldPoint = CoordinateConverter::screenToWorld3D(point, view);

        if (!m_firstPointSet) {
            // Set first point
            m_firstPoint = worldPoint;
            m_firstPointSet = true;
            updatePreview(m_firstPoint);

            qDebug() << "First point set at:" << m_firstPoint.X() << m_firstPoint.Y() << m_firstPoint.Z();
            qDebug() << "Click to set second point";
        }
        else {
            // Set second point and create line
            m_secondPoint = worldPoint;

            qDebug() << "Second point set at:" << m_secondPoint.X() << m_secondPoint.Y() << m_secondPoint.Z();

            if (createLine()) {
                m_isFinished = true;
                qDebug() << "Line created successfully";
            }
            else {
                qWarning() << "Failed to create line";
                cancel();
            }
        }
    }

    void TyrexLineCommand::onMouseMove(const QPoint& point)
    {
        if (!m_firstPointSet) {
            return;
        }

        if (!m_viewerManager) {
            return;
        }

        Handle(V3d_View) view = m_viewerManager->view();
        if (view.IsNull()) {
            return;
        }

        // Update preview with current mouse position
        gp_Pnt currentPoint = CoordinateConverter::screenToWorld3D(point, view);
        updatePreview(currentPoint);
    }

    void TyrexLineCommand::onMouseRelease(const QPoint& point)
    {
        // No action needed on mouse release for line command
        Q_UNUSED(point);
    }

    bool TyrexLineCommand::createLine()
    {
        if (!m_modelSpace) {
            qWarning() << "Cannot create line - no model space";
            return false;
        }

        // Check if points are different
        double distance = m_firstPoint.Distance(m_secondPoint);
        if (distance < 1e-6) {
            qWarning() << "Cannot create line - points are too close";
            return false;
        }

        try {
            // Create line entity
            auto lineEntity = std::make_shared<TyrexLineEntity>(
                "line_" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count()),
                m_firstPoint,
                m_secondPoint
            );

            // Add to model space
            m_modelSpace->addEntity(lineEntity);

            // Clean up preview
            cleanupPreview();

            return true;
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "OpenCascade error creating line:" << ex.GetMessageString();
            return false;
        }
        catch (const std::exception& ex) {
            qWarning() << "Error creating line:" << ex.what();
            return false;
        }
        catch (...) {
            qWarning() << "Unknown error creating line";
            return false;
        }
    }

    void TyrexLineCommand::updatePreview(const gp_Pnt& currentPoint)
    {
        if (!m_viewerManager) {
            return;
        }

        Handle(AIS_InteractiveContext) context = m_viewerManager->context();
        if (context.IsNull()) {
            return;
        }

        try {
            // Remove existing preview
            cleanupPreview();

            // Don't create preview if points are the same
            double distance = m_firstPoint.Distance(currentPoint);
            if (distance < 1e-6) {
                return;
            }

            // Create preview edge
            BRepBuilderAPI_MakeEdge edgeMaker(m_firstPoint, currentPoint);
            if (!edgeMaker.IsDone()) {
                qWarning() << "Failed to create preview edge";
                return;
            }

            TopoDS_Edge previewEdge = edgeMaker.Edge();
            m_previewShape = new AIS_Shape(previewEdge);

            // Set preview appearance
            SAFE_HANDLE_CALL(m_previewShape, SetColor(Quantity_Color(0.0, 0.8, 0.8, Quantity_TOC_RGB)));
            SAFE_HANDLE_CALL(m_previewShape, SetWidth(2.0));
            SAFE_HANDLE_CALL(m_previewShape, SetTransparency(0.3));

            // Display preview
            context->Display(m_previewShape, Standard_False);
            context->UpdateCurrentViewer();
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating line preview:" << ex.GetMessageString();
            cleanupPreview();
        }
        catch (...) {
            qWarning() << "Unknown error updating line preview";
            cleanupPreview();
        }
    }

    void TyrexLineCommand::cleanupPreview()
    {
        if (!m_previewShape.IsNull() && m_viewerManager) {
            Handle(AIS_InteractiveContext) context = m_viewerManager->context();
            SAFE_HANDLE_CALL_OR(context, Remove(m_previewShape, Standard_False), {
                qWarning() << "Cannot remove preview - null context";
                });

            m_previewShape.Nullify();

            SAFE_HANDLE_CALL(context, UpdateCurrentViewer());
        }
    }

} // namespace TyrexCAD