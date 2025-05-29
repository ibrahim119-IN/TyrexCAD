/****************************************************************************
** Meta object code from reading C++ file 'TyrexSketchManager.h'
**
** Created by: The Qt Meta Object Compiler version 67 (Qt 5.15.16)
**
** WARNING! All changes made in this file will be lost!
*****************************************************************************/

#include <memory>
#include "../../../include/TyrexSketch/TyrexSketchManager.h"
#include <QtCore/qbytearray.h>
#include <QtCore/qmetatype.h>
#if !defined(Q_MOC_OUTPUT_REVISION)
#error "The header file 'TyrexSketchManager.h' doesn't include <QObject>."
#elif Q_MOC_OUTPUT_REVISION != 67
#error "This file was generated using the moc from 5.15.16. It"
#error "cannot be used with the include files from this version of Qt."
#error "(The moc has changed too much.)"
#endif

QT_BEGIN_MOC_NAMESPACE
QT_WARNING_PUSH
QT_WARNING_DISABLE_DEPRECATED
struct qt_meta_stringdata_TyrexCAD__TyrexSketchManager_t {
    QByteArrayData data[16];
    char stringdata0[215];
};
#define QT_MOC_LITERAL(idx, ofs, len) \
    Q_STATIC_BYTE_ARRAY_DATA_HEADER_INITIALIZER_WITH_OFFSET(len, \
    qptrdiff(offsetof(qt_meta_stringdata_TyrexCAD__TyrexSketchManager_t, stringdata0) + ofs \
        - idx * sizeof(QByteArrayData)) \
    )
static const qt_meta_stringdata_TyrexCAD__TyrexSketchManager_t qt_meta_stringdata_TyrexCAD__TyrexSketchManager = {
    {
QT_MOC_LITERAL(0, 0, 28), // "TyrexCAD::TyrexSketchManager"
QT_MOC_LITERAL(1, 29, 17), // "sketchModeEntered"
QT_MOC_LITERAL(2, 47, 0), // ""
QT_MOC_LITERAL(3, 48, 16), // "sketchModeExited"
QT_MOC_LITERAL(4, 65, 13), // "entityCreated"
QT_MOC_LITERAL(5, 79, 11), // "std::string"
QT_MOC_LITERAL(6, 91, 8), // "entityId"
QT_MOC_LITERAL(7, 100, 14), // "entityModified"
QT_MOC_LITERAL(8, 115, 13), // "entityDeleted"
QT_MOC_LITERAL(9, 129, 14), // "entitySelected"
QT_MOC_LITERAL(10, 144, 16), // "selectionCleared"
QT_MOC_LITERAL(11, 161, 18), // "sketchPlaneChanged"
QT_MOC_LITERAL(12, 180, 6), // "gp_Pln"
QT_MOC_LITERAL(13, 187, 5), // "plane"
QT_MOC_LITERAL(14, 193, 13), // "statusMessage"
QT_MOC_LITERAL(15, 207, 7) // "message"

    },
    "TyrexCAD::TyrexSketchManager\0"
    "sketchModeEntered\0\0sketchModeExited\0"
    "entityCreated\0std::string\0entityId\0"
    "entityModified\0entityDeleted\0"
    "entitySelected\0selectionCleared\0"
    "sketchPlaneChanged\0gp_Pln\0plane\0"
    "statusMessage\0message"
};
#undef QT_MOC_LITERAL

static const uint qt_meta_data_TyrexCAD__TyrexSketchManager[] = {

 // content:
       8,       // revision
       0,       // classname
       0,    0, // classinfo
       9,   14, // methods
       0,    0, // properties
       0,    0, // enums/sets
       0,    0, // constructors
       0,       // flags
       9,       // signalCount

 // signals: name, argc, parameters, tag, flags
       1,    0,   59,    2, 0x06 /* Public */,
       3,    0,   60,    2, 0x06 /* Public */,
       4,    1,   61,    2, 0x06 /* Public */,
       7,    1,   64,    2, 0x06 /* Public */,
       8,    1,   67,    2, 0x06 /* Public */,
       9,    1,   70,    2, 0x06 /* Public */,
      10,    0,   73,    2, 0x06 /* Public */,
      11,    1,   74,    2, 0x06 /* Public */,
      14,    1,   77,    2, 0x06 /* Public */,

 // signals: parameters
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void, 0x80000000 | 5,    6,
    QMetaType::Void, 0x80000000 | 5,    6,
    QMetaType::Void, 0x80000000 | 5,    6,
    QMetaType::Void, 0x80000000 | 5,    6,
    QMetaType::Void,
    QMetaType::Void, 0x80000000 | 12,   13,
    QMetaType::Void, QMetaType::QString,   15,

       0        // eod
};

