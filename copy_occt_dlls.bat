@echo off
echo 🔁 Copying OpenCASCADE DLLs to Debug folder...

REM --- عدّل المسارات حسب تثبيتك ---
set OCCT_BIN=D:\OpenCascade\opencascade-7.9.0-vc14-64\win64\vc14\bin
set TARGET_DIR=%~dp0build\Debug

REM --- إنشاء المجلد إن لم يكن موجوداً ---
if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%"
)

REM --- نسخ جميع TK*.dll الخاصة بـ OCCT ---
echo 🧩 Copying TK*.dll from %OCCT_BIN%
copy /Y "%OCCT_BIN%\TK*.dll" "%TARGET_DIR%" >nul

echo ✅ Done copying OpenCASCADE DLLs.
