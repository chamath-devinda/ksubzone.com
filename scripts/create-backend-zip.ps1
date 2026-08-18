# KSubZone Backend Safe Update Packager
# ====================================================
# Generates backend-upload.zip by copying server-php files,
# excluding database and local uploads folders to prevent data loss.

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
if ($workspaceRoot -like "*scripts") {
    $workspaceRoot = Split-Path -Parent -Path $workspaceRoot
}

$sourceDir = Join-Path $workspaceRoot "server-php"
$zipPath = Join-Path $workspaceRoot "backend-upload.zip"
$tempDir = Join-Path $workspaceRoot "temp-backend-build"

Write-Host "Cleaning up previous build files..."
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}

Write-Host "Copying backend files to build directory..."
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Copy-Item -Path "$sourceDir\*" -Destination $tempDir -Recurse -Force

# Define excluded files/directories
$dbFile = Join-Path $tempDir "ksubzone.sqlite"
$uploadsDir = Join-Path $tempDir "uploads"
$configJson = Join-Path $tempDir "config\backup_config.json"
$envFile = Join-Path $tempDir ".env"

Write-Host "Stripping environment-specific database and configurations..."
if (Test-Path $dbFile) {
    Remove-Item -Path $dbFile -Force
    Write-Host " - Excluded: ksubzone.sqlite"
}
if (Test-Path $uploadsDir) {
    Remove-Item -Path "$uploadsDir\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host " - Cleaned uploads folder"
}
if (Test-Path $configJson) {
    Remove-Item -Path $configJson -Force
    Write-Host " - Excluded: local backup config credentials"
}
if (Test-Path $envFile) {
    Remove-Item -Path $envFile -Force
    Write-Host " - Excluded: .env"
}

Write-Host "Waiting for file locks to settle..."
Start-Sleep -Seconds 2

Write-Host "Creating zip package..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

Write-Host "Cleaning up build directory..."
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "SUCCESS: Safe update package built at $zipPath" -ForegroundColor Green
