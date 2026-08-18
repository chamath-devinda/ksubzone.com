# KSubZone Full Update Packager
# Creates backend-update.zip containing:
#   - root .htaccess (Authorization header fix + routing)
#   - server-php/ (all backend PHP files, excluding .env, sqlite db, uploads)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
if ($root -like "*scripts") { $root = Split-Path -Parent $root }

$zipPath  = Join-Path $root "backend-update.zip"
$tempDir  = Join-Path $root "temp-update-build"

Write-Host "=== KSubZone Update Packager ===" -ForegroundColor Cyan

# Cleanup previous
if (Test-Path $zipPath)  { Remove-Item $zipPath  -Force }
if (Test-Path $tempDir)  { Remove-Item $tempDir  -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# ── 1. Copy server-php contents directly to temp build root ───────────────
$serverPhpSrc = Join-Path $root "server-php"
Copy-Item "$serverPhpSrc\*" $tempDir -Recurse -Force
Write-Host "Copied contents of server-php/ directly to build root"

# Strip sensitive / environment-specific files from the root of tempDir
$excludes = @(
    (Join-Path $tempDir "ksubzone.sqlite"),
    (Join-Path $tempDir ".env"),
    (Join-Path $tempDir "config\backup_config.json")
)
foreach ($f in $excludes) {
    if (Test-Path $f) {
        Remove-Item $f -Force
        Write-Host " - Excluded: $(Split-Path -Leaf $f)"
    }
}

# Clear uploads contents if any
$uploadsDir = Join-Path $tempDir "uploads"
if (Test-Path $uploadsDir) {
    Get-ChildItem $uploadsDir | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host " - Cleared: uploads/ contents"
}

# Clear temp/ contents if any (temporary query caches & visitor log files)
$tempSubDir = Join-Path $tempDir "temp"
if (Test-Path $tempSubDir) {
    Get-ChildItem $tempSubDir | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host " - Cleared: temp/ contents (query caches & visitor metrics)"
}

# ── 2. Zip ─────────────────────────────────────────────────────────────
Write-Host "Creating zip using tar..."
# Use tar to preserve POSIX-compliant permissions when extracted on Linux hosts
tar -a -c -f $zipPath -C $tempDir .

# Cleanup temp
Remove-Item $tempDir -Recurse -Force

$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "SUCCESS: backend-update.zip ($sizeMB MB) ready at:" -ForegroundColor Green
Write-Host "  $zipPath"
Write-Host ""
Write-Host "Upload this zip to cPanel and extract it DIRECTLY into public_html/api/" -ForegroundColor Yellow
Write-Host "It will update the API files directly." -ForegroundColor Yellow
Write-Host "(Your .env and ksubzone.sqlite are SAFE - not included)" -ForegroundColor Green
