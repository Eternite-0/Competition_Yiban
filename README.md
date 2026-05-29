# 易赛通 - 高校赛事服务平台

高校赛事服务一站式平台，支持赛事发布、在线报名、组队招募、作品提交与评审、成长档案等功能。

## 功能特性

### 学生端
- **赛事大厅**：浏览、筛选、搜索校内外赛事
- **在线报名**：填写报名信息、选择赛道、添加队员
- **组队招募**：发布招募帖、申请加入队伍、队长审核
- **作品提交**：上传成果文件、查看审核状态
- **成长档案**：五维能力雷达图、参赛时间轴
- **阶段进度**：查看赛事各阶段状态
- **消息中心**：接收审核通知、站内消息

### 教师端
- **工作台**：待办任务统计、快捷审核入口
- **报名审核**：审核学生报名申请（通过/驳回/退回补充）
- **成果审核**：审核学生提交的作品
- **学生管理**：查看学生参赛情况、成长数据
- **学院总览**：学院参赛统计、专业分布
- **数据导出**：综测评分表 Excel 导出

### 管理员端
- **赛事管理**：发布、编辑、删除赛事
- **用户管理**：查看、删除用户
- **优秀作品**：标记展示优秀成果
- **公告管理**：发布、编辑、删除公告
- **统一工作台**：集中处理各类审核待办

## 技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2 | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | 4.3 | 样式框架 |
| Zustand | 5.0 | 状态管理 |
| Axios | 1.16 | HTTP 请求 |
| Framer Motion | 12.4 | 动画库 |
| Sonner | 2.0 | Toast 通知 |
| Material Symbols | 0.44 | 图标库 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Spring Boot | 2.7.18 | 应用框架 |
| MyBatis-Plus | 3.5.5 | ORM 框架 |
| MySQL | 8.0 | 数据库 |
| JDK | 17 | Java 运行环境 |
| JWT (jjwt) | 0.11.5 | 身份认证 |
| Apache POI | 5.2.5 | Excel 导出 |
| Hutool | 5.8.25 | 工具库 |
| SpringDoc | 1.7.0 | API 文档 |

## 快速开始

### 环境要求
- JDK 17+
- Node.js 18+
- MySQL 8.0+

### 1. 数据库初始化

```bash
# 创建数据库
mysql -u root -e "CREATE DATABASE IF NOT EXISTS etsaion DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

# 初始化表结构和种子数据
mysql -u root etsaion < Yiban_backend/db/000-schema.sql
mysql -u root etsaion < Yiban_backend/db/001-data.sql
```

> 💡 种子数据包含管理员、教师、学生测试账号及示例赛事数据。

### 2. 后端启动

```bash
cd Yiban_backend

# 复制配置文件（可选，已有默认配置）
cp src/main/resources/application.yml.example src/main/resources/application.yml

# 修改数据库连接（如需要）
# 编辑 src/main/resources/application.yml

# 启动后端
mvn spring-boot:run
```

后端默认运行在 `http://localhost:8080`。

### 3. 前端启动

```bash
cd Yiban

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端默认运行在 `http://localhost:5173`，通过 Vite 代理将 `/api` 请求转发到后端。

## 测试账号

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | admin | 123456 | 系统管理员 |
| 教师 | teacher1 | 123456 | 王辅导员 |
| 学生 | 20230101 | 123456 | 张三 |
| 学生 | 20230102 | 123456 | 李四 |

## 项目结构

