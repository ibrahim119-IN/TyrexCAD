/****************************************************************************
** Meta object code from reading C++ file 'TyrexMainWindow.h'
**
** Created by: The Qt Meta Object Compiler version 67 (Qt 5.15.16)
**
** WARNING! All changes made in this file will be lost!
*****************************************************************************/

#include <memory>
#include "../../../include/TyrexApp/TyrexMainWindow.h"
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
    QByteArrayData data[21];
    char stringdata0[320];
};
#define QT_MOC_LITERAL(idx, ofs, len) \
    Q_STATIC_BYTE_ARRAY_DATA_HEADER_INITIALIZER_WITH_OFFSET(len, \
    qptrdiff(offsetof(qt_meta_stringdata_TyrexCAD__TyrexMainWindow_t, stringdata0) + ofs \
        - idx * sizeof(QByteArrayData)) \
    )
static const qt_meta_stringdata_TyrexCAD__TyrexMainWindow_t qt_meta_stringdata_TyrexCAD__TyrexMainWindow = {
    {
QT_MOC_LITERAL(0, 0, 25), // "TyrexCAD::TyrexMainWindow"
QT_MOC_LITERAL(1, 26, 7), // "newFile"
QT_MOC_LITERAL(2, 34, 0), // ""
QT_MOC_LITERAL(3, 35, 8), // "openFile"
QT_MOC_LITERAL(4, 44, 8), // "saveFile"
QT_MOC_LITERAL(5, 53, 10), // "saveFileAs"
QT_MOC_LITERAL(6, 64, 5), // "about"
QT_MOC_LITERAL(7, 70, 16), // "startLineCommand"
QT_MOC_LITERAL(8, 87, 16), // "createSampleLine"
QT_MOC_LITERAL(9, 104, 15), // "addSampleEntity"
QT_MOC_LITERAL(10, 120, 16), // "toggleSketchMode"
QT_MOC_LITERAL(11, 137, 15), // "enterSketchMode"
QT_MOC_LITERAL(12, 153, 14), // "exitSketchMode"
QT_MOC_LITERAL(13, 168, 22), // "startSketchLineCommand"
QT_MOC_LITERAL(14, 191, 24), // "startSketchCircleCommand"
QT_MOC_LITERAL(15, 216, 17), // "onCommandFinished"
QT_MOC_LITERAL(16, 234, 22), // "onSketchEntitySelected"
QT_MOC_LITERAL(17, 257, 11), // "std::string"
QT_MOC_LITERAL(18, 269, 8), // "entityId"
QT_MOC_LITERAL(19, 278, 22), // "onSketchEntityModified"
QT_MOC_LITERAL(20, 301, 18) // "createTestGeometry"

    },
    "TyrexCAD::TyrexMainWindow\0newFile\0\0"
    "openFile\0saveFile\0saveFileAs\0about\0"
    "startLineCommand\0createSampleLine\0"
    "addSampleEntity\0toggleSketchMode\0"
    "enterSketchMode\0exitSketchMode\0"
    "startSketchLineCommand\0startSketchCircleCommand\0"
    "onCommandFinished\0onSketchEntitySelected\0"
    "std::string\0entityId\0onSketchEntityModified\0"
    "createTestGeometry"
};
#undef QT_MOC_LITERAL

static const uint qt_meta_data_TyrexCAD__TyrexMainWindow[] = {

 // content:
       8,       // revision
       0,       // classname
       0,    0, // classinfo
      17,   14, // methods
       0,    0, // properties
       0,    0, // enums/sets
       0,    0, // constructors
       0,       // flags
       0,       // signalCount

 // slots: name, argc, parameters, tag, flags
       1,    0,   99,    2, 0x08 /* Private */,
       3,    0,  100,    2, 0x08 /* Private */,
       4,    0,  101,    2, 0x08 /* Private */,
       5,    0,  102,    2, 0x08 /* Private */,
       6,    0,  103,    2, 0x08 /* Private */,
       7,    0,  104,    2, 0x08 /* Private */,
       8,    0,  105,    2, 0x08 /* Private */,
       9,    0,  106,    2, 0x08 /* Private */,
      10,    0,  107,    2, 0x08 /* Private */,
      11,    0,  108,    2, 0x08 /* Private */,
      12,    0,  109,    2, 0x08 /* Private */,
      13,    0,  110,    2, 0x08 /* Private */,
      14,    0,  111,    2, 0x08 /* Private */,
      15,    0,  112,    2, 0x08 /* Private */,
      16,    1,  113,    2, 0x08 /* Private */,
      19,    1,  116,    2, 0x08 /* Private */,
      20,    0,  119,    2, 0x08 /* Private */,

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
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void, 0x80000000 | 17,   18,
    QMetaType::Void, 0x80000000 | 17,   18,
    QMetaType::Void,

       0        // eod
};

void TyrexCAD::TyrexMainWindow::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        auto *_t = static_cast<TyrexMainWindow *>(_o);
        (void)_t;
        switch (_id) {
        case 0: _t->newFile(); break;
        case 1: _t->openFile(); break;
        case 2: _t->saveFile(); break;
        case 3: _t->saveFileAs(); break;
        case 4: _t->about(); break;
        case 5: _t->startLineCommand(); break;
        case 6: _t->createSampleLine(); break;
        case 7: _t->addSampleEntity(); break;
        case 8: _t->toggleSketchMode(); break;
        case 9: _t->enterSketchMode(); break;
        case 10: _t->exitSketchMode(); break;
        case 11: _t->startSketchLineCommand(); break;
        case 12: _t->startSketchCircleCommand(); break;
        case 13: _t->onCommandFinished(); break;
        case 14: _t->onSketchEntitySelected((*reinterpret_cast< const std::string(*)>(_a[1]))); break;
        case 15: _t->onSketchEntityModified((*reinterpret_cast< const std::string(*)>(_a[1]))); break;
        case 16: _t->createTestGeometry(); break;
        default: ;
        }
    }
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
        if (_id < 17)
            qt_static_metacall(this, _c, _id, _a);
        _id -= 17;
    } else if (_c == QMetaObject::RegisterMethodArgumentMetaType) {
        if (_id < 17)
            *reinterpret_cast<int*>(_a[0]) = -1;
        _id -= 17;
    }
    return _id;
}
QT_WARNING_POP
QT_END_MOC_NAMESPACE
