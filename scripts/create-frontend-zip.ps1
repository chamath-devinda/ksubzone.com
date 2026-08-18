# KSubZone Frontend Update Packager
# ====================================================
# Generates frontend.zip by copying client files,
# excluding node_modules and logs to keep it clean.

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
if ($workspaceRoot -like "*scripts") {
    $workspaceRoot = Split-Path -Parent -Path $workspaceRoot
}

$sourceDir = Join-Path $workspaceRoot "client"
$zipPath = Join-Path $workspaceRoot "frontend.zip"
$tempDir = Join-Path $workspaceRoot "temp-frontend-build"

Write-Host "Cleaning up previous build files..."
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}

Write-Host "Copying frontend files to build directory..."
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy files while excluding node_modules, .next build cache, and dist build outputs
Get-ChildItem -Path $sourceDir | Where-Object { $_.Name -notin @("node_modules", ".next", "dist") -and $_.Extension -ne ".log" } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
}

Write-Host "Waiting for file locks to settle..."
Start-Sleep -Seconds 2

Write-Host "Creating zip package..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

Write-Host "Cleaning up build directory..."
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "SUCCESS: Frontend update package built at $zipPath" -ForegroundColor Green
