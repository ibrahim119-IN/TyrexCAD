/***************************************************************************
 *   Copyright (c) 2025 TyrexCAD development team                          *
 *                                                                         *
 *   This file is part of the TyrexCAD CAx development system.             *
 *                                                                         *
 ***************************************************************************/

#include "TyrexCore/TyrexEntityManager.h"
#include <algorithm>
#include <sstream>
#include <iomanip>
#include <random>
#include <fstream>
#include <limits>

namespace Tyrex {
    namespace Core {

        TyrexEntityManager& TyrexEntityManager::getInstance()
        {
            static TyrexEntityManager instance;
            return instance;
        }

        TyrexEntityManager::TyrexEntityManager()
            : m_idCounter(0)
            , m_rng(std::random_device{}())
        {
            // Initialize RNG and load counter from storage if available
            loadIdCounter();
        }

        TyrexEntityManager::~TyrexEntityManager()
        {
            // Save current counter to storage
            saveIdCounter();
        }

        bool TyrexEntityManager::addEntity(const std::shared_ptr<TyrexCAD::TyrexEntity>& entity)
        {
            if (!entity) {
                return false;
            }

            const std::string& entityId = entity->getId();

            // Check if entity with this ID already exists
            if (m_entities.find(entityId) != m_entities.end()) {
                return false;
            }

            // Add entity to the map
            m_entities[entityId] = entity;
            return true;
        }

        bool TyrexEntityManager::removeEntity(const std::string& entityId)
        {
            return m_entities.erase(entityId) > 0;
        }

        std::shared_ptr<TyrexCAD::TyrexEntity> TyrexEntityManager::getEntity(const std::string& entityId) const
        {
            auto it = m_entities.find(entityId);
            if (it != m_entities.end()) {
                return it->second;
            }
            return nullptr;
        }

        bool TyrexEntityManager::hasEntity(const std::string& entityId) const
        {
            return m_entities.find(entityId) != m_entities.end();
        }

        std::string TyrexEntityManager::getEntityType(const std::string& entityId) const
        {
            auto entity = getEntity(entityId);
            if (entity) {
                return entity->getTypeName();
            }
            return std::string();
        }

        std::string TyrexEntityManager::getEntityLayer(const std::string& entityId) const
        {
            auto entity = getEntity(entityId);
            if (entity) {
                return entity->getLayerName();
            }
            return std::string();
        }

        std::vector<std::shared_ptr<TyrexCAD::TyrexEntity>> TyrexEntityManager::getAllEntities() const
        {
            std::vector<std::shared_ptr<TyrexCAD::TyrexEntity>> result;
            result.reserve(m_entities.size());

            for (const auto& pair : m_entities) {
                result.push_back(pair.second);
            }

            return result;
        }

        std::vector<std::shared_ptr<TyrexCAD::TyrexEntity>> TyrexEntityManager::getEntitiesByType(
            const std::string& typeName) const
        {
            std::vector<std::shared_ptr<TyrexCAD::TyrexEntity>> result;

            for (const auto& pair : m_entities) {
                if (pair.second->getTypeName() == typeName) {
                    result.push_back(pair.second);
                }
            }

            return result;
        }

        std::vector<std::shared_ptr<TyrexCAD::TyrexEntity>> TyrexEntityManager::getEntitiesByLayer(
            const std::string& layerName) const
        {
            std::vector<std::shared_ptr<TyrexCAD::TyrexEntity>> result;

            for (const auto& pair : m_entities) {
                if (pair.second->getLayerName() == layerName) {
                    result.push_back(pair.second);
                }
            }

            return result;
        }

        std::string TyrexEntityManager::generateUniqueEntityId(const std::string& prefix) const
        {
            std::string candidateId;

            // Generate a random value combined with counter to ensure uniqueness
            std::uniform_int_distribution<uint64_t> dist(0, std::numeric_limits<uint64_t>::max());

            do {
                std::stringstream ss;
                ss << prefix << "_" << std::hex << (dist(m_rng) ^ (++m_idCounter));
                candidateId = ss.str();
            } while (hasEntity(candidateId));

            return candidateId;
        }

        void TyrexEntityManager::clearAllEntities()
        {
            m_entities.clear();
        }

        void TyrexEntityManager::saveIdCounter()
        {
            // Save counter to a file for persistence across sessions
            try {
                std::ofstream file("tyrex_id_counter.dat", std::ios::binary);
                if (file.is_open()) {
                    file.write(reinterpret_cast<const char*>(&m_idCounter), sizeof(m_idCounter));
                }
            }
            catch (const std::exception&) {
                // Handle file write errors gracefully
            }
        }

        void TyrexEntityManager::loadIdCounter()
        {
            // Load counter from file if it exists
            try {
                std::ifstream file("tyrex_id_counter.dat", std::ios::binary);
                if (file.is_open() && file.good()) {
                    file.read(reinterpret_cast<char*>(&m_idCounter), sizeof(m_idCounter));
                }
            }
            catch (const std::exception&) {
                // If loading fails, keep the default initialized value
                m_idCounter = 0;
            }
        }

    } // namespace Core
} // namespace Tyrex