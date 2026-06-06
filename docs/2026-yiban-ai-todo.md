# 易赛通 AI 能力增强开发 Todo

关联文档：

- 需求文档：`docs/2026-yiban-ai-requirements.md`
- 设计文档：`docs/2026-yiban-ai-design.md`

说明：

- 所有 AI 能力统一接入 `mimo-v2.5`。
- API Key 只使用 `AI_API_KEY` 环境变量，不写入代码和文档。
- 开发顺序按“先跑通参赛核心演示，再补齐平台级能力”推进。
- 本清单使用 checkbox 维护进度。

## Phase 0：准备与配置

### 后端配置

- [x] 在 `Yiban_backend/src/main/resources/application.yml` 增加 `ai.*` 配置项。
- [x] 新建 `Yiban_backend/src/main/java/com/etsaion/config/AiProperties.java`。
- [x] 校验 `AI_API_KEY` 为空时 AI 接口返回明确错误。
- [x] 确认日志不会输出 Authorization、API Key、Token。

验收：

- [x] 后端能正常启动。
- [x] 未配置 `AI_API_KEY` 时普通业务接口不受影响。
- [x] Swagger 中不出现真实密钥。

### 数据库脚本

- [x] 新建 `Yiban_backend/db/migrate-ai-001.sql`。
- [x] 创建 `ai_task` 表。
- [x] 创建 `award_proof` 表。
- [x] 创建 `award_proof_student` 表。
- [x] 创建 `ai_competition_draft` 表。
- [x] 创建 `competition_source` 表。
- [x] 创建 `ai_conversation` 表。
- [x] 创建 `ai_message` 表。
- [x] 本地执行脚本并确认表结构可创建。

验收：

- [x] 所有新增表创建成功。
- [x] 不破坏现有 `000-schema.sql` 和种子数据启动流程。

## Phase 1：大模型基础能力

### 模型客户端

- [x] 新建 `Yiban_backend/src/main/java/com/etsaion/service/ai/MimoModelClient.java`。
- [x] 支持普通文本对话请求。
- [x] 支持 JSON 输出请求。
- [x] 支持图片 URL 多模态识别请求。
- [x] 增加超时和重试控制。
- [x] 增加错误响应统一包装。

验收：

- [x] 可通过单元测试模拟模型返回 JSON。
- [x] 模型异常时不会抛出未处理异常到控制器。

### AI 任务中心

- [x] 新建 `AiTask` entity、mapper、service、VO。
- [x] 新建 `AiTaskController`。
- [x] 实现创建任务、更新状态、保存结果、保存错误信息。
- [x] 实现 `GET /api/ai/task/{id}`。
- [x] 实现管理员分页查询 AI 任务。
- [x] 实现管理员重试失败任务。

验收：

- [x] 学生只能查看自己发起的任务。
- [x] 管理员能查看全部任务。
- [x] 失败任务能保存失败原因。

### JSON 结构化校验

- [x] 新建 `AiJsonSchemaService`。
- [x] 支持从模型回复中提取 JSON。
- [x] 支持文档解析结果校验。
- [x] 支持证书识别结果校验。
- [x] 支持网页抽取结果校验。
- [x] JSON 解析失败时触发一次修复请求。

验收：

- [x] 非 JSON 文本不会直接进入业务表。
- [x] 日期、置信度、数组字段格式异常时能返回可读错误。

## Phase 2：证书识别与成长档案闭环

### 后端实体与接口

- [x] 新建 `AwardProof` entity、mapper、service、VO。
- [x] 新建 `AwardProofStudent` entity、mapper、service。
- [x] 新建 `AwardProofSubmitDTO`。
- [x] 新建 `AwardProofReviewDTO`。
- [x] 新建 `AwardProofController`。
- [x] 实现 `POST /api/ai/certificate/recognize`。
- [x] 实现 `POST /api/award-proof/submit`。
- [x] 实现 `GET /api/award-proof/my`。
- [x] 实现 `GET /api/award-proof/audit-list`。
- [x] 实现 `GET /api/award-proof/{id}`。
- [x] 实现 `POST /api/award-proof/review`。

验收：

