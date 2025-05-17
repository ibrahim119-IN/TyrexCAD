$projectRoot = Get-Location
$outputFile = "$projectRoot\TyrexCAD_Structure.txt"
$excludeDirs = @("build", "out", ".vs", ".git")

$extensions = @("*.cpp", "*.h", "*.hpp", "*.c", "*.ui", "*.qrc", "*.qml", "*.cmake", "*.txt")

if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
}

foreach ($ext in $extensions) {
    $files = Get-ChildItem -Path $projectRoot -Recurse -Include $ext -File | Where-Object {
        foreach ($excluded in $excludeDirs) {
            if ($_.FullName -like "*\$excluded\*") { return $false }
        }
        return $true
    }

    foreach ($file in $files) {
        $relativePath = $file.FullName.Replace($projectRoot, "")
        Add-Content -Path $outputFile -Value "`n========== FILE: $relativePath =========="
        try {
            Add-Content -Path $outputFile -Value (Get-Content $file.FullName)
        } catch {
            Write-Warning "❌ Failed to read file: $($file.FullName)"
        }
    }
}

Write-Host "✅ Project structure and code saved to: $outputFile"
