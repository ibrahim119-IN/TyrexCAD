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
    
    # Suppress specific warnings
    add_compile_options(/wd4005) # macro redefinition warning
endif()

# ================== Qt Integration (via vcpkg) ==================
# Set up vcpkg paths if not already set
if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    set(CMAKE_TOOLCHAIN_FILE "D:/Tools/vcpkg/scripts/buildsystems/vcpkg.cmake" CACHE STRING "")
endif()

# Add vcpkg installed directory to CMAKE_PREFIX_PATH
set(CMAKE_PREFIX_PATH "D:/Tools/vcpkg/installed/x64-windows" ${CMAKE_PREFIX_PATH})

# Set Qt5 directory explicitly
set(Qt5_DIR "D:/Tools/vcpkg/installed/x64-windows/share/qt5" CACHE PATH "Qt5 directory")

# Find Qt5
find_package(Qt5 REQUIRED COMPONENTS Core Gui Widgets OpenGL)

# ================== Sources ==================
# Automatically find all source files
file(GLOB_RECURSE ALL_SOURCES 
    ${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp
)

# Automatically find all header files
file(GLOB_RECURSE ALL_HEADERS 
    ${CMAKE_CURRENT_SOURCE_DIR}/include/*.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/*.hpp
)

# Remove the duplicate TyrexCommand files from TyrexCore
set(FILES_TO_EXCLUDE
    "${CMAKE_CURRENT_SOURCE_DIR}/src/TyrexCore/TyrexCommand.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/include/TyrexCore/TyrexCommand.h"
)

foreach(file_to_exclude ${FILES_TO_EXCLUDE})
    list(REMOVE_ITEM ALL_SOURCES ${file_to_exclude})
    list(REMOVE_ITEM ALL_HEADERS ${file_to_exclude})
    if(EXISTS ${file_to_exclude})
        message(WARNING "Excluding duplicate file: ${file_to_exclude}")
    endif()
endforeach()

# Remove duplicates
list(REMOVE_DUPLICATES ALL_SOURCES)
list(REMOVE_DUPLICATES ALL_HEADERS)

# Debug: Print all source files
message(STATUS "Source files found:")
foreach(source ${ALL_SOURCES})
    get_filename_component(source_name ${source} NAME)
    message(STATUS "  - ${source_name}")
endforeach()

# Count files
list(LENGTH ALL_SOURCES SOURCE_COUNT)
list(LENGTH ALL_HEADERS HEADER_COUNT)
message(STATUS "Total: ${SOURCE_COUNT} source files, ${HEADER_COUNT} header files")

# Create executable
add_executable(${PROJECT_NAME} 
    ${ALL_SOURCES} 
    ${ALL_HEADERS}
)

# Qt definitions
target_compile_definitions(${PROJECT_NAME} PRIVATE 
    QT_WIDGETS_LIB
    QT_CORE_LIB
    QT_GUI_LIB
    QT_OPENGL_LIB
)

# ================== Include Directories ==================
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${OCCT_INC_DIR}
    ${CMAKE_CURRENT_BINARY_DIR} # For MOC generated files
)

# ================== Library Directories ==================
target_link_directories(${PROJECT_NAME} PRIVATE
    ${OCCT_LIB_DIR}
)

# ================== Linking ==================
target_link_libraries(${PROJECT_NAME} PRIVATE
    # Qt Libraries
    Qt5::Core
    Qt5::Gui
    Qt5::Widgets
    Qt5::OpenGL

    # OpenCascade Libraries (ordered by dependency)
    TKernel
    TKMath
    TKG2d
    TKG3d
    TKGeomBase
    TKBRep
    TKGeomAlgo
    TKTopAlgo
    TKPrim
    TKBO
    TKBool
    TKShHealing
    TKService
    TKV3d
    TKOpenGl
    TKXSBase
    TKCAF
    TKLCAF
    TKXCAF
    TKDESTEP
    TKDEIGES

    # System Libraries
    opengl32
)

# ================== Source Groups for IDE ==================
source_group(TREE ${CMAKE_CURRENT_SOURCE_DIR}/src PREFIX "Source Files" FILES ${ALL_SOURCES})
source_group(TREE ${CMAKE_CURRENT_SOURCE_DIR}/include PREFIX "Header Files" FILES ${ALL_HEADERS})
source_group("Generated Files" REGULAR_EXPRESSION ".*_autogen/.*")

# ================== DLL Copy ==================
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E echo "Copying OpenCascade DLLs..."
    COMMAND ${CMAKE_COMMAND} -E copy_directory "${OCCT_DLL_DIR}" "$<TARGET_FILE_DIR:${PROJECT_NAME}>"
)

# Copy FreeType DLL if it exists
if(EXISTS "D:/OpenCascade/freetype-install/bin/freetype.dll")
    add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different 
            "D:/OpenCascade/freetype-install/bin/freetype.dll" 
            "$<TARGET_FILE_DIR:${PROJECT_NAME}>"
    )
endif()

# ================== Force CMake to reconfigure on new files ==================
set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS ${ALL_SOURCES} ${ALL_HEADERS})

# Set MOC options for Windows
if(WIN32)
    set_property(TARGET ${PROJECT_NAME} PROPERTY AUTOMOC_MOC_OPTIONS "-D_WIN32")
endif()

# ================== Debug Info ==================
message(STATUS "CMAKE_TOOLCHAIN_FILE: ${CMAKE_TOOLCHAIN_FILE}")
message(STATUS "CMAKE_PREFIX_PATH: ${CMAKE_PREFIX_PATH}")
message(STATUS "Qt5_DIR: ${Qt5_DIR}")
message(STATUS "OpenCascade Include: ${OCCT_INC_DIR}")
message(STATUS "OpenCascade Libs: ${OCCT_LIB_DIR}")
message(STATUS "OpenCascade DLLs: ${OCCT_DLL_DIR}")

# ================== Installation ==================
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

install(DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/include/
    DESTINATION include
    FILES_MATCHING PATTERN "*.h" PATTERN "*.hpp"
)