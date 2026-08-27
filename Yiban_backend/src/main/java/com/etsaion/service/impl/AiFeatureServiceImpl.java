package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.entity.Competition;
import com.etsaion.entity.Registration;
import com.etsaion.entity.ReviewTask;
import com.etsaion.entity.TeamPost;
import com.etsaion.entity.User;
import com.etsaion.service.ai.AiFeatureService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.AwardProofService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.TeamPostService;
import com.etsaion.service.TeacherService;
import com.etsaion.service.UserService;
import com.etsaion.vo.RegistrationVO;
import com.etsaion.vo.TeamVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

/** Deterministic, explainable AI feature orchestration.
 *
 * <p>The scoring layer deliberately stays explainable and safe: the model can
 * summarize these facts in chat, while business data is always read from the
 * database and no registration is submitted automatically.</p>
 */
@Service
public class AiFeatureServiceImpl implements AiFeatureService {

    @Autowired private UserService userService;
    @Autowired private CompetitionService competitionService;
    @Autowired private RegistrationService registrationService;
    @Autowired private AwardProofService awardProofService;
    @Autowired private TeamPostService teamPostService;
    @Autowired private ReviewTaskService reviewTaskService;
    @Autowired private TeacherService teacherService;

    @Override
    public Map<String, Object> recommendCompetitions(Long userId) {
        User user = userService.getById(userId);
        if (user == null) return Map.of("profile", Map.of(), "recommendations", List.of());

        List<RegistrationVO> history = safeRegistrations(userId);
        List<?> awards = safeAwards(userId);
        Set<String> historyCategories = history.stream()
                .map(RegistrationVO::getCompetitionCategory)
                .filter(StrUtil::isNotBlank)
                .map(this::normalize)
                .collect(Collectors.toSet());
        Page<Competition> page = competitionService.getCompetitionsPage(1, 50, null, null, null, "published");
        LocalDateTime now = LocalDateTime.now();
        List<Map<String, Object>> recommendations = new ArrayList<>();
        for (Competition competition : page.getRecords()) {
            if (competition.getEndTime() != null && competition.getEndTime().isBefore(now)) continue;
            if (history.stream().anyMatch(item -> Objects.equals(item.getCompetitionId(), competition.getId()))) continue;

            String searchable = normalize(String.join(" ", nullToEmpty(competition.getName()),
                    nullToEmpty(competition.getCategory()), nullToEmpty(competition.getTags()),
                    nullToEmpty(competition.getTracks()), nullToEmpty(competition.getContent())));
            int score = 30;
            List<String> reasons = new ArrayList<>();
            String major = StrUtil.blankToDefault(user.getMajor(), "你的专业");
            if (StrUtil.isNotBlank(user.getMajor()) && searchable.contains(normalize(user.getMajor()))) {
                score += 35;
                reasons.add("与你的" + major + "专业匹配");
            } else if (major.contains("软件") && containsAny(searchable, "软件", "程序", "web", "ai", "人工智能", "信息")) {
                score += 28;
                reasons.add("赛事方向与你的专业能力相近");
            } else if (containsAny(searchable, "创新", "创业", "科技")) {
                score += 12;
                reasons.add("属于科技创新方向，适合积累竞赛经历");
            }
            if (!historyCategories.isEmpty() && historyCategories.stream().anyMatch(searchable::contains)) {
                score += 18;
                reasons.add("你曾参加过同类赛事");
            }
            if (!awards.isEmpty() && containsAny(searchable, "创新", "科技", "创业", "设计", "程序")) {
                score += 8;
                reasons.add("你的获奖经历与该方向有一定关联");
            }
            if (competition.getEndTime() != null) {
                long days = Math.max(0, Duration.between(now, competition.getEndTime()).toDays());
                if (days <= 30) {
                    score += 10;
                    reasons.add("当前仍处于报名阶段");
                }
                if (days >= 7) {
                    score += 5;
                    reasons.add("距截止还有" + days + "天，准备时间充足");
                }
            }
            score = Math.min(99, Math.max(45, score));
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("competitionId", competition.getId());
            item.put("name", competition.getName());
            item.put("level", competition.getLevel());
            item.put("category", competition.getCategory());
            item.put("fitScore", score);
            item.put("daysLeft", daysLeft(now, competition.getEndTime()));
            item.put("deadline", competition.getEndTime());
            item.put("reasons", reasons.isEmpty() ? List.of("当前开放报名，可作为新的参赛方向") : reasons.stream().limit(3).collect(Collectors.toList()));
            item.put("actions", Map.of("detail", "/student/competitions/" + competition.getId(), "register", "/student/registrations/workbench/" + competition.getId()));
            recommendations.add(item);
        }
        recommendations.sort((a, b) -> Integer.compare((Integer) b.get("fitScore"), (Integer) a.get("fitScore")));
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("major", nullToEmpty(user.getMajor()));
        profile.put("grade", nullToEmpty(user.getGrade()));
        profile.put("historyCount", history.size());
        profile.put("awardCount", awards.size());
        profile.put("signals", List.of("专业", "年级", "历史参赛", "报名截止时间"));
        return Map.of("profile", profile, "recommendations", recommendations.stream().limit(6).collect(Collectors.toList()), "generatedAt", now);
    }

