package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.Competition;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.Registration;
import com.etsaion.entity.Submission;
import com.etsaion.entity.SubmissionStudent;
import com.etsaion.mapper.GrowthRecordMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.SubmissionStudentService;
import com.etsaion.vo.StudentGrowthVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class GrowthRecordServiceImpl extends ServiceImpl<GrowthRecordMapper, GrowthRecord> implements GrowthRecordService {

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    @Lazy
    private RegistrationService registrationService;

    @Autowired
    @Lazy
    private SubmissionService submissionService;

    @Autowired
    @Lazy
    private SubmissionStudentService submissionStudentService;

    @Override
    public List<GrowthRecord> getTimeline(Long studentId) {
        return this.list(new LambdaQueryWrapper<GrowthRecord>()
                .eq(GrowthRecord::getStudentId, studentId)
                .orderByDesc(GrowthRecord::getHappenTime));
    }

    @Override
    public Page<GrowthRecord> getTimelinePage(Long studentId, int current, int size) {
        return this.page(new Page<>(current, size), new LambdaQueryWrapper<GrowthRecord>()
                .eq(GrowthRecord::getStudentId, studentId)
                .orderByDesc(GrowthRecord::getHappenTime));
    }

    @Override
    public StudentGrowthVO getStudentGrowth(Long studentId) {
        // 1. Fetch registrations count (totalCompetitions)
        List<Registration> registrations = registrationService.list(
                new LambdaQueryWrapper<Registration>().eq(Registration::getStudentId, studentId));
        int totalCompetitions = registrations.size();

        // 2. Fetch approved submissions count (awards)
        List<Long> registrationIds = registrations.stream().map(Registration::getId).collect(Collectors.toList());
        
        List<Submission> registrationSubmissions = new ArrayList<>();
        if (CollUtil.isNotEmpty(registrationIds)) {
            registrationSubmissions = submissionService.list(new LambdaQueryWrapper<Submission>()
                    .in(Submission::getRegistrationId, registrationIds)
                    .eq(Submission::getStatus, "已审核")
                    .eq(Submission::getApproved, true))
                    .stream()
                    .filter(this::isApprovedSubmission)
                    .collect(Collectors.toList());
        }

        List<Long> linkedSubmissionIds = submissionStudentService == null
                ? Collections.emptyList()
                : submissionStudentService.list(new LambdaQueryWrapper<SubmissionStudent>()
                                .eq(SubmissionStudent::getStudentId, studentId))
                        .stream()
                        .map(SubmissionStudent::getSubmissionId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .collect(Collectors.toList());
        List<Submission> linkedSubmissions = CollUtil.isNotEmpty(linkedSubmissionIds)
                ? submissionService.list(new LambdaQueryWrapper<Submission>()
                        .in(Submission::getId, linkedSubmissionIds)
                        .eq(Submission::getStatus, "已审核")
                        .eq(Submission::getApproved, true))
                        .stream()
                        .filter(this::isApprovedSubmission)
                        .collect(Collectors.toList())
                : Collections.emptyList();

        Map<Long, Submission> approvedSubmissionMap = new HashMap<>();
        registrationSubmissions.stream()
                .filter(s -> s.getId() != null)
                .forEach(s -> approvedSubmissionMap.put(s.getId(), s));
        linkedSubmissions.stream()
                .filter(s -> s.getId() != null)
                .forEach(s -> approvedSubmissionMap.put(s.getId(), s));
        List<Submission> approvedSubmissions = new ArrayList<>(approvedSubmissionMap.values());
        int awards = approvedSubmissions.size();

        // Base ability points (students start with a baseline of 60)
        int innovation = 60;
        int engineering = 60;
        int programming = 60;
        int writing = 60;
        int teamwork = 60;

        // 3. Dynamic radar calculation logic based on registrations and submissions
        for (Registration reg : registrations) {
            // Teamwork: signup is cooperative if teamName is not blank
            if (StrUtil.isNotBlank(reg.getTeamName())) {
                teamwork += 8;
            } else {
                teamwork += 2;
            }
        }

        // Batch-fetch competitions to avoid N+1 queries
        Map<Long, Registration> regMap = registrations.stream()
                .collect(Collectors.toMap(Registration::getId, r -> r, (a, b) -> a));
        List<Long> compIds = registrations.stream()
                .map(Registration::getCompetitionId).filter(Objects::nonNull).distinct().collect(Collectors.toList());
        Map<Long, Competition> compMap = CollUtil.isNotEmpty(compIds)
                ? competitionService.listByIds(compIds).stream()
                        .collect(Collectors.toMap(Competition::getId, c -> c, (a, b) -> a))
                : Collections.emptyMap();
        if (CollUtil.isNotEmpty(compIds) && compMap.isEmpty()) {
            compMap = compIds.stream()
                    .map(competitionService::getById)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toMap(Competition::getId, c -> c, (a, b) -> a));
        }

        for (Submission sub : approvedSubmissions) {
            Registration reg = regMap.get(sub.getRegistrationId());
            if (reg == null) continue;

            Competition comp = compMap.get(reg.getCompetitionId());
            if (comp == null) continue;

            // Base boost for approved deliverables
            writing += 10;

            // Category logic (A=科技创新, B=商业创业, C=文化艺术)
            String category = comp.getCategory();
            int boost = 12;
            if (StrUtil.isNotBlank(category)) {
                if ("A".equalsIgnoreCase(category)) {
                    innovation += boost;
                    programming += 6;
                    engineering += 4;
                } else if ("B".equalsIgnoreCase(category)) {
                    innovation += boost;
                    writing += 5;
                } else if ("C".equalsIgnoreCase(category)) {
                    writing += boost;
                    teamwork += 5;
                    engineering += 4;
                } else {
                    innovation += 6;
                    engineering += 6;
                }
            }
        }

        // Cap scores at 99
        innovation = Math.min(innovation, 99);
        engineering = Math.min(engineering, 99);
        programming = Math.min(programming, 99);
        writing = Math.min(writing, 99);
        teamwork = Math.min(teamwork, 99);

        StudentGrowthVO.RadarData radarData = new StudentGrowthVO.RadarData(innovation, engineering, programming, writing, teamwork);
        return new StudentGrowthVO(studentId, radarData, totalCompetitions, awards);
    }

    private boolean isApprovedSubmission(Submission submission) {
        return submission != null && Boolean.TRUE.equals(submission.getApproved());
    }
}
