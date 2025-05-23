/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexInteraction/TyrexInteractionManager.h"

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <Standard_DefineHandle.hxx>
#include <V3d_View.hxx>

// Qt includes
#include <QMouseEvent>
#include <QWheelEvent>
#include <QResizeEvent>
#include <QShowEvent>
#include <QVBoxLayout>
#include <QDebug>
#include <QTimer>

namespace TyrexCAD {

    TyrexViewWidget::TyrexViewWidget(QWidget* parent)
        : QWidget(parent)
        , m_viewerManager(nullptr)
        , m_interactionManager(nullptr)
    {
        // Set widget properties for optimal OpenGL rendering
        setAttribute(Qt::WA_OpaquePaintEvent);
        setAttribute(Qt::WA_NoSystemBackground);
        setMouseTracking(true);  // Enable mouse tracking for hover events
        setFocusPolicy(Qt::StrongFocus);

        // Set minimum size
        setMinimumSize(400, 300);

        qDebug() << "TyrexViewWidget constructed";

        // Initialize immediately - don't wait for show event
        QTimer::singleShot(50, this, &TyrexViewWidget::initializeManagers);
    }

    TyrexViewWidget::~TyrexViewWidget()
    {
        qDebug() << "TyrexViewWidget destructor";
    }

    std::shared_ptr<TyrexViewerManager> TyrexViewWidget::viewerManager() const
    {
        return m_viewerManager;
    }

    TyrexInteractionManager* TyrexViewWidget::interactionManager() const
    {
        return m_interactionManager.get();
    }

    void TyrexViewWidget::mousePressEvent(QMouseEvent* e)
    {
        if (m_interactionManager) {
            m_interactionManager->onMousePress(e->button(), e->pos());
        }
        e->accept(); // Prevent event propagation
    }

    void TyrexViewWidget::mouseMoveEvent(QMouseEvent* e)
    {
        if (m_interactionManager) {
            m_interactionManager->onMouseMove(e->pos(), e->modifiers());
        }
        e->accept(); // Prevent event propagation
    }

    void TyrexViewWidget::mouseReleaseEvent(QMouseEvent* e)
    {
        if (m_interactionManager) {
            m_interactionManager->onMouseRelease(e->button(), e->pos());
        }
        e->accept(); // Prevent event propagation
    }

    void TyrexViewWidget::wheelEvent(QWheelEvent* e)
    {
        if (m_interactionManager) {
            m_interactionManager->onMouseWheel(e->angleDelta().y(), e->position().toPoint());
        }
        e->accept(); // Prevent event propagation
    }

    void TyrexViewWidget::resizeEvent(QResizeEvent* e)
    {
        QWidget::resizeEvent(e);

        // Notify view manager of size change
        if (m_viewerManager) {
            m_viewerManager->handleResize();
        }
    }

    void TyrexViewWidget::showEvent(QShowEvent* e)
    {
        QWidget::showEvent(e);
        qDebug() << "TyrexViewWidget::showEvent called";

        // Ensure initialization happens
        if (!m_viewerManager) {
            QTimer::singleShot(100, this, &TyrexViewWidget::initializeManagers);
        }
    }

    void TyrexViewWidget::initializeManagers()
    {
        if (m_viewerManager) {
            qDebug() << "Managers already initialized, skipping";
            return;
        }

        qDebug() << "Starting manager initialization...";

        try {
            // 1. Create the viewer manager first
            m_viewerManager = std::make_shared<TyrexViewerManager>(this);

            // 2. Verify viewer manager creation
            if (!m_viewerManager) {
                qCritical() << "Failed to create viewer manager!";
                return;
            }

            Handle(AIS_InteractiveContext) context = m_viewerManager->context();
            Handle(V3d_View) view = m_viewerManager->view();

            if (context.IsNull() || view.IsNull()) {
                qCritical() << "Viewer manager created but context/view is null!";
                return;
            }

            // 3. Create the interaction manager
            m_interactionManager = std::make_unique<TyrexInteractionManager>();

            // 4. Verify interaction manager creation
            if (!m_interactionManager) {
                qCritical() << "Failed to create interaction manager!";
                return;
            }

            // 5. Connect the managers
            m_interactionManager->setViewerManager(m_viewerManager.get());
            m_viewerManager->setInteractionManager(m_interactionManager.get());

            qDebug() << "Viewer and interaction managers initialized successfully";

            // 6. Setup initial view
            view->SetProj(V3d_Zpos);  // Top view
            view->SetImmediateUpdate(Standard_True);
            view->FitAll();
            view->Redraw();

            // 7. Emit initialization completed signal
            emit viewerInitialized();

            qDebug() << "Manager initialization completed - signal emitted";
        }
        catch (const Standard_Failure& ex) {
            qCritical() << "OpenCascade error during initialization:" << ex.GetMessageString();
        }
        catch (const std::exception& ex) {
            qCritical() << "Error during initialization:" << ex.what();
        }
        catch (...) {
            qCritical() << "Unknown error during initialization";
        }
    }

} // namespace TyrexCAD