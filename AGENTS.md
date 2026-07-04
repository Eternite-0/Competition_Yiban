# AGENTS.md

## Local Startup Notes

This workspace has two local MySQL instances. For this project, use the project database on port `3307`.

- Project DB: `127.0.0.1:3307/etsaion`
- DB username: `root`
- DB password: `root`
- Current project MySQL config: `C:\Users\lj06l\AppData\Local\Temp\etsaion-mysql-3307\my-normal.ini`
- Do not silently fall back to `localhost:3306`; that is the separate `MySQL84` service and may reject `root/root` or point at the wrong data.

Before starting the Spring Boot backend locally, set these environment variables in the same PowerShell session:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot'
$env:DB_URL = 'jdbc:mysql://127.0.0.1:3307/etsaion?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf-8&allowPublicKeyRetrieval=true'
$env:DB_USERNAME = 'root'
$env:DB_PASSWORD = 'root'
$env:AI_API_KEY = [Environment]::GetEnvironmentVariable('AI_API_KEY', 'User')
```

Then start the backend from `Yiban_backend`:

```powershell
.\mvnw.cmd spring-boot:run
```

The frontend dev server is configured for port `3000` and proxies `/api` to `http://localhost:8080`.

## Verification

After restart, check:

```powershell
Invoke-RestMethod http://localhost:8080/api/health
```

If AI chat reports that `AI_API_KEY` is missing, the backend process did not inherit `AI_API_KEY`; set it in the same shell before starting. Do not write the API key into tracked source or docs.

## Student Account Repair

If a MySQL restart or import leaves 2024 students unable to log in, or leaves `student_roster.status` as `pending` while `user` already has the student account, repair the local test data through the admin API:

```powershell
$adminLogin = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/auth/login' -ContentType 'application/json; charset=utf-8' -Body (@{ username='admin'; password='123456' } | ConvertTo-Json -Compress)
$headers = @{ Authorization = "Bearer $($adminLogin.data.token)" }
$body = @{ grade='2024'; resetPassword=$true } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/admin/users/sync-student-accounts' -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $body
```

This syncs all 2024 roster rows into `user`, sets student accounts to `active`, marks roster rows as `registered`, and resets the local test password to `123456`.

## Teacher Test Accounts

The teacher UI is scoped by the logged-in teacher account's `college`. The imported 2024 roster belongs to `计算机与人工智能学院`, so local testing should use a teacher bound to that college.

- `teacher1 / 123456` is repaired by `migrate-014-sync-2024-comprehensive-users.sql` to view the imported 2024 college.
- `teacher24 / 123456` is also created/repaired by that migration.
- If the browser was already logged in before this repair, log out and log in again so the frontend refreshes the cached teacher `college`.
