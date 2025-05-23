#pragma once
/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_SKETCH_LINE_COMMAND_H
#define TYREX_SKETCH_LINE_COMMAND_H

#include "TyrexCore/TyrexCommand.h"
#include <gp_Pnt2d.hxx>
#include <memory>

namespace TyrexCAD {

    // Forward declarations
    class TyrexSketchManager;
    class TyrexSketchLineEntity;

    /**
     * @brief Interactive command for creating lines in sketch mode
     *
     * This command allows users to create lines by clicking two points in the 2D sketch plane.
     * It provides real-time preview of the line as the mouse moves between the first
     * and second point selections.
     *
     * Workflow:
     * 1. User activates sketch line command
     * 2. Command waits for first point (click)
     * 3. Preview line follows mouse movement
     * 4. User clicks second point to finalize line
     * 5. TyrexSketchLineEntity is created and added to sketch manager
     * 6. Command can continue for multiple lines or finish
     */
    class TyrexSketchLineCommand : public TyrexCommand {
    public:
        /**
         * @brief Constructor
         * @param sketchManager Pointer to the sketch manager
         */
        explicit TyrexSketchLineCommand(TyrexSketchManager* sketchManager);

        /**
         * @brief Destructor - cleans up any preview objects
         */
        virtual ~TyrexSketchLineCommand() override;

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
         * First press sets the start point, second press sets end point and creates line
         */
        virtual void onMousePress(const QPoint& point) override;

        /**
         * @brief Handle mouse move events
         * @param point Current screen coordinates of the mouse
         *
         * Updates the preview line from first point to current mouse position
         */
        virtual void onMouseMove(const QPoint& point) override;

        /**
         * @brief Handle mouse release events
         * @param point Screen coordinates of the mouse release
         */
        virtual void onMouseRelease(const QPoint& point) override;

        /**
         * @brief Enable/disable continuous line mode
         * In continuous mode, the end point of the previous line becomes
         * the start point of the next line
         * @param continuous True to enable continuous mode
         */
        void setContinuousMode(bool continuous);

        /**
         * @brief Check if continuous mode is enabled
         * @return True if in continuous mode
         */
        bool isContinuousMode() const;

    private:
        TyrexSketchManager* m_sketchManager;         ///< Sketch manager reference (not owned)

        bool m_firstPointSet;                        ///< Whether first point has been selected
        gp_Pnt2d m_firstPoint;                       ///< First point of the line (start)
        gp_Pnt2d m_secondPoint;                      ///< Second point of the line (end)

        bool m_continuousMode;                       ///< Continuous line drawing mode
        std::shared_ptr<TyrexSketchLineEntity> m_previewLine;  ///< Legacy preview line entity
        Handle(AIS_Shape) m_previewShape;            ///< Real-time preview shape

        /**
         * @brief Create the final line entity and add it to the sketch manager
         * @return True if line was created successfully
         */
        bool createLine();

        /**
         * @brief Update the preview line to the current mouse position
         * @param currentPoint 2D coordinates to preview line endpoint
         */
        void updatePreview(const gp_Pnt2d& currentPoint);

        /**
         * @brief Remove the current preview shape from display
         */
        void removePreview();

        /**
         * @brief Clean up and remove all preview objects
         */
        void cleanupPreview();

        /**
         * @brief Generate unique ID for the new line
         * @return Unique line ID
         */
        std::string generateLineId() const;
    };

} // namespace TyrexCAD

#endif // TYREX_SKETCH_LINE_COMMAND_H