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
#include <QMetaObject>

namespace TyrexCAD {

    TyrexViewWidget::TyrexViewWidget(QWidget* parent)
        : QWidget(parent)
        , m_viewerManager(nullptr)
    {
        // Set widget properties for optimal OpenGL rendering
        setAttribute(Qt::WA_OpaquePaintEvent);
        setAttribute(Qt::WA_NoSystemBackground);
        setMouseTracking(true);  // Enable mouse tracking for hover events
        setFocusPolicy(Qt::StrongFocus);

        // Create layout
        QVBoxLayout* layout = new QVBoxLayout(this);
        layout->setContentsMargins(0, 0, 0, 0);
        layout->setSpacing(0);
        setLayout(layout);

        // Initialize manager instances
        initializeManagers();
    }

    TyrexViewWidget::~TyrexViewWidget() = default;

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

        // Setup view once widget becomes visible
        if (m_viewerManager) {
            // Use Qt::QueuedConnection to ensure this runs after the event is fully processed
            QMetaObject::invokeMethod(this, [this]() {
                m_viewerManager->fitAll();
                m_viewerManager->redraw();
                }, Qt::QueuedConnection);
        }
    }

    void TyrexViewWidget::initializeManagers()
    {
        // 1. Create the viewer manager first
        m_viewerManager = std::make_shared<TyrexViewerManager>(this);

        // 2. Create the interaction manager
        m_interactionManager = std::make_unique<TyrexInteractionManager>();

        // 3. Connect the managers
        if (m_viewerManager && m_interactionManager) {
            // Set viewer manager in interaction manager
            m_interactionManager->setViewerManager(m_viewerManager.get());

            // Set interaction manager in viewer manager
            m_viewerManager->setInteractionManager(m_interactionManager.get());

            qDebug() << "Viewer and interaction managers initialized and connected";

            // Initial view setup
            m_viewerManager->fitAll();
            m_viewerManager->redraw();
        }

        // 4. Emit initialization completed signal
        emit viewerInitialized();
    }

} // namespace TyrexCAD