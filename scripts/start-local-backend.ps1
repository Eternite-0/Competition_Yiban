Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$backendDir = Join-Path $repoRoot 'Yiban_backend'
$mysqlBin = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
$dbUrl = 'jdbc:mysql://127.0.0.1:3307/etsaion?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf-8&allowPublicKeyRetrieval=true'
$backendPort = 8080

if (-not (Test-Path -LiteralPath $mysqlBin)) {
    throw "mysql.exe not found at $mysqlBin"
}

Write-Host 'Checking project MySQL: 127.0.0.1:3307/etsaion ...'
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $mysqlOutput = & $mysqlBin --no-defaults --protocol=TCP --host=127.0.0.1 --port=3307 --user=root --password=root --connect-timeout=3 --database=etsaion -N -e "select 1;" 2>&1
    $mysqlExitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $previousErrorActionPreference
}
if ($mysqlExitCode -ne 0) {
    $message = ($mysqlOutput | Out-String).Trim()
    throw "Project MySQL check failed. Start the 3307 project database, then run this script again. $message"
}

$existingBackend = Get-NetTCPConnection -State Listen -LocalPort $backendPort -ErrorAction SilentlyContinue
if ($existingBackend) {
    $pidList = ($existingBackend | Select-Object -ExpandProperty OwningProcess -Unique) -join ', '
    Write-Host "Backend port $backendPort is already in use by process(es): $pidList"
    Write-Host "If this is the current backend, keep using http://localhost:$backendPort. Stop it before starting another copy."
    exit 0
}

$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot'
$env:DB_URL = $dbUrl
$env:DB_USERNAME = 'root'
$env:DB_PASSWORD = 'root'

$userAiKey = [Environment]::GetEnvironmentVariable('AI_API_KEY', 'User')
if ($userAiKey) {
    $env:AI_API_KEY = $userAiKey
}

Write-Host "Starting backend with DB_URL=$env:DB_URL"
Push-Location $backendDir
try {
    .\mvnw.cmd spring-boot:run
}
finally {
    Pop-Location
}
