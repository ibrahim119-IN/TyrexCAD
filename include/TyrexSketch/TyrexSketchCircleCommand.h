#ifndef TYREX_SKETCH_CIRCLE_COMMAND_H
#define TYREX_SKETCH_CIRCLE_COMMAND_H

#include "TyrexCommands/TyrexCommand.h"
#include <gp_Pnt2d.hxx>
#include <AIS_Shape.hxx>

namespace TyrexCAD {

    // Forward declarations
    class TyrexSketchManager;

    /**
     * @brief Command for creating circles in sketch mode
     */
    class TyrexSketchCircleCommand : public TyrexCommand {
    public:
        enum class CircleMode {
            CenterRadius,    // Click center, then radius point
            ThreePoints,     // Three points on circumference
            TwoPoints        // Two points as diameter
        };

        /**
         * @brief Constructor
         * @param sketchManager Pointer to sketch manager
         * @param mode Circle creation mode
         */
        TyrexSketchCircleCommand(TyrexSketchManager* sketchManager,
            CircleMode mode = CircleMode::CenterRadius);

        /**
         * @brief Destructor
         */
        virtual ~TyrexSketchCircleCommand() override;

        // Command interface implementation
        virtual void start() override;
        virtual void cancel() override;
        virtual bool isFinished() const override;
        virtual void onMousePress(const QPoint& point) override;
        virtual void onMouseMove(const QPoint& point) override;
        virtual void onMouseRelease(const QPoint& point) override;

        /**
         * @brief Set circle creation mode
         * @param mode New circle mode
         */
        void setMode(CircleMode mode) { m_mode = mode; }

        /**
         * @brief Get current circle mode
         * @return Current circle creation mode
         */
        CircleMode getMode() const { return m_mode; }

    private:
        /**
         * @brief Create the final circle entity
         * @return true if circle was created successfully
         */
        bool createCircle();

        /**
         * @brief Update preview based on current mode
         * @param currentPoint Current mouse position in sketch coordinates
         */
        void updatePreview(const gp_Pnt2d& currentPoint);

        /**
         * @brief Remove preview from display
         */
        void removePreview();

        /**
         * @brief Calculate circle from three points
         * @param p1 First point
         * @param p2 Second point
         * @param p3 Third point
         * @param center Output circle center
         * @param radius Output circle radius
         * @return true if circle can be calculated
         */
        bool calculateCircleFromThreePoints(const gp_Pnt2d& p1, const gp_Pnt2d& p2,
            const gp_Pnt2d& p3, gp_Pnt2d& center,
            double& radius);

    private:
        TyrexSketchManager* m_sketchManager;
        CircleMode m_mode;

        // Circle parameters
        bool m_centerPointSet;
        gp_Pnt2d m_centerPoint;
        gp_Pnt2d m_radiusPoint;

        // For three-point mode
        std::vector<gp_Pnt2d> m_points;

        // Preview
        Handle(AIS_Shape) m_previewShape;

        // State
        bool m_isCreating;
        double m_minimumRadius;
    };

} // namespace TyrexCAD

#endif // TYREX_SKETCH_CIRCLE_COMMAND_H