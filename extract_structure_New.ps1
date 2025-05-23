$rootPath = Get-Location
$outputFile = "$rootPath\TyrexCAD_Export_Summary.txt"
$extensions = @("*.cpp", "*.h", "*.hpp", "*.c", "*.cc", "*.cxx", "CMakeLists.txt", "*.cmake")
$ignoredFolders = @("\.vs\", "\build\", "\out\", "\Debug\", "\Release\")

# حذف الملف السابق لو موجود
if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

# دالة لاستخلاص محتوى مركز من الملف
function Extract-ImportantContent {
    param ($filePath)

    $lines = Get-Content $filePath
    $filtered = @()

    foreach ($line in $lines) {
        if ($line -match "^\s*(class|struct|namespace|void|int|float|double|bool|auto|template|#include|#define|using|public:|private:|protected:|Q_OBJECT|QMainWindow|QApplication)" `
         -or $line -match "main\s*\(" `
         -or $line -match "^\s*CMAKE_MINIMUM_REQUIRED" `
         -or $line -match "^\s*project\s*\(" `
         -or $line -match "add_(executable|library)\(" `
         -or $line -match "target_link_libraries\(" `
         -or $line -match "target_include_directories\(") {
            $filtered += $line
        }
    }

    return $filtered
}

# تجميع الملفات
Get-ChildItem -Path $rootPath -Recurse -Include $extensions -File | Where-Object {
    foreach ($ignored in $ignoredFolders) {
        if ($_.FullName -match [regex]::Escape($ignored)) {
            return $false
        }
    }
    return $true
} | Sort-Object FullName | ForEach-Object {
    $relativePath = $_.FullName.Substring($rootPath.Length + 1).Replace("\", "/")
    Add-Content -Path $outputFile -Value "`n`n==== FILE: $relativePath ===="
    Add-Content -Path $outputFile -Value ("-" * 80)
    
    if ($_.Name -like "*.cmake" -or $_.Name -eq "CMakeLists.txt") {
        Get-Content $_.FullName | Add-Content -Path $outputFile
    } else {
        Extract-ImportantContent -filePath $_.FullName | Add-Content -Path $outputFile
    }
}

Write-Host "`n✅ Summary Export Done!"
Write-Host "📄 Exported to: $outputFile"
