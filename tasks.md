# 易赛通 注册系统开发任务

> 创建时间: 2026-05-29
> 状态说明: ☐ 待开发 | 🔧 进行中 | ✅ 已完成

---

## 现状分析

### 已有基础
- 后端 `POST /api/auth/register` 已存在，但只接受 username/password/realName/college/major/className，硬编码 role=student
- 前端登录页 `LoginPage.tsx` **没有注册入口**，用户无法自行注册
- 密码已使用 BCrypt 加密
- User 实体已有 grade 字段（入学年份）

### 缺失能力
- 前端无注册页面
- 注册不支持选择角色（学生/教师）
- 教师注册需要管理员审核（涉及权限，不能随意开放）
- 无邮箱/手机验证
- 无注册协议确认
- 管理员无法管理待审核的注册申请

---

## 设计方案

### 注册流程设计

```
┌─────────────────────────────────────────────────────────┐
│                    登录页增加"注册账号"入口                  │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│               注册页（选择角色：学生 / 教师）                │
│  学生: 学号 + 姓名 + 密码 + 学院 + 专业 + 班级 + 年级       │
│  教师: 工号 + 姓名 + 密码 + 学院 + 职称                     │
└───────────────────────────┬─────────────────────────────┘
                            ▼
              ┌─────────────┴─────────────┐
              ▼                           ▼
     学生注册流程                    教师注册流程
  直接激活，自动登录            提交后进入"待审核"状态
       │                              │
       ▼                              ▼
   跳转学生首页              管理员在工作台审核
                                   │
                         ┌─────────┴─────────┐
                         ▼                   ▼
                      审核通过             审核驳回
                   账号激活+站内消息      驳回原因+站内消息
                         │
                         ▼
                    教师可登录
```

### 角色策略
- **学生**: 自注册即激活（学号是唯一标识，天然防滥用）
- **教师**: 自注册后需管理员审核（教师有审核权限，属于敏感角色）
- **管理员**: 不开放注册，由数据库 seed 或其他管理员手动创建

### 学号/工号规则
- 学生用户名 = 学号（纯数字，如 `20230101`）
- 教师用户名 = 工号（如 `T001`）
- 注册时根据用户名格式自动推断角色：纯数字 → 学生，T 开头 → 教师（或由用户手动选择）

---

## 任务清单

### Phase 1: 后端 — 注册接口重构

#### Task 1 — 扩展 RegisterDTO
- **文件**: `Yiban_backend/src/main/java/com/etsaion/dto/RegisterDTO.java`
- **改动**:
  - 新增字段: `role` (student/teacher), `grade` (入学年份，学生必填), `phone` (手机号，选填), `email` (邮箱，选填)
  - 新增字段: `agreement` (boolean，同意注册协议，前端必传 true)
  - 添加分组校验: 学生注册时 grade 必填，教师注册时 grade 非必填
- **验证**: 不同角色注册时字段校验正确

#### Task 2 — 重构 UserService.register()
- **文件**: `Yiban_backend/src/main/java/com/etsaion/service/impl/UserServiceImpl.java`
- **改动**:
  - 根据 dto.role 设置用户角色（不再硬编码 student）
  - 学生注册: 直接设置 status=active，自动登录返回 token
  - 教师注册: 设置 status=pending_approval，不返回 token，返回"等待管理员审核"提示
  - 校验学号/工号格式: 学生纯数字，教师可自定义规则
  - 校验 username 不能与已有用户重复（现有逻辑保留）
  - 校验 role 只能是 student 或 teacher（禁止自注册 admin）
- **验证**: 学生注册后可登录，教师注册后不能登录

#### Task 3 — User 实体新增 status 字段
- **文件**: `Yiban_backend/src/main/java/com/etsaion/entity/User.java`
- **改动**:
  - 新增 `status` 字段: `active` / `pending_approval` / `rejected`
  - 现有用户默认 status=active（迁移脚本回填）
- **数据库迁移**: `Yiban_backend/db/migrate-009-registration.sql`
  - ALTER TABLE user ADD COLUMN status VARCHAR(20) DEFAULT 'active'
  - UPDATE user SET status = 'active' WHERE status IS NULL（幂等）
- **验证**: 现有用户不受影响，新注册教师 status=pending_approval

