# 易赛通平台重构计划

> 基于 2026-07-26 对全代码库的三路并行调研（报名流程 / 赛事域与 AI 草稿 / 教师端与整体架构）。
> 下方"现状诊断"记录的是重构前的状态，文件行号以当日工作区为准。

## 执行状态（2026-07-26）

| 阶段 | 状态 | 说明 |
|---|---|---|
| Phase 0 安全网 | ✅ 已完成 | `AuditFlowContractTest` + `schema_version` 表 |
| Phase 1 状态收口 | ✅ 已完成 | `enums/` 包 + `RegistrationStatusManager` |
| Phase 2 审核单轨化 | ✅ 已完成 | `WorkbenchControllerSupport` + 获奖证明并入待办 |
| Phase 3 学生数据统一 | ✅ 已完成 | `StudentAccessPolicy` + `ActivityScore` + `/api/meta` |
| Phase 4 前端 API 层 | ⏸ 搁置 | 前端由他人并行改造中，待解冻 |
| Phase 5 页面组件收敛 | ⏸ 搁置 | 同上 |
| Phase 6 AI 草稿隔离 | ✅ 已完成 | `CompetitionPublishService` + `DraftDedupService` + `CompetitionScheduleExtractor` |

后端测试 134 → 181 个，全绿。所有后端改动对既有前端保持 HTTP 契约兼容：
端点路径不变，旧参数（`approve` + `【退回补充】` 前缀意见）继续接受，同时新增显式 `action`。

### 顺带修掉的线上缺陷

1. **成果"退回补充"必定 500**。`SubmissionServiceImpl` 里
   `? true : (isReturn ? null : false)` 混用 `boolean` 字面量与 `Boolean`，
   按 JLS 15.25 整个条件表达式按 `boolean` 求值，退回分支的 `null` 被拆箱成 NPE。
2. **孤儿待办反向未覆盖**。审核报名会把关联成果标为已审核却不结掉成果的待办，
   点开抛"该成果已审核过"。原有的 `contains("已处理完毕")` 补丁只兜了另一个方向。
3. **获奖证明待办点开即报错**。待办一直在创建，`handleTask` 却不认这个 targetType。
4. **教师无学院时越权**。`GrowthController` 的 `teacher.getCollege() != null` 写法
   把没填学院的教师放行到全校数据，与 `TeacherServiceImpl` 的拒绝语义相反。
5. **注册页学院下拉永远走硬编码**。匿名调 admin-only 的 `/admin/colleges` 必然 401，
   异常被 catch 吞掉。

### 已知但未改动

`SUBMISSION_DEADLINE_PATTERN` 同时匹配"提交作品截止"与"作品提交截止"，
但随后的判断只放行前者，后一种写法被匹配到又丢弃。看着像笔误，
但改动会影响已抓取通知的解析结果，应作为单独的决定。
现状已记录在 `CompetitionScheduleExtractorTest`。

---

## 一、现状诊断：五大病灶

### 病灶 1：状态与业务规则全靠"魔法字符串"，没有单一事实来源

- **全后端零枚举**：`grep -rl "enum " Yiban_backend/src/main/java` 结果为空。中文状态字面量后端出现 **74 处/8 个文件**，前端 **182 处/28 个文件**。
- **「退回补充」编码在审核意见的文本前缀里**：`reviewNote.startsWith("【退回补充】")` 是事实上的状态位，横跨前后端 6 个文件 11+ 处（`RegistrationServiceImpl.java:232`、`SubmissionServiceImpl.java:217`、`ReviewTaskServiceImpl.java:230`、`SubmissionAudit.tsx:442-459`、`MyProgress.tsx:81`、`MyRegistrations.tsx:160`）。改一个字就静默破坏状态判定。
- **`待完善` 是死状态**：DB 默认值（`000-schema.sql:154`），但后端没有任何代码写入/读取它；前端却为它维护完整 UI 分支（tab、chip、按钮、进度条，约 10 处）。
- **`Registration.status` 有 4 个写入点、分散在 2 个 Service**：`RegistrationServiceImpl`（submit/audit）+ `SubmissionServiceImpl`（submitSubmission 把报名改"审核中"、reviewSubmission 完整复制了三分支流转）。两者 `@Lazy` 循环注入。
- 直接恶果：`ReviewTaskServiceImpl.java:231-238` **靠匹配异常消息中文子串 `contains("已处理完毕")` 做控制流**，专门兜"另一条路径已把报名审掉、待办成孤儿"的场景。
- level/category 归一化规则存在 **3 份实现**：后端 `AiCompetitionDraftServiceImpl.java:838-884`、前端 `DraftsBox.tsx:130-152` 与 `AiImportPanel.tsx:56-78`（后两者逐字相同）。

