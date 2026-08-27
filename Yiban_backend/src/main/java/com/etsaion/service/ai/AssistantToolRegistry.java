package com.etsaion.service.ai;

import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.entity.*;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.*;
import com.etsaion.vo.ai.AiArtifactVO;
import com.etsaion.vo.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * AI 工具注册中心。
 * 负责：1) 向模型声明可用工具定义  2) 根据模型请求执行对应工具
 */
@Service
public class AssistantToolRegistry {

    @Autowired private CompetitionService competitionService;
    @Autowired private StudentAccessPolicy studentAccessPolicy;
    @Autowired private RegistrationService registrationService;
    @Autowired private SubmissionService submissionService;
    @Autowired private AwardProofService awardProofService;
    @Autowired private ReviewTaskService reviewTaskService;
    @Autowired private GrowthRecordService growthRecordService;
    @Autowired private UserService userService;
    @Autowired private AiTaskService aiTaskService;
    @Autowired private AiCompetitionDraftService aiCompetitionDraftService;
    @Autowired private ActivityService activityService;
    @Autowired private MessageService messageService;
    @Autowired private AnnouncementService announcementService;
    @Autowired private TeacherService teacherService;
    @Autowired private AiArtifactService aiArtifactService;
    @Autowired private ComprehensiveScoreService comprehensiveScoreService;
    @Autowired private AiFeatureService aiFeatureService;

    // ────────────── 工具定义 ──────────────

