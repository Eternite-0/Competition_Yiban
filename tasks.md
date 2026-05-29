# 易赛通 注册系统开发任务

> 创建时间: 2026-05-29
> 状态说明: ☐ 待开发 | 🔧 进行中 | ✅ 已完成

---

## 现状分析

### 已有基础
- 后端 `POST /api/auth/register` 已存在，接受 username/password/realName/college/major/className
- 硬编码 role=student，前端无注册入口
- 密码已使用 BCrypt 加密
- User 实体已有 grade（入学年份）字段
- 专业(major)、班级(className) 目前是 seed 数据写死的，无管理入口

### 核心问题
1. 前端无注册页面
2. 专业/班级写死在 seed 数据里，无法灵活管理
3. 没有防乱注册机制——任何人都能用任意学号注册

---

## 设计方案

### 核心思路：花名册校验 + 专业班级管理

```
┌──────────────────────────────────────────────────────────────┐
│                      管理员预先导入花名册                       │
│         (学号 + 姓名 + 学院 + 专业 + 班级 + 年级)               │
│         上传 Excel 或 手动逐条添加                              │
└───────────────────────────────┬──────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                      学生注册流程                              │
│  1. 输入学号 → 系统查花名册                                    │
│  2. 匹配到 → 显示预填信息（姓名、学院、专业、班级、年级）         │
│  3. 学生输入真实姓名 → 与花名册比对                              │
│  4. 姓名一致 → 允许设置密码 → 注册完成，自动登录                 │
│  5. 姓名不一致 → 拒绝："信息与学籍不符，请联系辅导员"            │
│  6. 学号不在花名册 → 拒绝："学号未录入系统，请联系管理员"         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    专业/班级管理                               │
│  管理员可 增/删/改 专业和班级                                   │
│  花名册中引用这些专业/班级，保证一致性                           │
│  学生注册时从下拉框选择（已由花名册预填，不可自由输入）            │
└──────────────────────────────────────────────────────────────┘
```

### 教师注册
- 教师走独立注册入口（工号 + 姓名 + 学院）
- 注册后 status=pending_approval，等待管理员审核
- 管理员审核通过后方可登录

### 花名册数据来源
- 方式一：管理员上传 Excel（学号、姓名、学院、专业、班级、年级）
- 方式二：管理员在后台手动添加
- 花名册独立表 `student_roster`，与 `user` 表分离（花名册是"预期名单"，user 是"实际注册用户"）

---

## 任务清单

### Phase 1: 数据库 — 新增表与字段

#### Task 1 — 新增专业表、班级表
- **新建表**: `major`（专业表）
  - id, name(专业名), college(所属学院), status(启用/停用), created_at
- **新建表**: `class_info`（班级表，避免与 SQL 关键字冲突）
  - id, name(班级名), college, major_id(关联专业), grade(年级/入学年份), status, created_at
- **迁移脚本**: `Yiban_backend/db/migrate-010-registration.sql`
- **种子数据**: 从现有 user 表中提取已有的专业和班级数据，插入 major/class_info 表
- **验证**: 表创建成功，种子数据正确

#### Task 2 — 新增花名册表
- **新建表**: `student_roster`（学生花名册，预导入的学生名单）
  - id, student_no(学号), real_name(姓名), college, major_id(关联专业), class_id(关联班级), grade(年级), status(未注册/已注册), created_at
  - UNIQUE(student_no) — 学号唯一
  - status: `pending`(未注册) → `registered`(已注册，注册时自动更新)
- **迁移脚本**: 合并到 `migrate-010-registration.sql`
- **种子数据**: 将现有 user 表中的学生数据回填到花名册（标记为已注册）
- **验证**: 现有学生在花名册中 status=registered

#### Task 3 — User 表新增 status 字段
- **改动**: `ALTER TABLE user ADD COLUMN status VARCHAR(20) DEFAULT 'active'`
- **回填**: `UPDATE user SET status = 'active' WHERE status IS NULL`
- **实体类**: `User.java` 新增 status 字段
- **验证**: 现有用户不受影响

