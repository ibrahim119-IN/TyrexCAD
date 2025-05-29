#include "TyrexSnapping/TyrexSnapManager.h"
#include "TyrexCanvas/TyrexCanvasOverlay.h"
#include "TyrexCanvas/TyrexModelSpace.h"
#include "TyrexCore/CoordinateConverter.h"
#include "TyrexEntities/TyrexEntity.h"
#include "TyrexEntities/TyrexLineEntity.h"
#include "TyrexEntities/TyrexCircleEntity.h"

#include <AIS_InteractiveContext.hxx>
#include <AIS_Shape.hxx>
#include <BRepBuilderAPI_MakeVertex.hxx>
#include <Prs3d_PointAspect.hxx>
#include <Graphic3d_AspectMarker3d.hxx>
#include <Geom_CartesianPoint.hxx>
#include <AIS_Point.hxx>
#include <gp_Pnt2d.hxx>

#include <QDebug>
#include <algorithm>
#include <cmath>

namespace TyrexCAD {

    // Note: Q_DECLARE_OPERATORS_FOR_FLAGS removed here as it's already in the header

    TyrexSnapManager::TyrexSnapManager(QObject* parent)
        : QObject(parent)
        , m_activeSnapTypes(Grid | Endpoint)  // Default snap types
        , m_snapTolerance(10.0)  // 10 pixels default
        , m_enabled(true)
        , m_canvasOverlay(nullptr)
        , m_modelSpace(nullptr)
        , m_indicatorVisible(false)
    {
        // Initialize snap priorities (lower value = higher priority)
        m_snapPriorities[Endpoint] = 1.0;
        m_snapPriorities[Midpoint] = 2.0;
        m_snapPriorities[Center] = 3.0;
        m_snapPriorities[Intersection] = 4.0;
        m_snapPriorities[Perpendicular] = 5.0;
        m_snapPriorities[Tangent] = 6.0;
        m_snapPriorities[Grid] = 7.0;
        m_snapPriorities[Nearest] = 8.0;
    }

    TyrexSnapManager::~TyrexSnapManager()
    {
        hideSnapIndicator();
    }

    TyrexSnapManager::SnapResult TyrexSnapManager::snap(const QPoint& screenPos,
        const Handle(V3d_View)& view)
    {
        if (!m_enabled || view.IsNull() || !m_converter) {
            return SnapResult{ false, gp_Pnt2d(), None, "", 0.0, "" };
        }

        // Convert screen to world coordinates
        gp_Pnt2d worldPos = m_converter->screenToWorld2D(screenPos, view);

        // Perform snap in world coordinates
        return snapWorldPoint(worldPos);
    }

    TyrexSnapManager::SnapResult TyrexSnapManager::snapWorldPoint(const gp_Pnt2d& worldPos)
    {
        if (!m_enabled) {
            return SnapResult{ false, worldPos, None, "", 0.0, "" };
        }

        // Collect all snap candidates
        std::vector<SnapCandidate> candidates;

        // Check each active snap type
        if (m_activeSnapTypes & Grid) {
            checkGridSnap(worldPos, candidates);
        }
        if (m_activeSnapTypes & Endpoint) {
            checkEndpointSnap(worldPos, candidates);
        }
        if (m_activeSnapTypes & Midpoint) {
            checkMidpointSnap(worldPos, candidates);
        }
        if (m_activeSnapTypes & Center) {
            checkCenterSnap(worldPos, candidates);
        }
        if (m_activeSnapTypes & Intersection) {
            checkIntersectionSnap(worldPos, candidates);
        }
        if (m_activeSnapTypes & Nearest) {
            checkNearestSnap(worldPos, candidates);
        }

        // Select the best snap point
        SnapResult result = selectBestSnap(candidates, worldPos);

        // Update snap indicator
        if (result.snapped) {
            showSnapIndicator(result);
            emit snapOccurred(result);
        }
        else {
            hideSnapIndicator();
        }

        return result;
    }

    void TyrexSnapManager::checkGridSnap(const gp_Pnt2d& worldPos,
        std::vector<SnapCandidate>& candidates)
    {
        if (!m_canvasOverlay || !m_canvasOverlay->isGridVisible()) {
            return;
        }

        // Use canvas overlay's snap function
        gp_Pnt2d snappedPoint = m_canvasOverlay->snapToGrid(worldPos);
        double distance = worldPos.Distance(snappedPoint);

        // Convert pixel tolerance to world tolerance
        // TODO: This needs proper view-based conversion
        double worldTolerance = m_snapTolerance * m_canvasOverlay->getCurrentGridSpacing() / 50.0;

        if (distance <= worldTolerance) {
            SnapCandidate candidate;
            candidate.point = snappedPoint;
            candidate.type = Grid;
            candidate.distance = distance;
            candidate.priority = calculatePriority(Grid);
            candidate.description = QString("Grid: (%1, %2)")
                .arg(snappedPoint.X(), 0, 'f', 2)
                .arg(snappedPoint.Y(), 0, 'f', 2);

            candidates.push_back(candidate);
        }
    }

