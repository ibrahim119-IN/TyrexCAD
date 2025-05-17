#ifndef TYREX_INITIALIZER_H
#define TYREX_INITIALIZER_H

namespace TyrexCAD {

    class TyrexInitializer {
    public:
        TyrexInitializer();
        ~TyrexInitializer();

        bool initialize();
        void shutdown();
    };

} // namespace TyrexCAD

#endif // TYREX_INITIALIZER_H