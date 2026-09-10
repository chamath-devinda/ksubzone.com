$dest = Join-Path (Get-Location) "backend-update.zip"
if (Test-Path $dest) {
    Remove-Item $dest -Force
}

$staging = Join-Path (Get-Location) "temp_backend_pkg"
if (Test-Path $staging) {
    Remove-Item $staging -Recurse -Force
}
New-Item -ItemType Directory -Path $staging | Out-Null

Copy-Item "server-php/.env" -Destination $staging
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

Compress-Archive -Path "$staging\*" -DestinationPath $dest -Force
Remove-Item $staging -Recurse -Force

$file = Get-Item $dest
Write-Host "Created Zip Package Successfully:"
Write-Host "Path: $($file.FullName)"
Write-Host "Size: $([math]::Round($file.Length / 1KB, 2)) KB"
