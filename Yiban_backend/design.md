# “易赛通”高校赛事服务平台 完整设计方案与后端实现指南

## 📌 目录
- [一、系统概述](#一系统概述)
- [二、用户角色与权限矩阵](#二用户角色与权限矩阵)
- [三、功能模块详细设计](#三功能模块详细设计含前端页面映射)
- [四、数据库设计（核心表结构）](#四数据库设计核心表结构)
- [五、技术架构选型](#五技术架构选型)
- [六、后端实现步骤（从零搭建）](#六后端实现步骤从零搭建)
- [七、核心代码示例](#七核心代码示例)
- [八、部署与运维建议](#八部署与运维建议)
- [附录：接口文档示例（部分）](#附录接口文档示例部分)

---

## 一、系统概述

“易赛通”是一套面向高校的赛事全生命周期管理平台，服务**管理员**（统筹监管）、**学生**（参赛与成长）和**教师/辅导员**（指导与分析）三类用户。系统实现赛事发布、在线报名、成果审核、组队协作、成长档案、综测导出的数字化闭环。

---

## 二、用户角色与权限矩阵

| 角色 | 核心权限 | 对应页面（截图参考） |
| :--- | :--- | :--- |
| **管理员** | 系统配置、赛事发布/审核、优秀作品管理、附件管理、综测规则设定 | 后台首页、优秀作品管理、成果审核、赛事发布与编辑 |
| **学生** | 浏览/报名赛事、组队招募、提交成果、查看成长档案 | 赛事中心、报名工作台、组队招募中心、我的成长、成果上传 |
| **教师/辅导员** | 学生赛事监控、综测导出、消息提醒 | 教师端首页、学生赛事动态、综测导出 |

---

## 三、功能模块详细设计（含前端页面映射）

### 3.1 管理员端

| 模块 | 功能点 | 前端页面 | 后端接口要点 |
| :--- | :--- | :--- | :--- |
| **仪表盘** | 展示总览数据（赛事数、报名人数、待审核数等）及趋势图表（近6个月报名人数、赛事级别分布） | `admin/dashboard` | 聚合查询：`Event`、`Registration`、`Achievement` 表统计 |
| **赛事管理** | 发布/编辑赛事：基本信息、富文本内容、封面/附件上传、组队设置 | `admin/event/edit` | `Event` 表 CRUD；文件上传接口；富文本内容存储为 HTML |
| **优秀作品管理** | 筛选作品、预览附件、修改展示状态 | `admin/works/list` | `Achievement` 表审核通过 + `event` 关联；更新 `is_displayed` 字段 |
| **成果审核** | 查看学生提交材料、填写审核意见、通过/驳回 | `admin/review/detail` | `Achievement` 表状态流转；`Message` 表生成站内信 |

### 3.2 学生端

| 模块 | 功能点 | 前端页面 | 后端接口要点 |
| :--- | :--- | :--- | :--- |
| **赛事中心** | 赛事日历、赛事列表（含筛选、搜索）、热门推荐 | `student/events` | 分页查询 + 多条件筛选；按报名截止时间排序；优秀作品推荐子查询 |
| **报名工作台** | 进度可视化、材料清单上传、AI 解析助手 | `student/registration/workspace` | `Registration` 表材料字段（JSON）；调用 NLP 解析赛事通知（预留） |
| **组队招募** | 招募墙、申请加入、创建队伍、管理申请 | `student/team` | `Team` 表 + `TeamApplication` 表；查询空缺角色；校验人数上限 |
| **我的成长** | 能力画像、成长时间轴、证书列表 | `student/growth` | 聚合 `Registration`、`Achievement`、`GrowthRecord` 表；综测分计算规则 |
| **成果上传** | 提交获奖成果（必传证书/截图、选传附件） | `student/achievement/upload` | `Achievement` 表插入，状态为 `pending`；文件存储 |

### 3.3 教师端

| 模块 | 功能点 | 前端页面 | 后端接口要点 |
| :--- | :--- | :--- | :--- |
| **辅导员仪表盘** | 查看指标（活跃系数、报名人数等）、学生参赛动态表 | `teacher/dashboard` | 按专业/班级聚合学生数据；最近赛事日程查询 |
| **学生赛事监控** | 按状态筛选学生报名记录，待办事项提醒 | `teacher/student-events` | 联查 `User`、`Registration`、`Event`；支持批量消息推送 |
| **综测导出** | 按学年/专业/班级筛选学生，导出 Excel | `teacher/comprehensive-export` | 动态计算综测分；POI 生成 Excel 文件流 |

---

## 四、数据库设计（核心表结构）

### 4.1 用户表 `user`
```sql
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '学号/工号',
  `password` varchar(255) NOT NULL,
  `real_name` varchar(50) DEFAULT NULL,
  `role` varchar(20) DEFAULT 'student' COMMENT 'admin/student/teacher',
  `college` varchar(100) DEFAULT NULL,
  `major` varchar(100) DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
);
```

### 4.2 赛事表 `event`
```sql
CREATE TABLE `event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `level` varchar(20) DEFAULT NULL COMMENT '国家级/省级/校级/院级',
  `category` varchar(50) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL COMMENT '报名开始',
  `end_time` datetime DEFAULT NULL COMMENT '报名截止',
  `competition_start` datetime DEFAULT NULL,
  `competition_end` datetime DEFAULT NULL,
  `max_team_size` int DEFAULT '1',
  `cover_url` varchar(500) DEFAULT NULL,
  `content` text COMMENT '富文本赛事简介/要求',
  `status` varchar(20) DEFAULT 'draft' COMMENT 'draft/published/closed',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
```

### 4.3 报名表 `registration`
```sql
CREATE TABLE `registration` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `event_id` bigint NOT NULL,
  `team_id` bigint DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending' COMMENT 'pending/submitted/reviewing/approved/rejected',
  `submit_time` datetime DEFAULT NULL,
  `materials` json DEFAULT NULL COMMENT '存储附件路径列表',
  PRIMARY KEY (`id`)
);
```

### 4.4 组队表 `team`
```sql
CREATE TABLE `team` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `event_id` bigint NOT NULL,
  `captain_id` bigint NOT NULL,
  `current_members` int DEFAULT '1',
  `required_roles` varchar(255) DEFAULT NULL COMMENT 'JSON数组',
  `status` varchar(20) DEFAULT 'recruiting' COMMENT 'recruiting/full/disbanded',
  PRIMARY KEY (`id`)
);
```

### 4.5 成果表 `achievement`
```sql
CREATE TABLE `achievement` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `event_id` bigint NOT NULL,
  `award_level` varchar(50) DEFAULT NULL,
  `semester` varchar(20) DEFAULT NULL,
  `instructor` varchar(100) DEFAULT NULL,
  `attachments` json DEFAULT NULL COMMENT '{certificate, proof, work_file}',
  `audit_status` varchar(20) DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  `audit_comment` varchar(500) DEFAULT NULL,
  `is_displayed` tinyint DEFAULT '0' COMMENT '是否展示为优秀作品',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
```

### 4.6 成长记录表 `growth_record`
```sql
CREATE TABLE `growth_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `event_id` bigint NOT NULL,
  `record_type` varchar(20) COMMENT 'competition/award/certificate',
  `title` varchar(200) DEFAULT NULL,
  `happen_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
);
```

### 4.7 消息表 `message`
```sql
CREATE TABLE `message` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `from_user` bigint DEFAULT '0' COMMENT '0表示系统',
  `to_user` bigint NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text,
  `is_read` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
```

---

## 五、技术架构选型

| 层次 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 后端框架 | Spring Boot | 2.7.x | 主框架 |
| ORM | MyBatis-Plus | 3.5.5 | 简化数据库操作 |
| 数据库 | MySQL | 8.0+ | 关系型数据存储 |
| 缓存/会话 | Redis | 7.0+ | 登录 token、热点数据 |
| 文件存储 | MinIO / 阿里云 OSS | - | 生产环境推荐 |
| 权限认证 | JWT + 拦截器 | - | 无状态认证 |
| Excel 导出 | Apache POI | 5.2.5 | 综测导出 |
| 工具库 | Hutool | 5.8.25 | 常用工具类 |
| 构建工具 | Maven | 3.8+ | 依赖管理 |

---

## 六、后端实现步骤（从零搭建）

### 6.1 环境准备
- 安装 JDK 17、Maven、MySQL 8.0、Redis
- IDE：IntelliJ IDEA

### 6.2 创建 Spring Boot 项目
访问 [Spring Initializr](https://start.spring.io/) 生成项目，或手动创建 Maven 项目，添加 `pom.xml` 依赖（参考五、技术架构选型）。

### 6.3 配置文件 `application.yml`
```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/etsaion?useSSL=false&serverTimezone=Asia/Shanghai
    username: root
    password: 123456
    driver-class-name: com.mysql.cj.jdbc.Driver
  redis:
    host: localhost
    port: 6379
  servlet:
    multipart:
      max-file-size: 20MB
      max-request-size: 50MB

mybatis-plus:
  mapper-locations: classpath*:mapper/**/*.xml
  global-config:
    db-config:
      id-type: auto
      logic-delete-field: deleted
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl

jwt:
  secret: yourSecretKey
  expire: 86400000

file:
  upload-path: /data/upload   # 本地存储路径
```

### 6.4 项目包结构
```
com.etsaion
├── EtsaionApplication
├── config
│   ├── MybatisPlusConfig
│   ├── RedisConfig
│   ├── WebMvcConfig
│   └── MinioConfig (可选)
├── controller
│   ├── AuthController
│   ├── EventController
│   ├── RegistrationController
│   ├── TeamController
│   ├── AchievementController
│   ├── GrowthController
│   └── TeacherController
├── service
│   ├── impl
│   └── ...
├── mapper
├── entity
├── dto
├── vo
├── utils
│   ├── JwtUtil
│   ├── ExcelUtil
│   └── FileUtil
├── interceptor
│   └── AuthInterceptor
└── exception
    ├── GlobalExceptionHandler
    └── BusinessException
```

### 6.5 数据库初始化
执行第四章的 SQL 建表语句，插入测试数据。

### 6.6 实现核心代码（见下一章）

### 6.7 启动测试
运行 `EtsaionApplication`，使用 Postman 测试接口。

---

## 七、核心代码示例

### 7.1 实体类（MyBatis-Plus 风格）
```java
@Data
@TableName("event")
public class Event {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String level;
    private String category;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime competitionStart;
    private LocalDateTime competitionEnd;
    private Integer maxTeamSize;
    private String coverUrl;
    private String content;
    private String status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
```

### 7.2 登录与 JWT 生成
```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public Result login(@RequestBody LoginDTO dto) {
        User user = userService.login(dto.getUsername(), dto.getPassword());
        if (user == null) {
            return Result.error("账号或密码错误");
        }
        String token = JwtUtil.generateToken(user.getId(), user.getRole());
        return Result.success(token);
    }
}

// JwtUtil
public class JwtUtil {
    private static final String SECRET = "yourSecretKey";
    private static final long EXPIRE = 86400000L;

    public static String generateToken(Long userId, String role) {
        return Jwts.builder()
                .setSubject(userId.toString())
                .claim("role", role)
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRE))
                .signWith(SignatureAlgorithm.HS256, SECRET)
                .compact();
    }
}
```

### 7.3 赛事发布（管理员）
```java
@RestController
@RequestMapping("/api/admin/event")
@PreAuthorize("hasRole('ADMIN')")
public class EventManageController {
    @Autowired
    private EventService eventService;

    @PostMapping("/publish")
    public Result publish(@RequestBody EventPublishDTO dto) {
        Event event = new Event();
        BeanUtils.copyProperties(dto, event);
        event.setStatus("published");
        eventService.save(event);
        return Result.success();
    }
}
```

### 7.4 文件上传（本地存储 + MinIO 兼容）
```java
@PostMapping("/upload")
public Result upload(@RequestParam("file") MultipartFile file) {
    String url = fileService.upload(file);
    return Result.success(url);
}

@Service
public class FileServiceImpl implements FileService {
    @Value("${file.upload-path}")
    private String uploadPath;

    public String upload(MultipartFile file) {
        String original = file.getOriginalFilename();
        String ext = original.substring(original.lastIndexOf("."));
        String newName = UUID.randomUUID() + ext;
        Path target = Paths.get(uploadPath, newName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return "/files/" + newName;
    }
}
```

### 7.5 综测数据导出（Excel）
```java
@GetMapping("/export/comprehensive")
public void exportComprehensive(@RequestParam String academicYear,
                                 @RequestParam(required=false) String major,
                                 HttpServletResponse response) throws IOException {
    List<StudentComprehensiveVO> list = teacherService.getComprehensiveData(academicYear, major);
    Workbook workbook = ExcelUtil.export(list, "综测数据",
            new String[]{"姓名", "学号", "专业", "参赛次数", "综测分"});
    response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", "attachment;filename=comprehensive.xlsx");
    workbook.write(response.getOutputStream());
}
```

### 7.6 成果审核（管理员）
```java
@PostMapping("/review")
public Result reviewAchievement(@RequestBody ReviewDTO dto) {
    Achievement achievement = achievementService.getById(dto.getAchievementId());
    achievement.setAuditStatus(dto.getStatus()); // "approved" or "rejected"
    achievement.setAuditComment(dto.getComment());
    achievementService.updateById(achievement);
    // 发送站内信
    Message message = new Message();
    message.setFromUser(0L);
    message.setToUser(achievement.getStudentId());
    message.setTitle("成果审核结果通知");
    message.setContent(dto.getStatus().equals("approved") ? "您的成果已通过审核" : "您的成果未通过审核：" + dto.getComment());
    messageService.save(message);
    return Result.success();
}
```

---

## 八、部署与运维建议

### 8.1 打包
```bash
mvn clean package
```

### 8.2 运行（生产环境）
```bash
nohup java -jar target/etsaion-0.0.1.jar --spring.profiles.active=prod > app.log 2>&1 &
```

### 8.3 Nginx 反向代理配置片段
```nginx
server {
    listen 80;
    server_name api.etsaion.com;

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
    }

    location /files/ {
        alias /data/upload/;
    }
}
```

### 8.4 文件存储建议
- 开发/测试：本地存储
- 生产：MinIO 或阿里云 OSS（需配置对应 SDK）

### 8.5 安全加固
- 使用 HTTPS
- JWT 有效期不宜过长，提供 refresh token
- 敏感操作（发布赛事、综测导出）记录操作日志
- 对上传文件进行类型和大小校验，防恶意文件

### 8.6 监控与备份
- 数据库每日自动备份
- 使用 Spring Boot Actuator + Prometheus 监控健康状态
- 文件存储定期清理临时/未关联文件

---

## 附录：接口文档示例（部分）

| 接口 | 方法 | 路径 | 权限 |
|------|------|------|------|
| 管理员发布赛事 | POST | `/api/admin/event/publish` | ADMIN |
| 学生报名 | POST | `/api/student/registration/add` | STUDENT |
| 学生上传成果 | POST | `/api/student/achievement/submit` | STUDENT |
| 辅导员综测导出 | GET | `/api/teacher/export/comprehensive` | TEACHER |
| 管理员审核成果 | POST | `/api/admin/achievement/review` | ADMIN |

---

**文档版本**：1.0  
**最后更新**：2025年  
**编写依据**：易赛通平台界面截图与需求分析