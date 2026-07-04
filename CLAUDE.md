# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

易赛通高校赛事报名管理系统，支持赛事发布、学生报名、成果审核、成长档案、组队招募、志愿活动等全链路功能。

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand 5
- **后端**: Spring Boot 2.7 + MyBatis-Plus 3.5 + MySQL 8 + JWT
- **目录**: `Yiban/` (前端), `Yiban_backend/` (后端)

## 快速启动

### 后端 (端口 8080)

```powershell
cd D:\Project\Competition
$env:AI_API_KEY = "your-api-key"  # AI 功能必须
.\scripts\start-local-backend.ps1  # 日常启动，会先检查 3307 项目库
```

后端检查命令:

```powershell
cd D:\Project\Competition\Yiban_backend
mvn clean install -DskipTests         # 首次或依赖变更
mvn compile                           # 仅编译检查
mvn test                              # 运行所有测试
mvn test -q                           # 静默测试（只看结果）
mvn test -Dtest=ContractBaselineTest  # 运行单个测试类
```

数据库: 本地项目库使用 MySQL `127.0.0.1:3307/etsaion`，用户名/密码为 `root/root`。不要默认连 `localhost:3306`，那是单独的 `MySQL84` 服务，账号和数据目录都可能不同。种子密码均为 `123456`。
AI 配置: `AI_API_KEY`(必须), `AI_BASE_URL`, `AI_MODEL` 在 `application.yml` 的 `ai.*` 节点。

停止后端: `Stop-Process -Name java -Force`

### 前端 (端口 3000)

```powershell
cd D:\Project\Competition\Yiban
npm install                     # 首次安装依赖
npm run dev                     # 开发服务器，自动代理 /api -> localhost:8080
npm run build                   # 生产构建 + TypeScript 类型检查
npm run lint                    # ESLint 检查
```

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | 123456 |
| 教师 | teacher1 | 123456 |
| 学生 | 20230101 (张三) | 123456 |
| 学生 | 20230102 (李四) | 123456 |

## 架构要点

### 后端分层

```
controller/     → REST 端点，18 个控制器
service/        → 业务逻辑
service/ai/     → AI 子系统 (AssistantToolRegistry, MimoModelClient, AiChatService)
mapper/         → MyBatis-Plus 数据访问
entity/         → 数据库实体 (25 张表)
dto/            → 请求 DTO
vo/             → 响应视图对象
vo/ai/          → AI 响应 VO (ToolCallVO, AiModelResponseVO 等)
config/         → 配置类 (WebMvc, MyBatis, Qiniu, AiProperties)
interceptor/    → AuthInterceptor + @RequireRole 注解
exception/      → 全局异常处理 + BusinessException
utils/          → JwtUtil, UserContext (ThreadLocal)
```

### 前端结构

```
src/api/        → client.ts (axios 实例), qiniu.ts (七牛云上传), aiChat.ts
src/store/      → useStore.ts (Zustand 全局状态)
src/pages/      → 按角色分目录: admin/(5), student/(12), teacher/(7)
src/components/ → 公共组件: Header, Sidebar, Layout, CascadeFilter, PageHero
src/components/ai/ → AI 助手组件 (AIAssistantWidget, ChatMessageList, ChatInputBar, QuickPromptChips)
src/router/     → 路由配置
src/types/      → TypeScript 类型定义
src/lib/        → motion.ts (Framer Motion 动画配置)
```

### AI 助手架构 (Function Calling)

AI 助手采用 OpenAI Function Calling 架构，模型按需调用工具获取数据：

```
用户消息 → MimoModelClient.chatWithTools(消息, 工具定义)
         → 模型返回 tool_calls? (最多 3 轮循环)
            ├─ 否 → 直接返回文本回答
            └─ 是 → AssistantToolRegistry.executeTool() 执行工具
                   → 结果作为 tool message 喂回模型 → 继续循环
```

**核心文件**：
- `AssistantToolRegistry` — 工具注册中心，定义 15 个工具 + 执行分发
- `MimoModelClient` — OpenAI 兼容 HTTP 客户端，支持 `tools` 参数
- `AiChatServiceImpl` — 对话服务，管理 Function Calling 循环 + 对话历史

**工具列表**（按角色动态分配）：

