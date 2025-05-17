@echo off
setlocal

:: ========================
:: إعدادات المستخدم
set BUILD_CONFIG=Debug
set OUTPUT_FILE=build_log.txt
:: ========================

echo.
echo ================================
echo 🔨 Starting CMake Build...
echo ================================
echo.

:: تنفيذ أمر البناء وتوجيه الإخراج
cmake --build . --config %BUILD_CONFIG% > %OUTPUT_FILE% 2>&1

echo.
echo ================================
echo ✅ Build Completed!
echo 📄 Output saved to: %OUTPUT_FILE%
echo ================================
echo.

:: فتح الملف تلقائيًا بعد الانتهاء (اختياري)
notepad %OUTPUT_FILE%

endlocal
