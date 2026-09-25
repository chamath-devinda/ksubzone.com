# KSubZone subtitle upload PHP compatibility hotfix packager
# Produces a minimal archive that can be extracted over the live API root.

$ErrorActionPreference = 'Stop'

$workspaceRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$sourceRoot = Join-Path $workspaceRoot 'server-php'
$zipPath = Join-Path $workspaceRoot 'subtitle-upload-hotfix.zip'
$tempDir = Join-Path $workspaceRoot 'temp-subtitle-upload-hotfix'

$resolvedWorkspace = [System.IO.Path]::GetFullPath($workspaceRoot).TrimEnd('\')
$resolvedTemp = [System.IO.Path]::GetFullPath($tempDir)
if (-not $resolvedTemp.StartsWith($resolvedWorkspace + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to use a temporary directory outside the workspace: $resolvedTemp"
}

$files = @(
    'controllers\SubtitleController.php',
    'utils\Revalidate.php'
)

if (Test-Path -LiteralPath $tempDir) {
    Remove-Item -LiteralPath $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

foreach ($relativePath in $files) {
    $sourcePath = Join-Path $sourceRoot $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath)) {
        throw "Required hotfix file was not found: $sourcePath"
    }

    $destinationPath = Join-Path $tempDir $relativePath
    $destinationParent = Split-Path -Parent $destinationPath
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
}

Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $zipPath -Force
Remove-Item -LiteralPath $tempDir -Recurse -Force

$sizeKB = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1KB, 2)
Write-Host "Created subtitle-upload-hotfix.zip ($sizeKB KB)" -ForegroundColor Green
Write-Host "Extract it over the live API root so controllers/ and utils/ are replaced." -ForegroundColor Yellow
