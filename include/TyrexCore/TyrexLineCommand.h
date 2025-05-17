/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_LINE_COMMAND_H
#define TYREX_LINE_COMMAND_H

#include "TyrexCore/TyrexCommand.h"
#include <gp_Pnt.hxx>
#include <AIS_Shape.hxx>

namespace TyrexCAD {

    // Forward declarations
    class TyrexModelSpace;
    class TyrexViewerManager;

    /**
     * @brief Command for creating a line by selecting two points
     */
    class TyrexLineCommand : public TyrexCommand {
    public:
        /**
         * @brief Constructor
         * @param modelSpace Pointer to the model space
         * @param viewerManager Pointer to the viewer manager
         */
        TyrexLineCommand(TyrexModelSpace* modelSpace, TyrexViewerManager* viewerManager);

        /**
         * @brief Destructor
         */
        virtual ~TyrexLineCommand() override;

        /**
         * @brief Start the command
         */
        virtual void start() override;

        /**
         * @brief Cancel the command
         */
        virtual void cancel() override;

        /**
         * @brief Check if command is finished
         */
        virtual bool isFinished() const override;

        /**
         * @brief Handle mouse press
         * @param point Mouse position
         */
        virtual void onMousePress(const QPoint& point) override;

        /**
         * @brief Handle mouse move
         * @param point Mouse position
         */
        virtual void onMouseMove(const QPoint& point) override;

        /**
         * @brief Handle mouse release
         * @param point Mouse position
         */
        virtual void onMouseRelease(const QPoint& point) override;

        /**
         * @brief Create the line between selected points
         */
        void createLine();

    private:
        TyrexModelSpace* m_modelSpace;          ///< Model space reference
        TyrexViewerManager* m_viewerManager;    ///< Viewer manager reference

        bool m_firstPointSet;                   ///< Whether first point is set
        gp_Pnt m_firstPoint;                    ///< First point of the line
        gp_Pnt m_secondPoint;                   ///< Second point of the line

        Handle(AIS_Shape) m_previewShape;       ///< Preview shape during drawing
    };

} // namespace TyrexCAD

#endif // TYREX_LINE_COMMAND_H