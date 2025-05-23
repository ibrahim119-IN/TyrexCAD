/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCore/TyrexLineCommand.h"
#include "TyrexCanvas/TyrexModelSpace.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexEntities/TyrexLineEntity.h"
#include "TyrexCore/TyrexEntityManager.h"

#include <BRepBuilderAPI_MakeEdge.hxx>
#include <TopoDS_Edge.hxx>
#include <Quantity_Color.hxx>
#include <Quantity_NameOfColor.hxx>
#include <AIS_InteractiveContext.hxx>
#include <V3d_View.hxx>
#include <QDebug>
#include <sstream>
#include <iomanip>

namespace TyrexCAD {

    TyrexLineCommand::TyrexLineCommand(TyrexModelSpace* modelSpace, TyrexViewerManager* viewerManager)
        : TyrexCommand("Line")
        , m_modelSpace(modelSpace)
        , m_viewerManager(viewerManager)
        , m_firstPointSet(false)
        , m_firstPoint(0, 0, 0)
        , m_secondPoint(0, 0, 0)
    {
        // Initialize preview shape as null
        m_previewShape.Nullify();

        qDebug() << "TyrexLineCommand created with model space and viewer manager";
    }

    TyrexLineCommand::~TyrexLineCommand()
    {
        // Clean up preview if it exists
        cleanupPreview();
        qDebug() << "TyrexLineCommand destroyed";
    }

    void TyrexLineCommand::start()
    {
        TyrexCommand::start();

        // Reset state to initial conditions
        m_firstPointSet = false;
        m_firstPoint = gp_Pnt(0, 0, 0);
        m_secondPoint = gp_Pnt(0, 0, 0);

        // Clean up any existing preview
        cleanupPreview();

        qDebug() << "Line command started - click to place first point";
    }

    void TyrexLineCommand::cancel()
    {
        // Clean up preview shape
        cleanupPreview();

        // Call base class cancel
        TyrexCommand::cancel();

        qDebug() << "Line command canceled";
    }

    bool TyrexLineCommand::isFinished() const
    {
        return m_isFinished;
    }

    void TyrexLineCommand::onMousePress(const QPoint& point)
    {
        if (!m_viewerManager) {
            qWarning() << "No viewer manager available in line command";
            m_isFinished = true;
            return;
        }

        // Convert screen coordinates to 3D model coordinates
        gp_Pnt modelPoint = m_viewerManager->screenToModel(point);

        if (!m_firstPointSet) {
            // Set the first point
            m_firstPoint = modelPoint;
            m_firstPointSet = true;

            qDebug() << QString("First point set at (%1, %2, %3)")
                .arg(m_firstPoint.X(), 0, 'f', 3)
                .arg(m_firstPoint.Y(), 0, 'f', 3)
                .arg(m_firstPoint.Z(), 0, 'f', 3);

            qDebug() << "Move mouse and click to place second point";
        }
        else {
            // Set the second point and create the line
            m_secondPoint = modelPoint;

            qDebug() << QString("Second point set at (%1, %2, %3)")
                .arg(m_secondPoint.X(), 0, 'f', 3)
                .arg(m_secondPoint.Y(), 0, 'f', 3)
                .arg(m_secondPoint.Z(), 0, 'f', 3);

            // Validate that the two points are different
            if (m_firstPoint.Distance(m_secondPoint) < 1e-6) {
                qWarning() << "Points are too close together, line not created";
                return;
            }

            // Create the actual line entity
            if (createLine()) {
                // Command completed successfully
                m_isFinished = true;
                qDebug() << "Line command completed successfully";
            }
            else {
                qWarning() << "Failed to create line entity";
                m_isFinished = true;
            }
        }
    }

    void TyrexLineCommand::onMouseMove(const QPoint& point)
    {
        if (!m_firstPointSet || !m_viewerManager) {
            return;
        }

        // Convert current mouse position to 3D coordinates
        gp_Pnt currentPoint = m_viewerManager->screenToModel(point);

        // Update or create preview
        updatePreview(currentPoint);
    }

