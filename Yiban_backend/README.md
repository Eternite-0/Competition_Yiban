# “易赛通” 高校赛事服务平台后端

“易赛通” 是一套面向高校赛事全生命周期管理的数字化平台后端系统。服务 **系统管理员**（赛事管理与成果审核）、**学生**（参赛组队与成长档案）和 **教师/辅导员**（赛事监控与综测分析）三类用户。

本后端基于 **Spring Boot 2.7.x + MyBatis-Plus + MySQL 8.0 + Redis 7.0 + Apache POI + Swagger/OpenAPI** 架构开发，并集成了完全容器化的 Docker 本地运行环境。

---

## 📌 技术栈选型

* **核心框架**：Spring Boot 2.7.18 (JDK 17 兼容)
* **持久层 ORM**：MyBatis-Plus 3.5.5
* **数据库**：MySQL 8.0
* **高性能缓存**：Redis 7.0 (存储无状态 JWT & 缓存校验)
* **文档/数据导出**：Apache POI 5.2.5 (用于教师一键生成班级综测 Excel 表格)
* **无状态安全认证**：JWT (JSON Web Token) 自定义角色拦截器
* **开发辅助**：Lombok + Hutool 5.8.25
* **API 文档与交互测试**：Springdoc OpenAPI (Swagger UI) 1.7.0

---

## 📂 项目包结构

```text
d:\Project\Yiban_backend
├── db/                         # 数据库初始化脚本
│   ├── schema.sql              # 表结构定义 (含 team_application)
│   └── data.sql                # 丰富初始测试数据 (管理员/教师/学生账号)
├── docker-compose.yml          # 开箱即用 MySQL/Redis 容器编排
├── pom.xml                     # Maven 依赖与构建配置
├── README.md                   # 本说明文件
└── src/
    └── main/
        ├── java/
        │   └── com/
        │       └── etsaion/
        │           ├── EtsaionApplication.java     # 主程序入口
        │           ├── config/                     # 业务配置类 (MyBatis-Plus/WebMVC 静态映射/CORS)
        │           ├── controller/                 # 控制器层 (REST APIs)
        │           ├── dto/                        # 数据传输对象 (输入校验 DTOs / Result 统一包装)
        │           ├── entity/                     # MyBatis-Plus 实体类
        │           ├── exception/                  # 全局异常拦截处理层
        │           ├── interceptor/                # JWT 安全拦截与 @RequireRole 校验拦截器
        │           ├── mapper/                     # MyBatis 数据库映射接口
        │           ├── service/                    # 业务逻辑服务接口与实现 (impl)
        │           ├── utils/                      # 工具库 (JwtUtil / ExcelUtil 导出 / UserContext 线程上下文)
        │           └── vo/                         # 视图对象 (UserVO / TeamVO 嵌套结构 / Radar 能力图 VO)
        └── resources/
            └── application.yml                     # 核心配置文件 (MySQL/Redis/JWT密钥/Swagger)
```

---

## 🚀 极速启动与运行指南

### 1. 环境依赖
请确保您本地已安装：
* **JDK 17** 或更高版本
* **Maven 3.8+**
* **Docker Desktop** (可选，用于快速启动 MySQL 和 Redis 服务)

### 2. 第一步：启动 MySQL 和 Redis 容器服务
在项目根目录（`d:\Project\Yiban_backend`）打开终端，运行以下命令启动服务：
```powershell
docker-compose up -d
```
> **提示**：`docker-compose.yml` 已经配置了自动挂载 `./db` 目录。容器首次启动时，MySQL 会自动执行 `db/schema.sql` 和 `db/data.sql` 以创建全部表并插入丰富的测试数据！

如果您选择使用本地已有的 MySQL 和 Redis 实例，请先执行 `db/schema.sql` 和 `db/data.sql` 脚本，并修改 `src/main/resources/application.yml` 中的数据库及 Redis 连接参数。

### 3. 第二步：编译与运行 Spring Boot
在项目根目录运行 Maven 编译打包命令：
```powershell
mvn clean compile
```
启动 Spring Boot 服务：
```powershell
mvn spring-boot:run
```
服务成功启动后，后端将运行在 `http://localhost:8080` 上。

