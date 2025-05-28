/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCanvas/TyrexModelSpace.h"
#include "TyrexEntities/TyrexEntity.h"
#include "TyrexCore/TyrexSelectionMode.h"

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <Standard_Real.hxx>
#include <AIS_Shape.hxx>
#include <AIS_InteractiveObject.hxx>
#include <AIS_InteractiveContext.hxx>
#include <TopoDS_Shape.hxx>
#include <gp_Pnt.hxx>
#include <SelectMgr_SelectionManager.hxx>
#include <StdSelect_ViewerSelector3d.hxx>
#include <V3d_View.hxx>

#include <algorithm>
#include <QDebug>
#include <limits>

namespace TyrexCAD {

    TyrexModelSpace::TyrexModelSpace(const Handle(AIS_InteractiveContext)& context)
        : m_context(context)
    {
        // Ensure context is valid
        if (m_context.IsNull()) {
            qDebug() << "Warning: Null AIS_InteractiveContext provided to TyrexModelSpace";
        }
    }

    TyrexModelSpace::~TyrexModelSpace() = default;

    void TyrexModelSpace::addEntity(const std::shared_ptr<TyrexEntity>& entity)
    {
        if (!entity) {
            qDebug() << "Warning: Attempted to add null entity to model space";
            return;
        }

        // Check if entity with same ID already exists
        for (const auto& existingEntity : m_entities) {
            if (existingEntity->getId() == entity->getId()) {
                qDebug() << "Warning: Entity with ID" << QString::fromStdString(entity->getId()) << "already exists in model space";
                return;
            }
        }

        // Add to collection
        m_entities.push_back(entity);

        // Draw the entity if context is available
        if (!m_context.IsNull()) {
            entity->draw(m_context, Standard_False);
            qDebug() << QString("Added and drew entity: %1").arg(QString::fromStdString(entity->getId()));
        }
    }

    void TyrexModelSpace::removeEntity(const std::string& id)
    {
        for (auto it = m_entities.begin(); it != m_entities.end(); ++it) {
            if ((*it)->getId() == id) {
                // Remove from visual context if needed
                if (!m_context.IsNull()) {
                    Handle(AIS_Shape) shape = (*it)->getAISShape();
                    if (!shape.IsNull()) {
                        m_context->Remove(shape, Standard_True);
                    }
                }

                // Remove from collection
                m_entities.erase(it);
                return;
            }
        }

        qDebug() << "Warning: Attempted to remove non-existent entity with ID" << QString::fromStdString(id);
    }

    std::shared_ptr<TyrexEntity> TyrexModelSpace::findEntityById(const std::string& id) const
    {
        for (const auto& entity : m_entities) {
            if (entity->getId() == id) {
                return entity;
            }
        }

        return nullptr;
    }

    TyrexEntity* TyrexModelSpace::findEntityAtPoint(const gp_Pnt& point, Standard_Real tolerance) const
    {
        TyrexEntity* closestEntity = nullptr;
        Standard_Real minDistance = std::numeric_limits<Standard_Real>::max();

        for (const auto& entity : m_entities) {
            Standard_Real distance = entity->distanceToPoint(point);

            if (distance <= tolerance && distance < minDistance) {
                minDistance = distance;
                closestEntity = entity.get();
            }
        }

        return closestEntity;
    }

    void TyrexModelSpace::drawAll()
    {
        if (m_context.IsNull()) {
            qDebug() << "Warning: Cannot draw entities - null context";
            return;
        }

        qDebug() << QString("Drawing %1 entities").arg(m_entities.size());

        // Clear display first
        m_context->RemoveAll(Standard_False);

        // Draw all entities
        for (const auto& entity : m_entities) {
            if (entity) {
                entity->draw(m_context, entity->isSelected());

                // Ensure entity is displayed
                Handle(AIS_Shape) shape = entity->getAISShape();
                if (!shape.IsNull() && !m_context->IsDisplayed(shape)) {
                    m_context->Display(shape, Standard_False);
                }
            }
        }

        // Force update of the viewer
        m_context->UpdateCurrentViewer();

        // Get the active view and force redraw
        Handle(V3d_View) activeView = m_context->CurrentViewer()->ActiveView();
        if (!activeView.IsNull()) {
            activeView->Redraw();
            activeView->Update();
        }

        qDebug() << "Finished drawing all entities";
    }

    void TyrexModelSpace::clear()
    {
        // Clear visual context if available
        if (!m_context.IsNull()) {
            m_context->RemoveAll(Standard_True);
        }

        // Clear entity collection
        m_entities.clear();
    }

    void TyrexModelSpace::selectAtScreenPoint(const QPoint& screenPos, const Handle(V3d_View)& view)
    {
        selectAtScreenPoint(screenPos, view, SelectionMode::Replace);
    }

    void TyrexModelSpace::selectAtScreenPoint(const QPoint& screenPos, const Handle(V3d_View)& view, SelectionMode mode)
    {
        if (m_context.IsNull() || view.IsNull()) {
            qDebug() << "Warning: Cannot select - null context or view";
            return;
        }

        // Determine selection mode  
        Standard_Boolean updateViewer = Standard_True;

        switch (mode) {
        case SelectionMode::Replace:
            m_context->ClearSelected(Standard_False);
            // Updated to use the correct overload of Select  
            m_context->MoveTo(screenPos.x(), screenPos.y(), view, Standard_True);
            m_context->Select(Standard_True);
            break;

        case SelectionMode::Add:
            m_context->MoveTo(screenPos.x(), screenPos.y(), view, Standard_True);
            m_context->ShiftSelect(Standard_True);
            break;

        case SelectionMode::Remove:
            m_context->MoveTo(screenPos.x(), screenPos.y(), view, Standard_True);
            m_context->ShiftSelect(Standard_False);
            break;
        }

        // Update selection state of entities  
        for (const auto& entity : m_entities) {
            Handle(AIS_Shape) shape = entity->getAISShape();
            if (!shape.IsNull()) {
                bool selected = m_context->IsSelected(shape);
                entity->setSelected(selected);
            }
        }

        // Update display  
        if (updateViewer) {
            m_context->UpdateCurrentViewer();
        }
    }

    void TyrexModelSpace::clearSelection()
    {
        if (!m_context.IsNull()) {
            m_context->ClearSelected(Standard_True);

            // Update internal selection state
            for (const auto& entity : m_entities) {
                entity->setSelected(false);
            }
        }
    }

    std::vector<std::shared_ptr<TyrexEntity>> TyrexModelSpace::getSelectedEntities() const
    {
        std::vector<std::shared_ptr<TyrexEntity>> selectedEntities;

        for (const auto& entity : m_entities) {
            if (entity->isSelected()) {
                selectedEntities.push_back(entity);
            }
        }

        return selectedEntities;
    }

    bool TyrexModelSpace::isEntitySelected(const std::shared_ptr<TyrexEntity>& entity) const
    {
        if (!entity) {
            return false;
        }

        // Check internal selection state
        return entity->isSelected();
    }

    size_t TyrexModelSpace::getSelectionCount() const
    {
        size_t count = 0;

        for (const auto& entity : m_entities) {
            if (entity->isSelected()) {
                count++;
            }
        }

        return count;
    }

} // namespace TyrexCAD