#ifndef TYREX_SAFE_HANDLE_UTILS_H
#define TYREX_SAFE_HANDLE_UTILS_H

#include <QDebug>

/**
 * @brief Macro for safe Handle access with null checking
 *
 * Usage: SAFE_HANDLE_CALL(myHandle, DoSomething(param1, param2))
 */
#define SAFE_HANDLE_CALL(handle, call) \
    do { \
        if (!(handle).IsNull()) { \
            (handle)->call; \
        } else { \
            qWarning() << "Null handle in" << __FUNCTION__ << "at line" << __LINE__; \
        } \
    } while(0)

 /**
  * @brief Macro for safe Handle access with return value
  *
  * Usage: bool result = SAFE_HANDLE_CALL_RETURN(myHandle, GetSomething(), false)
  */
#define SAFE_HANDLE_CALL_RETURN(handle, call, defaultValue) \
    ((!(handle).IsNull()) ? (handle)->call : (defaultValue))

  /**
   * @brief Macro for safe Handle access with custom error handling
   *
   * Usage: SAFE_HANDLE_CALL_OR(myHandle, DoSomething(), { handleError(); })
   */
#define SAFE_HANDLE_CALL_OR(handle, call, errorBlock) \
    do { \
        if (!(handle).IsNull()) { \
            (handle)->call; \
        } else { \
            errorBlock \
        } \
    } while(0)

   /**
    * @brief Macro for checking if handle is valid with custom error message and return
    *
    * Usage: SAFE_HANDLE_CHECK_RETURN(myHandle, "Handle is null!", false)
    */
#define SAFE_HANDLE_CHECK_RETURN(handle, errorMsg, returnValue) \
    do { \
        if ((handle).IsNull()) { \
            qCritical() << errorMsg << "at" << __FUNCTION__ << "line" << __LINE__; \
            return returnValue; \
        } \
    } while(0)

    /**
     * @brief Macro for checking if multiple handles are valid
     *
     * Usage: if (HANDLES_VALID(handle1, handle2, handle3)) { ... }
     */
#define HANDLES_VALID(...) \
    ([]{ \
        for (auto& h : {__VA_ARGS__}) { \
            if (h.IsNull()) return false; \
        } \
        return true; \
    }())

namespace TyrexCAD {

    /**
     * @brief Utility class for Handle validation and safe access
     */
    class HandleUtils {
    public:
        /**
         * @brief Check if handle is valid (not null)
         */
        template<typename HandleType>
        static bool isValid(const HandleType& handle) {
            return !handle.IsNull();
        }

        /**
         * @brief Check if all handles in a collection are valid
         */
        template<typename... HandleTypes>
        static bool areAllValid(const HandleTypes&... handles) {
            return ((isValid(handles)) && ...);
        }

        /**
         * @brief Execute function if handle is valid
         */
        template<typename HandleType, typename Func>
        static void executeIfValid(const HandleType& handle, Func func) {
            if (!handle.IsNull()) {
                func(handle);
            }
        }

        /**
         * @brief Execute function if handle is valid, with error callback
         */
        template<typename HandleType, typename Func, typename ErrorFunc>
        static void executeIfValidOrError(const HandleType& handle, Func func, ErrorFunc errorFunc) {
            if (!handle.IsNull()) {
                func(handle);
            }
            else {
                errorFunc();
            }
        }
    };

} // namespace TyrexCAD

#endif // TYREX_SAFE_HANDLE_UTILS_H