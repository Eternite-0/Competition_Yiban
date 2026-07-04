# 高校赛事管理系统 JSP/MVC 课程作业版

本目录是为“系统综合应用开发”实验报告准备的传统 MVC Web 工程，和仓库中原有的前后端分离项目互不影响。

## 技术栈

- JDK 8+
- Servlet 4.0
- JSP + JSTL
- MySQL 8.0
- Maven WAR
- Tomcat 9

## 模块结构

```text
src/main/java/cn/edu/lingnan
├── dao       数据访问层，负责 JDBC 增删改查
├── pojo      实体类，对应数据库表
├── service   业务层，封装登录、赛事、报名、用户业务
├── servlet   控制层，接收请求并转发 JSP
├── tag       自定义标签，用于页面状态样式展示
└── util      工具类，提供数据库连接和字符串处理
```

## 快速运行

1. 执行数据库脚本：

```sql
source db/yiban_mvc.sql;
```

2. 修改 `src/main/resources/db.properties` 中的 MySQL 用户名和密码。
3. 在 IDEA 中以 Maven Web 项目导入，配置 Tomcat 9，部署 `yiban-mvc-coursework:war exploded`。
4. 访问：

```text
http://localhost:8080/yiban-mvc-coursework
```

## 测试账号

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | admin | 123456 |
| 教师 | teacher01 | 123456 |
| 学生 | 20240101 | 123456 |

## 实验报告可截图页面

- 登录页：`/login`
- 用户信息全表查询：`/users`
- 赛事信息全表查询：`/competitions`
- 报名信息全表查询：`/registrations`