    void TyrexSnapManager::checkEndpointSnap(const gp_Pnt2d& worldPos,
        std::vector<SnapCandidate>& candidates)
    {
        if (!m_modelSpace) {
            return;
        }

        // Get entities near the point
        double searchRadius = m_snapTolerance * 0.1; // Approximate conversion
        auto nearbyEntities = getEntitiesNearPoint(worldPos, searchRadius);

        for (auto* entity : nearbyEntities) {
            // Check if entity is a line
            if (auto* line = dynamic_cast<TyrexLineEntity*>(entity)) {
                // Check both endpoints
                gp_Pnt startPt = line->getStartPoint();
                gp_Pnt endPt = line->getEndPoint();

                gp_Pnt2d start2d(startPt.X(), startPt.Y());
                gp_Pnt2d end2d(endPt.X(), endPt.Y());

                // Check start point
                double startDist = worldPos.Distance(start2d);
                if (startDist <= searchRadius) {
                    SnapCandidate candidate;
                    candidate.point = start2d;
                    candidate.type = Endpoint;
                    candidate.distance = startDist;
                    candidate.priority = calculatePriority(Endpoint);
                    candidate.description = QString("Endpoint: (%1, %2)")
                        .arg(start2d.X(), 0, 'f', 2)
                        .arg(start2d.Y(), 0, 'f', 2);
                    candidate.entityId = entity->getId();

                    candidates.push_back(candidate);
                }

                // Check end point
                double endDist = worldPos.Distance(end2d);
                if (endDist <= searchRadius) {
                    SnapCandidate candidate;
                    candidate.point = end2d;
                    candidate.type = Endpoint;
                    candidate.distance = endDist;
                    candidate.priority = calculatePriority(Endpoint);
                    candidate.description = QString("Endpoint: (%1, %2)")
                        .arg(end2d.X(), 0, 'f', 2)
                        .arg(end2d.Y(), 0, 'f', 2);
                    candidate.entityId = entity->getId();

                    candidates.push_back(candidate);
                }
            }
        }
    }

    void TyrexSnapManager::checkMidpointSnap(const gp_Pnt2d& worldPos,
        std::vector<SnapCandidate>& candidates)
    {
        if (!m_modelSpace) {
            return;
        }

        double searchRadius = m_snapTolerance * 0.1;
        auto nearbyEntities = getEntitiesNearPoint(worldPos, searchRadius);

        for (auto* entity : nearbyEntities) {
            if (auto* line = dynamic_cast<TyrexLineEntity*>(entity)) {
                // Calculate midpoint
                gp_Pnt startPt = line->getStartPoint();
                gp_Pnt endPt = line->getEndPoint();

                gp_Pnt2d midpoint(
                    (startPt.X() + endPt.X()) / 2.0,
                    (startPt.Y() + endPt.Y()) / 2.0
                );

                double distance = worldPos.Distance(midpoint);
                if (distance <= searchRadius) {
                    SnapCandidate candidate;
                    candidate.point = midpoint;
                    candidate.type = Midpoint;
                    candidate.distance = distance;
                    candidate.priority = calculatePriority(Midpoint);
                    candidate.description = QString("Midpoint: (%1, %2)")
                        .arg(midpoint.X(), 0, 'f', 2)
                        .arg(midpoint.Y(), 0, 'f', 2);
                    candidate.entityId = entity->getId();

                    candidates.push_back(candidate);
                }
            }
        }
    }

    void TyrexSnapManager::checkCenterSnap(const gp_Pnt2d& worldPos,
        std::vector<SnapCandidate>& candidates)
    {
        if (!m_modelSpace) {
            return;
        }

        double searchRadius = m_snapTolerance * 0.1;
        auto nearbyEntities = getEntitiesNearPoint(worldPos, searchRadius);

        for (auto* entity : nearbyEntities) {
            if (auto* circle = dynamic_cast<TyrexCircleEntity*>(entity)) {
                gp_Pnt centerPt = circle->getCenter();
                gp_Pnt2d center2d(centerPt.X(), centerPt.Y());

                double distance = worldPos.Distance(center2d);
                if (distance <= searchRadius) {
                    SnapCandidate candidate;
                    candidate.point = center2d;
                    candidate.type = Center;
                    candidate.distance = distance;
                    candidate.priority = calculatePriority(Center);
                    candidate.description = QString("Center: (%1, %2)")
                        .arg(center2d.X(), 0, 'f', 2)
                        .arg(center2d.Y(), 0, 'f', 2);
                    candidate.entityId = entity->getId();

                    candidates.push_back(candidate);
                }
            }
        }
    }