---

### Phase 2: 后端 — 专业/班级管理 API

#### Task 4 — Major 实体与 Mapper
- **新建**: `entity/Major.java`, `mapper/MajorMapper.java`, `service/MajorService.java`, `service/impl/MajorServiceImpl.java`
- **验证**: 基础 CRUD 可用

#### Task 5 — ClassInfo 实体与 Mapper
- **新建**: `entity/ClassInfo.java`, `mapper/ClassInfoMapper.java`, `service/ClassInfoService.java`, `service/impl/ClassInfoServiceImpl.java`
- **验证**: 基础 CRUD 可用

#### Task 6 — 专业/班级管理 Controller
- **新建**: `controller/AdminController.java`（如已有则扩展）
- **端点**:
  - `GET /api/admin/majors` — 专业列表（支持 college 筛选）
  - `POST /api/admin/majors` — 新增专业
  - `PUT /api/admin/majors/{id}` — 编辑专业
  - `DELETE /api/admin/majors/{id}` — 删除/停用专业
  - `GET /api/admin/classes` — 班级列表（支持 college/major/grade 筛选）
  - `POST /api/admin/classes` — 新增班级
  - `PUT /api/admin/classes/{id}` — 编辑班级
  - `DELETE /api/admin/classes/{id}` — 删除/停用班级
- **权限**: `@RequireRole("admin")`
- **验证**: 增删改查正常

---

### Phase 3: 后端 — 花名册管理 API

#### Task 7 — StudentRoster 实体与 Mapper
- **新建**: `entity/StudentRoster.java`, `mapper/StudentRosterMapper.java`, `service/StudentRosterService.java`, `service/impl/StudentRosterServiceImpl.java`
- **验证**: 基础 CRUD 可用

#### Task 8 — 花名册管理 Controller
- **端点**:
  - `GET /api/admin/roster` — 花名册列表（分页，支持 keyword/college/major/grade/status 筛选）
  - `POST /api/admin/roster` — 手动添加单条记录
  - `PUT /api/admin/roster/{id}` — 编辑记录
  - `DELETE /api/admin/roster/{id}` — 删除记录
  - `POST /api/admin/roster/import` — 批量导入（接收 JSON 数组，一次性插入多条）
  - `GET /api/admin/roster/export` — 导出花名册为 Excel
- **校验**: 添加时学号不能重复，major_id/class_id 必须存在于对应表
- **权限**: `@RequireRole("admin")`
- **验证**: 增删改查 + 批量导入正常

#### Task 9 — Excel 导入花名册
- **端点**: `POST /api/admin/roster/upload-excel`
- **逻辑**: 使用 Apache POI 解析 Excel（列: 学号、姓名、学院、专业、班级、年级）
  - 解析时校验专业/班级是否已存在于 major/class_info 表
  - 不存在则自动创建（或返回错误提示管理员先建专业/班级，两种方案二选一）
  - 重复学号跳过或覆盖（建议跳过并返回提示）
- **返回**: 导入成功数、跳过数、失败明细
- **验证**: 上传 Excel 后花名册数据正确

---

### Phase 4: 后端 — 注册流程重构

#### Task 10 — 扩展 RegisterDTO
- **文件**: `dto/RegisterDTO.java`
- **改动**:
  - 新增字段: `role` (student/teacher), `grade`, `phone`(选填), `email`(选填)
  - 新增字段: `agreement` (boolean，前端必传 true)
  - 学生注册: student_no(学号) + realName(姓名)，系统自动匹配花名册
  - 教师注册: username(工号) + realName + college
- **验证**: 字段校验正确

#### Task 11 — 重构 UserService.register() — 学生注册
- **逻辑**:
  1. 根据 student_no 查 student_roster
  2. 未找到 → 抛异常 "学号未录入系统，请联系辅导员"
  3. 找到但 status=registered → 抛异常 "该学号已注册"
  4. 找到且 status=pending → 比对 realName 与花名册姓名
  5. 姓名不一致 → 抛异常 "姓名与学籍信息不符，请核对后重试"
  6. 姓名一致 → 创建 User（role=student, status=active），从花名册填充 college/major/className/grade
  7. 更新花名册 status=registered
  8. 自动登录返回 token