- [x] 学生上传证书后能获得结构化识别结果。
- [x] 学生确认后能创建获奖证明记录。
- [x] 教师/管理员能看到待审核记录。

### 证书识别业务规则

- [x] 计算证书文件 hash。
- [x] 同一文件 hash 重复上传时提示风险。
- [x] 同一学生、同一赛事、同一奖项重复提交时提示风险。
- [x] 模型返回低置信度字段时保存 `field_confidence_json`。
- [x] 模型返回证据片段时保存 `evidence_json`。
- [x] 模型返回风险时保存 `risk_flags_json`。

验收：

- [x] 重复证书不会静默通过。
- [x] 审核页能展示置信度、证据和风险。

### 审核联动

- [x] 提交获奖证明后创建 `review_task`，`target_type=award_proof`。
- [x] 审核通过后关闭对应审核任务。
- [x] 审核通过后为关联学生写入 `growth_record`。
- [x] 审核通过、驳回、退回时发送 `message`。
- [x] 教师审核时限制只能看本学院学生。
- [x] 管理员审核时可看全部。

验收：

- [x] 审核通过后学生成长档案出现记录。
- [x] 学生能收到站内消息。
- [x] 教师无法审核非本学院学生证明。

### 学生端页面

- [x] 修改 `Yiban/src/pages/student/AchievementUpload.tsx`。
- [x] 增加“AI 识别证书”上传区。
- [x] 展示识别中状态。
- [x] 自动回填比赛名称、获奖等级、获奖时间、主办单位、获奖人、证书编号。
- [x] 支持学生手动修正识别字段。
- [x] 支持关联团队成员。
- [x] 支持提交审核。
- [x] 增加低置信度提示。

验收：

- [x] 学生上传证书后能看到自动填表效果。
- [x] 学生修改字段后提交的是修正后的结果。

### 审核端页面

- [x] 在 `Yiban/src/pages/teacher/SubmissionAudit.tsx` 增加“获奖证明”标签或入口。
- [x] 管理员端复用审核入口或新增获奖证明审核入口。
- [x] 展示证书原图。
- [x] 展示学生提交字段。
- [x] 展示 AI 识别字段、置信度、证据、风险。
- [x] 支持通过、驳回、退回补充。

验收：

- [x] 教师能完成获奖证明审核。
- [x] 管理员能完成获奖证明审核。

## Phase 3：AI 文档解析生成赛事草稿

### 后端草稿能力

- [x] 新建 `AiCompetitionDraft` entity、mapper、service、VO。
- [x] 新建 `AiCompetitionController`。
- [x] 新建 `DocumentContentService`。
- [x] 实现文档内容读取。
- [x] 实现 URL 内容读取。
- [x] 实现 `POST /api/ai/competition/parse-file`。
- [x] 实现 `POST /api/ai/competition/parse-url`。
- [x] 实现 `GET /api/ai/competition/drafts`。
- [x] 实现 `GET /api/ai/competition/drafts/{id}`。
- [x] 实现 `PUT /api/ai/competition/drafts/{id}`。
- [x] 实现 `POST /api/ai/competition/drafts/{id}/confirm`。
- [x] 实现 `POST /api/ai/competition/drafts/{id}/ignore`。

验收：

- [x] 管理员上传赛事通知后能生成 AI 草稿。
- [x] 管理员输入 URL 后能生成 AI 草稿。
- [x] AI 草稿不会直接对学生可见。

### 草稿确认联动

- [x] 草稿确认后创建 `competition.status=draft`。
- [x] 草稿确认后创建 `competition_stage`。
- [x] 保存 tags、tracks 为 JSON 数组字符串。
- [x] 保存字段置信度和证据。
- [x] 检测疑似重复赛事并展示重复风险。

验收：

- [x] 确认后的赛事能进入现有赛事管理。
- [x] 发布前仍为 draft，学生端不可见。
- [x] 发布后学生端可见。

### 管理员端页面

