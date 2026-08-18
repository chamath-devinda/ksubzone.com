# KSubZone Direct Backend Packager (For Subdomains pointing to server-php/)
# ====================================================

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
if ($workspaceRoot -like "*scripts") {
    $workspaceRoot = Split-Path -Parent -Path $workspaceRoot
}

$zipPath = Join-Path $workspaceRoot "backend-direct-upload.zip"
$tempDir = Join-Path $workspaceRoot "temp-direct-build"

Write-Host "=== KSubZone Direct Backend Packager ===" -ForegroundColor Cyan

# Clean up previous builds
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy files directly from server-php (no nested server-php folder in the zip)
$sourceDir = Join-Path $workspaceRoot "server-php"
Copy-Item -Path "$sourceDir\*" -Destination $tempDir -Recurse -Force
Write-Host "Copied server-php/ contents directly to build directory."

# Exclude SQLite Database, .env, and local config
$dbFile = Join-Path $tempDir "ksubzone.sqlite"
$envFile = Join-Path $tempDir ".env"
$configJson = Join-Path $tempDir "config\backup_config.json"

if (Test-Path $dbFile) {
    Remove-Item -Path $dbFile -Force
    Write-Host " - Excluded: ksubzone.sqlite"
}
if (Test-Path $envFile) {
    Remove-Item -Path $envFile -Force
    Write-Host " - Excluded: .env"
}
if (Test-Path $configJson) {
    Remove-Item -Path $configJson -Force
    Write-Host " - Excluded: local backup config credentials"
}

# Clean uploads folder contents
$uploadsDir = Join-Path $tempDir "uploads"
if (Test-Path $uploadsDir) {
    Get-ChildItem -Path $uploadsDir | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host " - Cleared uploads folder contents"
}

Write-Host "Waiting for file locks to settle..."
Start-Sleep -Seconds 2

# Create Zip Archive
Write-Host "Creating backend-direct-upload.zip..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# Clean up temp directory
Remove-Item -Path $tempDir -Recurse -Force

$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "SUCCESS: backend-direct-upload.zip ($sizeMB MB) built successfully!" -ForegroundColor Green
Write-Host "  Path: $zipPath" -ForegroundColor Green
Write-Host "Upload this zip directly to your subdomain folder (e.g., server-php/) and extract it." -ForegroundColor Yellow