    @Override
    public Map<String, Object> precheckMaterials(Long userId, Long competitionId, Map<String, Object> payload) {
        Competition competition = competitionService.getById(competitionId);
        if (competition == null) return Map.of("error", "赛事不存在");
        Map<String, Object> input = payload == null ? Map.of() : payload;
        List<Map<String, Object>> issues = new ArrayList<>();
        List<String> attachments = readStrings(input.get("attachments"));
        String projectName = text(input.get("projectName"));
        String mentorName = text(input.get("mentorName"));
        int teamCount = number(input.get("teamMemberCount"), 1);
        int requiredMin = number(input.get("requiredTeamMin"), competition.getMaxTeamSize() != null && competition.getMaxTeamSize() > 1 ? 3 : 1);

        if (StrUtil.isBlank(projectName)) issue(issues, "project_name", "缺少作品名称", "请填写报名作品或项目名称");
        if (StrUtil.isBlank(mentorName)) issue(issues, "mentor", "指导教师未完整", "请补充指导教师信息");
        if (attachments.isEmpty()) issue(issues, "attachment", "缺少项目计划书", "比赛材料建议上传 PDF 项目计划书");
        else if (attachments.stream().noneMatch(name -> name.toLowerCase(Locale.ROOT).endsWith(".pdf"))) issue(issues, "format", "附件格式待确认", "赛事要求的核心计划书建议使用 PDF 格式");
        if (requiredMin > 1 && teamCount < requiredMin) issue(issues, "team_size", "团队人数不足", "当前" + teamCount + "人，建议至少" + requiredMin + "人");
        if (competition.getEndTime() != null) {
            long days = daysLeft(LocalDateTime.now(), competition.getEndTime());
            if (days >= 0 && days <= 3) issue(issues, "deadline", "截止日期临近", "距报名截止仅剩" + days + "天，请尽快提交");
        }
        int total = 5;
        int completeness = Math.max(0, Math.round((total - issues.stream().filter(i -> !"deadline".equals(i.get("code"))).count()) * 100f / total));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("competitionId", competitionId);
        result.put("competitionName", competition.getName());
        result.put("completeness", completeness);
        result.put("issueCount", issues.size());
        result.put("issues", issues);
        result.put("ready", issues.stream().noneMatch(i -> Set.of("project_name", "attachment", "team_size", "mentor", "format").contains(i.get("code"))));
        result.put("checkedAt", LocalDateTime.now());
        result.put("hint", issues.isEmpty() ? "材料完整，可以进入人工确认提交" : "建议先修复以上问题，再进行人工提交");
        return result;
    }

