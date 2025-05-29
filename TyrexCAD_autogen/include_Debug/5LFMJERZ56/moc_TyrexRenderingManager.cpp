/****************************************************************************
** Meta object code from reading C++ file 'TyrexRenderingManager.h'
**
** Created by: The Qt Meta Object Compiler version 67 (Qt 5.15.16)
**
** WARNING! All changes made in this file will be lost!
*****************************************************************************/

#include <memory>
#include "../../../include/TyrexRendering/TyrexRenderingManager.h"
#include <QtCore/qbytearray.h>
#include <QtCore/qmetatype.h>
#if !defined(Q_MOC_OUTPUT_REVISION)
#error "The header file 'TyrexRenderingManager.h' doesn't include <QObject>."
#elif Q_MOC_OUTPUT_REVISION != 67
#error "This file was generated using the moc from 5.15.16. It"
#error "cannot be used with the include files from this version of Qt."
#error "(The moc has changed too much.)"
#endif

QT_BEGIN_MOC_NAMESPACE
QT_WARNING_PUSH
QT_WARNING_DISABLE_DEPRECATED
struct qt_meta_stringdata_TyrexCAD__TyrexRenderingManager_t {
    QByteArrayData data[12];
    char stringdata0[194];
};
#define QT_MOC_LITERAL(idx, ofs, len) \
    Q_STATIC_BYTE_ARRAY_DATA_HEADER_INITIALIZER_WITH_OFFSET(len, \
    qptrdiff(offsetof(qt_meta_stringdata_TyrexCAD__TyrexRenderingManager_t, stringdata0) + ofs \
        - idx * sizeof(QByteArrayData)) \
    )
static const qt_meta_stringdata_TyrexCAD__TyrexRenderingManager_t qt_meta_stringdata_TyrexCAD__TyrexRenderingManager = {
    {
QT_MOC_LITERAL(0, 0, 31), // "TyrexCAD::TyrexRenderingManager"
QT_MOC_LITERAL(1, 32, 14), // "renderComplete"
QT_MOC_LITERAL(2, 47, 0), // ""
QT_MOC_LITERAL(3, 48, 15), // "viewportResized"
QT_MOC_LITERAL(4, 64, 5), // "width"
QT_MOC_LITERAL(5, 70, 6), // "height"
QT_MOC_LITERAL(6, 77, 21), // "gridVisibilityChanged"
QT_MOC_LITERAL(7, 99, 7), // "enabled"
QT_MOC_LITERAL(8, 107, 13), // "performRender"
QT_MOC_LITERAL(9, 121, 20), // "updateGridVisibility"
QT_MOC_LITERAL(10, 142, 23), // "onGridVisibilityChanged"
QT_MOC_LITERAL(11, 166, 27) // "handleGridVisibilityChanged"

    },
    "TyrexCAD::TyrexRenderingManager\0"
    "renderComplete\0\0viewportResized\0width\0"
    "height\0gridVisibilityChanged\0enabled\0"
    "performRender\0updateGridVisibility\0"
    "onGridVisibilityChanged\0"
    "handleGridVisibilityChanged"
};
#undef QT_MOC_LITERAL

static const uint qt_meta_data_TyrexCAD__TyrexRenderingManager[] = {

 // content:
       8,       // revision
       0,       // classname
       0,    0, // classinfo
       7,   14, // methods
       0,    0, // properties
       0,    0, // enums/sets
       0,    0, // constructors
       0,       // flags
       3,       // signalCount

 // signals: name, argc, parameters, tag, flags
       1,    0,   49,    2, 0x06 /* Public */,
       3,    2,   50,    2, 0x06 /* Public */,
       6,    1,   55,    2, 0x06 /* Public */,

 // slots: name, argc, parameters, tag, flags
       8,    0,   58,    2, 0x08 /* Private */,
       9,    1,   59,    2, 0x08 /* Private */,
      10,    1,   62,    2, 0x08 /* Private */,
      11,    1,   65,    2, 0x08 /* Private */,

 // signals: parameters
    QMetaType::Void,
    QMetaType::Void, QMetaType::Int, QMetaType::Int,    4,    5,
    QMetaType::Void, QMetaType::Bool,    7,

 // slots: parameters
    QMetaType::Void,
    QMetaType::Void, QMetaType::Bool,    7,
    QMetaType::Void, QMetaType::Bool,    7,
    QMetaType::Void, QMetaType::Bool,    7,

       0        // eod
};