    void TyrexSnapManager::checkIntersectionSnap(const gp_Pnt2d& worldPos,
        std::vector<SnapCandidate>& candidates)
    {
        // TODO: Implement intersection detection between entities
        // This is complex and requires geometric calculations
    }

    void TyrexSnapManager::checkNearestSnap(const gp_Pnt2d& worldPos,
        std::vector<SnapCandidate>& candidates)
    {
        // TODO: Implement nearest point on entity calculation
        // This requires projecting the point onto each entity
    }

    TyrexSnapManager::SnapResult TyrexSnapManager::selectBestSnap(
        const std::vector<SnapCandidate>& candidates,
        const gp_Pnt2d& originalPoint)
    {
        if (candidates.empty()) {
            return SnapResult{ false, originalPoint, None, "", 0.0, "" };
        }

        // Sort candidates by priority then by distance
        auto sortedCandidates = candidates;
        std::sort(sortedCandidates.begin(), sortedCandidates.end(),
            [](const SnapCandidate& a, const SnapCandidate& b) {
                if (std::abs(a.priority - b.priority) < 0.001) {
                    return a.distance < b.distance;
                }
                return a.priority < b.priority;
            });

        // Return the best candidate
        const auto& best = sortedCandidates.front();

        SnapResult result;
        result.snapped = true;
        result.point = best.point;
        result.type = best.type;
        result.description = best.description;
        result.distance = best.distance;
        result.entityId = best.entityId;

        return result;
    }

    double TyrexSnapManager::calculatePriority(SnapType type) const
    {
        auto it = m_snapPriorities.find(type);
        return (it != m_snapPriorities.end()) ? it->second : 999.0;
    }

    std::vector<TyrexEntity*> TyrexSnapManager::getEntitiesNearPoint(
        const gp_Pnt2d& point, double tolerance)
    {
        std::vector<TyrexEntity*> result;

        if (!m_modelSpace) {
            return result;
        }

        // Get all entities and check distance
        auto allEntities = m_modelSpace->getAllEntities();

        for (const auto& entity : allEntities) {
            // TODO: Implement proper bounding box or distance check
            // For now, add all entities
            result.push_back(entity.get());
        }

        return result;
    }

    void TyrexSnapManager::setActiveSnapTypes(SnapTypes types)
    {
        if (m_activeSnapTypes != types) {
            m_activeSnapTypes = types;
            emit snapTypesChanged(types);
        }
    }

    TyrexSnapManager::SnapTypes TyrexSnapManager::getActiveSnapTypes() const
    {
        return m_activeSnapTypes;
    }

    void TyrexSnapManager::setSnapTolerance(double tolerance)
    {
        m_snapTolerance = tolerance;
    }

    double TyrexSnapManager::getSnapTolerance() const
    {
        return m_snapTolerance;
    }

    void TyrexSnapManager::setEnabled(bool enabled)
    {
        m_enabled = enabled;
        if (!enabled) {
            hideSnapIndicator();
        }
    }

    bool TyrexSnapManager::isEnabled() const
    {
        return m_enabled;
    }

    void TyrexSnapManager::setCanvasOverlay(TyrexCanvasOverlay* overlay)
    {
        m_canvasOverlay = overlay;
    }

    void TyrexSnapManager::setModelSpace(TyrexModelSpace* modelSpace)
    {
        m_modelSpace = modelSpace;
    }

    void TyrexSnapManager::setCoordinateConverter(std::unique_ptr<CoordinateConverter> converter)
    {
        m_converter = std::move(converter);
    }

    void TyrexSnapManager::showSnapIndicator(const SnapResult& result)
    {
        // TODO: Implement visual snap indicator
        // This would create/update an AIS object to show the snap point
        qDebug() << "Snap indicator at:" << result.description;
    }

    void TyrexSnapManager::hideSnapIndicator()
    {
        if (m_indicatorVisible && !m_snapIndicator.IsNull()) {
            // TODO: Remove indicator from context
            m_indicatorVisible = false;
        }
    }

} // namespace TyrexCAD