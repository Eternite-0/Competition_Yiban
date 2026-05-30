@echo off
net stop MySQL84
timeout /t 2
start "" "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --skip-grant-tables
timeout /t 5
echo FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY '123456'; EXIT; | "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root
taskkill /f /im mysqld.exe
timeout /t 2
net start MySQL84
echo Done! Password is 123456
pause
