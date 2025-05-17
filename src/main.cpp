#include "TyrexApp/TyrexMainWindow.h"
#include "TyrexCore/TyrexApplication.h"
#include "TyrexCore/TyrexInitializer.h"

#include <QApplication>
#include <QSurfaceFormat>
#include <QDebug>

int main(int argc, char* argv[])
{
    // Set OpenGL format for Qt
    QSurfaceFormat format;
    format.setDepthBufferSize(24);
    format.setStencilBufferSize(8);
    format.setVersion(3, 3);  // OpenGL 3.3
    format.setProfile(QSurfaceFormat::CoreProfile);
    QSurfaceFormat::setDefaultFormat(format);

    // Create Qt application
    QApplication app(argc, argv);
    app.setApplicationName("TyrexCAD");
    app.setOrganizationName("YourCompany");
    app.setOrganizationDomain("yourcompany.com");

    // Initialize Tyrex application components
    TyrexCAD::TyrexApplication tyrexApp;
    TyrexCAD::TyrexInitializer initializer;

    // Initialize application services and modules
    if (!initializer.initialize()) {
        qDebug() << "Failed to initialize TyrexCAD!";
        return -1;
    }

    // Create and show main window
    TyrexCAD::TyrexMainWindow mainWindow;
    mainWindow.show();

    // Run application event loop
    int result = app.exec();

    // Cleanup
    initializer.shutdown();

    return result;
}