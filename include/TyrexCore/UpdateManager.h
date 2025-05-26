#ifndef TYREX_UPDATE_MANAGER_H
#define TYREX_UPDATE_MANAGER_H

#include <QObject>
#include <QTimer>
#include <QElapsedTimer>
#include <functional>
#include <unordered_set>

namespace TyrexCAD {

    /**
     * @brief Intelligent update manager to prevent excessive redraws
     *
     * This class manages update requests and batches them to improve performance
     * by avoiding redundant redraws and maintaining a stable frame rate.
     */
    class UpdateManager : public QObject {
        Q_OBJECT

    public:
        /**
         * @brief Update priority levels
         */
        enum class Priority {
            Low = 0,      // Can be deferred
            Normal = 1,   // Standard updates
            High = 2,     // Important updates
            Immediate = 3 // Must be done now
        };

        /**
         * @brief Constructor
         * @param parent Parent QObject
         * @param targetFps Target frames per second (default 60)
         */
        explicit UpdateManager(QObject* parent = nullptr, int targetFps = 60)
            : QObject(parent)
            , m_targetFrameTime(1000 / targetFps)
            , m_needsRedraw(false)
            , m_updatePending(false) {

            m_updateTimer.setSingleShot(true);
            connect(&m_updateTimer, &QTimer::timeout, this, &UpdateManager::performUpdate);

            m_frameTimer.start();
        }

        /**
         * @brief Request an update with specified priority
         * @param priority Update priority
         * @param updateFunc Optional function to execute during update
         */
        void requestUpdate(Priority priority = Priority::Normal,
            std::function<void()> updateFunc = nullptr) {
            m_needsRedraw = true;

            if (updateFunc) {
                m_updateFunctions.insert(updateFunc.target_type().hash_code());
                m_pendingUpdates.push_back(updateFunc);
            }

            if (priority == Priority::Immediate) {
                performUpdate();
            }
            else if (!m_updatePending) {
                scheduleUpdate(priority);
            }
        }

        /**
         * @brief Force immediate update
         */
        void forceUpdate() {
            performUpdate();
        }

        /**
         * @brief Check if update is pending
         */
        bool isUpdatePending() const {
            return m_updatePending;
        }

        /**
         * @brief Set target frame rate
         * @param fps Target frames per second
         */
        void setTargetFps(int fps) {
            m_targetFrameTime = 1000 / fps;
        }

    signals:
        /**
         * @brief Emitted when update should be performed
         */
        void updateRequested();

    private slots:
        void performUpdate() {
            if (!m_needsRedraw) {
                m_updatePending = false;
                return;
            }

            // Execute pending update functions
            for (const auto& func : m_pendingUpdates) {
                if (func) func();
            }
            m_pendingUpdates.clear();
            m_updateFunctions.clear();

            // Emit update signal
            emit updateRequested();

            // Reset state
            m_needsRedraw = false;
            m_updatePending = false;

            // Record frame time for adaptive scheduling
            m_lastFrameTime = m_frameTimer.elapsed();
            m_frameTimer.restart();
        }

    private:
        void scheduleUpdate(Priority priority) {
            m_updatePending = true;

            // Calculate delay based on priority and frame timing
            int delay = m_targetFrameTime;

            if (priority == Priority::High) {
                delay = std::min(5, m_targetFrameTime / 2);
            }
            else if (priority == Priority::Low) {
                delay = m_targetFrameTime * 2;
            }

            // Adaptive timing based on last frame time
            if (m_lastFrameTime > m_targetFrameTime * 1.5) {
                delay = std::max(delay, static_cast<int>(m_lastFrameTime * 0.8));
            }

            m_updateTimer.start(delay);
        }

    private:
        QTimer m_updateTimer;
        QElapsedTimer m_frameTimer;
        int m_targetFrameTime;
        qint64 m_lastFrameTime = 0;
        bool m_needsRedraw;
        bool m_updatePending;

        // Prevent duplicate update functions
        std::unordered_set<size_t> m_updateFunctions;
        std::vector<std::function<void()>> m_pendingUpdates;
    };

} // namespace TyrexCAD

#endif // TYREX_UPDATE_MANAGER_H