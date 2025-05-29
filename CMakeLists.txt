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


# ================== OpenCascade Paths ==================
set(OCCT_INSTALL_DIR "D:/OpenCascade/install")
set(OCCT_INC_DIR "${OCCT_INSTALL_DIR}/inc")
set(OCCT_LIB_DIR "${OCCT_INSTALL_DIR}/win64/vc14/lib")
set(OCCT_DLL_DIR "${OCCT_INSTALL_DIR}/win64/vc14/bin")

# Enable OpenCascade debug mode
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_definitions(-DOCCT_DEBUG)
    add_definitions(-DDEBUG)
    add_definitions(-DOCCT_DEBUG_FPE)
    add_definitions(-DOCCT_DEBUG_CHRONOMETER)
    
    # Enable verbose output
    set(CMAKE_VERBOSE_MAKEFILE ON)
    
    # Add debug flags
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -DOCCT_DEBUG_FPE")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -DOCCT_DEBUG_CHRONOMETER")
    
    message(STATUS "OpenCascade debug mode enabled")
endif()

# For Visual Studio
if(MSVC)
    # Enable debug information
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} /Zi")
    set(CMAKE_SHARED_LINKER_FLAGS_DEBUG "${CMAKE_SHARED_LINKER_FLAGS_DEBUG} /DEBUG")
    
    # Disable optimizations in debug
    string(REPLACE "/O2" "/Od" CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG}")
endif()

# ================== Qt Integration (via vcpkg) ==================
set(CMAKE_PREFIX_PATH "D:/Tools/vcpkg/installed/x64-windows")
set(Qt5_DIR "D:/Tools/vcpkg/installed/x64-windows/share/qt5-base")
find_package(Qt5 REQUIRED COMPONENTS Core Gui Widgets OpenGL)

# ================== Sources ==================
# Automatically find all source and header files
file(GLOB_RECURSE TYREXCAD_SOURCES 
    ${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp
)
file(GLOB_RECURSE TYREXCAD_HEADERS 
    ${CMAKE_CURRENT_SOURCE_DIR}/include/*.h
)

# Remove duplicate entries if any
list(REMOVE_DUPLICATES TYREXCAD_SOURCES)
list(REMOVE_DUPLICATES TYREXCAD_HEADERS)

# Create executable
add_executable(TyrexCAD 
    ${TYREXCAD_SOURCES} 
    ${TYREXCAD_HEADERS}
)

# Qt definitions
target_compile_definitions(TyrexCAD PRIVATE QT_WIDGETS_LIB)

# ================== Include Directories ==================
target_include_directories(TyrexCAD PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${OCCT_INC_DIR}
)

# ================== Library Directories ==================
target_link_directories(TyrexCAD PRIVATE
    ${OCCT_LIB_DIR}
)

# ================== Linking ==================
target_link_libraries(TyrexCAD PRIVATE
    Qt5::Core
    Qt5::Gui
    Qt5::Widgets
    Qt5::OpenGL

    TKBool TKShHealing TKDESTEP TKDEIGES TKXSBase TKXCAF TKCAF TKLCAF
    TKGeomBase TKMath TKG3d TKG2d TKBRep TKTopAlgo TKPrim TKBO
    TKOpenGl TKService TKV3d TKernel

    opengl32
)

# ================== DLL Copy ==================
add_custom_command(TARGET TyrexCAD POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E echo "✅Copying OpenCascade DLLs..."
    COMMAND ${CMAKE_COMMAND} -E copy_directory "${OCCT_DLL_DIR}" "$<TARGET_FILE_DIR:TyrexCAD>"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different "D:/OpenCascade/freetype-install/bin/freetype.dll" "$<TARGET_FILE_DIR:TyrexCAD>"
    COMMENT "✅Copying required DLLs to output folder"
)

# ================== Force CMake to reconfigure on new files ==================
# This helps detect new files without manual reconfiguration
set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS ${TYREXCAD_SOURCES} ${TYREXCAD_HEADERS})
set_property(TARGET TyrexCAD PROPERTY AUTOMOC_MOC_OPTIONS "-D_WIN32")

# ================== Debug Info ==================
message(STATUS "✅CMAKE_TOOLCHAIN_FILE: ${CMAKE_TOOLCHAIN_FILE}")
message(STATUS "✅OpenCascade Include : ${OCCT_INC_DIR}")
message(STATUS "✅OpenCascade Libs    : ${OCCT_LIB_DIR}")
message(STATUS "✅OpenCascade DLLs    : ${OCCT_DLL_DIR}")
message(STATUS "✅Found ${CMAKE_CURRENT_LIST_LINE} source files")