$dest = Join-Path (Get-Location) "backend-update.zip"
if (Test-Path $dest) {
    Remove-Item $dest -Force
}

$staging = Join-Path (Get-Location) "temp_backend_pkg"
if (Test-Path $staging) {
    Remove-Item $staging -Recurse -Force
}
New-Item -ItemType Directory -Path $staging | Out-Null

# The production environment file contains secrets and is intentionally not
# packaged. Extract this archive over the existing backend so its .env and
# uploads directory remain untouched.
Copy-Item "server-php/.htaccess" -Destination $staging
Copy-Item "server-php/index.php" -Destination $staging
Copy-Item "server-php/bot-seo.php" -Destination $staging
Copy-Item "server-php/check-db.php" -Destination $staging
Copy-Item "server-php/config" -Destination (Join-Path $staging "config") -Recurse
Copy-Item "server-php/controllers" -Destination (Join-Path $staging "controllers") -Recurse
Copy-Item "server-php/middleware" -Destination (Join-Path $staging "middleware") -Recurse
Copy-Item "server-php/utils" -Destination (Join-Path $staging "utils") -Recurse
Copy-Item "server-php/scripts" -Destination (Join-Path $staging "scripts") -Recurse

# Clean unnecessary internal runtime flags
Get-ChildItem -Path $staging -Filter ".db_initialized*" -Recurse -Force | Remove-Item -Force
Get-ChildItem -Path $staging -Filter ".mysql_failed" -Recurse -Force | Remove-Item -Force

# Give file system and antivirus time to release locks
Start-Sleep -Milliseconds 300

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $dest, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Start-Sleep -Milliseconds 300
Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue

if (Test-Path $dest) {
    $file = Get-Item $dest
    Write-Host "Created Zip Package Successfully:"
    Write-Host "Path: $($file.FullName)"
    Write-Host "Size: $([math]::Round($file.Length / 1KB, 2)) KB"
} else {
    Write-Error "Failed to generate $dest"
    exit 1
}
