# 易赛通 - 高校赛事服务平台

高校赛事服务一站式平台，支持赛事发布、在线报名、组队招募、作品提交与评审等功能。

## 技术栈

### 前端
- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Zustand (状态管理)
- Axios (HTTP 请求)
- Framer Motion (动画)
- Sonner (Toast 通知)

### 后端
- Spring Boot 2.7
- MyBatis-Plus
- MySQL 5.7
- JWT 认证
- 七牛云 OSS (文件存储)

## 快速开始

### 数据库准备

1. 创建 MySQL 数据库：
```sql
CREATE DATABASE etsaion DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 执行 `Yiban_backend/src/main/resources/schema.sql` 初始化表结构和数据。

### 后端启动

1. 复制配置文件并填写实际值：
```bash
cp Yiban_backend/src/main/resources/application.yml.example Yiban_backend/src/main/resources/application.yml
```

2. 修改 `application.yml` 中的数据库连接、JWT 密钥、七牛云配置。

3. 启动 Spring Boot 应用：
```bash
cd Yiban_backend
./mvnw spring-boot:run
```

后端默认运行在 `http://localhost:8080`。

### 前端启动

```bash
cd Yiban
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`，通过 Vite 代理将 `/api` 请求转发到后端。

## 项目结构

```
├── Yiban/                  # 前端 React 应用
│   ├── src/
│   │   ├── api/            # API 客户端与请求封装
│   │   ├── components/     # 公共组件 (Header, Sidebar, Layout)
│   │   ├── pages/          # 页面组件
│   │   │   ├── admin/      # 管理员页面
│   │   │   ├── student/    # 学生页面
│   │   │   └── teacher/    # 教师页面
│   │   ├── router/         # 路由配置
│   │   ├── store/          # Zustand 状态管理
│   │   └── types/          # TypeScript 类型定义
│   └── ...
│
├── Yiban_backend/          # 后端 Spring Boot 应用
│   └── src/main/java/com/etsaion/
│       ├── controller/     # REST 控制器
│       ├── service/        # 业务逻辑层
│       ├── mapper/         # MyBatis Mapper 接口
│       ├── entity/         # 数据库实体
│       ├── dto/            # 数据传输对象
│       ├── vo/             # 视图对象
│       ├── config/         # 配置类
│       ├── interceptor/    # 拦截器 (JWT 认证)
│       └── utils/          # 工具类
└── ...
```

## 角色说明

| 角色 | 功能 |
|------|------|
| 学生 | 浏览赛事、在线报名、组队招募、作品提交、成长档案 |
| 教师 | 赛事审核、作品评审、学生管理 |
| 管理员 | 赛事发布、优秀作品管理 |

## API 文档

启动后端后访问 Swagger UI：`http://localhost:8080/swagger-ui/index.html`