void TyrexCAD::TyrexRenderingManager::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        auto *_t = static_cast<TyrexRenderingManager *>(_o);
        (void)_t;
        switch (_id) {
        case 0: _t->renderComplete(); break;
        case 1: _t->viewportResized((*reinterpret_cast< int(*)>(_a[1])),(*reinterpret_cast< int(*)>(_a[2]))); break;
        case 2: _t->gridVisibilityChanged((*reinterpret_cast< bool(*)>(_a[1]))); break;
        case 3: _t->performRender(); break;
        case 4: _t->updateGridVisibility((*reinterpret_cast< bool(*)>(_a[1]))); break;
        case 5: _t->onGridVisibilityChanged((*reinterpret_cast< bool(*)>(_a[1]))); break;
        case 6: _t->handleGridVisibilityChanged((*reinterpret_cast< bool(*)>(_a[1]))); break;
        default: ;
        }
    } else if (_c == QMetaObject::IndexOfMethod) {
        int *result = reinterpret_cast<int *>(_a[0]);
        {
            using _t = void (TyrexRenderingManager::*)();
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexRenderingManager::renderComplete)) {
                *result = 0;
                return;
            }
        }
        {
            using _t = void (TyrexRenderingManager::*)(int , int );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexRenderingManager::viewportResized)) {
                *result = 1;
                return;
            }
        }
        {
            using _t = void (TyrexRenderingManager::*)(bool );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexRenderingManager::gridVisibilityChanged)) {
                *result = 2;
                return;
            }
        }
    }
}

QT_INIT_METAOBJECT const QMetaObject TyrexCAD::TyrexRenderingManager::staticMetaObject = { {
    QMetaObject::SuperData::link<QObject::staticMetaObject>(),
    qt_meta_stringdata_TyrexCAD__TyrexRenderingManager.data,
    qt_meta_data_TyrexCAD__TyrexRenderingManager,
    qt_static_metacall,
    nullptr,
    nullptr
} };


const QMetaObject *TyrexCAD::TyrexRenderingManager::metaObject() const
{
    return QObject::d_ptr->metaObject ? QObject::d_ptr->dynamicMetaObject() : &staticMetaObject;
}

void *TyrexCAD::TyrexRenderingManager::qt_metacast(const char *_clname)
{
    if (!_clname) return nullptr;
    if (!strcmp(_clname, qt_meta_stringdata_TyrexCAD__TyrexRenderingManager.stringdata0))
        return static_cast<void*>(this);
    return QObject::qt_metacast(_clname);
}

int TyrexCAD::TyrexRenderingManager::qt_metacall(QMetaObject::Call _c, int _id, void **_a)
{
    _id = QObject::qt_metacall(_c, _id, _a);
    if (_id < 0)
        return _id;
    if (_c == QMetaObject::InvokeMetaMethod) {
        if (_id < 7)
            qt_static_metacall(this, _c, _id, _a);
        _id -= 7;
    } else if (_c == QMetaObject::RegisterMethodArgumentMetaType) {
        if (_id < 7)
            *reinterpret_cast<int*>(_a[0]) = -1;
        _id -= 7;
    }
    return _id;
}

// SIGNAL 0
void TyrexCAD::TyrexRenderingManager::renderComplete()
{
    QMetaObject::activate(this, &staticMetaObject, 0, nullptr);
}

// SIGNAL 1
void TyrexCAD::TyrexRenderingManager::viewportResized(int _t1, int _t2)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t2))) };
    QMetaObject::activate(this, &staticMetaObject, 1, _a);
}

// SIGNAL 2
void TyrexCAD::TyrexRenderingManager::gridVisibilityChanged(bool _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 2, _a);
}
QT_WARNING_POP
QT_END_MOC_NAMESPACE
