/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexSketch/TyrexSketchCircleCommand.h"
#include "TyrexSketch/TyrexSketchManager.h"
#include "TyrexSketch/TyrexSketchCircleEntity.h"

 // Qt includes
#include <QDebug>
#include <sstream>
#include <iomanip>
#include <cmath>

namespace TyrexCAD {

    TyrexSketchCircleCommand::TyrexSketchCircleCommand(TyrexSketchManager* sketchManager,
        CircleDefinitionMethod method)
        : TyrexCommand("Sketch Circle")
        , m_sketchManager(sketchManager)
        , m_definitionMethod(method)
        , m_centerPointSet(false)
        , m_centerPoint(0, 0)
        , m_radiusPoint(0, 0)
        , m_minimumRadius(2.0)  // Increased minimum radius for better visibility
        , m_previewCircle(nullptr)
    {
        qDebug() << "TyrexSketchCircleCommand created";
    }

    TyrexSketchCircleCommand::~TyrexSketchCircleCommand()
    {
        cleanupPreview();
        qDebug() << "TyrexSketchCircleCommand destroyed";
    }

    void TyrexSketchCircleCommand::start()
    {
        TyrexCommand::start();

        // Reset state
        m_centerPointSet = false;
        m_centerPoint = gp_Pnt2d(0, 0);
        m_radiusPoint = gp_Pnt2d(0, 0);

        // Clean up any existing preview
        cleanupPreview();

        qDebug() << "Sketch circle command started - click to place center point";
    }

    void TyrexSketchCircleCommand::cancel()
    {
        // Clean up preview
        cleanupPreview();

        // Call base class cancel
        TyrexCommand::cancel();

        qDebug() << "Sketch circle command canceled";
    }

    bool TyrexSketchCircleCommand::isFinished() const
    {
        return m_isFinished;
    }

    void TyrexSketchCircleCommand::onMousePress(const QPoint& point)
    {
        if (!m_sketchManager) {
            qWarning() << "No sketch manager available";
            m_isFinished = true;
            return;
        }

        // Convert screen coordinates to 2D sketch coordinates
        gp_Pnt2d sketchPoint = m_sketchManager->screenToSketch(point);

        if (!m_centerPointSet) {
            // Set the center point
            m_centerPoint = sketchPoint;
            m_centerPointSet = true;

            qDebug() << QString("Center point set at (%1, %2)")
                .arg(m_centerPoint.X(), 0, 'f', 3)
                .arg(m_centerPoint.Y(), 0, 'f', 3);

            if (m_definitionMethod == CircleDefinitionMethod::CenterRadius) {
                qDebug() << QString("Move mouse and click to set radius (minimum: %1)")
                    .arg(m_minimumRadius);
            }
            else if (m_definitionMethod == CircleDefinitionMethod::CenterDiameter) {
                qDebug() << QString("Move mouse and click to set diameter (minimum: %1)")
                    .arg(m_minimumRadius * 2.0);
            }
        }
        else {
            // Set the radius/diameter point and create the circle
            m_radiusPoint = sketchPoint;

            qDebug() << QString("Radius point set at (%1, %2)")
                .arg(m_radiusPoint.X(), 0, 'f', 3)
                .arg(m_radiusPoint.Y(), 0, 'f', 3);

            // Calculate radius based on definition method
            double radius = 0.0;
            if (m_definitionMethod == CircleDefinitionMethod::CenterRadius) {
                radius = calculateRadius(m_centerPoint, m_radiusPoint);
            }
            else if (m_definitionMethod == CircleDefinitionMethod::CenterDiameter) {
                radius = calculateRadiusFromDiameter(m_centerPoint, m_radiusPoint);
            }

            qDebug() << QString("Calculated radius: %1 (minimum: %2)")
                .arg(radius, 0, 'f', 3)
                .arg(m_minimumRadius);

            // Validate circle with enhanced feedback
            if (!validateCircle(m_centerPoint, radius)) {
                qWarning() << QString("Circle too small! Radius %1 is below minimum of %2")
                    .arg(radius, 0, 'f', 3)
                    .arg(m_minimumRadius);

                // Don't finish command - let user try again
                qWarning() << "Try again with a larger radius";
                return;
            }

            // Create the actual circle entity
            if (createCircle()) {
                m_isFinished = true;
                qDebug() << QString("Circle command completed successfully with radius: %1")
                    .arg(radius, 0, 'f', 3);
            }
            else {
                qWarning() << "Failed to create circle entity";
                m_isFinished = true;
            }
        }
    }