    @Override
    public Map<String, Object> matchTeamMembers(Long userId, Long competitionId, String desiredRole) {
        if (competitionId == null) return Map.of("error", "缺少赛事ID", "matches", List.of());
        User current = userService.getById(userId);
        Page<TeamVO> page = teamPostService.listTeamPostsPage(1, 50, competitionId, "招募中");
        List<Map<String, Object>> matches = new ArrayList<>();
        String role = StrUtil.blankToDefault(desiredRole, "技能互补");
        for (TeamVO post : page.getRecords()) {
            if (Objects.equals(post.getAuthorId(), userId)) continue;
            User author = userService.getById(post.getAuthorId());
            if (author == null) continue;
            String profile = normalize(String.join(" ", nullToEmpty(author.getMajor()), nullToEmpty(post.getContent()), String.join(" ", post.getRolesNeeded() == null ? List.of() : post.getRolesNeeded())));
            int score = containsAny(normalize(role), profile) || containsAny(profile, "设计", "前端", "ui", "产品") ? 88 : 66;
            if (StrUtil.isNotBlank(current == null ? null : current.getMajor()) && !normalize(current.getMajor()).equals(normalize(author.getMajor()))) score += 6;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("postId", post.getId());
            item.put("studentId", post.getAuthorId());
            item.put("studentName", post.getAuthorName());
            item.put("major", author.getMajor());
            item.put("skillTags", post.getRolesNeeded() == null ? List.of("跨专业协作") : post.getRolesNeeded());
            item.put("matchScore", Math.min(score, 98));
            item.put("matchReason", "技能互补度高，目前未加入该赛事队伍");
            item.put("postContent", post.getContent());
            matches.add(item);
        }
        matches.sort((a, b) -> Integer.compare((Integer) b.get("matchScore"), (Integer) a.get("matchScore")));
        return Map.of("competitionId", competitionId, "desiredRole", role, "matches", matches.stream().limit(8).collect(Collectors.toList()), "hint", matches.isEmpty() ? "暂无符合条件的公开招募，可先发布自己的需求" : "推荐结果仅供参考，请通过平台申请并由队长确认");
    }

    @Override
    public Map<String, Object> teacherCockpit(Long teacherId) {
        User teacher = userService.getById(teacherId);
        String college = teacher == null ? null : teacher.getCollege();
        Map<String, Object> stats = safeMap(() -> teacherService.getDashboardStats(college, null, null, null));
        Page<?> pending = null;
        try {
            pending = reviewTaskService.listTasks(1, 50, "pending", null, null, null);
        } catch (Exception ignored) {
            // AI cockpit should still render the dashboard shell when the review queue is unavailable.
        }
        List<?> records = pending == null ? List.of() : pending.getRecords();
        long urgent = records.stream().filter(item -> item instanceof com.etsaion.vo.ReviewTaskVO && ((com.etsaion.vo.ReviewTaskVO) item).getDeadline() != null && ((com.etsaion.vo.ReviewTaskVO) item).getDeadline().isBefore(LocalDateTime.now().plusDays(1))).count();
        List<Map<String, Object>> todos = new ArrayList<>();
        todos.add(todo("报名材料待审核", records.size(), urgent > 0 ? "其中" + urgent + "份距离截止不足24小时" : "建议按截止时间优先处理", "/teacher/audit"));
        todos.add(todo("退回材料待重新提交", countTasks(records, "补充"), "关注被退回后尚未重新提交的学生", "/teacher/audit"));
        todos.add(todo("团队作品进度异常", countTasks(records, "作品"), "查看长时间未更新的团队提交进度", "/teacher/audit"));
        todos.add(todo("学业状态提醒", countTasks(records, "学业"), "结合学业预警关注参赛学生状态", "/teacher/academic-warning"));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("title", "今日建议优先处理");
        result.put("college", college);
        result.put("todos", todos);
        result.put("stats", stats);
        result.put("generatedAt", LocalDateTime.now());
        return result;
    }

    private long countTasks(List<?> records, String keyword) {
        return records.stream().filter(item -> item instanceof com.etsaion.vo.ReviewTaskVO
                && StrUtil.containsIgnoreCase(((com.etsaion.vo.ReviewTaskVO) item).getTitle(), keyword)).count();
    }