#### Task 4 — 登录接口增加 status 校验
- **文件**: `Yiban_backend/src/main/java/com/etsaion/service/impl/UserServiceImpl.java`
- **改动**:
  - login() 方法在密码校验通过后，检查 user.status
  - status=pending_approval → 抛出 "账号正在审核中，请等待管理员审核"
  - status=rejected → 抛出 "账号审核未通过，请联系管理员"
  - status=active → 正常登录
- **验证**: pending_approval 状态的教师无法登录

#### Task 5 — 注册审核接口（管理员）
- **文件**: `Yiban_backend/src/main/java/com/etsaion/controller/AuthController.java`（或新建 AdminController）
- **新增端点**:
  - `GET /api/admin/registrations/pending` — 获取待审核注册列表（分页，含 keyword/role 筛选）
  - `POST /api/admin/registrations/approve` — 审核通过（body: { userId }），激活用户 + 发站内消息
  - `POST /api/admin/registrations/reject` — 审核驳回（body: { userId, reason }），设 status=rejected + 发站内消息
- **权限**: `@RequireRole("admin")`
- **验证**: 管理员可查看待审核列表、通过/驳回注册

#### Task 6 — 站内消息通知
- **文件**: `Yiban_backend/src/main/java/com/etsaion/service/impl/UserServiceImpl.java`（或专门的 MessageService）
- **改动**: 注册审核通过/驳回时，自动发送站内消息给申请人
  - 通过: "您的教师账号已审核通过，现在可以正常登录系统。"
  - 驳回: "您的教师账号审核未通过。原因：{reason}。如有疑问请联系管理员。"
- **验证**: user 收到消息，GET /api/message/list 可查到

---

### Phase 2: 前端 — 注册页面

#### Task 7 — 登录页增加注册入口
- **文件**: `Yiban/src/pages/LoginPage.tsx`
- **改动**:
  - 在表单底部（"忘记密码"旁边）增加 "注册账号" 链接
  - 点击跳转到 `/register` 路由
- **验证**: 点击后正确跳转

#### Task 8 — 注册页面开发
- **文件**: 新建 `Yiban/src/pages/RegisterPage.tsx`
- **布局**:
  - 左侧: 与登录页一致的品牌区域（复用 LoginPage 左侧样式）
  - 右侧: 注册表单
    - 角色切换: 学生 / 教师 Tab（与登录页风格一致）
    - 学生表单: 学号、真实姓名、密码、确认密码、学院、专业、班级、年级（入学年份下拉，2020-2026）
    - 教师表单: 工号、真实姓名、密码、确认密码、学院
    - 底部: 同意注册协议 checkbox + "注册" 按钮
    - 已有账号？去登录 链接
- **交互**:
  - 表单前端校验: 必填项、密码长度≥6、两次密码一致、学号纯数字 / 工号格式
  - 注册按钮 loading 状态
  - 学生注册成功 → toast 提示 + 自动登录 + 跳转首页
  - 教师注册成功 → toast "注册成功，请等待管理员审核" + 跳转登录页
- **API 调用**: `POST /api/auth/register`
- **验证**: 学生注册后直接进入系统，教师注册后回到登录页

#### Task 9 — 路由配置
- **文件**: `Yiban/src/router/index.tsx`
- **改动**: 新增 `/register` 路由，指向 `RegisterPage`，未登录可访问
- **验证**: 路由跳转正常

---

### Phase 3: 前端 — 管理员审核注册

#### Task 10 — 管理员工作台增加注册审核入口
- **文件**: `Yiban/src/components/Sidebar.tsx`
- **改动**: 管理员侧边栏新增 "注册审核" 菜单项（图标: person_add）
- **验证**: 菜单显示正确

#### Task 11 — 注册审核页面
- **文件**: 新建 `Yiban/src/pages/admin/RegistrationAudit.tsx`
- **布局**:
  - 顶部: 标题 + 统计数字（待审核数量）
  - 筛选条: 角色（全部/学生/教师）、关键词搜索
  - 列表: 表格展示待审核用户
    - 列: 用户名、姓名、角色、学院、专业、年级、注册时间、操作
    - 操作: "通过" 按钮 + "驳回" 按钮（驳回弹窗输入原因）
  - 分页
