$rootPath = Get-Location
$outputFile = "$rootPath\TyrexCAD_Complete_Export.txt"
$extensions = @("*.cpp", "*.h", "*.hpp", "*.c", "*.cc", "*.cxx", "CMakeLists.txt", "*.cmake")
$ignoredFolders = @("\.vs\", "\build\", "\out\", "\Debug\", "\Release\")

# حذف الملف السابق لو موجود
if (Test-Path $outputFile) {
    Remove-Item $outputFile
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
    Get-Content $_.FullName | Add-Content -Path $outputFile
}

Write-Host "`n✅ Done!"
Write-Host "📄 Exported to: $outputFile"