| 工具名 | 角色 | 功能 |
|--------|------|------|
| `search_competitions` | all | 搜索赛事 |
| `get_competition_detail` | all | 赛事详情 |
| `get_my_registrations` | student | 我的报名 |
| `get_my_submissions` | student | 我的成果 |
| `get_my_award_proofs` | student | 我的获奖证明 |
| `get_my_growth` | student | 成长雷达 |
| `get_my_participations` | student | 活动参与 |
| `get_my_messages` | student | 站内消息 |
| `get_announcements` | student/admin | 最新公告 |
| `search_students` | teacher | 搜索学生 |
| `get_student_detail` | teacher | 学生详情 |
| `get_pending_reviews` | teacher/admin | 待审核任务 |
| `get_college_overview` | teacher | 学院总览 |
| `get_award_proof_audit` | teacher | 获奖证明审核 |
| `get_pending_drafts` | admin | 待审核草稿 |
| `get_ai_task_stats` | admin | AI 任务统计 |
| `get_user_stats` | admin | 用户统计 |

**环境变量**：`AI_API_KEY` 必须配置，`AI_BASE_URL` / `AI_MODEL` 可选覆盖。

### 认证与权限

- JWT token 存 localStorage，axios 请求拦截器自动附加 `Authorization: Bearer <token>`
- 后端 `AuthInterceptor` 解析 token 填充 `UserContext` (ThreadLocal)
- `@RequireRole("admin")` 注解控制端点权限，支持多角色 `"admin", "teacher"`
- 响应拦截器自动处理 401 → 清除 token + logout

### API 响应约定

- 统一格式: `{ code: 200, message: "success", data: ... }`
- 前端 `client.ts` 已解包：成功返回 `res.data`，非 200 抛错
- 登录: `POST /api/auth/login` → `{ token, user }`

### 数据库迁移

迁移脚本在 `Yiban_backend/db/`:

```bash
# 两步完成全新初始化（幂等，可重复运行）
mysql --protocol=TCP --host=127.0.0.1 --port=3307 -u root -proot etsaion < db/000-schema.sql   # 全量建表 (15 张表)
mysql --protocol=TCP --host=127.0.0.1 --port=3307 -u root -proot etsaion < db/001-data.sql     # 种子数据 + review_task 回填

# Docker 启动自动执行，无需手动操作
# migrate-*.sql 已全部合并进 schema，仅保留用于已有数据库升级
```

## 核心数据模型

### 报名状态 (Registration)
`待完善` → `已提交` → `审核中` → `审核通过` / `退回补充` / `审核驳回`

### 成果状态 (Submission)
`待审核` → `已审核` (通过/驳回/退回补充由 approved + reviewNote 区分)

### 活动参与状态 (Participation)
`submitted` → `in_review` → `approved` / `returned` / `rejected` / `cancelled`

### 统一待办 (ReviewTask)
`pending` / `processing` / `resolved`
targetType: `registration` / `submission` / `participation`

## 关键端点

| 模块 | 端点 | 说明 |
|------|------|------|
| 赛事 | `GET /api/competition/list` | 分页赛事列表，params: current, size, status, level, category |
| 赛事 | `GET /api/competition/detail/{id}` | 赛事详情 |
| 报名 | `POST /api/registration/submit` | 学生报名 |
| 报名 | `GET /api/registration/my` | 我的报名 |
| 报名 | `POST /api/registration/audit` | 审核报名 (teacher/admin) |
| 成果 | `POST /api/submission/submit` | 上传成果 |
| 成果 | `POST /api/submission/review` | 审核成果 |
| 工作台 | `GET /api/admin/workbench/tasks` | 统一待办列表 |
| 工作台 | `POST /api/admin/workbench/tasks/{id}/action` | 处理待办 (approve/reject/return) |
| 工作台 | `POST /api/admin/workbench/tasks/backfill` | 幂等补齐历史待办 |
| 工作台 | `GET /api/admin/workbench/stats` | 待办统计 |
| 成长 | `GET /api/growth/radar?studentId=` | 成长雷达 (学生只能查自己) |
| 活动 | `GET /api/activities` | 活动列表 |
| 参与 | `GET /api/me/participations` | 我的参与 |
| 组队 | `GET /api/team/list` | 招募列表 |
| 组队 | `POST /api/team/create` | 发布招募 |
| 消息 | `GET /api/message/list` | 消息列表 |
| AI 对话 | `POST /api/ai/chat` | AI 对话 (Function Calling) |
| AI 对话 | `POST /api/ai/chat/stream` | AI 对话 (SSE) |
| AI 对话 | `GET /api/ai/chat/conversations` | 会话列表 |
| AI 对话 | `GET /api/ai/chat/conversations/{id}` | 会话详情 |
| AI 对话 | `DELETE /api/ai/chat/conversations/{id}` | 删除会话 |

