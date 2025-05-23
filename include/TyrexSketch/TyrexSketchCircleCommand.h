#pragma once
/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_SKETCH_CIRCLE_COMMAND_H
#define TYREX_SKETCH_CIRCLE_COMMAND_H

#include "TyrexCore/TyrexCommand.h"
#include <gp_Pnt2d.hxx>
#include <AIS_Shape.hxx>
#include <memory>

namespace TyrexCAD {

    // Forward declarations
    class TyrexSketchManager;

    /**
     * @brief Interactive command for creating circles in sketch mode
     *
     * This command allows users to create circles by clicking center point and then
     * a point to define the radius. It provides real-time preview of the circle
     * as the mouse moves to define the radius.
     *
     * Workflow:
     * 1. User activates sketch circle command
     * 2. Command waits for center point (click)
     * 3. Preview circle follows mouse movement to show radius
     * 4. User clicks to set radius point and finalize circle
     * 5. TyrexSketchCircleEntity is created and added to sketch manager
     * 6. Command completes and returns to idle state
     */
    class TyrexSketchCircleCommand : public TyrexCommand {
    public:
        /**
         * @brief Methods for defining circle geometry
         */
        enum class CircleDefinitionMethod {
            CenterRadius,       ///< Center point + radius point
            CenterDiameter,     ///< Center point + diameter point
            ThreePoints         ///< Three points on circumference (future implementation)
        };

        /**
         * @brief Constructor
         * @param sketchManager Pointer to the sketch manager
         * @param method Method for defining the circle
         */
        explicit TyrexSketchCircleCommand(TyrexSketchManager* sketchManager,
            CircleDefinitionMethod method = CircleDefinitionMethod::CenterRadius);

        /**
         * @brief Destructor - cleans up any preview objects
         */
        virtual ~TyrexSketchCircleCommand() override;

        /**
         * @brief Start the command and reset to initial state
         */
        virtual void start() override;

        /**
         * @brief Cancel the command and clean up any preview
         */
        virtual void cancel() override;

        /**
         * @brief Check if command is finished
         * @return True if command has completed (successfully or unsuccessfully)
         */
        virtual bool isFinished() const override;

        /**
         * @brief Handle mouse press events
         * @param point Screen coordinates of the mouse press
         *
         * First press sets the center, second press sets radius and creates circle
         */
        virtual void onMousePress(const QPoint& point) override;

        /**
         * @brief Handle mouse move events
         * @param point Current screen coordinates of the mouse
         *
         * Updates the preview circle from center to current mouse position
         */
        virtual void onMouseMove(const QPoint& point) override;

        /**
         * @brief Handle mouse release events
         * @param point Screen coordinates of the mouse release
         */
        virtual void onMouseRelease(const QPoint& point) override;

        /**
         * @brief Set the circle definition method
         * @param method New definition method
         */
        void setDefinitionMethod(CircleDefinitionMethod method);

        /**
         * @brief Get the current circle definition method
         * @return Current definition method
         */
        CircleDefinitionMethod getDefinitionMethod() const;

        /**
         * @brief Set minimum radius for circle creation
         * @param minRadius Minimum radius (must be positive)
         */
        void setMinimumRadius(double minRadius);

        /**
         * @brief Get the minimum radius
         * @return Current minimum radius
         */
        double getMinimumRadius() const;

    private:
        TyrexSketchManager* m_sketchManager;         ///< Sketch manager reference (not owned)
        CircleDefinitionMethod m_definitionMethod;  ///< Method for defining circle

        bool m_centerPointSet;                       ///< Whether center point has been selected
        gp_Pnt2d m_centerPoint;                      ///< Center point of the circle
        gp_Pnt2d m_radiusPoint;                      ///< Point defining the radius
        double m_minimumRadius;                      ///< Minimum allowed radius

        Handle(AIS_Shape) m_previewShape;            ///< Real-time preview shape

        /**
         * @brief Create the final circle entity and add it to the sketch manager
         * @return True if circle was created successfully
         */
        bool createCircle();

        /**
         * @brief Update the preview circle to the current mouse position
         * @param currentPoint 2D coordinates for radius calculation
         */
        void updatePreview(const gp_Pnt2d& currentPoint);

        /**
         * @brief Remove the current preview shape from display
         */
        void removePreview();

        /**
         * @brief Calculate radius from center and current point
         * @param centerPt Center point
         * @param radiusPt Point on circumference
         * @return Calculated radius
         */
        double calculateRadius(const gp_Pnt2d& centerPt, const gp_Pnt2d& radiusPt) const;

        /**
         * @brief Calculate diameter from center and current point
         * @param centerPt Center point
         * @param diameterPt Point defining diameter
         * @return Calculated radius (half of diameter)
         */
        double calculateRadiusFromDiameter(const gp_Pnt2d& centerPt, const gp_Pnt2d& diameterPt) const;

        /**
         * @brief Generate unique ID for the new circle
         * @return Unique circle ID
         */
        std::string generateCircleId() const;

        /**
         * @brief Validate that the circle would be geometrically valid
         * @param center Center point
         * @param radius Proposed radius
         * @return True if circle would be valid
         */
        bool validateCircle(const gp_Pnt2d& center, double radius) const;
    };

} // namespace TyrexCAD

#endif // TYREX_SKETCH_CIRCLE_COMMAND_H