- **API 调用**:
  - `GET /api/admin/registrations/pending` — 加载列表
  - `POST /api/admin/registrations/approve` — 通过
  - `POST /api/admin/registrations/reject` — 驳回（弹窗输入 reason）
- **交互**:
  - 通过/驳回后刷新列表 + toast 提示
  - 驳回弹窗: textarea 输入原因，确认/取消
- **验证**: 审核流程完整，通过后用户可登录，驳回后用户收到消息

#### Task 12 — 路由配置
- **文件**: `Yiban/src/router/index.tsx`
- **改动**: 新增 `/admin/registration-audit` 路由，RequireRole("admin")
- **验证**: 路由跳转正常

---

### Phase 4: 联调与完善

#### Task 13 — 注册协议页面
- **文件**: 新建 `Yiban/src/pages/TermsPage.tsx`
- **改动**: 简单的注册协议/服务条款页面（静态 HTML 即可）
- **路由**: `/terms`
- **验证**: 从注册页"服务协议"链接可跳转

#### Task 14 — 全流程联调测试
- **学生注册**: 填写信息 → 注册 → 自动登录 → 进入学生首页 → ✅
- **教师注册**: 填写信息 → 注册 → 提示等待审核 → 回到登录页 → 尝试登录 → 提示"审核中" → ✅
- **管理员审核**: 登录 admin → 注册审核 → 查看待审核列表 → 通过教师 → 教师收到消息 → 教师可登录 → ✅
- **管理员驳回**: 驳回教师（含原因）→ 教师收到消息 → 教师登录提示"审核未通过" → ✅
- **边界测试**: 重复学号注册、密码不一致、必填项为空、admin 角色自注册被拒 → ✅

#### Task 15 — 管理员首页增加待审核提醒
- **文件**: `Yiban/src/pages/admin/AdminHome.tsx`
- **改动**: 首页仪表盘增加"待审核注册"卡片，显示待审核数量，点击跳转审核页
- **验证**: 有新注册时数字实时更新

---

## 涉及文件清单

### 后端
| 文件 | 操作 | 说明 |
|------|------|------|
| `dto/RegisterDTO.java` | 修改 | 新增 role/grade/phone/email/agreement 字段 |
| `entity/User.java` | 修改 | 新增 status 字段 |
| `service/impl/UserServiceImpl.java` | 修改 | register() 重构，login() 增加 status 校验 |
| `controller/AuthController.java` | 修改 | register 接口适配新 DTO |
| `controller/AdminController.java` | 新增 | 注册审核相关端点（或在已有 AdminController 中新增） |
| `db/migrate-009-registration.sql` | 新增 | user 表新增 status 字段 |

### 前端
| 文件 | 操作 | 说明 |
|------|------|------|
| `pages/LoginPage.tsx` | 修改 | 增加"注册账号"入口链接 |
| `pages/RegisterPage.tsx` | 新增 | 注册页面 |
| `pages/TermsPage.tsx` | 新增 | 注册协议页面 |
| `pages/admin/RegistrationAudit.tsx` | 新增 | 注册审核页面 |
| `pages/admin/AdminHome.tsx` | 修改 | 增加待审核注册提醒卡片 |
| `router/index.tsx` | 修改 | 新增 /register, /terms, /admin/registration-audit 路由 |
| `components/Sidebar.tsx` | 修改 | 管理员菜单增加"注册审核" |
| `types/index.ts` | 修改 | 新增注册相关类型定义 |

---

## API 端点汇总

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 公开 | 用户注册（重构） |
| GET | `/api/admin/registrations/pending` | admin | 待审核注册列表 |
| POST | `/api/admin/registrations/approve` | admin | 审核通过 |
| POST | `/api/admin/registrations/reject` | admin | 审核驳回 |

---

## 注意事项

1. **不使用 Redis**: 本任务不涉及 Redis，所有状态存 MySQL
2. **密码安全**: 继续使用 BCrypt 加密，注册和登录逻辑保持一致
3. **用户名即学号/工号**: 不额外设计"昵称"字段，realName 即展示名
4. **教师注册审核是核心**: 教师有审核权限，不能随意开放，必须经管理员批准
5. **幂等迁移**: migrate-009-registration.sql 必须幂等，可重复执行
6. **中文 UI**: 所有界面文案使用中文
7. **样式复用**: 注册页复用 LoginPage 的 glass 样式和动画配置