    void TyrexSketchCircleCommand::onMouseMove(const QPoint& point)
    {
        if (!m_centerPointSet || !m_sketchManager) {
            return;
        }

        // Convert current mouse position to 2D coordinates
        gp_Pnt2d currentPoint = m_sketchManager->screenToSketch(point);

        // Calculate current radius
        double radius = 0.0;
        if (m_definitionMethod == CircleDefinitionMethod::CenterRadius) {
            radius = calculateRadius(m_centerPoint, currentPoint);
        }
        else if (m_definitionMethod == CircleDefinitionMethod::CenterDiameter) {
            radius = calculateRadiusFromDiameter(m_centerPoint, currentPoint);
        }

        // Only show preview if circle would be large enough
        if (radius >= m_minimumRadius) {
            updatePreview(currentPoint);
        }
        else {
            // Hide preview for too small circles
            cleanupPreview();
        }
    }

    void TyrexSketchCircleCommand::onMouseRelease(const QPoint& /*point*/)
    {
        // No specific action needed on mouse release for circle command
        // The click handling is done in onMousePress
    }

    void TyrexSketchCircleCommand::setDefinitionMethod(CircleDefinitionMethod method)
    {
        m_definitionMethod = method;
        qDebug() << "Circle definition method set to:" << static_cast<int>(method);
    }

    TyrexSketchCircleCommand::CircleDefinitionMethod TyrexSketchCircleCommand::getDefinitionMethod() const
    {
        return m_definitionMethod;
    }

    void TyrexSketchCircleCommand::setMinimumRadius(double minRadius)
    {
        m_minimumRadius = std::max(0.1, minRadius);
        qDebug() << "Minimum radius set to:" << m_minimumRadius;
    }

    double TyrexSketchCircleCommand::getMinimumRadius() const
    {
        return m_minimumRadius;
    }

    bool TyrexSketchCircleCommand::createCircle()
    {
        if (!m_sketchManager) {
            qCritical() << "Cannot create circle - sketch manager is null";
            return false;
        }

        // Clean up preview before creating final circle
        cleanupPreview();

        try {
            // Calculate final radius
            double radius = 0.0;
            if (m_definitionMethod == CircleDefinitionMethod::CenterRadius) {
                radius = calculateRadius(m_centerPoint, m_radiusPoint);
            }
            else if (m_definitionMethod == CircleDefinitionMethod::CenterDiameter) {
                radius = calculateRadiusFromDiameter(m_centerPoint, m_radiusPoint);
            }

            // Generate unique ID for the circle
            std::string circleId = generateCircleId();

            qDebug() << QString("Creating sketch circle with ID: %1, radius: %2")
                .arg(QString::fromStdString(circleId))
                .arg(radius, 0, 'f', 3);

            // Create the circle entity with explicit sketch plane
            auto circleEntity = std::make_shared<TyrexSketchCircleEntity>(
                circleId,
                m_sketchManager->sketchPlane(),
                m_centerPoint,
                radius
            );

            // Set sketch-specific color (orange for circles in sketch mode)
            Quantity_Color sketchColor(1.0, 0.5, 0.0, Quantity_TOC_RGB); // Orange
            circleEntity->setColor(sketchColor);

            // Force shape update before adding to manager
            circleEntity->updateShape();

            // Add the entity to sketch manager - this will display it
            m_sketchManager->addSketchEntity(circleEntity);

            // Force immediate redraw to ensure visibility
            m_sketchManager->redrawSketch();

            qDebug() << QString("Sketch circle entity created and displayed successfully");

            return true;
        }
        catch (const Standard_Failure& ex) {
            qCritical() << "OpenCascade error creating sketch circle:" << ex.GetMessageString();
            return false;
        }
        catch (const std::exception& ex) {
            qCritical() << "Error creating sketch circle:" << ex.what();
            return false;
        }
        catch (...) {
            qCritical() << "Unknown error creating sketch circle";
            return false;
        }
    }