---

## 💡 API 可视化交互式测试 (Swagger UI)

为了让接口测试更加直观和愉悦，本项目深度集成了 Swagger UI 交互界面。
* **访问地址**：[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

### 🔑 默认初始测试账号 (密码均为 `123456`)

| 账号用户名 (username) | 真实姓名 (realName) | 对应角色 (role) | 测试侧重点 |
| :--- | :--- | :--- | :--- |
| **`admin`** | 系统管理员 | `admin` | 发布赛事、成果审核、设置优秀作品展示 |
| **`20230101`** | 张三 | `student` | 报名赛事、创建团队、上传证明材料、查看雷达能力画像与通知 |
| **`20230102`** | 李四 | `student` | 申请加入张三的队伍、接收通知、上传成果 |
| **`teacher1`** | 王辅导员 | `teacher` | 辅导员仪表盘概览、监控学生参赛动态、**一键导出综测 Excel 报表** |

---

## 🛠️ 核心业务场景交互测试流程

### 流程一：学生组队与报名参赛（学生端）
1. 打开 Swagger UI，调用 `/api/auth/login` 接口：
   * 输入账号 `20230101`，密码 `123456`。
   * **复制**返回的 `token` 字符串。
2. 在 Swagger UI 页面右上角点击 **Authorize** 按钮，在输入框中填入 `Bearer [您的token]` (注意空格)，点击 **Authorize** 完成鉴权。
3. 调用 `/api/team/create` 创建新队伍：
   * 关联赛事 `eventId` = `1` (第十届“互联网+”大学生创新创业大赛)。
   * 指定招募角色列表：`["后端开发", "UI设计"]`。
4. 切换登录账号为 `20230102`（李四，并获取其 Token 进行 Swagger 鉴权认证）：
   * 调用 `/api/team/recruiting` 查看招募墙上的队伍列表。
   * 调用 `/api/team/apply` 申请加入张三的队伍，角色填入 `后端开发`。
5. 切换回张三（`20230101`）账号：
   * 调用 `/api/team/captain/applications` 查看申请列表。
   * 调用 `/api/team/captain/applications/handle` 传入申请 ID 批准同意（`status = approved`）。此时队伍人数加 1。
6. 张三/李四调用 `/api/registration/submit` 提交比赛报名表和材料。

### 流程二：成果提交、双盲审核与成长画像生成（管理员/学生端）
1. **学生提交成果**：张三登录后，调用 `/api/achievement/submit`，关联赛事 ID = 1，上传获奖证明证书文件（可先调用 `/api/file/upload` 接口上传本地证书得到物理地址 URL `/files/xxx` 作为 attachments 输入值）。
2. **管理员审核**：切换登录为 `admin`，调用 `/api/achievement/admin/pending` 查看到张三待审核的成果。
3. 调用 `/api/achievement/admin/review` 进行成果审核，传入成果 ID，设置审核结果为 `approved`。
4. **成长记录与通知自动生成**：系统在审核通过瞬间，会自动：
   * 为张三生成一封成果审核通过的站内信通知。
   * 在 `growth_record` 表中自动插入一条成长记录。
5. **能力画像雷达图生成**：切换登录回张三（`20230101`），调用 `/api/growth/radar` 和 `/api/growth/timeline`，能力积分会根据获奖级别自动换算为科学的能力积分（雷达图），生成精彩的时间轴档案！

### 流程三：教师数据监控与综测表一键导出（教师端）
1. 使用辅导员账号 `teacher1` 登录，获取其 Token 完成 Swagger 鉴权。
2. 调用 `/api/teacher/dashboard` 即可获取班级概况看板：
   * 学生活跃度指数（参赛比率）
   * 活跃名单动态 feed 流
3. 在浏览器中直接请求或使用 Swagger 调试：
   * **URL 路径**：`http://localhost:8080/api/teacher/export/comprehensive?academicYear=2025-2026-2`
   * 系统将自动读取数据，通过 `ExcelUtil` 使用 Apache POI 动态绘制出精美样式、字体规范、包含自动列宽和表头色彩的高清 Excel 文件流，浏览器会直接触发文件下载（`xlsx` 格式）！
