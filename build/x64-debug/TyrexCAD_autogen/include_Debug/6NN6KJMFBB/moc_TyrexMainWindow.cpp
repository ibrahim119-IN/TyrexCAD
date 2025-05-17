/****************************************************************************
** Meta object code from reading C++ file 'TyrexMainWindow.h'
**
** Created by: The Qt Meta Object Compiler version 67 (Qt 5.15.16)
**
** WARNING! All changes made in this file will be lost!
*****************************************************************************/

#include <memory>
#include "../../../../../include/TyrexApp/TyrexMainWindow.h"
#include <QtCore/qbytearray.h>
#include <QtCore/qmetatype.h>
#if !defined(Q_MOC_OUTPUT_REVISION)
#error "The header file 'TyrexMainWindow.h' doesn't include <QObject>."
#elif Q_MOC_OUTPUT_REVISION != 67
#error "This file was generated using the moc from 5.15.16. It"
#error "cannot be used with the include files from this version of Qt."
#error "(The moc has changed too much.)"
#endif

QT_BEGIN_MOC_NAMESPACE
QT_WARNING_PUSH
QT_WARNING_DISABLE_DEPRECATED
struct qt_meta_stringdata_TyrexCAD__TyrexMainWindow_t {
    QByteArrayData data[12];
    char stringdata0[157];
};
#define QT_MOC_LITERAL(idx, ofs, len) \
    Q_STATIC_BYTE_ARRAY_DATA_HEADER_INITIALIZER_WITH_OFFSET(len, \
    qptrdiff(offsetof(qt_meta_stringdata_TyrexCAD__TyrexMainWindow_t, stringdata0) + ofs \
        - idx * sizeof(QByteArrayData)) \
    )
static const qt_meta_stringdata_TyrexCAD__TyrexMainWindow_t qt_meta_stringdata_TyrexCAD__TyrexMainWindow = {
    {
QT_MOC_LITERAL(0, 0, 25), // "TyrexCAD::TyrexMainWindow"
QT_MOC_LITERAL(1, 26, 18), // "createTestGeometry"
QT_MOC_LITERAL(2, 45, 0), // ""
QT_MOC_LITERAL(3, 46, 15), // "addSampleEntity"
QT_MOC_LITERAL(4, 62, 16), // "createSampleLine"
QT_MOC_LITERAL(5, 79, 16), // "startLineCommand"
QT_MOC_LITERAL(6, 96, 17), // "onCommandFinished"
QT_MOC_LITERAL(7, 114, 7), // "newFile"
QT_MOC_LITERAL(8, 122, 8), // "openFile"
QT_MOC_LITERAL(9, 131, 8), // "saveFile"
QT_MOC_LITERAL(10, 140, 10), // "saveFileAs"
QT_MOC_LITERAL(11, 151, 5) // "about"

    },
    "TyrexCAD::TyrexMainWindow\0createTestGeometry\0"
    "\0addSampleEntity\0createSampleLine\0"
    "startLineCommand\0onCommandFinished\0"
    "newFile\0openFile\0saveFile\0saveFileAs\0"
    "about"
};
#undef QT_MOC_LITERAL

static const uint qt_meta_data_TyrexCAD__TyrexMainWindow[] = {

 // content:
       8,       // revision
       0,       // classname
       0,    0, // classinfo
      10,   14, // methods
       0,    0, // properties
       0,    0, // enums/sets
       0,    0, // constructors
       0,       // flags
       0,       // signalCount

 // slots: name, argc, parameters, tag, flags
       1,    0,   64,    2, 0x08 /* Private */,
       3,    0,   65,    2, 0x08 /* Private */,
       4,    0,   66,    2, 0x08 /* Private */,
       5,    0,   67,    2, 0x08 /* Private */,
       6,    0,   68,    2, 0x08 /* Private */,
       7,    0,   69,    2, 0x08 /* Private */,
       8,    0,   70,    2, 0x08 /* Private */,
       9,    0,   71,    2, 0x08 /* Private */,
      10,    0,   72,    2, 0x08 /* Private */,
      11,    0,   73,    2, 0x08 /* Private */,

 // slots: parameters
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void,

       0        // eod
};

void TyrexCAD::TyrexMainWindow::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        auto *_t = static_cast<TyrexMainWindow *>(_o);
        (void)_t;
        switch (_id) {
        case 0: _t->createTestGeometry(); break;
        case 1: _t->addSampleEntity(); break;
        case 2: _t->createSampleLine(); break;
        case 3: _t->startLineCommand(); break;
        case 4: _t->onCommandFinished(); break;
        case 5: _t->newFile(); break;
        case 6: _t->openFile(); break;
        case 7: _t->saveFile(); break;
        case 8: _t->saveFileAs(); break;
        case 9: _t->about(); break;
        default: ;
        }
    }
    (void)_a;
}

QT_INIT_METAOBJECT const QMetaObject TyrexCAD::TyrexMainWindow::staticMetaObject = { {
    QMetaObject::SuperData::link<QMainWindow::staticMetaObject>(),
    qt_meta_stringdata_TyrexCAD__TyrexMainWindow.data,
    qt_meta_data_TyrexCAD__TyrexMainWindow,
    qt_static_metacall,
    nullptr,
    nullptr
} };


const QMetaObject *TyrexCAD::TyrexMainWindow::metaObject() const
{
    return QObject::d_ptr->metaObject ? QObject::d_ptr->dynamicMetaObject() : &staticMetaObject;
}

void *TyrexCAD::TyrexMainWindow::qt_metacast(const char *_clname)
{
    if (!_clname) return nullptr;
    if (!strcmp(_clname, qt_meta_stringdata_TyrexCAD__TyrexMainWindow.stringdata0))
        return static_cast<void*>(this);
    return QMainWindow::qt_metacast(_clname);
}

int TyrexCAD::TyrexMainWindow::qt_metacall(QMetaObject::Call _c, int _id, void **_a)
{
    _id = QMainWindow::qt_metacall(_c, _id, _a);
    if (_id < 0)
        return _id;
    if (_c == QMetaObject::InvokeMetaMethod) {
        if (_id < 10)
            qt_static_metacall(this, _c, _id, _a);
        _id -= 10;
    } else if (_c == QMetaObject::RegisterMethodArgumentMetaType) {
        if (_id < 10)
            *reinterpret_cast<int*>(_a[0]) = -1;
        _id -= 10;
    }
    return _id;
}
QT_WARNING_POP
QT_END_MOC_NAMESPACE