### 病灶 2：审核链路"双轨制"，新老两套模型未收敛

- **6 个审核 HTTP 端点，2 套并行模型**：老轨 `/registration/audit`、`/submission/review`；新轨 workbench（ReviewTask）4 个端点。新轨最终委托回老轨 service，但入口、DTO 契约、生命周期各是一套。
- `AdminWorkbenchController` 与 `TeacherWorkbenchController` 是**逐行复制的孪生类**（72 vs 65 行），仅注解不同。
- 审核动作契约有 **3 套 DTO**：`AuditDTO`（Boolean approve）、`ReviewTaskActionDTO`（action 字符串，`normalizeAction` 还兼容 6 种拼写）、未使用的 `ReviewDTO`。4 个端点参数风格各异（body / body+query / 纯 query）。
- 后端不收敛的代价转嫁给前端：`SubmissionAudit.tsx`（888 行，教师/管理共用）`fetchPending()` **并行拉 4 个数据源再在客户端手工去重**（`task-` / `reg-` / `sub-` / `award-` ID 前缀防碰撞），`handleAudit()` 4 分支路由到 4 个不同端点。
- `backfillHistorical()`（`ReviewTaskServiceImpl.java:318-425`，107 行）把状态映射规则又复制一遍，`db/001-data.sql:227-254` 还有第四份 SQL 实现。

### 病灶 3：学生数据多源，教师端管理混乱的根源

- **学生主数据双表**：`user` 表（教师端/管理端用户管理读）vs `student_roster` 表（管理端花名册读），靠手动按钮 `/admin/users/sync-student-accounts` 同步。花名册改了班级，教师端看到旧值。
- **学生查询实现了 5 遍**：`TeacherServiceImpl.listStudentsPage`、`listStudents`（死代码，无 controller 调用）、`UserServiceImpl.getUserPage`、`AuthController./auth/search-students`、`AssistantToolRegistry.searchStudents`。
- **学院数据权限规则 3 套且行为矛盾**：`TeacherServiceImpl.canAccessStudent` 教师无学院→**拒绝**；`GrowthController` 4 处逐字复制的判断教师无学院→**放行**；`AssistantToolRegistry.collegeAliases` 模糊别名匹配。AI 助手能查到的学生，教师列表可能查不到。
- **学院列表 3 个来源**：`/teacher/colleges`（user 表 distinct）、`/admin/colleges`（major 表）、`RegisterPage.tsx:53` 前端硬编码 8 个学院。且注册页匿名调 admin-only 的 `/admin/colleges` **必然 401**，被 catch 静默吞掉，下拉框永远走硬编码兜底（真实 bug）。
- **成长雷达双通道**：教师端 `TeacherStudentGrowth` 走 `/growth/profile`，`StudentDetail` 走 `/teacher/student-detail`（内部再调 growthRecordService），字段名一个 `dimensions` 一个 `radar`。
- **综测分 3 处计算**：`TeacherServiceImpl.java:715` 和 `TeacherController.java:192` 各自硬编码 `报名×2 + 获奖×15`（controller 里导 Excel 时重算！），与 `comprehensive_score` 表的官方分互不相干。
- `TeacherServiceImpl`（822 行）注入 8 个 service，15 个接口方法里 **5 个返回裸 `Map<String,Object>`** —— 前端被迫各写各的 interface（`OverviewData` 两处字段不一致、`MonitorRow`/`RadarDim`/`ComprehensiveScore` 各重复 2-3 处）。零测试覆盖。
- 性能雷：`TeacherServiceImpl.java:560` O(专业×提交×报名) 三重嵌套；`:516` `userService.list()` 全学院学生载入内存；`StudentCompare.tsx:110` for 循环逐个打 N 次全量接口。

### 病灶 4：赛事域头重脚轻，AI 副线反噬主线

