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
    ${CMAKE_CURRENT_SOURCE_DIR}/include/*.hpp
)

# Remove duplicate entries if any
list(REMOVE_DUPLICATES TYREXCAD_SOURCES)
list(REMOVE_DUPLICATES TYREXCAD_HEADERS)

# Handle duplicate TyrexCommand.cpp if it exists in multiple locations
set(TYREXCOMMAND_IN_COMMANDS "${CMAKE_CURRENT_SOURCE_DIR}/src/TyrexCommands/TyrexCommand.cpp")
set(TYREXCOMMAND_IN_CORE "${CMAKE_CURRENT_SOURCE_DIR}/src/TyrexCore/TyrexCommand.cpp")

if(EXISTS ${TYREXCOMMAND_IN_COMMANDS} AND EXISTS ${TYREXCOMMAND_IN_CORE})
    message(WARNING "Found TyrexCommand.cpp in both TyrexCommands and TyrexCore directories!")
    message(WARNING "Removing ${TYREXCOMMAND_IN_CORE} from build to avoid duplicate symbols")
    list(REMOVE_ITEM TYREXCAD_SOURCES ${TYREXCOMMAND_IN_CORE})
endif()

# Count files for reporting
list(LENGTH TYREXCAD_SOURCES SOURCE_COUNT)
list(LENGTH TYREXCAD_HEADERS HEADER_COUNT)

# Create executable
add_executable(TyrexCAD 
    ${TYREXCAD_SOURCES} 
    ${TYREXCAD_HEADERS}
)

# Qt definitions
target_compile_definitions(TyrexCAD PRIVATE 
    QT_WIDGETS_LIB
    QT_CORE_LIB
    QT_GUI_LIB
    QT_OPENGL_LIB
)

# ================== Include Directories ==================
target_include_directories(TyrexCAD PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${OCCT_INC_DIR}
    ${CMAKE_CURRENT_BINARY_DIR} # For MOC generated files
)

# ================== Library Directories ==================
target_link_directories(TyrexCAD PRIVATE
    ${OCCT_LIB_DIR}
)

# ================== Linking ==================
target_link_libraries(TyrexCAD PRIVATE
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
# This organizes files nicely in Visual Studio
source_group(TREE ${CMAKE_CURRENT_SOURCE_DIR}/src PREFIX "Source Files" FILES ${TYREXCAD_SOURCES})
source_group(TREE ${CMAKE_CURRENT_SOURCE_DIR}/include PREFIX "Header Files" FILES ${TYREXCAD_HEADERS})
source_group("Generated Files" REGULAR_EXPRESSION ".*_autogen/.*")

# ================== DLL Copy ==================
add_custom_command(TARGET TyrexCAD POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E echo "Copying OpenCascade DLLs..."
    COMMAND ${CMAKE_COMMAND} -E copy_directory "${OCCT_DLL_DIR}" "$<TARGET_FILE_DIR:TyrexCAD>"
)

# Copy FreeType DLL if it exists
if(EXISTS "D:/OpenCascade/freetype-install/bin/freetype.dll")
    add_custom_command(TARGET TyrexCAD POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different 
            "D:/OpenCascade/freetype-install/bin/freetype.dll" 
            "$<TARGET_FILE_DIR:TyrexCAD>"
    )
endif()

# ================== Force CMake to reconfigure on new files ==================
# This helps detect new files without manual reconfiguration
set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS ${TYREXCAD_SOURCES} ${TYREXCAD_HEADERS})

# Set MOC options for Windows
if(WIN32)
    set_property(TARGET TyrexCAD PROPERTY AUTOMOC_MOC_OPTIONS "-D_WIN32")
endif()

# ================== Debug Info ==================
message(STATUS "CMAKE_TOOLCHAIN_FILE: ${CMAKE_TOOLCHAIN_FILE}")
message(STATUS "CMAKE_PREFIX_PATH: ${CMAKE_PREFIX_PATH}")
message(STATUS "Qt5_DIR: ${Qt5_DIR}")
message(STATUS "OpenCascade Include: ${OCCT_INC_DIR}")
message(STATUS "OpenCascade Libs: ${OCCT_LIB_DIR}")
message(STATUS "OpenCascade DLLs: ${OCCT_DLL_DIR}")
message(STATUS "Found ${SOURCE_COUNT} source files")
message(STATUS "Found ${HEADER_COUNT} header files")

# Print source files in debug mode
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    message(STATUS "Source files:")
    foreach(source ${TYREXCAD_SOURCES})
        get_filename_component(source_name ${source} NAME)
        message(STATUS "  - ${source_name}")
    endforeach()
endif()

# ================== Installation (Optional) ==================
install(TARGETS TyrexCAD
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

install(DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/include/
    DESTINATION include
    FILES_MATCHING PATTERN "*.h" PATTERN "*.hpp"
)