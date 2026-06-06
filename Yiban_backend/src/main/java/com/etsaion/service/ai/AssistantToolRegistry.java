package com.etsaion.service.ai;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.entity.Competition;
import com.etsaion.entity.AiCompetitionDraft;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.AwardProofService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.UserService;
import com.etsaion.vo.CompetitionVO;
import com.etsaion.vo.StudentGrowthVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

    public Map<String, Object> buildToolContext(Long userId, String role, String message) {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("updatedAt", LocalDateTime.now().toString());
        context.put("competitions", searchCompetitions(message, role));
        if ("student".equalsIgnoreCase(role)) {
            context.put("registrations", getMyRegistrations(userId, role));
            context.put("submissions", getMySubmissions(userId, role));
            context.put("awardProofs", getMyAwardProofs(userId, role));
            context.put("growth", getStudentGrowth(userId, role, userId));
        } else if ("teacher".equalsIgnoreCase(role) || "admin".equalsIgnoreCase(role)) {
            context.put("reviewSummary", getReviewSummary(role));
        }
        if ("admin".equalsIgnoreCase(role)) {
            context.put("draftCompetitionSummary", getDraftCompetitionSummary(role));
        }
        return context;
    }

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
        if (!"admin".equalsIgnoreCase(role) && !"published".equalsIgnoreCase(competition.getStatus())) {
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

    public Object getMyRegistrations(Long userId, String role) {
        requireRole(role, "student");
        return registrationService.getMyList(userId).stream().limit(5).collect(Collectors.toList());
    }

    public Object getMySubmissions(Long userId, String role) {
        requireRole(role, "student");
        return submissionService.listMySubmissions(userId).stream().limit(5).collect(Collectors.toList());
    }

    public Object getMyAwardProofs(Long userId, String role) {
        requireRole(role, "student");
        return awardProofService.listMyAwardProofs(userId, 1, 5).getRecords();
    }

    public Map<String, Object> getReviewSummary(String role) {
        if (!"teacher".equalsIgnoreCase(role) && !"admin".equalsIgnoreCase(role)) {
            throw new BusinessException(403, "无权查看审核统计");
        }
        return reviewTaskService.getStats();
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

    public Map<String, Object> getDraftCompetitionSummary(String role) {
        requireRole(role, "admin");
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("pendingReview", aiCompetitionDraftService.count(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<AiCompetitionDraft>()
                        .eq(AiCompetitionDraft::getStatus, "pending_review")));
        summary.put("confirmed", aiCompetitionDraftService.count(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<AiCompetitionDraft>()
                        .eq(AiCompetitionDraft::getStatus, "confirmed")));
        summary.put("ignored", aiCompetitionDraftService.count(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<AiCompetitionDraft>()
                        .eq(AiCompetitionDraft::getStatus, "ignored")));
        return summary;
    }

    public Object getAiTaskStatus(Long userId, String role, Long taskId) {
        return aiTaskService.getVisibleTask(taskId, userId, role);
    }

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
}