- **验证**: 学号+姓名正确才能注册，信息自动从花名册填充

#### Task 12 — 重构 UserService.register() — 教师注册
- **逻辑**:
  1. 校验工号不与已有用户重复
  2. 创建 User（role=teacher, status=pending_approval）
  3. 不返回 token，返回 "注册成功，请等待管理员审核"
- **验证**: 教师注册后不能登录，需管理员审核

#### Task 13 — 登录接口增加 status 校验
- **文件**: `service/impl/UserServiceImpl.java` login()
- **改动**:
  - password 通过后检查 status
  - pending_approval → "账号正在审核中，请等待管理员审核"
  - rejected → "账号审核未通过，请联系管理员"
  - active → 正常登录
- **验证**: pending 状态无法登录

#### Task 14 — 注册审核接口（教师）
- **端点**:
  - `GET /api/admin/registrations/pending` — 待审核教师列表
  - `POST /api/admin/registrations/approve` — 通过（body: { userId }），激活用户 + 发站内消息
  - `POST /api/admin/registrations/reject` — 驳回（body: { userId, reason }），设 status=rejected + 发站内消息
- **权限**: `@RequireRole("admin")`
- **验证**: 审核通过后教师可登录，驳回后收到消息

---

### Phase 5: 前端 — 注册页面

#### Task 15 — 登录页增加注册入口
- **文件**: `pages/LoginPage.tsx`
- **改动**: 表单底部增加 "注册账号" 链接 → 跳转 `/register`
- **验证**: 点击跳转正常

#### Task 16 — 学生注册页面
- **文件**: 新建 `pages/RegisterPage.tsx`
- **流程**:
  1. 角色切换 Tab: 学生 / 教师
  2. 学生注册表单:
     - 学号输入框 + "查询" 按钮（或输入完自动查询）
     - 调用 `POST /api/auth/lookup-student` 传入 student_no
     - 查询成功 → 显示预填信息（姓名、学院、专业、班级、年级），姓名变为可编辑输入框（用于校验）
     - 查询失败 → 红字提示
     - 姓名输入框 + 密码 + 确认密码
     - 同意协议 checkbox + 注册按钮
  3. 注册成功 → 自动登录 → 跳转学生首页
- **样式**: 复用 LoginPage 的 glass 样式和动画
- **验证**: 学号查询、姓名校验、注册全流程正常

#### Task 17 — 教师注册表单
- **位置**: 同一页面 RegisterPage.tsx，切换到"教师" Tab
- **表单**: 工号、真实姓名、密码、确认密码、学院（下拉框）
- **注册成功**: toast "注册成功，请等待管理员审核" → 跳转登录页
- **验证**: 教师注册流程正常

#### Task 18 — 新增查询学生信息接口
- **端点**: `POST /api/auth/lookup-student`
- **入参**: `{ studentNo: "20230101" }`
- **出参**: `{ found: true, data: { realName: "张三", college: "计算机学院", major: "软件工程", className: "软工2301", grade: "2023" } }`
- **逻辑**: 查 student_roster 表，找到且 status=pending 返回信息，已注册则提示
- **权限**: 公开（注册前查询）
- **验证**: 输入正确学号返回预填信息

#### Task 19 — 路由配置
- **文件**: `router/index.tsx`
- **改动**: 新增 `/register` 路由，无需登录即可访问
- **验证**: 路由正常

---

### Phase 6: 前端 — 管理员后台

#### Task 20 — 专业管理页面
- **文件**: 新建 `pages/admin/MajorManagement.tsx`
- **布局**: 表格（专业名、学院、状态、操作）+ 新增/编辑弹窗 + 停用/启用
- **API**: GET/POST/PUT/DELETE `/api/admin/majors`
- **验证**: 增删改查正常