- [x] 新建 `Yiban/src/pages/admin/AiCompetitionImport.tsx`。
- [x] 新建 `Yiban/src/pages/admin/AiCompetitionDrafts.tsx`。
- [x] 在 `Yiban/src/router/index.tsx` 增加管理员路由。
- [x] 在 `Yiban/src/components/Sidebar.tsx` 增加管理员菜单。
- [x] 导入页支持上传文件。
- [x] 导入页支持输入 URL。
- [x] 草稿箱支持列表、筛选、查看详情。
- [x] 草稿详情支持编辑、确认、忽略。

验收：

- [x] 管理员能从页面完成“上传文档 -> 草稿 -> 确认”的闭环。

## Phase 4：三端全局智能体

### 后端对话能力

- [x] 新建 `AiConversation` entity、mapper、service。
- [x] 新建 `AiMessage` entity、mapper、service。
- [x] 新建 `AiChatController`。
- [x] 新建 `AiChatService`。
- [x] 新建 `AssistantToolRegistry`。
- [x] 实现 `POST /api/ai/chat`。
- [x] 实现 `POST /api/ai/chat/stream`。
- [x] 实现 `GET /api/ai/chat/conversations`。
- [x] 实现 `GET /api/ai/chat/conversations/{id}`。
- [x] 实现 `DELETE /api/ai/chat/conversations/{id}`。

验收：

- [x] 三端登录用户都能发起对话。
- [x] 对话记录只对当前用户可见。
- [x] SSE 不可用时可回退非流式接口。

### 智能体工具

- [x] 实现 `searchCompetitions`。
- [x] 实现 `getCompetitionDetail`。
- [x] 实现 `getMyRegistrations`。
- [x] 实现 `getMySubmissions`。
- [x] 实现 `getMyAwardProofs`。
- [x] 实现 `getReviewSummary`。
- [x] 实现 `getStudentGrowth`。
- [x] 实现 `getDraftCompetitionSummary`。
- [x] 实现 `getAiTaskStatus`。
- [x] 对每个工具做角色权限校验。
- [x] 限制工具返回字段和数量。

验收：

- [x] 学生无法查询其他学生数据。
- [x] 教师无法查询非本学院学生数据。
- [x] 管理员能查询 AI 草稿和任务统计。

### 前端智能体组件

- [x] 新建 `Yiban/src/components/ai/AIAssistantWidget.tsx`。
- [x] 新建 `ChatMessageList.tsx`。
- [x] 新建 `ChatInputBar.tsx`。
- [x] 新建 `QuickPromptChips.tsx`。
- [x] 在 `Yiban/src/components/Layout.tsx` 挂载智能体浮窗。
- [x] 根据角色显示快捷问题。
- [x] 支持发送消息。
- [x] 支持流式展示。
- [x] 支持错误重试。
- [x] 支持移动端底部抽屉。

验收：

- [x] 学生端快捷问题包括报名、成果、推荐。
- [x] 教师端快捷问题包括审核、学院、学生成长。
- [x] 管理员端快捷问题包括草稿、任务、赛事统计。

## Phase 5：赛事来源管理与网页采集

### 后端来源管理

- [x] 新建 `CompetitionSource` entity、mapper、service、VO。
- [x] 新建 `CompetitionSourceController`。
- [x] 实现 `GET /api/admin/competition-sources`。
- [x] 实现 `POST /api/admin/competition-sources`。
- [x] 实现 `PUT /api/admin/competition-sources/{id}`。
- [x] 实现 `DELETE /api/admin/competition-sources/{id}`。
- [x] 实现 `POST /api/admin/competition-sources/{id}/crawl`。

验收：

- [x] 管理员能维护赛事来源。
- [x] 禁用来源不会被采集。

### 网页采集

- [x] 新建 `CrawlerService`。
- [x] 支持抓取公开网页标题、正文、发布时间、链接。
- [x] 设置请求超时。
- [x] 设置单来源采集上限。
- [x] 调用 `mimo-v2.5` 判断是否为赛事网页。
- [x] 调用 `mimo-v2.5` 抽取赛事字段。
- [x] 生成 `ai_competition_draft`。
- [x] 更新来源最近采集状态。
- [x] 抓取失败时保存错误信息。

验收：

- [x] 管理员手动触发采集后能看到新增草稿。
- [x] 失败来源有明确错误原因。

### 管理员来源页面