- 主流程极轻（`CompetitionServiceImpl` 61 行），AI 草稿子系统 3000+ 行，`AiCompetitionDraftServiceImpl.java` **1603 行、约 100 个私有方法**，是全后端最大类。
- **两条独立路径写 `competition` 表，默认值规则不同**：controller 路径默认 `status=published` + `@Validated` 校验；`confirmDraft`（:571-611）直接 `competitionService.save()` 绕过 DTO 校验，默认 `status=draft`、`level=校级`、`category=A`。AI 路径能写出 controller 路径写不出的数据。
- **去重靠全表扫描 + Levenshtein**：`findDuplicateCompetition`（:1190）把整张赛事表拉进内存逐条编辑距离比对，`catch (Exception ignored)` 静默吞异常。
- 前端**主系统没有 API 封装层，副系统反而有**：`api/` 下只有 aiChat/aiCompetition/awardProof/competitionSource/qiniu 等后加模块（占 HTTP 调用 ~18%）；`/competition/list` 在 10 个页面裸调、params 各异；`pages/` 内裸 `apiClient` 调用 125 处，`const data: any = await ...` + `Array.isArray(data) ? ... : data.records` 兜底逻辑复制十几遍。
- 展示层重复：level chip 函数 **7 份实现、4 套 class 命名**（共享的 `lib/levelDisplay.ts:26 levelChipClass` 几乎没人用）；`formatDate` 8 处（实现还不一致）；`statusLabel` 2 处；赛事卡片 87 行 JSX 内联在 `CompetitionsHub.tsx:396-482`，无组件化；`Segmented`/`CategoryButton` 定义在页面文件底部。
- 三端路由：`CompetitionsHub` 同时挂 `/student|teacher|admin/competitions` 三条路由，内部 8 处 role 分支；**教师点详情会跳到 `/student/competitions/{id}` 学生端路由**（`:390`）；`navigation.ts` 同一路径在侧栏/面包屑/移动端/relatedLinks 有 4 套中文名，与文件头"命名唯一来源"注释自相矛盾。
- `categoryCounts` 只统计当前页 12 条却当全量展示（`CompetitionsHub.tsx:265`），数字随翻页跳变。
- 命名陷阱：`admin/RegistrationAudit.tsx` 实际是**教师账号注册审批**（`User.status=pending_approval`），与赛事报名无关，却与真正的报名审核 `/admin/audit` 相邻共存。

### 病灶 5：类型、状态管理、测试、迁移基建缺失

- `types/index.ts` 197 行/23 个类型，仅 5 个页面 import；页面内部自定义 interface **83 个**；后端 17 个 VO 前端零对齐（`GrowthProfileVO` 前端抄了两份字段还不同）。
- Zustand store 66 行只管 `currentUser` + `theme`；token 在 localStorage、user 不持久化，刷新后 `currentUser=null` 但 token 还在，`RequireAuth` 写了"currentUser 为空就放行"的兜底（`router/index.tsx:64-72`，越权隐患）。
- 后端 21 个测试文件全部集中在 AI/获奖证明/综测；**报名、审核、教师域零测试**；前端零测试。
- `db/` 目录 16 个迁移脚本靠文件名序号手工执行，无版本记录表；`src/index.css` 2363 行单文件全局样式。
- **未提交改动互相依赖**：`CrawlerService` BFS 重写 + `DocumentContentService.rankCompetitionLinks` + `AiCompetitionDraftService.ingestCrawledPage` + `migrate-015/016` 是一个整体，任何一半单独提交都会编译失败或行为退化。

---

## 二、重构总体思路

1. **先立契约，再动刀**：现有行为用契约测试冻结（已有 `ContractBaselineTest` 底子），每阶段结束 `mvn test` + `npm run build` 必须全绿。
2. **状态收口是一切的前提**：枚举 + 单一写入方，病灶 2 的孤儿任务补丁、前端 4 源去重都是它的下游症状。
3. **审核单轨化**：ReviewTask/workbench 成为唯一审核入口，老端点降级为薄委托再删除。
4. **学生数据单源**：一个 `StudentQueryService` + 一套学院权限策略，`user` 表为运行时唯一权威。
5. **前端"API 层→类型→组件"三步收敛**，页面瘦身是收敛的自然结果，不单独立项。
6. **AI 草稿子系统隔离后置**：它是增量功能，先切断它对主表的"越权直写"，内部拆分放最后。