#### Task 21 — 班级管理页面
- **文件**: 新建 `pages/admin/ClassManagement.tsx`
- **布局**: 表格（班级名、所属专业、学院、年级、状态、操作）+ 新增/编辑弹窗
  - 新增时: 学院下拉 → 专业下拉（联动）→ 年级 → 班级名
- **API**: GET/POST/PUT/DELETE `/api/admin/classes`
- **验证**: 增删改查正常

#### Task 22 — 花名册管理页面
- **文件**: 新建 `pages/admin/StudentRosterManagement.tsx`
- **布局**:
  - 顶部: 统计卡片（总数、已注册、未注册）+ "导入 Excel" 按钮 + "添加学生" 按钮
  - 筛选条: 学院、专业、年级、注册状态、关键词搜索
  - 表格: 学号、姓名、学院、专业、班级、年级、注册状态、操作（编辑/删除）
  - 导入弹窗: 文件上传 + 格式说明 + 导入结果展示
  - 添加弹窗: 学号、姓名、学院下拉→专业下拉→班级下拉（级联）、年级
  - 分页
- **API**: GET/POST/PUT/DELETE `/api/admin/roster`，POST `/api/admin/roster/upload-excel`
- **验证**: 增删改查 + Excel 导入正常

#### Task 23 — 注册审核页面
- **文件**: 新建 `pages/admin/RegistrationAudit.tsx`
- **布局**:
  - 统计: 待审核数量
  - 表格: 工号、姓名、学院、注册时间、操作（通过/驳回）
  - 驳回弹窗: 输入原因
- **API**: GET/POST `/api/admin/registrations/pending`、approve、reject
- **验证**: 审核流程完整

#### Task 24 — 侧边栏与路由
- **文件**: `components/Sidebar.tsx`, `router/index.tsx`
- **改动**: 管理员菜单新增分组:
  - "系统管理": 专业管理、班级管理
  - "学生管理": 花名册管理、注册审核
  - 路由: /admin/majors, /admin/classes, /admin/roster, /admin/registration-audit
- **验证**: 导航正常

#### Task 25 — 管理员首页增加待审核提醒
- **文件**: `pages/admin/AdminHome.tsx`
- **改动**: 仪表盘增加 "待审核注册" 卡片，点击跳转审核页
- **验证**: 有新注册时数字显示正确

---

### Phase 7: 注册协议与联调

#### Task 26 — 注册协议页面
- **文件**: 新建 `pages/TermsPage.tsx`
- **路由**: `/terms`
- **内容**: 静态注册协议/服务条款
- **验证**: 链接可跳转

#### Task 27 — 全流程联调测试

| 场景 | 步骤 | 预期 |
|------|------|------|
| 学生正常注册 | 输入花名册中的学号 → 查询 → 输入正确姓名 → 设置密码 | 注册成功，自动登录 |
| 学号不存在 | 输入未录入的学号 | 提示"学号未录入系统" |
| 姓名不匹配 | 输入正确学号 → 输入错误姓名 | 提示"姓名与学籍信息不符" |
| 重复注册 | 已注册学号再次注册 | 提示"该学号已注册" |
| 教师注册 | 输入工号+姓名+学院 | 注册成功，等待审核 |
| 教师审核通过 | 管理员通过 | 教师收到消息，可登录 |
| 教师审核驳回 | 管理员驳回并填原因 | 教师收到消息，登录提示未通过 |
| 专业班级管理 | 管理员新增/编辑/停用专业和班级 | 数据正确，花名册可引用 |
| 花名册导入 | 管理员上传 Excel | 导入成功，统计数据正确 |
| 边界测试 | 空表单、密码不一致、重复学号、admin 角色自注册 | 各项校验正确拦截 |

---

## 新增/修改文件清单

### 数据库
| 文件 | 说明 |
|------|------|
| `db/migrate-010-registration.sql` | 新增 major、class_info、student_roster 表 + user 表 status 字段 |