    /**
     * 根据当前用户角色返回可用工具定义列表（OpenAI function calling 格式）。
     */
    public List<Map<String, Object>> getToolDefinitions(Long userId, String role) {
        List<Map<String, Object>> tools = new ArrayList<>();
        tools.add(tool("search_competitions", "搜索赛事列表", Map.of(
                "type", "object",
                "properties", Map.of("keyword", Map.of("type", "string", "description", "搜索关键词，如赛事名称、类别")),
                "required", List.of()
        )));
        tools.add(tool("get_competition_detail", "获取某个赛事的详细信息", Map.of(
                "type", "object",
                "properties", Map.of("competition_id", Map.of("type", "integer", "description", "赛事ID")),
                "required", List.of("competition_id")
        )));

        if ("student".equalsIgnoreCase(role)) {
            tools.add(tool("get_my_registrations", "查看当前学生的报名记录", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_my_submissions", "查看当前学生的成果提交记录", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_my_award_proofs", "查看当前学生的获奖证明", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_my_growth", "查看当前学生的成长雷达数据和档案", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_my_comprehensive_score", "查询当前学生的官方综测排名和排名百分比。只返回本年级本专业范围内的排名，不要按全校重新计算。", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_my_participations", "查看当前学生参与的活动记录", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_my_messages", "查看当前学生的站内消息", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_announcements", "查看平台最新公告", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_personalized_recommendations", "根据学生专业、年级、历史参赛和截止时间推荐适合的赛事", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("check_registration_materials", "检查指定赛事的报名材料完整度、附件格式和组队要求", Map.of(
                    "type", "object",
                    "properties", Map.of(
                            "competition_id", Map.of("type", "integer", "description", "赛事ID"),
                            "project_name", Map.of("type", "string", "description", "作品名称"),
                            "mentor_name", Map.of("type", "string", "description", "指导教师"),
                            "team_member_count", Map.of("type", "integer", "description", "团队人数"),
                            "attachments", Map.of("type", "array", "items", Map.of("type", "string"), "description", "附件文件名列表")
                    ),
                    "required", List.of("competition_id"))));
            tools.add(tool("match_team_members", "根据意向赛事和技能方向推荐互补队友", Map.of(
                    "type", "object",
                    "properties", Map.of(
                            "competition_id", Map.of("type", "integer", "description", "赛事ID"),
                            "desired_role", Map.of("type", "string", "description", "希望招募的技能，如 UI 设计")
                    ),
                    "required", List.of("competition_id"))));
        }

        if ("teacher".equalsIgnoreCase(role)) {
            tools.add(tool("search_students", "按姓名或学号搜索学生", Map.of(
                    "type", "object",
                    "properties", Map.of("keyword", Map.of("type", "string", "description", "学生姓名或学号")),
                    "required", List.of("keyword")
            )));
            tools.add(tool("get_student_detail", "获取某个学生的详细信息（参赛、成绩、个人资料）", Map.of(
                    "type", "object",
                    "properties", Map.of("student_id", Map.of("type", "integer", "description", "学生ID")),
                    "required", List.of("student_id")
            )));
            tools.add(tool("get_student_comprehensive_score", "查询指定学生的官方综测排名和排名百分比。只返回本年级本专业范围内的排名，不要按全校重新计算。", Map.of(
                    "type", "object",
                    "properties", Map.of("student_id", Map.of("type", "integer", "description", "学生ID")),
                    "required", List.of("student_id")
            )));
            tools.add(tool("find_student_comprehensive_score", "按姓名或学号查询本学院某个学生的官方综测排名。姓名重名时会返回候选学生，不能跨学院查询。", Map.of(
                    "type", "object",
                    "properties", Map.of("keyword", Map.of("type", "string", "description", "学生姓名或学号")),
                    "required", List.of("keyword")
            )));
            tools.add(tool("get_class_comprehensive_ranking", "按班级查询官方综测/学业成绩排名表。返回结构化表格数据，回答时只总结概况，不要把整张表直接写进聊天内容。", Map.of(
                    "type", "object",
                    "properties", Map.of(
                            "class_name", Map.of("type", "string", "description", "班级全名，例如 2024大数据1班"),
                            "academic_year", Map.of("type", "string", "description", "可选学年，例如 2024-2025-1"),
                            "metric", Map.of("type", "string", "enum", List.of("comprehensive", "academic"), "description", "排序指标，comprehensive=综测，academic=学业成绩/绩点参考")
                    ),
                    "required", List.of("class_name")
            )));
            tools.add(tool("get_pending_reviews", "查看待审核的任务列表", Map.of(
                    "type", "object",
                    "properties", Map.of("limit", Map.of("type", "integer", "description", "返回条数，默认5")),
                    "required", List.of()
            )));
            tools.add(tool("get_college_overview", "查看学院参赛总览数据", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_award_proof_audit", "查看待审核的获奖证明", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_teacher_ai_cockpit", "总结教师今天需要优先处理的审核、补交和预警事项", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
        }

        if ("admin".equalsIgnoreCase(role)) {
            tools.add(tool("get_pending_reviews", "查看待审核的任务列表", Map.of(
                    "type", "object",
                    "properties", Map.of("limit", Map.of("type", "integer", "description", "返回条数，默认5")),
                    "required", List.of()
            )));
            tools.add(tool("get_pending_drafts", "查看待审核的赛事草稿", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_ai_task_stats", "查看 AI 任务执行统计", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_user_stats", "查看平台用户统计", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_announcements", "查看平台最新公告", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_admin_ai_report", "生成赛事运行简报，分析发布、报名、审核和临近截止异常并给出建议", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
        }

        tools.add(tool("create_excel_artifact", "生成可下载的 Excel 文件。仅用于把已查询或用户提供的数据导出为临时文件，不修改平台业务数据。", Map.of(
                "type", "object",
                "properties", Map.of(
                        "title", Map.of("type", "string", "description", "文件标题，如 报名记录导出"),
                        "description", Map.of("type", "string", "description", "文件说明，简短描述数据来源和用途"),
                        "sheet_name", Map.of("type", "string", "description", "工作表名称"),
                        "columns", Map.of(
                                "type", "array",
                                "items", Map.of("type", "string"),
                                "description", "表头列名"),
                        "rows", Map.of(
                                "type", "array",
                                "items", Map.of(
                                        "type", "array",
                                        "items", Map.of("type", "string")
                                ),
                                "description", "二维数组，每个子数组是一行，顺序与 columns 对齐")
                ),
                "required", List.of("title", "columns", "rows")
        )));
        tools.add(tool("create_docx_artifact", "生成可下载的 DOCX 文件。仅用于报告、通知、汇总、说明等临时文档，不修改平台业务数据。", Map.of(
                "type", "object",
                "properties", Map.of(
                        "title", Map.of("type", "string", "description", "文档标题"),
                        "description", Map.of("type", "string", "description", "文档说明，简短描述生成目的"),
                        "paragraphs", Map.of(
                                "type", "array",
                                "items", Map.of("type", "string"),
                                "description", "正文段落，按阅读顺序排列"),
                        "table_columns", Map.of(
                                "type", "array",
                                "items", Map.of("type", "string"),
                                "description", "可选表格表头"),
                        "table_rows", Map.of(
                                "type", "array",
                                "items", Map.of(
                                        "type", "array",
                                        "items", Map.of("type", "string")
                                ),
                                "description", "可选表格行，顺序与 table_columns 对齐")
                ),
                "required", List.of("title", "paragraphs")
        )));

        return tools;
    }

    // ────────────── 工具执行 ──────────────

    /**
     * 根据工具名称执行对应操作，返回 JSON 字符串结果。
     */
    public String executeTool(String name, String argsJson, Long userId, String role) {
        try {
            Map<String, Object> args = parseArgs(argsJson);
            return switch (name) {
                case "search_competitions" -> toJson(searchCompetitions(
                        (String) args.getOrDefault("keyword", ""), role));
                case "get_competition_detail" -> toJson(getCompetitionDetail(
                        toLong(args.get("competition_id")), role));
                case "get_my_registrations" -> toJson(getMyRegistrations(userId, role));
                case "get_my_submissions" -> toJson(getMySubmissions(userId, role));
                case "get_my_award_proofs" -> toJson(getMyAwardProofs(userId, role));
                case "get_my_growth" -> toJson(getMyGrowth(userId, role));
                case "get_my_comprehensive_score" -> toJson(getMyComprehensiveScore(userId, role));
                case "get_my_participations" -> toJson(getMyParticipations(userId));
                case "get_my_messages" -> toJson(getMyMessages(userId));
                case "get_announcements" -> toJson(getRecentAnnouncements());
                case "get_personalized_recommendations" -> toJson(studentFeature(() -> aiFeatureService.recommendCompetitions(userId), role));
                case "check_registration_materials" -> toJson(studentFeature(() -> aiFeatureService.precheckMaterials(userId,
                        toLong(args.get("competition_id")), precheckPayload(args)), role));
                case "match_team_members" -> toJson(studentFeature(() -> aiFeatureService.matchTeamMembers(userId,
                        toLong(args.get("competition_id")), (String) args.getOrDefault("desired_role", "")), role));
                case "search_students" -> toJson(searchStudents(
                        (String) args.getOrDefault("keyword", ""), userId, role));
                case "get_student_detail" -> toJson(getStudentDetailById(toLong(args.get("student_id")), userId, role));
                case "get_student_comprehensive_score" -> toJson(getStudentComprehensiveScore(toLong(args.get("student_id")), userId, role));
                case "find_student_comprehensive_score" -> toJson(findStudentComprehensiveScore(
                        (String) args.getOrDefault("keyword", ""),
                        userId,
                        role));
                case "get_class_comprehensive_ranking" -> toJson(getClassComprehensiveRanking(
                        (String) args.getOrDefault("class_name", ""),
                        (String) args.getOrDefault("academic_year", ""),
                        (String) args.getOrDefault("metric", "comprehensive"),
                        userId,
                        role));
                case "get_pending_reviews" -> toJson(getPendingReviews(
                        toInt(args.getOrDefault("limit", 5))));
                case "get_college_overview" -> toJson(getCollegeOverview());
                case "get_award_proof_audit" -> toJson(getAwardProofAuditList());
                case "get_teacher_ai_cockpit" -> toJson(roleFeature(() -> aiFeatureService.teacherCockpit(userId), role, "teacher"));
                case "get_pending_drafts" -> toJson(getPendingDrafts());
                case "get_ai_task_stats" -> toJson(getAiTaskStats());
                case "get_user_stats" -> toJson(getUserStats());
                case "get_admin_ai_report" -> toJson(roleFeature(() -> aiFeatureService.adminAnalytics(userId), role, "admin"));
                case "create_excel_artifact" -> toJson(createExcelArtifact(args));
                case "create_docx_artifact" -> toJson(createDocxArtifact(args));
                default -> toJson(Map.of("error", "未知工具: " + name));
            };
        } catch (Exception e) {
            return toJson(Map.of("error", e.getMessage()));
        }
    }

    // ────────────── 工具实现 ──────────────

    private List<Map<String, Object>> searchCompetitions(String keyword, String role) {
        Page<Competition> page = competitionService.getCompetitionsPage(1, 5, keyword, null, null,
                "admin".equalsIgnoreCase(role) ? null : "published");
        return page.getRecords().stream().map(this::competitionSummary).collect(Collectors.toList());
    }

    private Map<String, Object> getCompetitionDetail(Long competitionId, String role) {
        Competition competition = competitionService.getById(competitionId);
        if (competition == null) return Map.of("error", "赛事不存在");
        if (!"admin".equalsIgnoreCase(role) && !"published".equals(competition.getStatus())) {
            return Map.of("error", "无权查看未发布赛事");
        }
        CompetitionVO vo = competitionService.toVO(competition);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", vo.getId());
        result.put("name", vo.getName());
        result.put("level", vo.getLevel());
        result.put("category", vo.getCategory());
        result.put("organizer", vo.getOrganizer());
        result.put("startTime", vo.getStartTime());
        result.put("endTime", vo.getEndTime());
        result.put("status", vo.getStatus());
        result.put("maxTeamSize", vo.getMaxTeamSize());
        result.put("tags", vo.getTags());
        return result;
    }

    private List<?> getMyRegistrations(Long userId, String role) {
        requireRole(role, "student");
        return registrationService.getMyList(userId).stream().limit(10).collect(Collectors.toList());
    }

    private List<?> getMySubmissions(Long userId, String role) {
        requireRole(role, "student");
        return submissionService.listMySubmissions(userId).stream().limit(10).collect(Collectors.toList());
    }

    private List<?> getMyAwardProofs(Long userId, String role) {
        requireRole(role, "student");
        return awardProofService.listMyAwardProofs(userId, 1, 10).getRecords();
    }

    private Object getMyGrowth(Long userId, String role) {
        requireRole(role, "student");
        return growthRecordService.getStudentGrowth(userId);
    }

    private Map<String, Object> getMyComprehensiveScore(Long userId, String role) {
        requireRole(role, "student");
        User user = userService.getById(userId);
        if (user == null) {
            return Map.of("error", "user not found");
        }
        return comprehensiveRankSummary(comprehensiveScoreService.getLatestByStudentNo(user.getUsername()));
    }

    private List<Map<String, Object>> getMyParticipations(Long userId) {
        try {
            return activityService.listMyParticipations(userId).stream().limit(10)
                    .map(p -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", p.getId());
                        item.put("activityTitle", p.getActivityTitle());
                        item.put("activityType", p.getActivityType());
                        item.put("status", p.getStatus());
                        item.put("submitDate", p.getSubmitDate());
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) { return List.of(); }
    }

    private List<Map<String, Object>> getMyMessages(Long userId) {
        try {
            return messageService.getMyMessagesPage(userId, 1, 10).getRecords().stream()
                    .map(msg -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", msg.getId());
                        item.put("title", msg.getTitle());
                        item.put("content", truncate(msg.getContent(), 100));
                        item.put("isRead", msg.getIsRead());
                        item.put("createTime", msg.getCreateTime());
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) { return List.of(); }
    }

    private List<Map<String, Object>> getRecentAnnouncements() {
        try {
            return announcementService.listAnnouncements(1, 5, null, null).getRecords().stream()
                    .map(a -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", a.get("id"));
                        item.put("title", a.get("title"));
                        item.put("type", a.get("type"));
                        item.put("createTime", a.get("createTime"));
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) { return List.of(); }
    }

    private List<Map<String, Object>> searchStudents(String keyword, Long teacherId, String role) {
        requireRole(role, "teacher");
        if (keyword == null || keyword.isBlank()) return List.of();
        try {
            User teacher = userService.getById(teacherId);
            if (teacher == null || teacher.getCollege() == null || teacher.getCollege().isBlank()) {
                return List.of();
            }
            return userService.list(new LambdaQueryWrapper<User>()
                    .eq(User::getRole, "student")
                    .in(User::getCollege, collegeAliases(teacher.getCollege()))
                    .and(w -> w.like(User::getUsername, keyword)
                            .or().like(User::getRealName, keyword))
                    .last("LIMIT 8")).stream().map(student -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", student.getId());
                        item.put("realName", student.getRealName());
                        item.put("username", student.getUsername());
                        item.put("college", student.getCollege());
                        item.put("major", student.getMajor());
                        item.put("className", student.getClassName());
                        item.put("grade", student.getGrade());
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) { return List.of(); }
    }

    private Map<String, Object> getStudentDetailById(Long studentId, Long teacherId, String role) {
        requireRole(role, "teacher");
        if (studentId == null) return Map.of("error", "缺少 student_id");
        try {
            // 验证教师权限（同学院）
            User teacher = userService.getById(teacherId);
            User student = userService.getById(studentId);
            if (teacher == null || student == null) return Map.of("error", "用户不存在");
            if (teacher.getCollege() != null && !sameCollege(teacher.getCollege(), student.getCollege())) {
                return Map.of("error", "无权查看其他学院学生");
            }
            Map<String, Object> detail = teacherService.getStudentDetail(studentId);
            return detail != null ? detail : Map.of("error", "未找到学生详情");
        } catch (Exception e) { return Map.of("error", e.getMessage()); }
    }

    private Map<String, Object> getStudentComprehensiveScore(Long studentId, Long teacherId, String role) {
        requireRole(role, "teacher");
        if (studentId == null) return Map.of("error", "missing student_id");
        try {
            User teacher = userService.getById(teacherId);
            User student = userService.getById(studentId);
            if (teacher == null || student == null) return Map.of("error", "user not found");
            if (teacher.getCollege() != null && !sameCollege(teacher.getCollege(), student.getCollege())) {
                return Map.of("error", "no permission to view students from another college");
            }
            return comprehensiveRankSummary(teacherService.getStudentComprehensive(studentId));
        } catch (Exception e) { return Map.of("error", e.getMessage()); }
    }

    private Map<String, Object> findStudentComprehensiveScore(String keyword, Long teacherId, String role) {
        requireRole(role, "teacher");
        if (keyword == null || keyword.isBlank()) {
            return Map.of("error", "缺少 keyword");
        }
        User teacher = userService.getById(teacherId);
        if (teacher == null || teacher.getCollege() == null || teacher.getCollege().isBlank()) {
            return Map.of("error", "教师账号未绑定学院，无法查询学生综测");
        }
        List<User> students = userService.list(new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .in(User::getCollege, collegeAliases(teacher.getCollege()))
                .and(w -> w.eq(User::getUsername, keyword.trim())
                        .or().eq(User::getRealName, keyword.trim())
                        .or().like(User::getRealName, keyword.trim()))
                .last("LIMIT 6"));
        if (students.isEmpty()) {
            return Map.of("found", false, "message", "未在本学院找到该学生");
        }
        if (students.size() > 1) {
            List<Map<String, Object>> candidates = students.stream().map(student -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", student.getId());
                item.put("realName", student.getRealName());
                item.put("username", student.getUsername());
                item.put("className", student.getClassName());
                item.put("major", student.getMajor());
                return item;
            }).collect(Collectors.toList());
            return Map.of("found", false, "candidates", candidates, "message", "找到多个匹配学生，请指定学号或 student_id");
        }
        return comprehensiveRankSummary(comprehensiveScoreService.getLatestByStudentNo(students.get(0).getUsername()));
    }

    private Map<String, Object> getClassComprehensiveRanking(
            String className,
            String academicYear,
            String metric,
            Long teacherId,
            String role) {
        requireRole(role, "teacher");
        if (className == null || className.isBlank()) {
            return Map.of("error", "缺少 class_name");
        }
        User teacher = userService.getById(teacherId);
        if (teacher == null || teacher.getCollege() == null || teacher.getCollege().isBlank()) {
            return Map.of("error", "教师账号未绑定学院，无法查询班级排名");
        }

        String normalizedMetric = "academic".equalsIgnoreCase(metric) ? "academic" : "comprehensive";
        List<ComprehensiveScore> scores = comprehensiveScoreService.list(
                new LambdaQueryWrapper<ComprehensiveScore>()
                        .eq(ComprehensiveScore::getClassName, className.trim())
                        .eq(academicYear != null && !academicYear.isBlank(), ComprehensiveScore::getAcademicYear, academicYear)
                        .in(ComprehensiveScore::getCollege, collegeAliases(teacher.getCollege()))
                        .orderByDesc(ComprehensiveScore::getAcademicYear)
        );

        Map<String, ComprehensiveScore> latestByStudentNo = new LinkedHashMap<>();
        for (ComprehensiveScore score : scores) {
            latestByStudentNo.putIfAbsent(score.getStudentNo(), score);
        }
        List<ComprehensiveScore> latestScores = new ArrayList<>(latestByStudentNo.values());
        latestScores.sort(scoreComparator(normalizedMetric));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < latestScores.size(); i++) {
            ComprehensiveScore score = latestScores.get(i);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("序号", i + 1);
            row.put("姓名", score.getRealName());
            row.put("学号", score.getStudentNo());
            row.put("班级", score.getClassName());
            row.put("专业", displayMajor(score.getMajor()));
            row.put("学业成绩", score.getAcademicScore());
            row.put("学业名次", score.getAcademicRank());
            row.put("综测分", score.getComprehensiveScore());
            row.put("综测名次", score.getComprehensiveRank());
            row.put("综测百分比", percentText(score.getComprehensiveRankPercent()));
            rows.add(row);
        }

        String title = className.trim() + ("academic".equals(normalizedMetric) ? "学业成绩排名" : "综测排名");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type", "table");
        result.put("title", title);
        result.put("description", "按官方" + ("academic".equals(normalizedMetric) ? "学业成绩名次" : "综测名次") + "升序排列，聊天区仅显示摘要，完整表格请点“查看详细”。");
        result.put("academicYear", latestScores.isEmpty() ? academicYear : latestScores.get(0).getAcademicYear());
        result.put("className", className.trim());
        result.put("metric", normalizedMetric);
        result.put("total", rows.size());
        result.put("columns", List.of("序号", "姓名", "学号", "班级", "专业", "学业成绩", "学业名次", "综测分", "综测名次", "综测百分比"));
        result.put("previewRows", rows.stream().limit(5).collect(Collectors.toList()));
        result.put("rows", rows);
        result.put("scopeNote", "该数据来自官方综测导入表。学业成绩字段不是教务 GPA，仅可作为绩点/学业表现参考。");
        return result;
    }

    private List<Map<String, Object>> getPendingReviews(int limit) {
        try {
            return reviewTaskService.listTasks(1, Math.min(limit, 10), "pending", null, null, null)
                    .getRecords().stream().map(task -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", task.getId());
                        item.put("title", task.getTitle());
                        item.put("targetType", task.getTargetType());
                        item.put("submitterName", task.getSubmitterName());
                        item.put("deadline", task.getDeadline());
                        item.put("createTime", task.getCreateTime());
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) { return List.of(); }
    }

    private Map<String, Object> getCollegeOverview() {
        try { return teacherService.getCollegeOverview(null, null, null); }
        catch (Exception e) { return Map.of(); }
    }

    private List<Map<String, Object>> getAwardProofAuditList() {
        try {
            return awardProofService.listAuditAwardProofs(null, "teacher", 1, 5, "pending")
                    .getRecords().stream().map(proof -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", proof.getId());
                        item.put("competitionName", proof.getCompetitionName());
                        item.put("awardLevel", proof.getAwardLevel());
                        item.put("submitterName", proof.getSubmitterName());
                        item.put("confidence", proof.getConfidence());
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) { return List.of(); }
    }

    private List<Map<String, Object>> getPendingDrafts() {
        try {
            return aiCompetitionDraftService.list(new LambdaQueryWrapper<AiCompetitionDraft>()
                    .eq(AiCompetitionDraft::getStatus, "pending_review")
                    .orderByDesc(AiCompetitionDraft::getCreateTime)
                    .last("LIMIT 5")).stream().map(draft -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", draft.getId());
                item.put("name", draft.getName());
                item.put("level", draft.getLevel());
                item.put("sourceType", draft.getSourceType());
                return item;
            }).collect(Collectors.toList());
        } catch (Exception e) { return List.of(); }
    }

    private Map<String, Object> getAiTaskStats() {
        try {
            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("running", aiTaskService.count(new LambdaQueryWrapper<AiTask>().eq(AiTask::getStatus, "running")));
            stats.put("failed", aiTaskService.count(new LambdaQueryWrapper<AiTask>().eq(AiTask::getStatus, "failed")));
            stats.put("succeeded", aiTaskService.count(new LambdaQueryWrapper<AiTask>().eq(AiTask::getStatus, "succeeded")));
            return stats;
        } catch (Exception e) { return Map.of(); }
    }

    private Map<String, Object> getUserStats() {
        try { return userService.getUserStats(); }
        catch (Exception e) { return Map.of(); }
    }

    private Map<String, Object> createExcelArtifact(Map<String, Object> args) {
        AiArtifactVO artifact = aiArtifactService.createExcelArtifact(
                toText(args.get("title")),
                toText(args.get("description")),
                toStringList(args.get("columns")),
                toRows(args.get("rows")),
                toText(args.get("sheet_name"))
        );
        return Map.of(
                "artifact", artifact,
                "message", "Excel 文件已生成，可通过 artifact.url 下载"
        );
    }

    private Map<String, Object> createDocxArtifact(Map<String, Object> args) {
        AiArtifactVO artifact = aiArtifactService.createDocxArtifact(
                toText(args.get("title")),
                toText(args.get("description")),
                toStringList(args.get("paragraphs")),
                toStringList(args.get("table_columns")),
                toRows(args.get("table_rows"))
        );
        return Map.of(
                "artifact", artifact,
                "message", "DOCX 文件已生成，可通过 artifact.url 下载"
        );
    }

    // ────────────── 工具方法 ──────────────

    private Map<String, Object> tool(String name, String description, Map<String, Object> parameters) {
        Map<String, Object> function = new LinkedHashMap<>();
        function.put("name", name);
        function.put("description", description);
        function.put("parameters", withStrictObjectParameters(parameters));
        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("type", "function");
        tool.put("function", function);
        return tool;
    }

    private Map<String, Object> withStrictObjectParameters(Map<String, Object> parameters) {
        Map<String, Object> strict = new LinkedHashMap<>(parameters);
        if ("object".equals(strict.get("type"))) {
            strict.putIfAbsent("additionalProperties", false);
        }
        return strict;
    }

    private Map<String, Object> competitionSummary(Competition c) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", c.getId());
        item.put("name", c.getName());
        item.put("level", c.getLevel());
        item.put("category", c.getCategory());
        item.put("organizer", c.getOrganizer());
        item.put("endTime", c.getEndTime());
        item.put("status", c.getStatus());
        return item;
    }

    private Map<String, Object> comprehensiveRankSummary(ComprehensiveScoreVO score) {
        if (score == null) {
            return Map.of("found", false);
        }
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("found", true);
        item.put("academicYear", score.getAcademicYear());
        item.put("comprehensiveRank", score.getComprehensiveRank());
        item.put("rankTotal", score.getRankTotal());
        item.put("comprehensiveRankPercent", score.getComprehensiveRankPercent());
        item.put("rankScope", score.getRankScope());
        item.put("scopeNote", "该官方综测排名仅限学生所在年级和专业范围，不要按全校重新计算。");
        return item;
    }

    private Comparator<ComprehensiveScore> scoreComparator(String metric) {
        Function<ComprehensiveScore, Integer> rankExtractor = "academic".equals(metric)
                ? ComprehensiveScore::getAcademicRank
                : ComprehensiveScore::getComprehensiveRank;
        Function<ComprehensiveScore, BigDecimal> scoreExtractor = "academic".equals(metric)
                ? ComprehensiveScore::getAcademicScore
                : ComprehensiveScore::getComprehensiveScore;
        Comparator<ComprehensiveScore> byOfficialRank = Comparator.comparing(
                rankExtractor,
                Comparator.nullsLast(Comparator.naturalOrder()));
        Comparator<ComprehensiveScore> byScore = Comparator.comparing(
                scoreExtractor,
                Comparator.nullsLast(Comparator.reverseOrder()));
        return byOfficialRank.thenComparing(byScore).thenComparing(ComprehensiveScore::getStudentNo);
    }

    private String percentText(BigDecimal value) {
        if (value == null) {
            return "";
        }
        return String.format(Locale.ROOT, "%.1f%%", value.doubleValue() * 100.0);
    }

    // 学院匹配交给 StudentAccessPolicy——助手能查到的学生必须与教师在页面上
    // 查到的完全一致，两边各维护一套别名规则时并非如此

    private boolean sameCollege(String left, String right) {
        return studentAccessPolicy.sameCollege(left, right);
    }

    private List<String> collegeAliases(String college) {
        return studentAccessPolicy.collegeAliases(college);
    }

    private String displayMajor(String major) {
        return "软件工程(创新班)".equals(major) ? "软件工程" : major;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseArgs(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try { return JSONUtil.toBean(json, Map.class); }
        catch (Exception e) { return Map.of(); }
    }

    private String toJson(Object obj) {
        return JSONUtil.toJsonStr(obj);
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).longValue();
        try { return Long.parseLong(value.toString()); } catch (Exception e) { return null; }
    }

    private int toInt(Object value) {
        if (value == null) return 5;
        if (value instanceof Number) return ((Number) value).intValue();
        try { return Integer.parseInt(value.toString()); } catch (Exception e) { return 5; }
    }

    private String toText(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private List<String> toStringList(Object value) {
        if (!(value instanceof List<?> list)) return List.of();
        return list.stream().map(this::toText).collect(Collectors.toList());
    }

    private List<List<String>> toRows(Object value) {
        if (!(value instanceof List<?> rows)) return List.of();
        return rows.stream()
                .filter(item -> item instanceof List<?>)
                .map(item -> ((List<?>) item).stream().map(this::toText).collect(Collectors.toList()))
                .collect(Collectors.toList());
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }

    private void requireRole(String actual, String expected) {
        if (!expected.equalsIgnoreCase(actual)) {
            throw new BusinessException(403, "当前角色无权使用该工具");
        }
    }

    private Map<String, Object> studentFeature(Supplier<Map<String, Object>> action, String role) {
        requireRole(role, "student");
        return action.get();
    }

    private Map<String, Object> precheckPayload(Map<String, Object> args) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("projectName", args.getOrDefault("project_name", ""));
        payload.put("mentorName", args.getOrDefault("mentor_name", ""));
        payload.put("teamMemberCount", args.getOrDefault("team_member_count", 1));
        payload.put("attachments", args.getOrDefault("attachments", List.of()));
        return payload;
    }

    private Map<String, Object> roleFeature(Supplier<Map<String, Object>> action, String role, String expected) {
        requireRole(role, expected);
        return action.get();
    }
}