    void TyrexSketchCircleCommand::updatePreview(const gp_Pnt2d& currentPoint)
    {
        if (!m_sketchManager) {
            return;
        }

        // Calculate radius for preview
        double radius = 0.0;
        if (m_definitionMethod == CircleDefinitionMethod::CenterRadius) {
            radius = calculateRadius(m_centerPoint, currentPoint);
        }
        else if (m_definitionMethod == CircleDefinitionMethod::CenterDiameter) {
            radius = calculateRadiusFromDiameter(m_centerPoint, currentPoint);
        }

        try {
            if (!m_previewCircle) {
                // Create new preview circle with unique ID
                std::string previewId = generateCircleId() + "_preview";
                m_previewCircle = std::make_shared<TyrexSketchCircleEntity>(
                    previewId,
                    m_sketchManager->sketchPlane(),
                    m_centerPoint,
                    radius
                );

                // Set preview appearance (gray dashed style)
                Quantity_Color previewColor(0.7, 0.7, 0.7, Quantity_TOC_RGB);
                m_previewCircle->setColor(previewColor);

                // Force shape creation
                m_previewCircle->updateShape();

                // Add to sketch manager temporarily
                m_sketchManager->addSketchEntity(m_previewCircle);
            }
            else {
                // Update existing preview circle radius
                m_previewCircle->setRadius(radius);
                m_previewCircle->updateShape();

                // Ensure it's displayed
                if (!m_sketchManager->context().IsNull()) {
                    m_previewCircle->draw(m_sketchManager->context(), false);
                }
            }

            // Force redraw to show preview
            m_sketchManager->redrawSketch();
        }
        catch (const std::exception& ex) {
            qWarning() << "Error updating circle preview:" << ex.what();
        }
        catch (...) {
            qWarning() << "Unknown error updating circle preview";
        }
    }

    void TyrexSketchCircleCommand::cleanupPreview()
    {
        if (m_previewCircle && m_sketchManager) {
            try {
                // Remove preview circle from sketch manager
                m_sketchManager->removeSketchEntity(m_previewCircle->getId());
                m_previewCircle = nullptr;

                // Force redraw to remove preview
                m_sketchManager->redrawSketch();

                qDebug() << "Preview circle cleaned up";
            }
            catch (const std::exception& ex) {
                qWarning() << "Error cleaning up preview:" << ex.what();
            }
            catch (...) {
                qWarning() << "Unknown error cleaning up preview";
            }
        }
    }

    double TyrexSketchCircleCommand::calculateRadius(const gp_Pnt2d& centerPt, const gp_Pnt2d& radiusPt) const
    {
        return centerPt.Distance(radiusPt);
    }

    double TyrexSketchCircleCommand::calculateRadiusFromDiameter(const gp_Pnt2d& centerPt, const gp_Pnt2d& diameterPt) const
    {
        // In diameter mode, the diameter point defines the end of a diameter
        // So radius is half the distance from center to diameter point
        return centerPt.Distance(diameterPt) * 0.5;
    }

    std::string TyrexSketchCircleCommand::generateCircleId() const
    {
        // Generate unique ID using timestamp and counter
        static int counter = 0;
        std::stringstream ss;
        ss << "sketch_circle_" << std::setfill('0') << std::setw(6) << ++counter;
        return ss.str();
    }

    bool TyrexSketchCircleCommand::validateCircle(const gp_Pnt2d& center, double radius) const
    {
        // Check minimum radius
        if (radius < m_minimumRadius) {
            return false;
        }

        // Check for reasonable maximum (optional safety check)
        const double MAX_RADIUS = 10000.0;
        if (radius > MAX_RADIUS) {
            qWarning() << QString("Circle too large! Maximum radius is %1").arg(MAX_RADIUS);
            return false;
        }

        return true;
    }

} // namespace TyrexCAD