package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.etsaion.entity.Activity;
import com.etsaion.entity.Competition;
import com.etsaion.entity.Participation;
import com.etsaion.entity.Registration;
import com.etsaion.entity.Submission;
import com.etsaion.service.ActivityService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthProfileService;
import com.etsaion.service.ParticipationService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.SubmissionService;
import com.etsaion.vo.GrowthDimensionVO;
import com.etsaion.vo.GrowthProfileVO;
import com.etsaion.vo.GrowthTimelineItemVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class GrowthProfileServiceImpl implements GrowthProfileService {

    private static final Map<String, String> DIMENSION_LABELS = new LinkedHashMap<>();

    static {
        DIMENSION_LABELS.put("competition_practice", "竞赛实践");
        DIMENSION_LABELS.put("innovation", "创新能力");
        DIMENSION_LABELS.put("volunteer", "志愿公益");
        DIMENSION_LABELS.put("culture_sports", "文体素养");
        DIMENSION_LABELS.put("teamwork", "团队协作");
    }

    @Autowired
    @Lazy
    private RegistrationService registrationService;

    @Autowired
    @Lazy
    private SubmissionService submissionService;

    @Autowired
    @Lazy
    private CompetitionService competitionService;

    @Autowired
    @Lazy
    private ParticipationService participationService;

    @Autowired
    @Lazy
    private ActivityService activityService;

    @Override
    public GrowthProfileVO getStudentProfile(Long studentId, String academicYear) {
        Map<String, DimensionAccumulator> dimensions = initDimensions();
        List<GrowthTimelineItemVO> timeline = new ArrayList<>();

        List<Registration> registrations = registrationService.list(new LambdaQueryWrapper<Registration>()
                .eq(Registration::getStudentId, studentId));
        List<Registration> approvedRegistrations = registrations.stream()
                .filter(this::isApprovedRegistration)
                .collect(Collectors.toList());

        Map<Long, Competition> competitionMap = loadCompetitions(approvedRegistrations);
        for (Registration registration : approvedRegistrations) {
            add(dimensions, "competition_practice", 14, "通过赛事报名");
            if (isTeamEvidence(registration.getTeamName(), registration.getMemberStudentIds())) {
                add(dimensions, "teamwork", 10, "团队参赛");
            }
            Competition competition = competitionMap.get(registration.getCompetitionId());
            timeline.add(new GrowthTimelineItemVO(
                    "registration-" + registration.getId(),
                    "registration",
                    competition != null ? competition.getName() : "赛事报名通过",
                    StrUtil.blankToDefault(registration.getTrack(), "竞赛赛事"),
                    registration.getStatus(),
                    "competition_practice",
                    "competition",
                    registration.getSubmitDate()
            ));
        }

        List<Submission> approvedSubmissions = loadApprovedSubmissions(approvedRegistrations);
        for (Submission submission : approvedSubmissions) {
            add(dimensions, "competition_practice", 8, "成果审核通过");
            add(dimensions, "innovation", 12, "成果材料认证");
            timeline.add(new GrowthTimelineItemVO(
                    "submission-" + submission.getId(),
                    "submission",
                    StrUtil.blankToDefault(submission.getFileName(), "成果材料通过审核"),
                    "已认证成果",
                    submission.getStatus(),
                    "innovation",
                    "competition",
                    submission.getUploadDate()
            ));
        }

        List<Participation> approvedParticipations = participationService.list(new LambdaQueryWrapper<Participation>()
                        .eq(Participation::getStudentId, studentId))
                .stream()
                .filter(this::isApprovedParticipation)
                .collect(Collectors.toList());
        Map<Long, Activity> activityMap = loadActivities(approvedParticipations);

        BigDecimal volunteerHours = BigDecimal.ZERO;
        int cultureSports = 0;
        for (Participation participation : approvedParticipations) {
            Activity activity = activityMap.get(participation.getActivityId());
            String type = activity != null && StrUtil.isNotBlank(activity.getType()) ? activity.getType() : "other";
            String title = activity != null ? activity.getTitle() : "活动参与审核通过";
            String dimensionKey = dimensionForActivity(type);

            if ("volunteer".equalsIgnoreCase(type)) {
                BigDecimal hours = activity.getServiceHours() == null ? BigDecimal.ZERO : activity.getServiceHours();
                volunteerHours = volunteerHours.add(hours);
                add(dimensions, "volunteer", 20 + Math.min(20, hours.multiply(BigDecimal.valueOf(4)).intValue()), "志愿服务通过审核");
            } else if ("culture_sports".equalsIgnoreCase(type)) {
                cultureSports++;
                add(dimensions, "culture_sports", 26, "文体活动通过审核");
            } else {
                add(dimensions, "competition_practice", 8, "校园活动通过审核");
            }

            if (isTeamEvidence(participation.getTeamName(), participation.getMemberStudentIds())) {
                add(dimensions, "teamwork", 8, "团队活动参与");
            }
            timeline.add(new GrowthTimelineItemVO(
                    "participation-" + participation.getId(),
                    "participation",
                    title,
                    labelForActivityType(type),
                    participation.getStatus(),
                    dimensionKey,
                    type,
                    firstNonNull(participation.getReviewTime(), participation.getSubmitDate())
            ));
        }

        List<GrowthDimensionVO> dimensionVos = dimensions.entrySet().stream()
                .map(entry -> entry.getValue().toVO(entry.getKey(), DIMENSION_LABELS.get(entry.getKey())))
                .collect(Collectors.toList());
        timeline.sort(Comparator.comparing(GrowthTimelineItemVO::getHappenTime,
                Comparator.nullsLast(Comparator.reverseOrder())));

        GrowthProfileVO profile = new GrowthProfileVO();
        profile.setStudentId(studentId);
        profile.setDimensions(dimensionVos);
        profile.setTotalCompetitions(approvedRegistrations.size());
        profile.setTotalAwards(approvedSubmissions.size());
        profile.setTotalActivities(approvedParticipations.size());
        profile.setTotalVolunteerHours(volunteerHours);
        profile.setTotalCultureSports(cultureSports);
        profile.setTimeline(timeline);
        profile.setSuggestions(buildSuggestions(dimensionVos));
        return profile;
    }

    private Map<String, DimensionAccumulator> initDimensions() {
        Map<String, DimensionAccumulator> result = new LinkedHashMap<>();
        DIMENSION_LABELS.keySet().forEach(key -> result.put(key, new DimensionAccumulator()));
        return result;
    }

    private void add(Map<String, DimensionAccumulator> dimensions, String key, int score, String summary) {
        DimensionAccumulator acc = dimensions.get(key);
        if (acc == null) return;
        acc.score = Math.min(100, acc.score + score);
        acc.evidenceCount++;
        if (StrUtil.isBlank(acc.summary)) {
            acc.summary = summary;
        }
    }

    private Map<Long, Competition> loadCompetitions(List<Registration> registrations) {
        List<Long> ids = registrations.stream()
                .map(Registration::getCompetitionId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        if (CollUtil.isEmpty(ids) || competitionService == null) {
            return Map.of();
        }
        return competitionService.listByIds(ids).stream()
                .collect(Collectors.toMap(Competition::getId, c -> c, (a, b) -> a));
    }

    private List<Submission> loadApprovedSubmissions(List<Registration> approvedRegistrations) {
        List<Long> regIds = approvedRegistrations.stream()
                .map(Registration::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        if (CollUtil.isEmpty(regIds)) {
            return List.of();
        }
        return submissionService.list(new LambdaQueryWrapper<Submission>()
                        .in(Submission::getRegistrationId, regIds)
                        .eq(Submission::getStatus, "已审核")
                        .eq(Submission::getApproved, true))
                .stream()
                .filter(s -> Boolean.TRUE.equals(s.getApproved()))
                .collect(Collectors.toList());
    }

    private Map<Long, Activity> loadActivities(List<Participation> participations) {
        Set<Long> ids = participations.stream()
                .map(Participation::getActivityId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (ids.isEmpty() || activityService == null) {
            return Map.of();
        }
        return activityService.listByIds(new ArrayList<>(ids)).stream()
                .collect(Collectors.toMap(Activity::getId, a -> a, (a, b) -> a));
    }

    private boolean isApprovedRegistration(Registration registration) {
        return registration != null && "审核通过".equals(registration.getStatus());
    }

    private boolean isApprovedParticipation(Participation participation) {
        return participation != null && "approved".equalsIgnoreCase(participation.getStatus());
    }

    private boolean isTeamEvidence(String teamName, String memberStudentIds) {
        return StrUtil.isNotBlank(teamName)
                || (StrUtil.isNotBlank(memberStudentIds) && !"[]".equals(memberStudentIds.trim()));
    }

    private String dimensionForActivity(String type) {
        if ("volunteer".equalsIgnoreCase(type)) return "volunteer";
        if ("culture_sports".equalsIgnoreCase(type)) return "culture_sports";
        return "competition_practice";
    }

    private String labelForActivityType(String type) {
        if ("volunteer".equalsIgnoreCase(type)) return "志愿服务";
        if ("culture_sports".equalsIgnoreCase(type)) return "文体活动";
        if ("competition".equalsIgnoreCase(type)) return "竞赛赛事";
        return "校园活动";
    }

    private LocalDateTime firstNonNull(LocalDateTime first, LocalDateTime second) {
        return first != null ? first : second;
    }

    private List<String> buildSuggestions(List<GrowthDimensionVO> dimensions) {
        List<String> suggestions = dimensions.stream()
                .filter(d -> d.getScore() < 40)
                .limit(2)
                .map(d -> "建议补齐" + d.getLabel() + "相关记录，优先选择近期开放的活动并完成审核闭环。")
                .collect(Collectors.toList());
        if (suggestions.isEmpty()) {
            suggestions.add("当前画像较均衡，建议继续沉淀可审核的赛事、志愿和文体活动记录。");
        }
        return suggestions;
    }

    private static class DimensionAccumulator {
        private int score;
        private int evidenceCount;
        private String summary;

        private GrowthDimensionVO toVO(String key, String label) {
            return new GrowthDimensionVO(key, label, score, 100, evidenceCount,
                    StrUtil.blankToDefault(summary, "暂无已审核成长记录"));
        }
    }
}