### 后端新增
| 文件 | 说明 |
|------|------|
| `entity/Major.java` | 专业实体 |
| `entity/ClassInfo.java` | 班级实体 |
| `entity/StudentRoster.java` | 花名册实体 |
| `mapper/MajorMapper.java` | 专业 Mapper |
| `mapper/ClassInfoMapper.java` | 班级 Mapper |
| `mapper/StudentRosterMapper.java` | 花名册 Mapper |
| `service/MajorService.java` + impl | 专业服务 |
| `service/ClassInfoService.java` + impl | 班级服务 |
| `service/StudentRosterService.java` + impl | 花名册服务 |

### 后端修改
| 文件 | 说明 |
|------|------|
| `entity/User.java` | 新增 status 字段 |
| `dto/RegisterDTO.java` | 新增 role/grade 等字段 |
| `service/impl/UserServiceImpl.java` | register() 重构，login() 增加 status 校验 |
| `controller/AuthController.java` | register 适配 + 新增 lookup-student |
| `controller/AdminController.java` | 专业/班级/花名册/注册审核端点 |

### 前端新增
| 文件 | 说明 |
|------|------|
| `pages/RegisterPage.tsx` | 注册页面（学生+教师） |
| `pages/TermsPage.tsx` | 注册协议 |
| `pages/admin/MajorManagement.tsx` | 专业管理 |
| `pages/admin/ClassManagement.tsx` | 班级管理 |
| `pages/admin/StudentRosterManagement.tsx` | 花名册管理 |
| `pages/admin/RegistrationAudit.tsx` | 注册审核 |

### 前端修改
| 文件 | 说明 |
|------|------|
| `pages/LoginPage.tsx` | 增加"注册账号"链接 |
| `pages/admin/AdminHome.tsx` | 待审核提醒卡片 |
| `components/Sidebar.tsx` | 管理员菜单新增 4 项 |
| `router/index.tsx` | 新增 5 条路由 |
| `types/index.ts` | 新增类型定义 |

---

## API 端点汇总

### 公开接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册（重构） |
| POST | `/api/auth/lookup-student` | 查询学号对应信息（注册前校验） |

### 管理员接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/majors` | 专业列表 |
| POST | `/api/admin/majors` | 新增专业 |
| PUT | `/api/admin/majors/{id}` | 编辑专业 |
| DELETE | `/api/admin/majors/{id}` | 删除/停用专业 |
| GET | `/api/admin/classes` | 班级列表 |
| POST | `/api/admin/classes` | 新增班级 |
| PUT | `/api/admin/classes/{id}` | 编辑班级 |
| DELETE | `/api/admin/classes/{id}` | 删除/停用班级 |
| GET | `/api/admin/roster` | 花名册列表 |
| POST | `/api/admin/roster` | 手动添加花名册记录 |
| PUT | `/api/admin/roster/{id}` | 编辑花名册记录 |
| DELETE | `/api/admin/roster/{id}` | 删除花名册记录 |
| POST | `/api/admin/roster/import` | 批量导入花名册 (JSON) |
| POST | `/api/admin/roster/upload-excel` | Excel 导入花名册 |
| GET | `/api/admin/roster/export` | 导出花名册 Excel |
| GET | `/api/admin/registrations/pending` | 待审核教师列表 |
| POST | `/api/admin/registrations/approve` | 审核通过 |
| POST | `/api/admin/registrations/reject` | 审核驳回 |

---

## 注意事项

1. **花名册是注册的前置条件**: 学生必须在花名册中才能注册，这是防乱注册的核心
2. **姓名二次校验**: 即使学号在花名册中，姓名也必须匹配，防学号泄露后被冒用
3. **专业/班级由管理员维护**: 不再写死，通过 major/class_info 表管理，花名册引用这些表
4. **教师注册需审核**: 教师有审核权限，不能随意开放
5. **Excel 导入用 Apache POI**: pom.xml 已有 poi-ooxml 依赖
6. **迁移脚本幂等**: migrate-010-registration.sql 必须可重复执行
7. **中文 UI**: 所有界面文案使用中文
8. **样式复用**: 注册页复用 LoginPage 的 glass 样式和动画