依赖关系：Phase 1 → Phase 2 → (Phase 3 与 Phase 4 可并行) → Phase 5 → Phase 6。

---

## 三、分阶段计划

### Phase 0 — 清理工作区 + 建立安全网（0.5 天）

| 动作 | 验证 |
|---|---|
| 处理未提交改动：爬虫 BFS 重写 6 文件 + migrate-015/016 作为**一个整体** commit（先 `mvn test`），或整体 stash。不允许在脏树上开始重构 | `git status` 干净；`mvn test` 绿 |
| 补报名/审核契约测试：`/registration/submit`、`/registration/audit`、`/workbench/tasks/{id}/action`、`/submission/review` 的请求→状态变迁→响应快照 | 新测试全绿，作为后续每阶段回归基线 |
| 给 `db/` 加最简迁移记录表 `schema_version`（或引入 Flyway community），杜绝"手工按序执行" | 重复执行迁移幂等 |

### Phase 1 — 状态收口（后端，2~3 天）

| 动作 | 验证 |
|---|---|
| 新建枚举/常量类：`RegistrationStatus`、`SubmissionStatus`、`ParticipationStatus`、`ReviewTaskStatus`、`CompetitionStatus`、`AuditAction(approve/reject/return)`。DB 仍存中文值，枚举带 `value()` 映射，**不改表** | 后端 service/controller 中文状态字面量 grep 计数 74 → 0（仅枚举定义处保留） |
| **消灭 `【退回补充】` 前缀嗅探**：审核入口显式接收 `action ∈ {approve, reject, return}`（`ReviewTaskActionDTO` 已有此形状），service 层按 action 分支；`review_note` 回归纯文本。展示兼容期可继续写前缀，判定逻辑一律不再读前缀 | 全库 `startsWith("【退回补充】")` grep → 0 |
| 抽 `RegistrationStatusManager`（或合并进统一 `AuditService`）作为 `Registration.status` **唯一写入方**；`SubmissionServiceImpl` 不再直接 set 报名状态，改为调用它；解除 `@Lazy` 循环依赖 | 全库 `setStatus(` 对 Registration 的调用只剩 1 个类；契约测试绿 |
| 删除死状态 `待完善`：DB 默认值改 `已提交`（迁移脚本），前端删除相关 tab/chip/分支（约 10 处） | 前端 grep `待完善` → 0 |
| 顺手删除：未使用的 `ReviewDTO`、死方法 `TeacherServiceImpl.listStudents` | 编译绿 |

### Phase 2 — 审核单轨化（2~3 天）

| 动作 | 验证 |
|---|---|
| 合并孪生 controller 为一个 `WorkbenchController`，`@RequireRole({"admin","teacher"})` + service 内按角色过滤数据范围 | 老路径 301/保留薄委托，契约测试绿 |
| 确保 registration/submission/participation 提交时**同步创建 ReviewTask**（backfill 已有，改为写入时保证），待审列表只从 `review_task` 出 | 新提交必有对应 task；`/registration/pending`、`/submission/list?status=待审核` 标记 @Deprecated |
| 统一动作契约：唯一 DTO `{action, reviewNote}`；删掉 `normalizeAction` 的 6 拼写兼容（前端同步改） | 全后端审核 DTO 只剩 1 个 |
| 获奖证明审核并入 ReviewTask（`targetType='award_proof'`） | SubmissionAudit 数据源 4 → 1 |
| 删除异常消息控制流补丁（`contains("已处理完毕")`）—— 单一写入方后孤儿任务不再产生 | 该代码删除后契约测试仍绿 |
| 前端 `SubmissionAudit.tsx`：只拉 `/workbench/tasks`、只提交一个端点，删除客户端去重和 ID 前缀体操。预计 888 行 → ~400 行 | 三角色手工过一遍审核流；页面行数减半 |
| 老端点 `/registration/audit`、`/submission/review` 前端零引用后删除 | 前端 grep 两个路径 → 0 |

### Phase 3 — 学生数据统一（教师端治理，3~4 天，可与 Phase 4 并行）

