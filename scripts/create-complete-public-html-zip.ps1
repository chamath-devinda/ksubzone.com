# KSubZone Complete public_html Packager (Includes .htaccess, server-php, .env, and client/dist)
# ======================================================================================

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
if ($workspaceRoot -like "*scripts") {
    $workspaceRoot = Split-Path -Parent -Path $workspaceRoot
}

$zipPath = Join-Path $workspaceRoot "complete-public-html.zip"
$tempDir = Join-Path $workspaceRoot "temp-complete-build"

Write-Host "=== KSubZone Complete public_html Packager ===" -ForegroundColor Cyan

# Clean up previous builds
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# 1. Copy Root .htaccess
$htaccessSrc = Join-Path $workspaceRoot ".htaccess"
if (Test-Path $htaccessSrc) {
    Copy-Item -Path $htaccessSrc -Destination $tempDir -Force
    Write-Host "Included: .htaccess"
}

# 2. Copy server-php folder (including .env!)
$serverPhpSrc = Join-Path $workspaceRoot "server-php"
$serverPhpDst = Join-Path $tempDir "server-php"
Copy-Item -Path $serverPhpSrc -Destination $serverPhpDst -Recurse -Force
Write-Host "Copied: server-php/"

# Exclude SQLite Database from the build
$dbFile = Join-Path $serverPhpDst "ksubzone.sqlite"
if (Test-Path $dbFile) {
    Remove-Item -Path $dbFile -Force
    Write-Host " - Excluded: ksubzone.sqlite (Database)"
}

# Clean uploads folder contents
$uploadsDir = Join-Path $serverPhpDst "uploads"
if (Test-Path $uploadsDir) {
    Get-ChildItem -Path $uploadsDir | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host " - Cleared uploads folder contents"
}

# Clean temp folder contents (temporary query caches & visitor log files)
$tempSubDir = Join-Path $serverPhpDst "temp"
if (Test-Path $tempSubDir) {
    Get-ChildItem -Path $tempSubDir | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host " - Cleared temp folder contents (query caches & visitor metrics)"
}

# 3. Copy client/dist folder (Frontend)
$clientDistSrc = Join-Path $workspaceRoot "client\dist"
$clientDistDst = Join-Path $tempDir "client\dist"
if (Test-Path $clientDistSrc) {
    New-Item -ItemType Directory -Path (Split-Path $clientDistDst) -Force | Out-Null
    Copy-Item -Path $clientDistSrc -Destination $clientDistDst -Recurse -Force
    Write-Host "Copied: client/dist/ (Frontend)"
} else {
    Write-Host "WARNING: client/dist/ not found, skipping frontend files." -ForegroundColor Yellow
}

Write-Host "Waiting for file locks to settle..."
Start-Sleep -Seconds 2

# 4. Create Zip Archive
Write-Host "Creating complete-public-html.zip..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# Clean up temp directory
Remove-Item -Path $tempDir -Recurse -Force

$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "SUCCESS: complete-public-html.zip ($sizeMB MB) built successfully!" -ForegroundColor Green
Write-Host "  Path: $zipPath" -ForegroundColor Green
Write-Host "Delete everything in public_html/ on cPanel, upload this zip and extract it." -ForegroundColor Yellow
