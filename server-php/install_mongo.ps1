$ErrorActionPreference = "Stop"
$url = "https://windows.php.net/downloads/pecl/releases/mongodb/1.17.2/php_mongodb-1.17.2-8.2-ts-vs16-x64.zip"
$zipFile = "C:\xampp\php\mongodb.zip"
$extractPath = "C:\xampp\php\mongodb_ext"
$extPath = "C:\xampp\php\ext\php_mongodb.dll"
$iniPath = "C:\xampp\php\php.ini"

Write-Host "Downloading MongoDB PHP Extension..."
Invoke-WebRequest -Uri $url -OutFile $zipFile

Write-Host "Extracting..."
Expand-Archive -LiteralPath $zipFile -DestinationPath $extractPath -Force

Write-Host "Installing DLL..."
Copy-Item "$extractPath\php_mongodb.dll" -Destination $extPath -Force

Write-Host "Updating php.ini..."
$iniContent = Get-Content $iniPath
if ($iniContent -notcontains "extension=mongodb") {
    Add-Content $iniPath "`nextension=mongodb"
    Write-Host "Added extension=mongodb to php.ini"
} else {
    Write-Host "extension=mongodb already in php.ini"
}

Write-Host "Cleaning up..."
Remove-Item $zipFile -Force
Remove-Item $extractPath -Recurse -Force

Write-Host "Done!"