| 动作 | 验证 |
|---|---|
| 新建 `StudentQueryService`：唯一的学生查询 + **唯一的学院权限策略**（建议规则：admin 全量；教师精确匹配本学院；教师无学院 → 拒绝并提示补全资料）。5 处查询实现全部委托它 | 权限策略单元测试（含"教师无学院"分支）；AI 助手与教师列表结果一致 |
| 学院列表单源化：以 `major` 表为权威（admin 可维护）；`/teacher/colleges` 改读同源；新增匿名可访问的 `/api/meta/colleges` 供注册页；删除 `RegisterPage.tsx` 硬编码 8 学院 | 注册页下拉来自接口（修复 401 bug）；两端下拉一致 |
| `user` 表定为运行时唯一权威；`student_roster` 定位为导入暂存，导入成功后**自动同步**（保留手动按钮做兜底），页面标注同步时间 | 花名册改班级 → 教师端立即可见 |
| 成长雷达单通道：统一走 `/growth/radar` / `/growth/profile`；`/teacher/student-detail` 内部复用同一 service，字段名统一 `dimensions` | 两页面雷达数据一致 |
| 综测分单源：删除 `TeacherServiceImpl:715`、`TeacherController:192` 两处硬编码公式，排名/导出一律读 `ComprehensiveScoreService` | 页面排名分 = 导出 Excel 分 |
| 拆 `TeacherServiceImpl`（822 行/8 依赖）：`TeacherDashboardService`、`StudentQueryService`（上）、`TeacherExportService`；5 个 `Map<String,Object>` 返回全部补 VO（`DashboardStatsVO`、`CollegeOverviewVO`、`StudentDetailVO`、`TrendVO`、导出 DTO） | 每个新 service < 300 行；前端可删对应手写 interface |
| 性能修复：三重嵌套改一次分组聚合；全学院 `list()` 加分页/按需字段；`StudentCompare` 后端提供批量接口 `/teacher/student-details?ids=` | 学院总览接口耗时对比 |

### Phase 4 — 前端 API 层与类型对齐（2~3 天，可与 Phase 3 并行）

| 动作 | 验证 |
|---|---|
| 建 `api/competition.ts`、`registration.ts`、`submission.ts`、`workbench.ts`、`teacher.ts`、`admin.ts`、`growth.ts`、`team.ts`、`message.ts`：每个端点一个类型化函数；`PageResponse<T>` 与"数组/分页兼容解包"只写一次 | `pages/` 内裸 `apiClient` 调用 125 → 0；`StudentDetail.tsx:148` 的裸 `fetch` 移除 |
| `types/` 与后端 VO 对齐重建（Phase 3 补齐 VO 后）；逐页删除 83 个本地 interface，改 import | `npm run build`（含 tsc）绿；`: any` 断言大幅减少 |
| 建 `lib/statusDisplay.ts`：报名/成果/参与状态 → {label, chipClass, step} 唯一映射（解决 5 套映射文案矛盾："审核中"vs"成果审核中"vs"待审核"——**以 `MyProgress` 的语义精确版为准**）；`lib/format.ts` 收口 `formatDate`（8 处 → 1）；`levelDisplay.ts` 推广到全部 7 个手写点 | 各页面状态文案一致；grep 重复实现 → 0 |
| Zustand 补 `persist` 中间件持久化 `currentUser`（或启动时用 token 拉 `/auth/profile`）；**删除 `RequireAuth` 的"currentUser 为空放行"兜底** | 刷新后角色路由守卫仍生效 |

### Phase 5 — 页面与组件收敛（3~4 天）

| 动作 | 验证 |
|---|---|
| 抽公共组件：`CompetitionCard`、`StatusChip`、`LevelBadge`、`Segmented`、`CategoryButton`、`EmptyState` 进 `components/` | Hub/Home/Calendar/TeamRecruitment 复用同一卡片 |
| 三端赛事路由归一：统一 `/competitions`、`/competitions/:id`（Layout 按角色渲染操作区），或至少修复教师详情跳学生路由的问题；`navigation.ts` 一路径一中文名 | 教师点详情路径正确；导航命名唯一 |
| `categoryCounts` 改用后端聚合或全量统计 | 翻页数字不再跳变 |
| 大页面拆分（Phase 2/4 完成后自然减半，再按职责拆）：`ExcellentWorks`(1083)、`DraftsBox`(1034)、`AchievementUpload`(998)、`CompetitionPublish`(923，四类型×两模式拆成 类型表单组件 + 编排壳) | 单页面 < 400 行 |
| `admin/RegistrationAudit.tsx` 更名 `TeacherAccountApproval.tsx`，路由/菜单文案同步改"教师账号审批" | 与报名审核不再混淆 |
| 孤儿页面处理：`/teacher/student-detail`、`/teacher/student-compare` 加导航入口或删除 | 导航可达或代码移除 |

