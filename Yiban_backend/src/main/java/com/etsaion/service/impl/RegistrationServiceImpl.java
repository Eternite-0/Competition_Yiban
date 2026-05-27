package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.RegistrationSubmitDTO;
import com.etsaion.entity.Competition;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.Message;
import com.etsaion.entity.Registration;
import com.etsaion.entity.Submission;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.RegistrationMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.MessageService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.UserService;
import com.etsaion.vo.RegistrationVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RegistrationServiceImpl extends ServiceImpl<RegistrationMapper, Registration> implements RegistrationService {

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private MessageService messageService;

    @Autowired
    private GrowthRecordService growthRecordService;

    @Autowired
    private UserService userService;

    @Autowired
    private SubmissionService submissionService;

    @Override
    @Transactional
    public Registration submitRegistration(Long studentId, RegistrationSubmitDTO dto) {
        Competition comp = competitionService.getById(dto.getCompetitionId());
        if (comp == null) {
            throw new BusinessException("要报名的赛事不存在");
        }
        if (!"published".equalsIgnoreCase(comp.getStatus())) {
            throw new BusinessException("该赛事当前未开放报名");
        }
        if (LocalDateTime.now().isAfter(comp.getEndTime())) {
            throw new BusinessException("赛事报名已截止");
        }

        long count = this.count(new LambdaQueryWrapper<Registration>()
                .eq(Registration::getStudentId, studentId)
                .eq(Registration::getCompetitionId, dto.getCompetitionId())
                .ne(Registration::getStatus, "审核驳回"));
        if (count > 0) {
            throw new BusinessException("您已报名参加该赛事，请勿重复申请");
        }

        Registration reg = new Registration();
        reg.setCompetitionId(dto.getCompetitionId());
        reg.setStudentId(studentId);
        reg.setTeamName(dto.getTeamName());
        reg.setStatus("已提交");
        reg.setSubmitDate(LocalDateTime.now());

        this.save(reg);
        return reg;
    }

    @Override
    public List<RegistrationVO> getMyList(Long studentId) {
        List<Registration> list = this.list(new LambdaQueryWrapper<Registration>()
                .eq(Registration::getStudentId, studentId)
                .orderByDesc(Registration::getSubmitDate));
        return toVOList(list);
    }

    @Override
    public Page<RegistrationVO> getPendingAuditPage(int current, int size) {
        Page<Registration> page = new Page<>(current, size);
        LambdaQueryWrapper<Registration> wrapper = new LambdaQueryWrapper<>();

        wrapper.in(Registration::getStatus, "已提交", "审核中")
               .orderByDesc(Registration::getSubmitDate);

        Page<Registration> raw = this.page(page, wrapper);
        return toVOPage(raw);
    }

    @Override
    @Transactional
    public void audit(Long id, Long teacherId, Boolean approve, String reviewNote) {
        Registration reg = this.getById(id);
        if (reg == null) {
            throw new BusinessException("报名表不存在");
        }
        if (!"已提交".equalsIgnoreCase(reg.getStatus()) && !"审核中".equalsIgnoreCase(reg.getStatus())) {
            throw new BusinessException("该报名申请已处理完毕");
        }

        Competition comp = competitionService.getById(reg.getCompetitionId());
        String compName = comp != null ? comp.getName() : "未知赛事";

        if (Boolean.TRUE.equals(approve)) {
            reg.setStatus("审核通过");
            this.updateById(reg);

            Message msg = new Message();
            msg.setFromUser(teacherId);
            msg.setToUser(reg.getStudentId());
            msg.setTitle("您的赛事报名审核已通过");
            msg.setContent(String.format("恭喜！您在“%s”中的参赛报名申请已审核通过！", compName));
            msg.setIsRead(0);
            msg.setCreateTime(LocalDateTime.now());
            messageService.save(msg);

            GrowthRecord record = new GrowthRecord();
            record.setStudentId(reg.getStudentId());
            record.setCompetitionId(reg.getCompetitionId());
            record.setRecordType("competition");
            record.setTitle(String.format("完成了在“%s”中的赛事报名与审核", compName));
            record.setHappenTime(LocalDateTime.now());
            growthRecordService.save(record);

        } else {
            reg.setStatus("审核驳回");
            this.updateById(reg);

            Message msg = new Message();
            msg.setFromUser(teacherId);
            msg.setToUser(reg.getStudentId());
            msg.setTitle("您的赛事报名审核已被驳回");
            msg.setContent(String.format("很遗憾，您在“%s”中的参赛报名申请未通过审核。理由：%s", compName, reviewNote));
            msg.setIsRead(0);
            msg.setCreateTime(LocalDateTime.now());
            messageService.save(msg);
        }

        // Sync linked submission status so it doesn't stay "待审核" forever
        List<Submission> linkedSubs = submissionService.list(
                new LambdaQueryWrapper<Submission>().eq(Submission::getRegistrationId, id));
        for (Submission sub : linkedSubs) {
            if ("待审核".equalsIgnoreCase(sub.getStatus())) {
                sub.setStatus("已审核");
                sub.setApproved(Boolean.TRUE.equals(approve));
                sub.setReviewNote(reviewNote);
                submissionService.updateById(sub);
            }
        }
    }

    @Override
    public List<RegistrationVO> toVOList(List<Registration> regs) {
        if (CollUtil.isEmpty(regs)) return new ArrayList<>();

        List<Long> studentIds = regs.stream().map(Registration::getStudentId)
                .filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());
        List<Long> compIds = regs.stream().map(Registration::getCompetitionId)
                .filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());
        List<Long> regIds = regs.stream().map(Registration::getId)
                .filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());

        Map<Long, User> studentMap = CollUtil.isEmpty(studentIds) ? Collections.emptyMap()
                : userService.listByIds(studentIds).stream()
                    .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        Map<Long, Competition> compMap = CollUtil.isEmpty(compIds) ? Collections.emptyMap()
                : competitionService.listByIds(compIds).stream()
                    .collect(Collectors.toMap(Competition::getId, c -> c, (a, b) -> a));

        // batch-load submissions and keep only the latest per registrationId
        Map<Long, Submission> submissionMap = Collections.emptyMap();
        if (!CollUtil.isEmpty(regIds)) {
            List<Submission> subs = submissionService.list(
                    new LambdaQueryWrapper<Submission>()
                            .in(Submission::getRegistrationId, regIds)
                            .orderByDesc(Submission::getUploadDate));
            submissionMap = subs.stream()
                    .collect(Collectors.toMap(Submission::getRegistrationId, s -> s, (a, b) -> a));
        }

        final Map<Long, Submission> finalSubMap = submissionMap;
        return regs.stream().map(r -> {
            RegistrationVO vo = new RegistrationVO();
            vo.setId(r.getId());
            vo.setCompetitionId(r.getCompetitionId());
            vo.setStudentId(r.getStudentId());
            vo.setTeamName(r.getTeamName());
            vo.setStatus(r.getStatus());
            vo.setSubmitDate(r.getSubmitDate());

            Competition c = compMap.get(r.getCompetitionId());
            if (c != null) {
                vo.setCompetitionName(c.getName());
                vo.setCompetitionLevel(c.getLevel());
                vo.setCompetitionCategory(c.getCategory());
            }
            User u = studentMap.get(r.getStudentId());
            if (u != null) {
                vo.setStudentName(u.getRealName());
                vo.setStudentNo(u.getUsername());
                vo.setCollege(u.getCollege());
                vo.setMajor(u.getMajor());
                vo.setClassName(u.getClassName());
            }
            Submission sub = finalSubMap.get(r.getId());
            if (sub != null) {
                vo.setFileName(sub.getFileName());
                vo.setFileUrl(sub.getFileUrl());
                vo.setFileSize(sub.getFileSize());
                vo.setReviewNote(sub.getReviewNote());
                vo.setApproved(sub.getApproved());
            }
            return vo;
        }).collect(Collectors.toList());
    }

    @Override
    public Page<RegistrationVO> toVOPage(Page<Registration> page) {
        Page<RegistrationVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(toVOList(page.getRecords()));
        return voPage;
    }
}
