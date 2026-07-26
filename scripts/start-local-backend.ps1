Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$backendDir = Join-Path $repoRoot 'Yiban_backend'
$backendPort = if ($env:BACKEND_PORT) { [int]$env:BACKEND_PORT } else { 8080 }

# 项目默认数据库固定在 3307；需要连接其他实例时显式覆盖环境变量。
$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { '127.0.0.1' }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { '3307' }
$dbName = if ($env:DB_NAME) { $env:DB_NAME } else { 'etsaion' }
$dbUsername = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { 'root' }
$dbPassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { 'root' }

if ($dbName -notmatch '^[A-Za-z0-9_]+$') {
    throw "DB_NAME 只能包含字母、数字和下划线，当前值：$dbName"
}

$defaultDbUrl = "jdbc:mysql://${dbHost}:${dbPort}/${dbName}?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf-8&allowPublicKeyRetrieval=true"
$dbUrl = if ($env:DB_URL) { $env:DB_URL } else { $defaultDbUrl }

# 如果显式传入 DB_URL，尽量让数据库预检使用同一主机、端口和库名。
if ($dbUrl -match '^jdbc:mysql://(?<host>[^:/?]+)(?::(?<port>\d+))?/(?<name>[^?]+)') {
    $dbHost = $Matches.host
    if ($Matches.port) { $dbPort = $Matches.port }
    $dbName = $Matches.name
}

if ($dbName -notmatch '^[A-Za-z0-9_]+$') {
    throw "DB_URL 中的数据库名只能包含字母、数字和下划线，当前值：$dbName"
}

$mysqlCandidates = @(
    $env:MYSQL_BIN,
    (Get-Command mysql.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    'D:\amysql\mysql-5.7.44-winx64\bin\mysql.exe',
    'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe',
    'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique

$mysqlBin = $mysqlCandidates | Select-Object -First 1
if (-not $mysqlBin) {
    throw '找不到 mysql.exe。请安装 MySQL 客户端，或设置 MYSQL_BIN 指向 mysql.exe。'
}

if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    $javaCommand = Get-Command java.exe -ErrorAction SilentlyContinue
    if ($javaCommand) {
        $env:JAVA_HOME = Split-Path (Split-Path $javaCommand.Source -Parent) -Parent
    }
}

if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    throw '找不到可用的 JDK 17。请设置 JAVA_HOME 后重试。'
}

$mvnCommand = if (Test-Path -LiteralPath (Join-Path $backendDir 'mvnw.cmd')) {
    Join-Path $backendDir 'mvnw.cmd'
}
else {
    $maven = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    if (-not $maven) { $maven = Get-Command mvn -ErrorAction SilentlyContinue }
    if (-not $maven) { throw '找不到 Maven。请安装 Maven 3.8+ 并加入 PATH。' }
    $maven.Source
}

function Invoke-MySqlCommand {
    param([Parameter(Mandatory = $true)][string]$Sql)

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & $mysqlBin --no-defaults --protocol=TCP --host=$dbHost --port=$dbPort --user=$dbUsername --connect-timeout=3 --batch --skip-column-names -e $Sql 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    [pscustomobject]@{ Output = $output; ExitCode = $exitCode }
}

Write-Host "Checking project MySQL: ${dbHost}:${dbPort}/${dbName} ($mysqlBin) ..."
$previousMysqlPwd = $env:MYSQL_PWD
$env:MYSQL_PWD = $dbPassword
try {
    $createResult = Invoke-MySqlCommand "CREATE DATABASE IF NOT EXISTS ``$dbName`` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
    if ($createResult.ExitCode -ne 0) {
        $message = ($createResult.Output | Out-String).Trim()
        throw "连不上项目数据库 ${dbHost}:${dbPort}，或无法创建 ${dbName}。$message"
    }

    $stateSql = "SELECT CONCAT((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='$dbName' AND TABLE_NAME <> 'flyway_schema_history'), ':', (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='$dbName' AND TABLE_NAME='flyway_schema_history'));"
    $stateResult = Invoke-MySqlCommand $stateSql
    if ($stateResult.ExitCode -ne 0) {
        $message = ($stateResult.Output | Out-String).Trim()
        throw "无法检查 ${dbName} 的 Flyway 状态。$message"
    }

    $state = (($stateResult.Output | Select-Object -Last 1) | Out-String).Trim()
    if ($state -match '^(?<tables>\d+):(?<history>\d+)$' -and [int]$Matches.tables -gt 0 -and [int]$Matches.history -eq 0) {
        throw "数据库 ${dbName} 已有表但尚未接入 Flyway。若它来自当前 baseline，请先按 docs/LOCAL-DEVELOPMENT.md 的 [已有数据库] 步骤认领；不确定来源时请备份后重建空库。"
    }
}
finally {
    if ($null -eq $previousMysqlPwd) {
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    }
    else {
        $env:MYSQL_PWD = $previousMysqlPwd
    }
}

$existingBackend = Get-NetTCPConnection -State Listen -LocalPort $backendPort -ErrorAction SilentlyContinue
if ($existingBackend) {
    $pidList = ($existingBackend | Select-Object -ExpandProperty OwningProcess -Unique) -join ', '
    Write-Host "Backend port $backendPort is already in use by process(es): $pidList"
    Write-Host "If this is the current backend, keep using http://localhost:$backendPort. Stop it before starting another copy."
    exit 0
}

$env:DB_URL = $dbUrl
$env:DB_USERNAME = $dbUsername
$env:DB_PASSWORD = $dbPassword

if (-not $env:AI_API_KEY) {
    $userAiKey = [Environment]::GetEnvironmentVariable('AI_API_KEY', 'User')
    if ($userAiKey) { $env:AI_API_KEY = $userAiKey }
}

Write-Host "Starting backend with DB_URL=$env:DB_URL"
Write-Host 'Flyway will apply the current baseline and all later migrations automatically.'

Push-Location $backendDir
try {
    & $mvnCommand spring-boot:run
}
finally {
    Pop-Location
}
