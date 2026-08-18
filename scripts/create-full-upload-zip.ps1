# KSubZone Full Upload Packager (Includes .env and .htaccess)
# ====================================================

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
if ($workspaceRoot -like "*scripts") {
    $workspaceRoot = Split-Path -Parent -Path $workspaceRoot
}

$zipPath = Join-Path $workspaceRoot "full-upload.zip"
$tempDir = Join-Path $workspaceRoot "temp-full-build"

Write-Host "=== KSubZone Full Upload Packager ===" -ForegroundColor Cyan

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

# 3. Exclude SQLite Database to prevent uploading local dev data
$dbFile = Join-Path $serverPhpDst "ksubzone.sqlite"
if (Test-Path $dbFile) {
    Remove-Item -Path $dbFile -Force
    Write-Host " - Excluded: ksubzone.sqlite (Database)"
}

# 4. Clean uploads folder contents (keep directory structure)
$uploadsDir = Join-Path $serverPhpDst "uploads"
if (Test-Path $uploadsDir) {
    Get-ChildItem -Path $uploadsDir | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host " - Cleared uploads folder contents"
}

Write-Host "Waiting for file locks to settle..."
Start-Sleep -Seconds 2

# 5. Create Zip Archive
Write-Host "Creating full-upload.zip..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# Clean up temp directory
Remove-Item -Path $tempDir -Recurse -Force

$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "SUCCESS: full-upload.zip ($sizeMB MB) built successfully!" -ForegroundColor Green
Write-Host "  Path: $zipPath" -ForegroundColor Green
Write-Host "Upload this zip to public_html/ and extract it." -ForegroundColor Yellow
