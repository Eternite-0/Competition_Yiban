package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.Competition;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.Registration;
import com.etsaion.entity.Submission;
import com.etsaion.mapper.GrowthRecordMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.SubmissionService;
import com.etsaion.vo.StudentGrowthVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
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

    @Override
    public List<GrowthRecord> getTimeline(Long studentId) {
        return this.list(new LambdaQueryWrapper<GrowthRecord>()
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
        
        List<Submission> approvedSubmissions = new ArrayList<>();
        if (CollUtil.isNotEmpty(registrationIds)) {
            approvedSubmissions = submissionService.list(new LambdaQueryWrapper<Submission>()
                    .in(Submission::getRegistrationId, registrationIds)
                    .eq(Submission::getStatus, "已审核")
                    .eq(Submission::getApproved, true))
                    .stream()
                    .filter(sub -> Boolean.TRUE.equals(sub.getApproved()))
                    .collect(Collectors.toList());
        }
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

        for (Submission sub : approvedSubmissions) {
            Registration reg = registrations.stream().filter(r -> r.getId().equals(sub.getRegistrationId())).findFirst().orElse(null);
            if (reg == null) continue;

            Competition comp = competitionService.getById(reg.getCompetitionId());
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
                } else if ("B".equalsIgnoreCase(category)) {
                    innovation += boost;
                    writing += 5;
                } else if ("C".equalsIgnoreCase(category)) {
                    writing += boost;
                    teamwork += 5;
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
}