```
Competition/
├── Yiban/                          # 前端 React 应用
│   ├── src/
│   │   ├── api/                    # API 客户端
│   │   │   ├── client.ts           # Axios 实例与拦截器
│   │   │   └── qiniu.ts            # 七牛云上传
│   │   ├── components/             # 公共组件
│   │   │   ├── CascadeFilter.tsx   # 级联筛选器
│   │   │   ├── Header.tsx          # 顶部导航
│   │   │   ├── Layout.tsx          # 布局容器
│   │   │   ├── PageHero.tsx        # 页面头部
│   │   │   └── Sidebar.tsx         # 侧边导航
│   │   ├── lib/                    # 工具库
│   │   │   └── motion.ts           # 动画配置
│   │   ├── pages/                  # 页面组件
│   │   │   ├── admin/              # 管理员页面 (5个)
│   │   │   ├── student/            # 学生页面 (12个)
│   │   │   └── teacher/            # 教师页面 (7个)
│   │   ├── router/                 # 路由配置
│   │   ├── store/                  # Zustand 状态管理
│   │   └── types/                  # TypeScript 类型
│   ├── package.json
│   └── vite.config.ts
│
├── Yiban_backend/                  # 后端 Spring Boot 应用
│   ├── db/                         # 数据库脚本
│   │   ├── 000-schema.sql          # 表结构 (15张表)
│   │   ├── 001-data.sql            # 种子数据
│   │   └── migrate-*.sql           # 历史迁移 (已合并)
│   ├── src/main/java/com/etsaion/
│   │   ├── controller/             # REST 控制器 (18个)
│   │   ├── service/                # 业务逻辑层
│   │   ├── mapper/                 # MyBatis Mapper
│   │   ├── entity/                 # 数据库实体 (15个)
│   │   ├── dto/                    # 数据传输对象
│   │   ├── vo/                     # 视图对象
│   │   ├── config/                 # 配置类
│   │   ├── interceptor/            # 拦截器
│   │   ├── exception/              # 异常处理
│   │   └── utils/                  # 工具类
│   ├── src/test/                   # 单元测试 (55个)
│   ├── docker-compose.yml          # Docker 配置
│   └── pom.xml
│
└── README.md
```

## 数据库设计

### 核心表 (15张)

| 表名 | 说明 |
|------|------|
| user | 用户表 (管理员/教师/学生) |
| competition | 赛事表 |
| competition_stage | 赛事阶段 |
| registration | 报名表 |
| submission | 成果提交表 |
| submission_student | 成果关联学生 |
| team_post | 组队招募帖 |
| team_application | 组队申请 |
| activity | 活动表 (赛事/志愿) |
| participation | 活动参与 |
| review_task | 审核任务 |
| growth_record | 成长记录 |
| student_stage_progress | 学生阶段进度 |
| announcement | 公告 |
| message | 站内消息 |

### 状态流转

**报名状态**：`待完善` → `已提交` → `审核中` → `审核通过` / `退回补充` / `审核驳回`

**成果状态**：`待审核` → `已审核` (通过/驳回由 approved 字段区分)

## API 文档

启动后端后访问 Swagger UI：
```
http://localhost:8080/swagger-ui/index.html
```

### 主要接口

| 模块 | 接口 | 说明 |
|------|------|------|
| 认证 | POST /api/auth/login | 用户登录 |
| 认证 | POST /api/auth/register | 用户注册 |
| 赛事 | GET /api/competition/list | 赛事列表 |
| 赛事 | GET /api/competition/detail/{id} | 赛事详情 |
| 报名 | POST /api/registration/submit | 提交报名 |
| 报名 | GET /api/registration/my | 我的报名 |
| 成果 | POST /api/submission/submit | 提交成果 |
| 成果 | GET /api/submission/excellent | 优秀作品 |
| 组队 | GET /api/team/list | 招募列表 |
| 组队 | POST /api/team/create | 发布招募 |
| 成长 | GET /api/growth/radar | 能力雷达 |
| 消息 | GET /api/message/list | 消息列表 |

## 测试

```bash
cd Yiban_backend

# 运行所有测试
mvn test

# 静默模式（只看结果）
mvn test -q
```

测试覆盖：
- 契约测试：接口方法存在性、DTO 字段、权限注解
- 业务规则：报名状态流转、成果审核、成长数据计算
- 工具类：日期解析、字符串数组解析

## Docker 部署 (可选)

```bash
cd Yiban_backend

# 启动 MySQL 和 Redis
docker-compose up -d

# 数据库会自动初始化（首次启动时）
```

## 许可证

MIT License