- [x] 新建 `Yiban/src/pages/admin/CompetitionSourceManagement.tsx`。
- [x] 在路由中增加 `/admin/competition-sources`。
- [x] 在侧边栏增加“赛事来源”入口。
- [x] 支持新增、编辑、删除、启用、停用来源。
- [x] 支持手动采集。
- [x] 展示最近采集状态和错误原因。

验收：

- [x] 管理员能从页面完成来源配置和手动采集。

## Phase 6：测试与演示收口

### 后端测试

- [x] 新增 `AiConfigContractTest`。
- [x] 新增 `AiJsonSchemaServiceTest`。
- [x] 新增 `AwardProofPermissionTest`。
- [x] 新增 `AwardProofFlowTest`。
- [x] 新增 `AiCompetitionDraftFlowTest`。
- [x] 新增 `AssistantToolPermissionTest`。
- [x] 运行后端测试。

验收：

- [x] 权限测试覆盖学生、教师、管理员。
- [x] 证书审核通过后成长记录和消息联动测试通过。
- [x] AI 草稿确认后创建赛事测试通过。

### 前端验证

- [x] 运行前端构建。
- [x] 验证学生证书识别页面。
- [x] 验证教师/管理员审核页面。
- [x] 验证管理员 AI 导入赛事页面。
- [x] 验证 AI 草稿箱。
- [x] 验证全局智能体。
- [x] 验证赛事来源管理。

验收：

- [x] 桌面端页面无明显布局错乱。
- [x] 移动端智能体可打开、输入、关闭。
- [x] 低置信度、风险、证据展示清晰。

### 参赛演示脚本

- [x] 准备一张获奖证书示例图片。
- [x] 准备一份赛事通知文档。
- [x] 准备一个公开赛事网页 URL。
- [x] 使用学生账号完成证书识别和提交。
- [x] 使用教师账号完成审核通过。
- [x] 使用学生账号查看成长记录和消息。
- [x] 使用管理员账号上传赛事通知并生成草稿。
- [x] 使用管理员账号确认草稿并发布。
- [x] 三端分别向智能体提一个实时数据问题。

验收：

- [x] 5 分钟内能完整演示“证书识别 -> 审核 -> 成长档案 -> 智能体查询”。
- [x] 3 分钟内能演示“文档解析 -> AI 草稿箱 -> 管理员确认”。

## 优先级建议

P0：

- [x] Phase 0：准备与配置。
- [x] Phase 1：大模型基础能力。
- [x] Phase 2：证书识别与成长档案闭环。

P1：

- [x] Phase 3：AI 文档解析生成赛事草稿。
- [x] Phase 4：三端全局智能体。

P2：

- [x] Phase 5：赛事来源管理与网页采集。
- [x] Phase 6：测试与演示收口。

## 最小可参赛闭环

- [x] 配好 `AI_API_KEY`。
- [x] 学生上传证书。
- [x] `mimo-v2.5` 返回结构化识别结果。
- [x] 学生确认并提交。
- [x] 教师审核通过。
- [x] 系统写入成长档案。
- [x] 系统发送站内消息。
- [x] 学生通过智能体查询获奖记录。
- [x] 管理员上传赛事通知生成草稿。

## 迭代记录

### 2026-06-06：AI 对话体验与图片附件

- [x] 左上角支持新建、切换和删除历史对话。
- [x] 移除对话窗口右上角冗余操作按钮并缩小桌面端窗口。
- [x] AI 窗口、输入区、模式入口和右下角悬浮入口统一为独立白色表面。
- [x] 右下角回答模式支持严谨、陪伴、极速切换。
- [x] 重绘 Notion 风格动态 AI 头像。
- [x] 头像悬浮显示个性化提示，点击头像打开个性化弹窗。
- [x] 个性化弹窗支持关闭、遮罩关闭、完成、重置、名称、装饰和动态强度设置。
- [x] 输入区支持选择图片附件和 `Ctrl+V` 粘贴图片。
- [x] 前后端限制附件为 PNG、JPG、WebP、GIF，拒绝非图片、超限大小和超限数量。
- [x] 图片附件可随 AI 对话请求发送给多模态模型。
- [x] 前端构建、后端 94 项测试及浏览器交互验证通过。

