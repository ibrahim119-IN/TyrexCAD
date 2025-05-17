cmake_minimum_required(VERSION 3.20)
project(TyrexCAD LANGUAGES CXX)

# C++ Standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# AutoMOC/UIC/RCC for Qt
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)

# Build Type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Debug CACHE STRING "Build type" FORCE)
endif()

# ================== PATHS ==================
set(OCCT_ROOT_DIR "D:/OpenCascade/opencascade-7.9.0-vc14-64")
set(OCCT_INC_DIR "${OCCT_ROOT_DIR}/inc")
set(OCCT_LIB_DIR "${OCCT_ROOT_DIR}/win64/vc14/lib")
set(OCCT_DLL_DIR "${OCCT_ROOT_DIR}/win64/vc14/bin")

set(OCCT_3RDPARTY_DLL_DIR "D:/OpenCascade/3rdparty-vc14-64/win64/vc14/bin")

# ================== INCLUDE & LINK ==================
file(GLOB_RECURSE TYREXCAD_SOURCES src/*.cpp)
file(GLOB_RECURSE TYREXCAD_HEADERS include/*.h)

add_executable(TyrexCAD ${TYREXCAD_SOURCES} ${TYREXCAD_HEADERS})

target_include_directories(TyrexCAD PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${OCCT_INC_DIR}
)

target_link_directories(TyrexCAD PRIVATE
    ${OCCT_LIB_DIR}
)

target_link_libraries(TyrexCAD PRIVATE
    TKBool TKShHealing TKXDESTEP TKXDEIGES TKSTEP TKXSBase TKXCAF TKCAF TKLCAF TKGeomBase
    TKMath TKG3d TKG2d TKBRep TKTopAlgo TKPrim TKBO
    TKOpenGl TKService TKV3d TKernel
)

# ================== DLL Copy ==================
add_custom_command(TARGET TyrexCAD POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory "${OCCT_DLL_DIR}" "$<TARGET_FILE_DIR:TyrexCAD>"
    COMMAND ${CMAKE_COMMAND} -E copy_directory "${OCCT_3RDPARTY_DLL_DIR}" "$<TARGET_FILE_DIR:TyrexCAD>"
    COMMENT "✅ Copying all OpenCascade + 3rdparty DLLs"
)

message(STATUS "✅ OpenCascade Include: ${OCCT_INC_DIR}")
message(STATUS "✅ OpenCascade Libs   : ${OCCT_LIB_DIR}")
message(STATUS "✅ OpenCascade DLLs   : ${OCCT_DLL_DIR}")
