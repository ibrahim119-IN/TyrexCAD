/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>
#include <random>
#include "TyrexEntities/TyrexEntity.h"

namespace Tyrex {
    namespace Core {

        /**
         * @brief Entity manager for TyrexCAD system
         *
         * The TyrexEntityManager is responsible for managing all entities in the TyrexCAD system.
         * It provides methods to add, remove, and retrieve entities, as well as query information
         * about them. It is implemented as a singleton to ensure global access to the entity registry.
         */
        class TyrexEntityManager {
        public:
            /**
             * @brief Get the singleton instance
             *
             * @return Reference to the singleton instance
             */
            static TyrexEntityManager& getInstance();

            /**
             * @brief Destructor
             */
            ~TyrexEntityManager();

            /**
             * @brief Add entity to the manager
             *
             * @param entity Shared pointer to the entity to add
             * @return True if entity was successfully added, false if entity with the same ID already exists
             */
            bool addEntity(const std::shared_ptr<TyrexCAD::TyrexEntity>& entity);

            /**
             * @brief Remove entity from the manager
             *
             * @param entityId ID of the entity to remove
             * @return True if entity was found and removed, false otherwise
             */
            bool removeEntity(const std::string& entityId);

            /**
             * @brief Get entity by ID
             *
             * @param entityId ID of the entity to retrieve
             * @return Shared pointer to the entity, or nullptr if not found
             */
            std::shared_ptr<TyrexCAD::TyrexEntity> getEntity(const std::string& entityId) const;

            /**
             * @brief Check if entity exists
             *
             * @param entityId ID of the entity to check
             * @return True if entity exists, false otherwise
             */
            bool hasEntity(const std::string& entityId) const;

            /**
             * @brief Get the type of an entity
             *
             * @param entityId ID of the entity
             * @return String representing the entity type, or empty string if entity not found
             */
            std::string getEntityType(const std::string& entityId) const;

            /**
             * @brief Get the layer of an entity
             *
             * @param entityId ID of the entity
             * @return Name of the layer the entity belongs to, or empty string if entity not found
             */
            std::string getEntityLayer(const std::string& entityId) const;

            /**
             * @brief Get all entities
             *
             * @return Vector of all entities managed by the entity manager
             */
            std::vector<std::shared_ptr<TyrexCAD::TyrexEntity>> getAllEntities() const;

            /**
             * @brief Get entities by type
             *
             * @param typeName Type name to filter by
             * @return Vector of entities of the specified type
             */
            std::vector<std::shared_ptr<TyrexCAD::TyrexEntity>> getEntitiesByType(const std::string& typeName) const;

            /**
             * @brief Get entities by layer
             *
             * @param layerName Layer name to filter by
             * @return Vector of entities on the specified layer
             */
            std::vector<std::shared_ptr<TyrexCAD::TyrexEntity>> getEntitiesByLayer(const std::string& layerName) const;

            /**
             * @brief Generate a unique entity ID
             *
             * Uses a combination of prefix and random number to ensure uniqueness.
             *
             * @param prefix Optional prefix for the ID (default is "entity")
             * @return A unique entity ID not currently in use
             */
            std::string generateUniqueEntityId(const std::string& prefix = "entity") const;

            /**
             * @brief Clear all entities
             *
             * Removes all entities from the manager
             */
            void clearAllEntities();

            /**
             * @brief Save current ID counter to persistent storage
             *
             * Call this before closing the application to ensure
             * ID continuity across sessions.
             */
            void saveIdCounter();

            /**
             * @brief Load ID counter from persistent storage
             *
             * Call this when initializing the application to ensure
             * ID continuity across sessions.
             */
            void loadIdCounter();

        private:
            /**
             * @brief Private constructor (singleton pattern)
             */
            TyrexEntityManager();

            /**
             * @brief Deleted copy constructor (singleton pattern)
             */
            TyrexEntityManager(const TyrexEntityManager&) = delete;

            /**
             * @brief Deleted assignment operator (singleton pattern)
             */
            TyrexEntityManager& operator=(const TyrexEntityManager&) = delete;

            /// Storage for entities, mapped by ID for fast access
            std::unordered_map<std::string, std::shared_ptr<TyrexCAD::TyrexEntity>> m_entities;

            /// Counter for generating unique IDs
            mutable uint64_t m_idCounter;

            /// Random number generator for unique IDs
            mutable std::mt19937_64 m_rng;
        };

    } // namespace Core
} // namespace Tyrex