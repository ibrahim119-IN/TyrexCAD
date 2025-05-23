/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#ifndef TYREX_VIEWER_MANAGER_H
#define TYREX_VIEWER_MANAGER_H

#include <memory>
#include <QObject>
#include <QWidget>

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <Standard_DefineHandle.hxx>
#include <gp_Pnt.hxx>
#include <Standard_Real.hxx>

// Forward declarations for OpenCascade
class AIS_InteractiveContext;
class V3d_View;
class V3d_Viewer;
class Aspect_DisplayConnection;
class OpenGl_GraphicDriver;

namespace TyrexCAD {

    // Forward declarations
    class TyrexInteractionManager;

    /**
     * @brief Manages 3D viewing functionality
     */
    class TyrexViewerManager : public QObject {
        Q_OBJECT

    public:
        /**
         * @brief Constructor
         * @param parent Parent widget to render into
         */
        explicit TyrexViewerManager(QWidget* parent);

        /**
         * @brief Destructor
         */
        ~TyrexViewerManager();

        /**
         * @brief Get the OpenCascade interactive context
         * @return AIS context handle
         */
        Handle(AIS_InteractiveContext) context() const;

        /**
         * @brief Get the OpenCascade view
         * @return V3d view handle
         */
        Handle(V3d_View) view() const;

        /**
         * @brief Set the interaction manager
         * @param manager Pointer to interaction manager
         */
        void setInteractionManager(TyrexInteractionManager* manager);

        /**
         * @brief Get the interaction manager
         * @return Pointer to interaction manager
         */
        TyrexInteractionManager* interactionManager() const;

        /**
         * @brief Handle widget resize
         */
        void handleResize();

        /**
         * @brief Fit all objects in view
         */
        void fitAll();

        /**
         * @brief Redraw the view
         */
        void redraw();

        /**
         * @brief Pan the view by specified amounts
         * @param dx X movement amount
         * @param dy Y movement amount
         */
        void pan(int dx, int dy);

        /**
         * @brief Rotate the view by specified amounts
         * @param dx X rotation amount
         * @param dy Y rotation amount
         */
        void rotate(int dx, int dy);

        /**
         * @brief Zoom the view by a factor
         * @param factor Zoom factor (>1 zooms in, <1 zooms out)
         */
        void zoom(double factor);

        /**
         * @brief Highlight entity at screen position
         * @param position Screen coordinates
         */
        void highlightEntityAt(const QPoint& position);

        /**
         * @brief Select entity at screen position
         * @param position Screen coordinates
         */
        void selectEntityAt(const QPoint& position);

        /**
         * @brief Convert screen coordinates to model coordinates
         * @param screenPos Screen position
         * @return 3D point in model space
         */
        gp_Pnt screenToModel(const QPoint& screenPos) const;

        /**
         * @brief Handle the AIS interactive context for selection
         * @param context The AIS interactive context
         */
        void handleAIS_InteractiveContext(const Handle(AIS_InteractiveContext)& context);

        /**
         * @brief Handle the V3d view for display operations
         * @param view The V3d view
         */
        void handleV3d_View(const Handle(V3d_View)& view);

        /**
         * @brief Set view to 2D mode (orthographic with locked rotation)
         */
        void set2DMode();

        /**
         * @brief Set view to 3D mode (perspective with free rotation)
         */
        void set3DMode();

    private:
        // OpenCascade components
        Handle(V3d_Viewer) m_viewer;
        Handle(AIS_InteractiveContext) m_context;
        Handle(V3d_View) m_view;

        // Parent widget
        QWidget* m_parentWidget;

        // Interaction manager
        TyrexInteractionManager* m_interactionManager;

        // View state
        bool m_is2DMode;

        /**
         * @brief Initialize the viewer components
         */
        void initialize();
    };

} // namespace TyrexCAD

#endif // TYREX_VIEWER_MANAGER_H