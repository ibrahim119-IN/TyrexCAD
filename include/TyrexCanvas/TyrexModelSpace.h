#ifndef TYREX_MODEL_SPACE_H
#define TYREX_MODEL_SPACE_H

#include <memory>
#include <string>
#include <vector>
#include <QPoint>

// OpenCascade includes
#include <Standard_Handle.hxx>
#include <Standard_Type.hxx>
#include <Standard_DefineHandle.hxx>
#include <Standard_Real.hxx>
#include <gp_Pnt.hxx>

// Forward declarations for OpenCascade
class AIS_InteractiveContext;
class V3d_View;

namespace TyrexCAD {

    // Forward declaration
    class TyrexEntity;

    /**
     * @class TyrexModelSpace
     * @brief Container for all geometric entities in the CAD system
     */
    class TyrexModelSpace {
    public:
        /**
         * @brief Selection modes for entity selection
         */
        enum class SelectionMode {
            Replace,  ///< Replace existing selection
            Add,      ///< Add to existing selection
            Remove    ///< Remove from existing selection
        };

        /**
         * @brief Constructor
         * @param context AIS context for rendering
         */
        explicit TyrexModelSpace(const Handle(AIS_InteractiveContext)& context);

        /**
         * @brief Destructor
         */
        ~TyrexModelSpace();

        /**
         * @brief Add an entity to the model space
         * @param entity Entity to add
         */
        void addEntity(const std::shared_ptr<TyrexEntity>& entity);

        /**
         * @brief Remove an entity from the model space
         * @param id ID of entity to remove
         */
        void removeEntity(const std::string& id);

        /**
         * @brief Find entity by ID
         * @param id ID to search for
         * @return Shared pointer to the entity or nullptr if not found
         */
        std::shared_ptr<TyrexEntity> findEntityById(const std::string& id) const;

        /**
         * @brief Find entity at a specific point in 3D space
         * @param point Point in model coordinates
         * @param tolerance Distance tolerance for detection
         * @return Pointer to the entity or nullptr if not found
         */
        TyrexEntity* findEntityAtPoint(const gp_Pnt& point, Standard_Real tolerance = 5.0) const;

        /**
         * @brief Draw all entities
         */
        void drawAll();

        /**
         * @brief Clear all entities
         */
        void clear();

        /**
         * @brief Select an entity at the given screen point
         * @param screenPos Screen coordinates for selection
         * @param view View to use for coordinate conversion
         */
        void selectAtScreenPoint(const QPoint& screenPos, const Handle(V3d_View)& view);

        /**
         * @brief Select an entity with specified selection mode
         * @param screenPos Screen coordinates for selection
         * @param view View to use for coordinate conversion
         * @param mode Selection mode
         */
        void selectAtScreenPoint(const QPoint& screenPos, const Handle(V3d_View)& view,
            SelectionMode mode);

        /**
         * @brief Clear all current selection
         */
        void clearSelection();

        /**
         * @brief Get all currently selected entities
         * @return Vector of selected entities
         */
        std::vector<std::shared_ptr<TyrexEntity>> getSelectedEntities() const;

        /**
         * @brief Check if entity is selected in the context
         * @param entity Entity to check
         * @return True if entity is selected
         */
        bool isEntitySelected(const std::shared_ptr<TyrexEntity>& entity) const;

        /**
         * @brief Get the number of selected entities
         * @return Count of selected entities
         */
        size_t getSelectionCount() const;

    private:
        std::vector<std::shared_ptr<TyrexEntity>> m_entities;  ///< All entities in model space
        Handle(AIS_InteractiveContext) m_context;              ///< AIS context for rendering
    };

} // namespace TyrexCAD

#endif // TYREX_MODEL_SPACE_H