void TyrexCAD::TyrexSketchManager::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        auto *_t = static_cast<TyrexSketchManager *>(_o);
        (void)_t;
        switch (_id) {
        case 0: _t->sketchModeEntered(); break;
        case 1: _t->sketchModeExited(); break;
        case 2: _t->entityCreated((*reinterpret_cast< const std::string(*)>(_a[1]))); break;
        case 3: _t->entityModified((*reinterpret_cast< const std::string(*)>(_a[1]))); break;
        case 4: _t->entityDeleted((*reinterpret_cast< const std::string(*)>(_a[1]))); break;
        case 5: _t->entitySelected((*reinterpret_cast< const std::string(*)>(_a[1]))); break;
        case 6: _t->selectionCleared(); break;
        case 7: _t->sketchPlaneChanged((*reinterpret_cast< const gp_Pln(*)>(_a[1]))); break;
        case 8: _t->statusMessage((*reinterpret_cast< const QString(*)>(_a[1]))); break;
        default: ;
        }
    } else if (_c == QMetaObject::IndexOfMethod) {
        int *result = reinterpret_cast<int *>(_a[0]);
        {
            using _t = void (TyrexSketchManager::*)();
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexSketchManager::sketchModeEntered)) {
                *result = 0;
                return;
            }
        }
        {
            using _t = void (TyrexSketchManager::*)();
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexSketchManager::sketchModeExited)) {
                *result = 1;
                return;
            }
        }
        {
            using _t = void (TyrexSketchManager::*)(const std::string & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexSketchManager::entityCreated)) {
                *result = 2;
                return;
            }
        }
        {
            using _t = void (TyrexSketchManager::*)(const std::string & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexSketchManager::entityModified)) {
                *result = 3;
                return;
            }
        }
        {
            using _t = void (TyrexSketchManager::*)(const std::string & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexSketchManager::entityDeleted)) {
                *result = 4;
                return;
            }
        }
        {
            using _t = void (TyrexSketchManager::*)(const std::string & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexSketchManager::entitySelected)) {
                *result = 5;
                return;
            }
        }
        {
            using _t = void (TyrexSketchManager::*)();
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexSketchManager::selectionCleared)) {
                *result = 6;
                return;
            }
        }
        {
            using _t = void (TyrexSketchManager::*)(const gp_Pln & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexSketchManager::sketchPlaneChanged)) {
                *result = 7;
                return;
            }
        }
        {
            using _t = void (TyrexSketchManager::*)(const QString & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexSketchManager::statusMessage)) {
                *result = 8;
                return;
            }
        }
    }
}

QT_INIT_METAOBJECT const QMetaObject TyrexCAD::TyrexSketchManager::staticMetaObject = { {
    QMetaObject::SuperData::link<QObject::staticMetaObject>(),
    qt_meta_stringdata_TyrexCAD__TyrexSketchManager.data,
    qt_meta_data_TyrexCAD__TyrexSketchManager,
    qt_static_metacall,
    nullptr,
    nullptr
} };


const QMetaObject *TyrexCAD::TyrexSketchManager::metaObject() const
{
    return QObject::d_ptr->metaObject ? QObject::d_ptr->dynamicMetaObject() : &staticMetaObject;
}

void *TyrexCAD::TyrexSketchManager::qt_metacast(const char *_clname)
{
    if (!_clname) return nullptr;
    if (!strcmp(_clname, qt_meta_stringdata_TyrexCAD__TyrexSketchManager.stringdata0))
        return static_cast<void*>(this);
    return QObject::qt_metacast(_clname);
}

int TyrexCAD::TyrexSketchManager::qt_metacall(QMetaObject::Call _c, int _id, void **_a)
{
    _id = QObject::qt_metacall(_c, _id, _a);
    if (_id < 0)
        return _id;
    if (_c == QMetaObject::InvokeMetaMethod) {
        if (_id < 9)
            qt_static_metacall(this, _c, _id, _a);
        _id -= 9;
    } else if (_c == QMetaObject::RegisterMethodArgumentMetaType) {
        if (_id < 9)
            *reinterpret_cast<int*>(_a[0]) = -1;
        _id -= 9;
    }
    return _id;
}

// SIGNAL 0
void TyrexCAD::TyrexSketchManager::sketchModeEntered()
{
    QMetaObject::activate(this, &staticMetaObject, 0, nullptr);
}

// SIGNAL 1
void TyrexCAD::TyrexSketchManager::sketchModeExited()
{
    QMetaObject::activate(this, &staticMetaObject, 1, nullptr);
}

// SIGNAL 2
void TyrexCAD::TyrexSketchManager::entityCreated(const std::string & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 2, _a);
}

// SIGNAL 3
void TyrexCAD::TyrexSketchManager::entityModified(const std::string & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 3, _a);
}

// SIGNAL 4
void TyrexCAD::TyrexSketchManager::entityDeleted(const std::string & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 4, _a);
}

// SIGNAL 5
void TyrexCAD::TyrexSketchManager::entitySelected(const std::string & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 5, _a);
}

// SIGNAL 6
void TyrexCAD::TyrexSketchManager::selectionCleared()
{
    QMetaObject::activate(this, &staticMetaObject, 6, nullptr);
}

// SIGNAL 7
void TyrexCAD::TyrexSketchManager::sketchPlaneChanged(const gp_Pln & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 7, _a);
}

// SIGNAL 8
void TyrexCAD::TyrexSketchManager::statusMessage(const QString & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 8, _a);
}
QT_WARNING_POP
QT_END_MOC_NAMESPACE