### Phase 6 — AI 草稿子系统隔离与拆分（后置，2~3 天）

| 动作 | 验证 |
|---|---|
| **切断越权直写**：`confirmDraft` 不再直接 `competitionService.save()`，改走与 controller 相同的 `CompetitionPublishService`（统一校验、统一默认值、统一建 stage） | 两条路径写出的数据字段规则一致；`AiCompetitionDraftFlowTest` 绿 |
| level/category 归一化只留后端一份（独立 `CompetitionFieldNormalizer`）；前端 `DraftsBox`/`AiImportPanel` 两份拷贝删除，直接用后端返回的归一化值 | 3 份实现 → 1 份 |
| 去重改造：`competition`/draft 表加 `normalized_name` 索引列，先精确/前缀命中再对小候选集做编辑距离；删除 `catch (Exception ignored)` | 赛事量 1w 条下去重耗时可控 |
| 拆 `AiCompetitionDraftServiceImpl`（1603 行）：`DraftIngestService`（抓取入库）、`DraftExtractionService`（AI+规则抽取，含 5 个日期 Pattern）、`DraftDedupService`、`DraftConfirmService` | 单类 < 400 行；现有 4 个 AI 测试类全绿 |
| `DraftsBox` 的 `UnifiedDraft(ai|manual)` 硬拼列表拆开：AI 草稿箱只管 AI 草稿，手工 draft 列表放赛事管理页 | 手工草稿不再"点开是空表单" |

---

## 四、立即可修的小 bug 清单（不等重构，半天内可清）

1. `RegisterPage.tsx:48` 匿名调 admin-only `/admin/colleges` 必然 401 → 学院下拉永远走硬编码（Phase 3 根治，可先加匿名 meta 端点止血）。
2. `CompetitionsHub.tsx:390` 教师点赛事详情跳 `/student/competitions/{id}`。
3. `CompetitionCalendar.tsx:19-27` levelColor 缺"院级"，falls back 灰色。
4. `CompetitionsHub.tsx:265` categoryCounts 只统计当前页却当全量展示。
5. `router/index.tsx:64-72` `RequireAuth` currentUser 为空放行（越权隐患）。
6. 死代码：`TeacherServiceImpl.listStudents`、`ReviewDTO`、`types/index.ts` 死类型。
7. `TeacherStudentCompetitions.tsx:29` 状态筛选漏 `退回补充`。
8. `Registration.java:19` 注释漏 `退回补充`（改注释，或等 Phase 1 枚举化）。

---

## 五、需要拍板的决策点

| # | 决策 | 建议 |
|---|---|---|
| 1 | `待完善` 状态：删除 or 真正实现"草稿报名"？ | **删除**。后端从未写入，实现它意味着新增功能而非重构 |
| 2 | 获奖证明审核是否并入 ReviewTask？ | **并入**（targetType='award_proof'），否则 SubmissionAudit 永远要拼双源 |
| 3 | 学生主数据：`user` 为权威 + roster 自动同步，还是合并两表？ | **前者**。合表动 25 张表关联，风险大收益小 |
| 4 | 教师无学院时：拒绝访问 or 放行全量？（现状两种并存） | **拒绝**，与 `canAccessStudent` 现有语义一致，避免越权 |
| 5 | 三端赛事路由：统一 `/competitions` or 保留三前缀？ | 统一，减少 role 分支；工作量可接受则做，否则只修教师跳转 bug |
| 6 | 迁移管理：Flyway or 手写 schema_version 表？ | 项目规模下**手写最简版**即可，避免引入新依赖 |

## 六、工期与风险

- 总量约 **15~20 个工作日**（单人）；Phase 3/4 可并行压缩至 ~13 天。
- 每阶段独立可交付、可回滚（一个 phase 一个分支/PR），任何时刻主干 `mvn test` + `npm run build` 全绿。
- 最大风险点：Phase 2 单轨化期间新老待办并存 → 用 Phase 0 的契约测试 + backfill 幂等脚本兜底；Phase 1 删 `待完善` 需先确认线上库无该状态存量数据（`SELECT COUNT(*) FROM registration WHERE status='待完善'`）。
