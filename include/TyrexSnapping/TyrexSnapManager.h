#ifndef TYREX_SNAP_MANAGER_H
#define TYREX_SNAP_MANAGER_H

#include <QObject>
#include <QPoint>
#include <memory>
#include <vector>
#include <map>
#include <gp_Pnt2d.hxx>
#include <V3d_View.hxx>
#include <AIS_InteractiveObject.hxx>

namespace TyrexCAD {

    // Forward declarations
    class TyrexCanvasOverlay;
    class TyrexModelSpace;
    class CoordinateConverter;
    class TyrexEntity;

    /**
     * @brief Unified snap management system
     *
     * Provides intelligent snapping to grid, objects, and geometric features
     * with priority-based selection of snap points.
     */
    class TyrexSnapManager : public QObject {
        Q_OBJECT

    public:
        /**
         * @brief Available snap types
         */
        enum SnapType {
            None = 0x00,
            Grid = 0x01,
            Endpoint = 0x02,
            Midpoint = 0x04,
            Center = 0x08,
            Intersection = 0x10,
            Perpendicular = 0x20,
            Tangent = 0x40,
            Nearest = 0x80
        };
        Q_DECLARE_FLAGS(SnapTypes, SnapType)

            /**
             * @brief Result of a snap operation
             */
            struct SnapResult {
            bool snapped = false;          ///< Whether a snap occurred
            gp_Pnt2d point;               ///< The snapped point
            SnapType type = None;         ///< Type of snap that occurred
            QString description;          ///< Human-readable description
            double distance = 0.0;        ///< Distance from original point
            std::string entityId;         ///< ID of entity if object snap
        };

        /**
         * @brief Constructor
         * @param parent Parent QObject
         */
        explicit TyrexSnapManager(QObject* parent = nullptr);

        /**
         * @brief Destructor
         */
        ~TyrexSnapManager();

        /**
         * @brief Main snap function
         * @param screenPos Screen position to snap from
         * @param view Current 3D view
         * @return Snap result with snapped point and metadata
         */
        SnapResult snap(const QPoint& screenPos, const Handle(V3d_View)& view);

        /**
         * @brief Snap a world point
         * @param worldPos World position to snap
         * @return Snap result
         */
        SnapResult snapWorldPoint(const gp_Pnt2d& worldPos);

        /**
         * @brief Enable/disable snap types
         * @param types Combination of snap types to enable
         */
        void setActiveSnapTypes(SnapTypes types);

        /**
         * @brief Get currently active snap types
         * @return Active snap types
         */
        SnapTypes getActiveSnapTypes() const;

        /**
         * @brief Set snap tolerance in pixels
         * @param tolerance Tolerance in pixels
         */
        void setSnapTolerance(double tolerance);

        /**
         * @brief Get current snap tolerance
         * @return Tolerance in pixels
         */
        double getSnapTolerance() const;

        /**
         * @brief Enable/disable all snapping
         * @param enabled True to enable snapping
         */
        void setEnabled(bool enabled);

        /**
         * @brief Check if snapping is enabled
         * @return True if enabled
         */
        bool isEnabled() const;

        /**
         * @brief Set canvas overlay for grid snapping
         * @param overlay Canvas overlay instance
         */
        void setCanvasOverlay(TyrexCanvasOverlay* overlay);

        /**
         * @brief Set model space for object snapping
         * @param modelSpace Model space instance
         */
        void setModelSpace(TyrexModelSpace* modelSpace);

        /**
         * @brief Set coordinate converter
         * @param converter Coordinate converter instance
         */
        void setCoordinateConverter(std::unique_ptr<CoordinateConverter> converter);

        /**
         * @brief Show snap indicator at position
         * @param result Snap result to visualize
         */
        void showSnapIndicator(const SnapResult& result);

        /**
         * @brief Hide snap indicator
         */
        void hideSnapIndicator();

    signals:
        /**
         * @brief Emitted when a snap occurs
         * @param result Details of the snap
         */
        void snapOccurred(const SnapResult& result);

        /**
         * @brief Emitted when snap types change
         * @param types New active types
         */
        void snapTypesChanged(SnapTypes types);

    private:
        /**
         * @brief Internal snap candidate structure
         */
        struct SnapCandidate {
            gp_Pnt2d point;
            SnapType type;
            double distance;
            double priority;
            QString description;
            std::string entityId;
        };

        // Snap checking methods
        void checkGridSnap(const gp_Pnt2d& worldPos, std::vector<SnapCandidate>& candidates);
        void checkEndpointSnap(const gp_Pnt2d& worldPos, std::vector<SnapCandidate>& candidates);
        void checkMidpointSnap(const gp_Pnt2d& worldPos, std::vector<SnapCandidate>& candidates);
        void checkCenterSnap(const gp_Pnt2d& worldPos, std::vector<SnapCandidate>& candidates);
        void checkIntersectionSnap(const gp_Pnt2d& worldPos, std::vector<SnapCandidate>& candidates);
        void checkNearestSnap(const gp_Pnt2d& worldPos, std::vector<SnapCandidate>& candidates);

        // Utility methods
        SnapResult selectBestSnap(const std::vector<SnapCandidate>& candidates,
            const gp_Pnt2d& originalPoint);
        double calculatePriority(SnapType type) const;
        double convertToWorldTolerance(double pixelTolerance, const Handle(V3d_View)& view);
        std::vector<TyrexEntity*> getEntitiesNearPoint(const gp_Pnt2d& point, double tolerance);

    private:
        // Configuration
        SnapTypes m_activeSnapTypes;
        double m_snapTolerance;      // In pixels
        bool m_enabled;

        // Dependencies
        TyrexCanvasOverlay* m_canvasOverlay;
        TyrexModelSpace* m_modelSpace;
        std::unique_ptr<CoordinateConverter> m_converter;

        // Snap indicator
        Handle(AIS_InteractiveObject) m_snapIndicator;
        bool m_indicatorVisible;

        // Priority configuration
        std::map<SnapType, double> m_snapPriorities;
    };

    Q_DECLARE_OPERATORS_FOR_FLAGS(TyrexSnapManager::SnapTypes)

} // namespace TyrexCAD

#endif // TYREX_SNAP_MANAGER_H