## 前端路由

```
/student/competitions              # 赛事大厅
/student/competitions/:id          # 赛事详情
/student/registrations             # 我的报名
/student/registrations/workbench/:id  # 报名工作台
/student/upload/:id                # 成果上传
/student/growth                    # 成长档案
/student/team-recruitment          # 组队招募
/admin/publish                     # 发布赛事
/admin/publish/:id                 # 编辑赛事
/admin/users                       # 用户管理
/admin/announcements               # 公告管理
/teacher/audit                     # 成果审核
/teacher/students                  # 学生赛事
/teacher/college-overview          # 学院总览
```

## 代码规范

- 中文 UI 文案，代码注释可中文
- 后端不使用 Lombok @Data（已有项目约定）
- 前端 API 调用统一走 `src/api/client.ts` (axios)，不要直接 fetch
- 前端状态管理用 Zustand (`src/store/useStore.ts`)
- 赛事内容字段 `content` 存储 HTML，前端用 `dangerouslySetInnerHTML` + sanitize 渲染
- 封面图 `coverUrl` 可能为 null 或不可访问，前端需 onError fallback
- "退回补充" 是独立状态，不是 "审核驳回" 的子状态
- 前端动效使用 Framer Motion，配置在 `src/lib/motion.ts`
- Toast 通知使用 Sonner

## PowerShell 命令规范

本项目运行在 Windows 11 环境，Shell 为 PowerShell。优先使用 PowerShell 原生语法。

### 常用对照表

| 操作 | PowerShell (正确) | Bash (不要用) |
|------|-------------------|---------------|
| 列目录 | `Get-ChildItem` 或 `ls` | `find`, `ls -la` |
| 读文件 | `Get-Content` 或 `cat` | `cat`, `head`, `tail` |
| 搜索文本 | `Select-String` 或 Grep 工具 | `grep` |
| 杀进程 | `Stop-Process -Name java -Force` | `kill`, `pkill` |
| 查端口占用 | `Get-NetTCPConnection -LocalPort 8080` | `lsof -i :8080`, `netstat` |
| 环境变量 | `$env:VAR_NAME` | `$VAR_NAME` |
| 路径拼接 | `Join-Path $a $b` 或直接 `\` | `/` |
| 创建目录 | `New-Item -ItemType Directory -Force path` | `mkdir -p` |
| 删除目录 | `Remove-Item -Recurse -Force path` | `rm -rf` |

### 进程管理

```powershell
# 查看 8080 端口占用
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue

# 杀掉占用 8080 的进程
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# 一键杀所有 Java 进程
Stop-Process -Name java -Force -ErrorAction SilentlyContinue

# 后台启动后端（不阻塞终端）
Start-Process -NoNewWindow -FilePath "mvn" -ArgumentList "spring-boot:run" -WorkingDirectory "D:\Project\Competition\Yiban_backend"
```

### 注意事项

- PowerShell 用反引号 `` ` `` 做续行，不是 `\`
- 字符串插值: `"Hello $var"` 或 `"Hello $($obj.Prop)"`
- 单引号字符串不插值: `'Hello $var'` 字面量
- 调用外部 exe 用 `&` 操作符: `& "C:\path\to\app.exe" arg1`
- `curl` 在 PowerShell 是 `Invoke-WebRequest` 的别名；API 测试用 `curl.exe` 或 Bash 工具
- `$null` 不是 `/dev/null`，重定向用 `2>$null`
- Bash 工具内路径用 `/d/Project/...` 格式；PowerShell 工具用 `D:\Project\...` 格式

## 常见问题

- **端口占用**: `Stop-Process -Name java -Force` 杀掉所有 Java 进程
- **编译报非法字符**: 检查 Java 文件是否有 Unicode 弯引号 (U+201C/U+201D)，用 Python 脚本替换
- **前端 build 报 unused variable**: 删除未使用的变量声明
- **coverUrl 显示破图**: 已有 onError fallback，检查 img 标签的 nextElementSibling 逻辑
- **Swagger API 文档**: http://localhost:8080/swagger-ui/index.html
