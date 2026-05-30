@echo off
echo ========================================
echo MySQL 密码重置脚本
echo ========================================

echo.
echo [步骤 1] 停止 MySQL 服务...
net stop MySQL84
if errorlevel 1 (
    echo 停止服务失败，请以管理员身份运行此脚本！
    pause
    exit /b 1
)

echo.
echo [步骤 2] 以跳过权限模式启动 MySQL...
echo 请保持此窗口打开，不要关闭！
echo.
echo 正在启动 mysqld --skip-grant-tables...
start "MySQL Skip Grant" "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --skip-grant-tables

echo.
echo 等待 5 秒让 MySQL 启动...
timeout /t 5 /nobreak

echo.
echo [步骤 3] 重置密码...
echo 正在连接 MySQL 并重置密码为 123456...
echo.

(
echo FLUSH PRIVILEGES;
echo ALTER USER 'root'@'localhost' IDENTIFIED BY '123456';
echo EXIT;
) | "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root

if errorlevel 1 (
    echo 密码重置失败！
    pause
    exit /b 1
)

echo.
echo [步骤 4] 重启 MySQL 服务...
echo 先关闭 mysqld 进程...
taskkill /f /im mysqld.exe >nul 2>&1

echo 启动 MySQL 服务...
net start MySQL84

echo.
echo ========================================
echo 密码重置完成！新密码: 123456
echo ========================================
pause