    @Override
    public Map<String, Object> adminAnalytics(Long adminId) {
        Map<String, Object> userStats = safeMap(() -> userService.getUserStats());
        Map<String, Object> reviewStats = safeMap(() -> reviewTaskService.getStats());
        Page<Competition> competitions = competitionService.getCompetitionsPage(1, 200, null, null, null, null);
        long published = competitions.getRecords().stream().filter(c -> "published".equalsIgnoreCase(c.getStatus())).count();
        long closingSoon = competitions.getRecords().stream().filter(c -> "published".equalsIgnoreCase(c.getStatus()) && c.getEndTime() != null && !c.getEndTime().isBefore(LocalDateTime.now()) && c.getEndTime().isBefore(LocalDateTime.now().plusDays(7))).count();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("title", "赛事运行简报");
        result.put("metrics", List.of(
                metric("发布中赛事", published, "场"),
                metric("学生报名人次", registrationService.count(), "人次"),
                metric("用户规模", userStats.getOrDefault("total", 0), "人"),
                metric("待审核任务", reviewStats.getOrDefault("pending", reviewStats.getOrDefault("open", 0)), "份"),
                metric("临近截止赛事", closingSoon, "场")));
        result.put("anomalies", closingSoon > 0 ? List.of("有" + closingSoon + "场赛事将在7天内截止，建议进行二次推送") : List.of("当前没有发现临近截止的赛事"));
        result.put("suggestions", List.of("对低报名赛事进行二次推送", "提醒相关学院及时审核", "为高热度赛事增加指导资源"));
        result.put("generatedAt", LocalDateTime.now());
        return result;
    }

    private List<RegistrationVO> safeRegistrations(Long userId) {
        try { return registrationService.getMyList(userId); } catch (Exception ignored) { return List.of(); }
    }

    private List<?> safeAwards(Long userId) {
        try { return awardProofService.listMyAwardProofs(userId, 1, 20).getRecords(); } catch (Exception ignored) { return List.of(); }
    }

    private long daysLeft(LocalDateTime now, LocalDateTime deadline) {
        return deadline == null ? -1 : Math.max(0, Duration.between(now, deadline).toDays());
    }

    private void issue(List<Map<String, Object>> issues, String code, String title, String detail) {
        issues.add(Map.of("code", code, "severity", "warning", "title", title, "detail", detail));
    }

    private Map<String, Object> todo(String title, long count, String description, String link) {
        return Map.of("title", title, "count", count, "description", description, "link", link);
    }

    private Map<String, Object> metric(String label, Object value, String unit) {
        return Map.of("label", label, "value", value, "unit", unit);
    }

    private String text(Object value) { return value == null ? "" : String.valueOf(value).trim(); }

    private int number(Object value, int fallback) {
        if (value instanceof Number) return ((Number) value).intValue();
        try { return Integer.parseInt(text(value)); } catch (Exception ignored) { return fallback; }
    }

    private List<String> readStrings(Object value) {
        if (value instanceof Collection<?> collection) return collection.stream().map(this::text).filter(StrUtil::isNotBlank).collect(Collectors.toList());
        if (value instanceof String raw && JSONUtil.isTypeJSON(raw)) return JSONUtil.toList(raw, String.class);
        return StrUtil.isBlank(text(value)) ? List.of() : List.of(text(value));
    }

    private String nullToEmpty(String value) { return value == null ? "" : value; }

    private String normalize(String value) { return nullToEmpty(value).toLowerCase(Locale.ROOT).replaceAll("[\\p{Punct}\\s]", ""); }

    private boolean containsAny(String text, String... terms) {
        String normalized = normalize(text);
        for (String term : terms) if (StrUtil.isNotBlank(term) && normalized.contains(normalize(term))) return true;
        return false;
    }

    private Map<String, Object> safeMap(java.util.function.Supplier<Map<String, Object>> supplier) {
        try {
            Map<String, Object> value = supplier.get();
            return value == null ? Map.of() : value;
        } catch (Exception ignored) { return Map.of(); }
    }
}
