#ifndef TYREXVIEWERMANAGER_H
#define TYREXVIEWERMANAGER_H

#include <QObject>
#include <QPoint>
#include <memory>

// OpenCascade forward declarations
#include <Standard_Handle.hxx>
#include <AIS_InteractiveContext.hxx>
#include <V3d_Viewer.hxx>
#include <V3d_View.hxx>
#include <Aspect_Window.hxx>
#include <OpenGl_GraphicDriver.hxx>

QT_BEGIN_NAMESPACE
class QWidget;
class QMouseEvent;
class QWheelEvent;
QT_END_NAMESPACE

namespace TyrexCAD {

    // Forward declarations
    class TyrexInteractionManager;

    /**
     * @brief Manages the 3D viewer and rendering context
     *
     * This class encapsulates OpenCascade viewer functionality and provides
     * a Qt-friendly interface for 3D visualization.
     */
    class TyrexViewerManager : public QObject
    {
        Q_OBJECT

    public:
        explicit TyrexViewerManager(QObject* parent = nullptr);
        ~TyrexViewerManager();

        // Initialization
        void initializeViewer(QWidget* window);

        // Accessors
        Handle(AIS_InteractiveContext) context() const;
        Handle(V3d_View) view() const;
        Handle(V3d_Viewer) viewer() const;

        // View manipulation
        void fitAll();
        void redraw();
        void resizeViewer(int width, int height);

        // Camera modes
        void set2DMode();
        void set3DMode();
        bool is2DMode() const { return m_is2DMode; }

        // Mouse interaction
        void mousePress(QMouseEvent* event);
        void mouseMove(QMouseEvent* event);
        void mouseRelease(QMouseEvent* event);
        void mouseWheel(QWheelEvent* event);

        // Camera controls
        void pan(int dx, int dy);
        void rotate(int dx, int dy);
        void zoomAtPoint(const QPoint& center, double factor);

        // Interaction management
        void setInteractionManager(TyrexInteractionManager* manager);
        TyrexInteractionManager* interactionManager() const;

    signals:
        void viewChanged();
        void entitySelected(const Handle(AIS_InteractiveObject)& entity);
        void entityHighlighted(const Handle(AIS_InteractiveObject)& entity);

    private:
        // Helper methods
        void selectEntityAt(const QPoint& point);
        void highlightEntityAt(const QPoint& point);

    private:
        // OpenCascade components
        Handle(OpenGl_GraphicDriver) m_graphicDriver;
        Handle(V3d_Viewer) m_viewer;
        Handle(V3d_View) m_view;
        Handle(AIS_InteractiveContext) m_context;
        Handle(Aspect_Window) m_window;

        // Interaction
        TyrexInteractionManager* m_interactionManager = nullptr;

        // State
        bool m_is2DMode;
        QPoint m_lastMousePos;
    };

} // namespace TyrexCAD

#endif // TYREXVIEWERMANAGER_H