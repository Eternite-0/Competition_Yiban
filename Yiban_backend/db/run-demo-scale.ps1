param(
    [switch]$Cleanup
)

$mysqlExe = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
$scriptName = if ($Cleanup) { 'cleanup-demo-scale.sql' } else { 'seed-demo-scale.sql' }
$scriptPath = Join-Path $PSScriptRoot $scriptName

if (-not (Test-Path -LiteralPath $mysqlExe)) {
    throw "MySQL client not found: $mysqlExe"
}
if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "Demo SQL script not found: $scriptPath"
}

# Use raw file redirection so UTF-8 SQL reaches mysql without PowerShell recoding.
$cmdLine = '"' + $mysqlExe + '" --protocol=tcp --host=127.0.0.1 --port=3307 --user=root --password=root --default-character-set=utf8mb4 --database=etsaion < "' + $scriptPath + '"'
Write-Host ('Running demo SQL: ' + $scriptName)
& $env:ComSpec /d /s /c $cmdLine
if ($LASTEXITCODE -ne 0) {
    throw "Demo SQL failed with exit code: $LASTEXITCODE"
}
