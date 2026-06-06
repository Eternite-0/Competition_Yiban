package com.etsaion.service.ai;

import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.entity.*;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.*;
import com.etsaion.vo.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * AI 工具注册中心。
 * 负责：1) 向模型声明可用工具定义  2) 根据模型请求执行对应工具
 */
@Service
public class AssistantToolRegistry {

    @Autowired private CompetitionService competitionService;
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
            tools.add(tool("get_my_participations", "查看当前学生参与的活动记录", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_my_messages", "查看当前学生的站内消息", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_announcements", "查看平台最新公告", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
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
            tools.add(tool("get_pending_reviews", "查看待审核的任务列表", Map.of(
                    "type", "object",
                    "properties", Map.of("limit", Map.of("type", "integer", "description", "返回条数，默认5")),
                    "required", List.of()
            )));
            tools.add(tool("get_college_overview", "查看学院参赛总览数据", Map.of(
                    "type", "object", "properties", Map.of(), "required", List.of())));
            tools.add(tool("get_award_proof_audit", "查看待审核的获奖证明", Map.of(
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
        }

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
                case "get_my_participations" -> toJson(getMyParticipations(userId));
                case "get_my_messages" -> toJson(getMyMessages(userId));
                case "get_announcements" -> toJson(getRecentAnnouncements());
                case "search_students" -> toJson(searchStudents(
                        (String) args.getOrDefault("keyword", "")));
                case "get_student_detail" -> toJson(getStudentDetailById(toLong(args.get("student_id")), userId));
                case "get_pending_reviews" -> toJson(getPendingReviews(
                        toInt(args.getOrDefault("limit", 5))));
                case "get_college_overview" -> toJson(getCollegeOverview());
                case "get_award_proof_audit" -> toJson(getAwardProofAuditList());
                case "get_pending_drafts" -> toJson(getPendingDrafts());
                case "get_ai_task_stats" -> toJson(getAiTaskStats());
                case "get_user_stats" -> toJson(getUserStats());
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

    private List<Map<String, Object>> searchStudents(String keyword) {
        if (keyword == null || keyword.isBlank()) return List.of();
        try {
            return teacherService.listStudentsPage(1, 8, keyword, null, null, null, null)
                    .getRecords().stream().map(student -> {
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

    private Map<String, Object> getStudentDetailById(Long studentId, Long teacherId) {
        if (studentId == null) return Map.of("error", "缺少 student_id");
        try {
            // 验证教师权限（同学院）
            User teacher = userService.getById(teacherId);
            User student = userService.getById(studentId);
            if (teacher == null || student == null) return Map.of("error", "用户不存在");
            if (teacher.getCollege() != null && !teacher.getCollege().equals(student.getCollege())) {
                return Map.of("error", "无权查看其他学院学生");
            }
            Map<String, Object> detail = teacherService.getStudentDetail(studentId);
            return detail != null ? detail : Map.of("error", "未找到学生详情");
        } catch (Exception e) { return Map.of("error", e.getMessage()); }
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

    // ────────────── 工具方法 ──────────────

    private Map<String, Object> tool(String name, String description, Map<String, Object> parameters) {
        Map<String, Object> function = new LinkedHashMap<>();
        function.put("name", name);
        function.put("description", description);
        function.put("parameters", parameters);
        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("type", "function");
        tool.put("function", function);
        return tool;
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

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }

    private void requireRole(String actual, String expected) {
        if (!expected.equalsIgnoreCase(actual)) {
            throw new BusinessException(403, "当前角色无权使用该工具");
        }
    }
}
