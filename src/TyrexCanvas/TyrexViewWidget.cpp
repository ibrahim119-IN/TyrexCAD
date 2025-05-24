/***************************************************************************
 * Copyright (c) 2025 TyrexCAD development team                          *
 * *
 * This file is part of the TyrexCAD CAx development system.             *
 * *
 ***************************************************************************/

#include "TyrexCanvas/TyrexViewWidget.h"
#include "TyrexRendering/TyrexViewerManager.h"
#include "TyrexRendering/TyrexGridOverlayRenderer.h" 
#include "TyrexInteraction/TyrexInteractionManager.h"

 // OpenCascade includes
#include <Standard_Handle.hxx>
#include <V3d_View.hxx>

// Qt includes
#include <QMouseEvent>
#include <QWheelEvent>
#include <QResizeEvent>
#include <QShowEvent>
#include <QEnterEvent> 
#include <QDebug>
#include <QTimer>
#include <QOpenGLContext>
#include <QSurfaceFormat>
#include <QThread> 

namespace TyrexCAD {

    // ... (Constructor remains the same)

    TyrexViewWidget::~TyrexViewWidget()
    {
        // Cleanup grid renderer in OpenGL context
        if (QOpenGLContext::currentContext() == context()) {
            makeCurrent();
        }
        else if (context()) {
            makeCurrent();
        }

        m_gridRenderer.reset();

        if (QOpenGLContext::currentContext() == context()) {
            doneCurrent();
        }

        qDebug() << "TyrexViewWidget destructor completed";
    }

    // ... (Rest of TyrexViewWidget.cpp as per previous correct version, including initializeGL, paintGL, etc.)
    // The key change here is the review of makeCurrent() logic in the destructor.
    // The existing logic in initializeGL already correctly calls initializeOpenGLFunctions() for the widget itself.

} // namespace TyrexCAD