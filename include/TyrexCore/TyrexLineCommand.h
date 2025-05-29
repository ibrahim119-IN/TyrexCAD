/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_LINE_COMMAND_H
#define TYREX_LINE_COMMAND_H

#include "TyrexCommands/TyrexCommand.h"
#include <gp_Pnt.hxx>
#include <AIS_Shape.hxx>

namespace TyrexCAD {

    // Forward declarations
    class TyrexModelSpace;
    class TyrexViewerManager;

    /**
     * @brief Interactive command for creating lines by selecting two points
     *
     * This command allows users to create lines by clicking two points in the 3D view.
     * It provides real-time preview of the line as the mouse moves between the first
     * and second point selections.
     *
     * Workflow:
     * 1. User activates line command
     * 2. Command waits for first point (click)
     * 3. Preview line follows mouse movement
     * 4. User clicks second point to finalize line
     * 5. TyrexLineEntity is created and added to model space
     * 6. Command completes and returns to idle state
     */
    class TyrexLineCommand : public TyrexCommand {
    public:
        /**
         * @brief Constructor
         * @param modelSpace Pointer to the model space for storing created entities
         * @param viewerManager Pointer to the viewer manager for 3D operations
         */
        TyrexLineCommand(TyrexModelSpace* modelSpace, TyrexViewerManager* viewerManager);

        /**
         * @brief Destructor - cleans up any preview objects
         */
        virtual ~TyrexLineCommand() override;

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

    private:
        /**
         * @brief Create the final line entity and add it to the model space
         * @return True if line was created successfully
         */
        bool createLine();

        /**
         * @brief Update the preview line to the current mouse position
         * @param currentPoint 3D coordinates to preview line endpoint
         */
        void updatePreview(const gp_Pnt& currentPoint);

        /**
         * @brief Clean up and remove the preview shape from the display
         */
        void cleanupPreview();

    private:
        TyrexModelSpace* m_modelSpace;          ///< Model space reference (not owned)
        TyrexViewerManager* m_viewerManager;    ///< Viewer manager reference (not owned)

        bool m_firstPointSet;                   ///< Whether first point has been selected
        gp_Pnt m_firstPoint;                    ///< First point of the line (start)
        gp_Pnt m_secondPoint;                   ///< Second point of the line (end)

        Handle(AIS_Shape) m_previewShape;       ///< Preview shape for dynamic display
    };

} // namespace TyrexCAD

#endif // TYREX_LINE_COMMAND_H