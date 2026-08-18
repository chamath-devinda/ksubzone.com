# KSubZone API Changes Only Packager
# ====================================================
# Generates api-only-changes.zip containing only the files
# that were updated in the recent commits.

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
if ($workspaceRoot -like "*scripts") {
    $workspaceRoot = Split-Path -Parent -Path $workspaceRoot
}

$zipPath = Join-Path $workspaceRoot "api-only-changes.zip"
$tempDir = Join-Path $workspaceRoot "temp-changes-build"

Write-Host "=== KSubZone API Changes Only Packager ===" -ForegroundColor Cyan

# Clean up previous builds
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# List of files to copy (relative to server-php)
$filesToCopy = @(
    "bot-seo.php",
    "index.php",
    "config\Database.php",
    "controllers\AiController.php",
    "controllers\AiSeoController.php",
    "controllers\AnalyticsController.php",
    "controllers\AuthController.php",
    "controllers\DramaController.php",
    "controllers\MovieController.php",
    "controllers\SeoController.php",
    "controllers\SubtitleController.php",
    "controllers\TmdbController.php",
    "utils\AiService.php",
    "utils\Cache.php",
    "utils\SiteContentDefaults.php"
)

$sourceDir = Join-Path $workspaceRoot "server-php"

foreach ($relPath in $filesToCopy) {
    $srcFile = Join-Path $sourceDir $relPath
    $dstFile = Join-Path $tempDir $relPath
    
    if (Test-Path $srcFile) {
        $dstParent = Split-Path -Parent $dstFile
        if (!(Test-Path $dstParent)) {
            New-Item -ItemType Directory -Path $dstParent -Force | Out-Null
        }
        Copy-Item -Path $srcFile -Destination $dstFile -Force
        Write-Host " - Included: $relPath"
    } else {
        Write-Warning "Source file not found: $srcFile"
    }
}

Write-Host "Waiting for file locks to settle..."
Start-Sleep -Seconds 1

# Create Zip Archive
Write-Host "Creating api-only-changes.zip..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# Clean up temp directory
Remove-Item -Path $tempDir -Recurse -Force

$sizeKB = [math]::Round((Get-Item $zipPath).Length / 1KB, 2)
Write-Host ""
Write-Host "SUCCESS: api-only-changes.zip ($sizeKB KB) built successfully!" -ForegroundColor Green
Write-Host "  Path: $zipPath" -ForegroundColor Green
Write-Host "Upload this zip directly to your cPanel api/ folder and extract it." -ForegroundColor Yellow
