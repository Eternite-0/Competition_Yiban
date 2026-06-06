package com.etsaion.service.ai;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.entity.*;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.*;
import com.etsaion.service.ai.AiCompetitionDraftService;
import com.etsaion.service.ai.AiTaskService;
import com.etsaion.vo.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AssistantToolRegistry {

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private RegistrationService registrationService;

    @Autowired
    private SubmissionService submissionService;

    @Autowired
    private AwardProofService awardProofService;

    @Autowired
    private ReviewTaskService reviewTaskService;

    @Autowired
    private GrowthRecordService growthRecordService;

    @Autowired
    private UserService userService;

    @Autowired
    private AiTaskService aiTaskService;

    @Autowired
    private AiCompetitionDraftService aiCompetitionDraftService;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private MessageService messageService;

    @Autowired
    private AnnouncementService announcementService;

    @Autowired
    private TeacherService teacherService;

    public Map<String, Object> buildToolContext(Long userId, String role, String message) {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("updatedAt", LocalDateTime.now().toString());
        context.put("competitions", searchCompetitions(message, role));

        if ("student".equalsIgnoreCase(role)) {
            buildStudentContext(context, userId, role);
        } else if ("teacher".equalsIgnoreCase(role)) {
            buildTeacherContext(context, userId, role);
        } else if ("admin".equalsIgnoreCase(role)) {
            buildAdminContext(context, userId, role);
        }

        return context;
    }

    // ────────────── 学生上下文 ──────────────

    private void buildStudentContext(Map<String, Object> context, Long userId, String role) {
        // 原有
        context.put("registrations", getMyRegistrations(userId, role));
        context.put("submissions", getMySubmissions(userId, role));
        context.put("awardProofs", getMyAwardProofs(userId, role));
        context.put("growth", getStudentGrowth(userId, role, userId));
        // 新增
        context.put("growthTimeline", getGrowthTimeline(userId));
        context.put("participations", getMyParticipations(userId));
        context.put("messages", getMyMessages(userId));
        context.put("unreadCount", getUnreadCount(userId));
        context.put("announcements", getRecentAnnouncements());
    }

    // ────────────── 教师上下文 ──────────────

    private void buildTeacherContext(Map<String, Object> context, Long userId, String role) {
        // 原有
        context.put("reviewSummary", getReviewSummary(role));
        // 新增
        context.put("pendingReviews", getPendingReviews());
        context.put("awardProofAudit", getAwardProofAuditList());
        context.put("collegeOverview", getCollegeOverview());
        context.put("dashboard", getTeacherDashboard());
    }

    // ────────────── 管理员上下文 ──────────────

    private void buildAdminContext(Map<String, Object> context, Long userId, String role) {
        // 原有
        context.put("reviewSummary", getReviewSummary(role));
        context.put("draftCompetitionSummary", getDraftCompetitionSummary(role));
        // 新增
        context.put("pendingDrafts", getPendingDrafts());
        context.put("aiTaskStats", getAiTaskStats());
        context.put("userStats", getUserStats());
        context.put("announcements", getRecentAnnouncements());
        context.put("pendingReviews", getPendingReviews());
    }

    // ────────────── 赛事搜索 ──────────────

    public List<Map<String, Object>> searchCompetitions(String keyword, String role) {
        Page<Competition> page = competitionService.getCompetitionsPage(1, 5, keyword, null, null,
                "admin".equalsIgnoreCase(role) ? null : "published");
        return page.getRecords().stream().map(this::competitionSummary).collect(Collectors.toList());
    }

    public Map<String, Object> getCompetitionDetail(Long competitionId, String role) {
        Competition competition = competitionService.getById(competitionId);
        if (competition == null) {
            throw new BusinessException("赛事不存在");
        }
        if (!"admin".equalsIgnoreCase(role) && !"published".equals(competition.getStatus())) {
            throw new BusinessException(403, "无权查看未发布赛事");
        }
        CompetitionVO vo = competitionService.toVO(competition);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", vo.getId());
        result.put("name", vo.getName());
        result.put("level", vo.getLevel());
        result.put("category", vo.getCategory());
        result.put("organizer", vo.getOrganizer());
        result.put("endTime", vo.getEndTime());
        result.put("status", vo.getStatus());
        return result;
    }

    // ────────────── 学生数据方法 ──────────────

    public Object getMyRegistrations(Long userId, String role) {
        requireRole(role, "student");
        return registrationService.getMyList(userId).stream().limit(8).collect(Collectors.toList());
    }

    public Object getMySubmissions(Long userId, String role) {
        requireRole(role, "student");
        return submissionService.listMySubmissions(userId).stream().limit(8).collect(Collectors.toList());
    }

    public Object getMyAwardProofs(Long userId, String role) {
        requireRole(role, "student");
        return awardProofService.listMyAwardProofs(userId, 1, 8).getRecords();
    }

    public StudentGrowthVO getStudentGrowth(Long currentUserId, String role, Long studentId) {
        Long targetId = studentId == null ? currentUserId : studentId;
        if ("student".equalsIgnoreCase(role) && !currentUserId.equals(targetId)) {
            throw new BusinessException(403, "学生只能查看自己的成长档案");
        }
        if ("teacher".equalsIgnoreCase(role)) {
            User teacher = userService.getById(currentUserId);
            User student = userService.getById(targetId);
            if (teacher == null || student == null || teacher.getCollege() == null
                    || !teacher.getCollege().equals(student.getCollege())) {
                throw new BusinessException(403, "无权查看其他学院学生的成长档案");
            }
        }
        return growthRecordService.getStudentGrowth(targetId);
    }

    private List<Map<String, Object>> getGrowthTimeline(Long userId) {
        try {
            return growthRecordService.getTimelinePage(userId, 1, 5).getRecords().stream()
                    .map(record -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", record.getId());
                        item.put("title", record.getTitle());
                        item.put("recordType", record.getRecordType());
                        item.put("happenTime", record.getHappenTime());
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<Map<String, Object>> getMyParticipations(Long userId) {
        try {
            return activityService.listMyParticipations(userId).stream().limit(5)
                    .map(p -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", p.getId());
                        item.put("activityTitle", p.getActivityTitle());
                        item.put("activityType", p.getActivityType());
                        item.put("status", p.getStatus());
                        item.put("submitDate", p.getSubmitDate());
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<Map<String, Object>> getMyMessages(Long userId) {
        try {
            return messageService.getMyMessagesPage(userId, 1, 5).getRecords().stream()
                    .map(msg -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", msg.getId());
                        item.put("title", msg.getTitle());
                        item.put("content", truncate(msg.getContent(), 80));
                        item.put("isRead", msg.getIsRead());
                        item.put("createTime", msg.getCreateTime());
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }

    private int getUnreadCount(Long userId) {
        try {
            return (int) messageService.getMyMessages(userId).stream()
                    .filter(m -> m.getIsRead() == null || m.getIsRead() == 0)
                    .count();
        } catch (Exception e) {
            return 0;
        }
    }

    private List<Map<String, Object>> getRecentAnnouncements() {
        try {
            return announcementService.listAnnouncements(1, 3, null, null).getRecords().stream()
                    .map(a -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", a.get("id"));
                        item.put("title", a.get("title"));
                        item.put("type", a.get("type"));
                        item.put("createTime", a.get("createTime"));
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }

    // ────────────── 教师数据方法 ──────────────

    public Map<String, Object> getReviewSummary(String role) {
        if (!"teacher".equalsIgnoreCase(role) && !"admin".equalsIgnoreCase(role)) {
            throw new BusinessException(403, "无权查看审核统计");
        }
        return reviewTaskService.getStats();
    }

    private List<Map<String, Object>> getPendingReviews() {
        try {
            return reviewTaskService.listTasks(1, 5, "pending", null, null, null)
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
        } catch (Exception e) {
            return List.of();
        }
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
                        item.put("status", proof.getStatus());
                        return item;
                    }).collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, Object> getCollegeOverview() {
        try {
            return teacherService.getCollegeOverview(null, null, null);
        } catch (Exception e) {
            return Map.of();
        }
    }

    private Map<String, Object> getTeacherDashboard() {
        try {
            return teacherService.getDashboardStats(null, null, null, null);
        } catch (Exception e) {
            return Map.of();
        }
    }

    // ────────────── 管理员数据方法 ──────────────

    public Map<String, Object> getDraftCompetitionSummary(String role) {
        requireRole(role, "admin");
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("pendingReview", aiCompetitionDraftService.count(
                new LambdaQueryWrapper<AiCompetitionDraft>()
                        .eq(AiCompetitionDraft::getStatus, "pending_review")));
        summary.put("confirmed", aiCompetitionDraftService.count(
                new LambdaQueryWrapper<AiCompetitionDraft>()
                        .eq(AiCompetitionDraft::getStatus, "confirmed")));
        summary.put("ignored", aiCompetitionDraftService.count(
                new LambdaQueryWrapper<AiCompetitionDraft>()
                        .eq(AiCompetitionDraft::getStatus, "ignored")));
        return summary;
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
                item.put("createTime", draft.getCreateTime());
                return item;
            }).collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, Object> getAiTaskStats() {
        try {
            long running = aiTaskService.count(new LambdaQueryWrapper<AiTask>()
                    .eq(AiTask::getStatus, "running"));
            long failed = aiTaskService.count(new LambdaQueryWrapper<AiTask>()
                    .eq(AiTask::getStatus, "failed"));
            long succeeded = aiTaskService.count(new LambdaQueryWrapper<AiTask>()
                    .eq(AiTask::getStatus, "succeeded"));
            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("running", running);
            stats.put("failed", failed);
            stats.put("succeeded", succeeded);
            return stats;
        } catch (Exception e) {
            return Map.of();
        }
    }

    private Map<String, Object> getUserStats() {
        try {
            return userService.getUserStats();
        } catch (Exception e) {
            return Map.of();
        }
    }

    public Object getAiTaskStatus(Long userId, String role, Long taskId) {
        return aiTaskService.getVisibleTask(taskId, userId, role);
    }

    // ────────────── 工具方法 ──────────────

    private Map<String, Object> competitionSummary(Competition competition) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", competition.getId());
        item.put("name", competition.getName());
        item.put("level", competition.getLevel());
        item.put("category", competition.getCategory());
        item.put("organizer", competition.getOrganizer());
        item.put("endTime", competition.getEndTime());
        item.put("status", competition.getStatus());
        return item;
    }

    private void requireRole(String actual, String expected) {
        if (!expected.equalsIgnoreCase(actual)) {
            throw new BusinessException(403, "当前角色无权使用该工具");
        }
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