    void TyrexLineCommand::onMouseRelease(const QPoint& /*point*/)
    {
        // No specific action needed on mouse release for line command
        // The click handling is done in onMousePress
    }

    bool TyrexLineCommand::createLine()
    {
        if (!m_modelSpace) {
            qCritical() << "Cannot create line - model space is null";
            return false;
        }

        // Clean up preview before creating final line
        cleanupPreview();

        try {
            // Generate a unique ID for the line
            auto& entityManager = Tyrex::Core::TyrexEntityManager::getInstance();
            std::string lineId = entityManager.generateUniqueEntityId("line");

            // Calculate line length for debugging
            Standard_Real lineLength = m_firstPoint.Distance(m_secondPoint);
            qDebug() << QString("Creating line with length: %1").arg(lineLength, 0, 'f', 3);

            // Create the line entity with a distinct color
            Quantity_Color lineColor(0.0, 0.7, 1.0, Quantity_TOC_RGB); // Bright blue
            auto lineEntity = std::make_shared<TyrexLineEntity>(
                lineId,
                "default",
                lineColor,
                m_firstPoint,
                m_secondPoint
            );

            // Add the entity to both the local model space and global entity manager
            m_modelSpace->addEntity(lineEntity);
            entityManager.addEntity(lineEntity);

            // Force a view update to show the new line
            if (m_viewerManager) {
                m_viewerManager->redraw();
            }

            qDebug() << QString("Line entity created successfully with ID: %1")
                .arg(QString::fromStdString(lineId));

            return true;
        }
        catch (const Standard_Failure& ex) {
            qCritical() << "OpenCascade error creating line:" << ex.GetMessageString();
            return false;
        }
        catch (const std::exception& ex) {
            qCritical() << "Standard error creating line:" << ex.what();
            return false;
        }
        catch (...) {
            qCritical() << "Unknown error creating line";
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
            // Validate points are different
            if (m_firstPoint.Distance(currentPoint) < 1e-6) {
                return; // Don't show preview for identical points
            }

            if (m_previewShape.IsNull()) {
                // Create new preview shape
                TopoDS_Edge previewEdge = BRepBuilderAPI_MakeEdge(m_firstPoint, currentPoint);
                m_previewShape = new AIS_Shape(previewEdge);

                // Set preview appearance (red dashed line)
                m_previewShape->SetColor(Quantity_NOC_RED);
                m_previewShape->SetWidth(1.5);
                m_previewShape->SetTransparency(0.3); // Semi-transparent

                // Set line style to dashed
                m_previewShape->Attributes()->SetLineAspect(
                    new Prs3d_LineAspect(Quantity_NOC_RED, Aspect_TOL_DASH, 1.5)
                );

                // Display the preview
                context->Display(m_previewShape, Standard_False);
            }
            else {
                // Update existing preview shape
                TopoDS_Edge updatedEdge = BRepBuilderAPI_MakeEdge(m_firstPoint, currentPoint);
                m_previewShape->Set(updatedEdge);

                // Redisplay the updated preview
                context->Redisplay(m_previewShape, Standard_False);
            }

            // Update the view to show changes
            context->UpdateCurrentViewer();
        }
        catch (const Standard_Failure& ex) {
            qWarning() << "Error updating line preview:" << ex.GetMessageString();
        }
        catch (...) {
            qWarning() << "Unknown error updating line preview";
        }
    }

    void TyrexLineCommand::cleanupPreview()
    {
        if (!m_previewShape.IsNull() && m_viewerManager) {
            Handle(AIS_InteractiveContext) context = m_viewerManager->context();
            if (!context.IsNull()) {
                try {
                    context->Remove(m_previewShape, Standard_False);
                    context->UpdateCurrentViewer();
                    qDebug() << "Preview shape cleaned up";
                }
                catch (const Standard_Failure& ex) {
                    qWarning() << "Error cleaning up preview:" << ex.GetMessageString();
                }
                catch (...) {
                    qWarning() << "Unknown error cleaning up preview";
                }
            }
            m_previewShape.Nullify();
        }
    }

} // namespace TyrexCAD