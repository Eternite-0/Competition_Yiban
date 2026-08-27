# 易赛通后端

Spring Boot 2.7 + MyBatis-Plus + MySQL + Flyway 后端，提供管理员、教师和学生三端 API。

## 环境

- JDK 17
- Maven 3.8+
- MySQL 5.7 或 8.x

项目本地默认数据库：`127.0.0.1:3307/etsaion`，账号密码 `root/root`。

## 启动

推荐从仓库根目录执行统一启动脚本：

```powershell
$env:AI_API_KEY = [Environment]::GetEnvironmentVariable('AI_API_KEY', 'User')
.\scripts\start-local-backend.ps1
```

默认 AI 服务为 OpenAI 兼容接口（`https://sshzyu.com/v1`，模型 `gpt-5.6-terra`）。如需使用其他服务，可通过 `AI_BASE_URL`、`AI_MODEL` 和 `AI_VISION_MODEL` 覆盖；密钥仅从 `AI_API_KEY` 环境变量读取。

脚本会检查工具链和数据库、创建空库，并运行 `mvn spring-boot:run`。后端启动后访问：

- 健康检查：`http://localhost:8080/api/health`
- Swagger：`http://localhost:8080/swagger-ui/index.html`

完整环境变量、已有数据库接管和前端启动步骤见
[`docs/LOCAL-DEVELOPMENT.md`](../docs/LOCAL-DEVELOPMENT.md)。

## 数据库 baseline

数据库由 Flyway 管理，迁移位于 `src/main/resources/db/migration/`：

```text
V1__schema.sql             27 张表结构
V2__reference_data.sql     运行必需的参考数据
V3__seed_students.sql      院系、班级、花名册与账号
V4__seed_scores.sql        综测成绩
V5__seed_competitions.sql  赛事、活动与公告
```

空库会在后端启动时自动执行 V1–V5。已有非空库必须先确认符合当前 baseline，再运行
`db/adopt-flyway.sql` 认领 V5。详细规则见 [`db/README.md`](db/README.md)。

旧的手工脚本已归档到 `db/legacy/`，不能再执行或挂载到 MySQL 初始化目录。

## 测试

```powershell
Set-Location .\Yiban_backend
mvn test
```

运行真实 HTTP 冒烟测试前，先启动后端，再从仓库根目录执行：

```powershell
.\scripts\smoke-backend.ps1
```

## 默认账号

密码均为 `123456`：

| 角色 | 账号 |
|---|---|
| 管理员 | `admin` |
| 教师 | `teacher1`、`teacher24` |
| 学生 | `20230101`、2024 花名册学号 |

教师界面按账号的 `college` 隔离；测试导入的 2024 学生时使用上述教师账号，并在旧登录
会话中退出后重新登录。
