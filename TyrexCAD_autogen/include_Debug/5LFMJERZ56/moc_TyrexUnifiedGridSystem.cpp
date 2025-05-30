/****************************************************************************
** Meta object code from reading C++ file 'TyrexUnifiedGridSystem.h'
**
** Created by: The Qt Meta Object Compiler version 67 (Qt 5.15.16)
**
** WARNING! All changes made in this file will be lost!
*****************************************************************************/

#include <memory>
#include "../../../include/TyrexRendering/TyrexUnifiedGridSystem.h"
#include <QtCore/qbytearray.h>
#include <QtCore/qmetatype.h>
#if !defined(Q_MOC_OUTPUT_REVISION)
#error "The header file 'TyrexUnifiedGridSystem.h' doesn't include <QObject>."
#elif Q_MOC_OUTPUT_REVISION != 67
#error "This file was generated using the moc from 5.15.16. It"
#error "cannot be used with the include files from this version of Qt."
#error "(The moc has changed too much.)"
#endif

QT_BEGIN_MOC_NAMESPACE
QT_WARNING_PUSH
QT_WARNING_DISABLE_DEPRECATED
struct qt_meta_stringdata_TyrexCAD__TyrexUnifiedGridSystem_t {
    QByteArrayData data[8];
    char stringdata0[123];
};
#define QT_MOC_LITERAL(idx, ofs, len) \
    Q_STATIC_BYTE_ARRAY_DATA_HEADER_INITIALIZER_WITH_OFFSET(len, \
    qptrdiff(offsetof(qt_meta_stringdata_TyrexCAD__TyrexUnifiedGridSystem_t, stringdata0) + ofs \
        - idx * sizeof(QByteArrayData)) \
    )
static const qt_meta_stringdata_TyrexCAD__TyrexUnifiedGridSystem_t qt_meta_stringdata_TyrexCAD__TyrexUnifiedGridSystem = {
    {
QT_MOC_LITERAL(0, 0, 32), // "TyrexCAD::TyrexUnifiedGridSystem"
QT_MOC_LITERAL(1, 33, 18), // "gridSpacingChanged"
QT_MOC_LITERAL(2, 52, 0), // ""
QT_MOC_LITERAL(3, 53, 7), // "spacing"
QT_MOC_LITERAL(4, 61, 17), // "gridConfigChanged"
QT_MOC_LITERAL(5, 79, 21), // "gridVisibilityChanged"
QT_MOC_LITERAL(6, 101, 7), // "visible"
QT_MOC_LITERAL(7, 109, 13) // "performUpdate"

    },
    "TyrexCAD::TyrexUnifiedGridSystem\0"
    "gridSpacingChanged\0\0spacing\0"
    "gridConfigChanged\0gridVisibilityChanged\0"
    "visible\0performUpdate"
};
#undef QT_MOC_LITERAL

static const uint qt_meta_data_TyrexCAD__TyrexUnifiedGridSystem[] = {

 // content:
       8,       // revision
       0,       // classname
       0,    0, // classinfo
       4,   14, // methods
       0,    0, // properties
       0,    0, // enums/sets
       0,    0, // constructors
       0,       // flags
       3,       // signalCount

 // signals: name, argc, parameters, tag, flags
       1,    1,   34,    2, 0x06 /* Public */,
       4,    0,   37,    2, 0x06 /* Public */,
       5,    1,   38,    2, 0x06 /* Public */,

 // slots: name, argc, parameters, tag, flags
       7,    0,   41,    2, 0x08 /* Private */,

 // signals: parameters
    QMetaType::Void, QMetaType::Double,    3,
    QMetaType::Void,
    QMetaType::Void, QMetaType::Bool,    6,

 // slots: parameters
    QMetaType::Void,

       0        // eod
};

void TyrexCAD::TyrexUnifiedGridSystem::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        auto *_t = static_cast<TyrexUnifiedGridSystem *>(_o);
        (void)_t;
        switch (_id) {
        case 0: _t->gridSpacingChanged((*reinterpret_cast< double(*)>(_a[1]))); break;
        case 1: _t->gridConfigChanged(); break;
        case 2: _t->gridVisibilityChanged((*reinterpret_cast< bool(*)>(_a[1]))); break;
        case 3: _t->performUpdate(); break;
        default: ;
        }
    } else if (_c == QMetaObject::IndexOfMethod) {
        int *result = reinterpret_cast<int *>(_a[0]);
        {
            using _t = void (TyrexUnifiedGridSystem::*)(double );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexUnifiedGridSystem::gridSpacingChanged)) {
                *result = 0;
                return;
            }
        }
        {
            using _t = void (TyrexUnifiedGridSystem::*)();
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexUnifiedGridSystem::gridConfigChanged)) {
                *result = 1;
                return;
            }
        }
        {
            using _t = void (TyrexUnifiedGridSystem::*)(bool );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&TyrexUnifiedGridSystem::gridVisibilityChanged)) {
                *result = 2;
                return;
            }
        }
    }
}

QT_INIT_METAOBJECT const QMetaObject TyrexCAD::TyrexUnifiedGridSystem::staticMetaObject = { {
    QMetaObject::SuperData::link<QObject::staticMetaObject>(),
    qt_meta_stringdata_TyrexCAD__TyrexUnifiedGridSystem.data,
    qt_meta_data_TyrexCAD__TyrexUnifiedGridSystem,
    qt_static_metacall,
    nullptr,
    nullptr
} };


const QMetaObject *TyrexCAD::TyrexUnifiedGridSystem::metaObject() const
{
    return QObject::d_ptr->metaObject ? QObject::d_ptr->dynamicMetaObject() : &staticMetaObject;
}

void *TyrexCAD::TyrexUnifiedGridSystem::qt_metacast(const char *_clname)
{
    if (!_clname) return nullptr;
    if (!strcmp(_clname, qt_meta_stringdata_TyrexCAD__TyrexUnifiedGridSystem.stringdata0))
        return static_cast<void*>(this);
    return QObject::qt_metacast(_clname);
}

int TyrexCAD::TyrexUnifiedGridSystem::qt_metacall(QMetaObject::Call _c, int _id, void **_a)
{
    _id = QObject::qt_metacall(_c, _id, _a);
    if (_id < 0)
        return _id;
    if (_c == QMetaObject::InvokeMetaMethod) {
        if (_id < 4)
            qt_static_metacall(this, _c, _id, _a);
        _id -= 4;
    } else if (_c == QMetaObject::RegisterMethodArgumentMetaType) {
        if (_id < 4)
            *reinterpret_cast<int*>(_a[0]) = -1;
        _id -= 4;
    }
    return _id;
}

// SIGNAL 0
void TyrexCAD::TyrexUnifiedGridSystem::gridSpacingChanged(double _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 0, _a);
}

// SIGNAL 1
void TyrexCAD::TyrexUnifiedGridSystem::gridConfigChanged()
{
    QMetaObject::activate(this, &staticMetaObject, 1, nullptr);
}

// SIGNAL 2
void TyrexCAD::TyrexUnifiedGridSystem::gridVisibilityChanged(bool _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 2, _a);
}
QT_WARNING_POP
QT_END_MOC_NAMESPACE
