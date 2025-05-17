cmake_minimum_required(VERSION 3.20)
project(TyrexCAD LANGUAGES CXX)

# ===== C++ Settings =====
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# ===== Qt Auto Configuration =====
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)

# ===== Build Type Default =====
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "Debug" CACHE STRING "Build type" FORCE)
endif()
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")

# ===== OpenCascade Manual Setup =====
set(OPENCASCADE_DIR "D:/OpenCascade/opencascade-7.9.0-vc14-64" CACHE PATH "OpenCASCADE directory")
set(OPENCASCADE_INC_DIR "${OPENCASCADE_DIR}/inc")
set(OPENCASCADE_LIB_DIR "${OPENCASCADE_DIR}/win64/vc14/lib")
set(OPENCASCADE_DLL_DIR "${OPENCASCADE_DIR}/win64/vc14/bin")

# ===== 3rdparty Directory =====
set(THIRDPARTY_DIR "D:/OpenCascade/3rdparty-vc14-64")
set(THIRDPARTY_INC "${THIRDPARTY_DIR}/inc")
set(THIRDPARTY_LIB "${THIRDPARTY_DIR}/lib")
set(THIRDPARTY_DLL "${THIRDPARTY_DIR}/bin")

# ===== OCCT Modules =====
set(OCCT_MODULES
    TKernel TKMath TKCDF
    TKG2d TKG3d TKGeomBase TKBRep TKTopAlgo
    TKPrim TKBO TKShHealing TKMesh TKOffset TKFillet TKFeat
    TKSTEP TKXSBase TKBool TKXBase
    TKLCAF TKCAF TKXCAF
    TKXDESTEP TKXDEIGES TKBinXCAF TKXmlXCAF TKBinL TKXmlL
    TKOpenGl TKService TKV3d TKSTEP209 TKSTEPAttr TKSTEPBase
)

# ===== Project Structure =====
set(SRC_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)
set(INC_DIR ${CMAKE_CURRENT_SOURCE_DIR}/include)

file(GLOB_RECURSE TYREXCAD_SOURCES ${SRC_DIR}/*.cpp)
file(GLOB_RECURSE TYREXCAD_HEADERS ${INC_DIR}/*.h)

if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/main.cpp")
    list(APPEND TYREXCAD_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/main.cpp")
endif()

# ===== Qt & OpenGL =====
find_package(Qt5 REQUIRED COMPONENTS Core Gui Widgets OpenGL)
find_package(OpenGL REQUIRED)

# ===== Executable =====
add_executable(TyrexCAD ${TYREXCAD_SOURCES} ${TYREXCAD_HEADERS})

# ===== Includes & Linking =====
target_include_directories(TyrexCAD PRIVATE
    ${INC_DIR}
    ${CMAKE_BINARY_DIR}
    ${OPENCASCADE_INC_DIR}
    ${THIRDPARTY_INC}
)

target_link_directories(TyrexCAD PRIVATE
    ${OPENCASCADE_LIB_DIR}
    ${THIRDPARTY_LIB}
)

target_link_libraries(TyrexCAD PRIVATE
    Qt5::Core
    Qt5::Gui
    Qt5::Widgets
    Qt5::OpenGL
    ${OPENGL_LIBRARIES}
    ${OCCT_MODULES}
)

# ===== Definitions =====
target_compile_definitions(TyrexCAD PRIVATE
    QT_USE_QSTRINGBUILDER
    _DEBUG
)

# ===== DLL Copy Automation =====
add_custom_command(TARGET TyrexCAD POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E echo "✅ Copying required DLLs to output folder"
    COMMAND ${CMAKE_COMMAND} -E echo "Copying OpenCascade DLLs..."
    COMMAND ${CMAKE_COMMAND} -E copy_directory "${OPENCASCADE_DLL_DIR}" "$<TARGET_FILE_DIR:TyrexCAD>"
)

if(EXISTS "${THIRDPARTY_DLL}")
    add_custom_command(TARGET TyrexCAD POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E echo "Copying 3rdparty DLLs..."
        COMMAND ${CMAKE_COMMAND} -E copy_directory "${THIRDPARTY_DLL}" "$<TARGET_FILE_DIR:TyrexCAD>"
    )
else()
    message(WARNING "⚠️ 3rdparty DLL directory does not exist: ${THIRDPARTY_DLL}")
endif()

# ===== Build Summary =====
message(STATUS "========== TyrexCAD Configuration Summary ==========")
message(STATUS "OCCT Include Dir  : ${OPENCASCADE_INC_DIR}")
message(STATUS "OCCT Lib Dir      : ${OPENCASCADE_LIB_DIR}")
message(STATUS "OCCT DLL Dir      : ${OPENCASCADE_DLL_DIR}")
message(STATUS "3rdparty Include  : ${THIRDPARTY_INC}")
message(STATUS "3rdparty Libs     : ${THIRDPARTY_LIB}")
message(STATUS "3rdparty DLLs     : ${THIRDPARTY_DLL}")
message(STATUS "====================================================")
