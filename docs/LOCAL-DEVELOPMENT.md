# 本地开发启动指引

这份指引以仓库内的 Flyway V1–V5 baseline 为准，适用于第一次拉取项目和已有开发库接管。

## 1. 环境要求

- JDK 17
- Maven 3.8+
- Node.js 18+
- MySQL 5.7 或 8.x
- 可选：Docker Desktop（只用来快速启动 MySQL/Redis）

项目本地数据库默认是 `127.0.0.1:3307/etsaion`，账号密码 `root/root`。不要默认使用
`localhost:3306`，它可能是另一套服务和另一份数据。

## 2. 准备数据库

已有 3307 MySQL 可跳过本节。需要容器时，在仓库根目录运行：

```powershell
docker compose -f .\Yiban_backend\docker-compose.yml up -d mysql
```

该命令启动项目 MySQL 服务并映射到 3307；新建数据卷第一次使用时数据库为空。
不要手工执行 `db/legacy/` 中的 SQL；后端启动时会由 Flyway 自动创建数据库结构和
baseline 数据。

## 3. 启动后端

从仓库根目录运行：

```powershell
$env:AI_API_KEY = [Environment]::GetEnvironmentVariable('AI_API_KEY', 'User')
.\scripts\start-local-backend.ps1
```

启动脚本会：

1. 检查 JDK、Maven 和 MySQL 客户端；
2. 连接 `127.0.0.1:3307` 并创建空的 `etsaion` 库（如果尚不存在）；
3. 拒绝自动认领来源不明的非空旧库；
4. 启动 Spring Boot，由 Flyway 自动执行缺失迁移。

健康检查：

```powershell
Invoke-RestMethod http://localhost:8080/api/health
```

如果 AI 对话提示缺少密钥，说明启动后端的同一个 PowerShell 会话没有
`AI_API_KEY`。不要把密钥写进源码或文档。

### 自定义数据库连接

推荐完整设置：

```powershell
$env:DB_URL = 'jdbc:mysql://127.0.0.1:3307/etsaion?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf-8&allowPublicKeyRetrieval=true'
$env:DB_USERNAME = 'root'
$env:DB_PASSWORD = 'root'
.\scripts\start-local-backend.ps1
```

也可用 `DB_HOST`、`DB_PORT`、`DB_NAME` 和 `MYSQL_BIN` 覆盖启动脚本的预检参数。

## 4. 启动前端

另开一个 PowerShell：

```powershell
Set-Location .\Yiban
npm install
npm run dev
```

访问 `http://localhost:3000`。Vite 会把 `/api` 和 `/files` 代理到
`http://localhost:8080`。

## 5. 已有数据库接入 Flyway

如果 `etsaion` 已经有业务表，但没有 `flyway_schema_history`，启动脚本会停止。先备份，
并确认该库来自项目当前 baseline，然后在仓库根目录执行：

```powershell
Get-Content -Raw -Encoding UTF8 .\Yiban_backend\db\adopt-flyway.sql |
  mysql --protocol=TCP -h 127.0.0.1 -P 3307 -u root -proot etsaion
```

脚本会验证 27 张必需表，再把现有结构标记为 V5；不会重放 baseline，也不会删除业务数据。
如果验证失败或无法确认来源，最稳妥的做法是先导出需要的数据，再重建空库让 Flyway 初始化。

## 6. 后续数据库变更

迁移目录：`Yiban_backend/src/main/resources/db/migration/`。

- V1–V5 是当前 baseline，提交后不再修改。
- 每次结构或必需数据变化都新增 `V6__description.sql`、`V7__description.sql`……
- 不要把新 SQL 放回 `Yiban_backend/db/legacy/`。
- 后端启动后检查 `flyway_schema_history`，确认新版本状态为成功。

更多数据库约定见 `Yiban_backend/db/README.md`。

## 7. 常用测试账号

密码均为 `123456`：

| 角色 | 账号 | 说明 |
|---|---|---|
| 管理员 | `admin` | 全局管理 |
| 教师 | `teacher1` / `teacher24` | 计算机与人工智能学院测试 |
| 学生 | `20230101` | 基础演示账号 |
| 2024 学生 | 学号 | 由 baseline 花名册生成 |

浏览器已有旧登录缓存时，请退出后重新登录，以刷新教师学院等用户信息。
