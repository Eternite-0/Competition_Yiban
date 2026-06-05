package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.RegistrationSubmitDTO;
import com.etsaion.entity.Competition;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.Message;
import com.etsaion.entity.Registration;
import com.etsaion.entity.ReviewTask;
import com.etsaion.entity.Submission;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.RegistrationMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.MessageService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.StudentStageProgressService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.UserService;
import com.etsaion.vo.RegistrationVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
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

    @Autowired
    @Lazy
    private ReviewTaskService reviewTaskService;

    @Autowired
    private StudentStageProgressService studentStageProgressService;

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
        if (comp.getStartTime() != null && LocalDateTime.now().isBefore(comp.getStartTime())) {
            throw new BusinessException("赛事报名尚未开始");
        }
        if (LocalDateTime.now().isAfter(comp.getEndTime())) {
            throw new BusinessException("赛事报名已截止");
        }

        Set<Long> memberIds = new LinkedHashSet<>();
        if (dto.getMemberStudentIds() != null) {
            dto.getMemberStudentIds().stream()
                    .filter(id -> id != null && !id.equals(studentId))
                    .forEach(memberIds::add);
        }
        int participantCount = memberIds.size() + 1;
        if (comp.getMaxTeamSize() != null && comp.getMaxTeamSize() > 0
                && participantCount > comp.getMaxTeamSize()) {
            throw new BusinessException("团队人数超过赛事限制");
        }

        // Validate member student IDs exist
        if (!memberIds.isEmpty()) {
            List<User> members = userService.listByIds(new ArrayList<>(memberIds));
            if (members.size() != memberIds.size()) {
                throw new BusinessException("部分成员学号不存在，请核实");
            }
        }

        // Validate track against competition's allowed tracks
        if (dto.getTrack() != null && !dto.getTrack().isEmpty()
                && comp.getTracks() != null && !comp.getTracks().isEmpty()) {
            List<String> allowedTracks = JSONUtil.toList(comp.getTracks(), String.class);
            if (!allowedTracks.contains(dto.getTrack())) {
                throw new BusinessException("所选赛道不在赛事允许范围内");
            }
        }

        long count = this.count(new LambdaQueryWrapper<Registration>()
                .eq(Registration::getStudentId, studentId)
                .eq(Registration::getCompetitionId, dto.getCompetitionId())
                .ne(Registration::getStatus, "审核驳回")
                .ne(Registration::getStatus, "退回补充"));
        if (count > 0) {
            throw new BusinessException("您已报名参加该赛事，请勿重复申请");
        }

        Registration reg = new Registration();
        reg.setCompetitionId(dto.getCompetitionId());
        reg.setStudentId(studentId);
        reg.setTeamName(dto.getTeamName());
        reg.setTrack(dto.getTrack());
        reg.setMemberStudentIds(JSONUtil.toJsonStr(new ArrayList<>(memberIds)));
        reg.setStatus("已提交");
        reg.setSubmitDate(LocalDateTime.now());

        this.save(reg);

        Map<String, Object> payload = new HashMap<>();
        payload.put("competitionName", comp.getName());
        payload.put("teamName", reg.getTeamName());
        payload.put("track", reg.getTrack());
        payload.put("memberStudentIds", new ArrayList<>(memberIds));
        reviewTaskService.createPending("competition", comp.getId(), "registration", reg.getId(),
                studentId, "赛事报名审核：" + comp.getName(), comp.getEndTime(), JSONUtil.toJsonStr(payload));

        // Initialize first stage progress for this student
        try {
            studentStageProgressService.initProgressForRegistration(studentId, comp.getId(), reg.getId());
        } catch (Exception e) {
            log.warn("初始化阶段进度失败，可能未配置阶段: {}", e.getMessage());
        }

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

        wrapper.in(Registration::getStatus, "已提交", "审核中");

        // 教师只能看到本学院学生的报名
        String teacherCollege = getTeacherCollege();
        if (teacherCollege != null) {
            java.util.List<Long> collegeStudentIds = getStudentIdsByCollege(teacherCollege);
            if (collegeStudentIds.isEmpty()) {
                Page<RegistrationVO> emptyPage = new Page<>(current, size, 0);
                emptyPage.setRecords(new java.util.ArrayList<>());
                return emptyPage;
            }
            wrapper.in(Registration::getStudentId, collegeStudentIds);
        }

        wrapper.orderByDesc(Registration::getSubmitDate);

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

        // 教师只能审核本学院学生的报名
        String teacherCollege = getTeacherCollege();
        if (teacherCollege != null) {
            User student = userService.getById(reg.getStudentId());
            if (student == null || !teacherCollege.equals(student.getCollege())) {
                throw new BusinessException(403, "无权审核其他学院学生的报名");
            }
        }

        Competition comp = competitionService.getById(reg.getCompetitionId());
        String compName = comp != null ? comp.getName() : "未知赛事";

        if (Boolean.TRUE.equals(approve)) {
            reg.setStatus("审核通过");
            this.updateById(reg);
            log.info("报名审核通过: 报名ID={}, 学生ID={}, 赛事={}", id, reg.getStudentId(), compName);

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
            boolean isReturn = reviewNote != null && reviewNote.startsWith("【退回补充】");
            reg.setStatus(isReturn ? "退回补充" : "审核驳回");
            this.updateById(reg);

            Message msg = new Message();
            msg.setFromUser(teacherId);
            msg.setToUser(reg.getStudentId());
            if (isReturn) {
                msg.setTitle("您的赛事报名需要补充材料");
                msg.setContent(String.format("您在“%s”中的参赛报名申请已被退回补充。请补充以下内容：%s",
                        compName, reviewNote.replace("【退回补充】", "")));
            } else {
                msg.setTitle("您的赛事报名审核已被驳回");
                msg.setContent(String.format("很遗憾，您在“%s”中的参赛报名申请未通过审核。理由：%s", compName, reviewNote));
            }
            msg.setIsRead(0);
            msg.setCreateTime(LocalDateTime.now());
            messageService.save(msg);
        }

        reviewTaskService.resolveTarget("registration", id, teacherId, reviewNote);

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

        Map<Long, String> reviewNoteMap = Collections.emptyMap();
        if (!CollUtil.isEmpty(regIds)) {
            List<ReviewTask> tasks = reviewTaskService.list(
                    new LambdaQueryWrapper<ReviewTask>()
                            .eq(ReviewTask::getTargetType, "registration")
                            .in(ReviewTask::getTargetId, regIds)
                            .isNotNull(ReviewTask::getReviewNote)
                            .orderByDesc(ReviewTask::getUpdateTime)
                            .orderByDesc(ReviewTask::getCreateTime));
            reviewNoteMap = new HashMap<>();
            for (ReviewTask task : tasks) {
                if (task.getTargetId() != null && task.getReviewNote() != null) {
                    reviewNoteMap.putIfAbsent(task.getTargetId(), task.getReviewNote());
                }
            }
        }

        final Map<Long, Submission> finalSubMap = submissionMap;
        final Map<Long, String> finalReviewNoteMap = reviewNoteMap;
        return regs.stream().map(r -> {
            RegistrationVO vo = new RegistrationVO();
            vo.setId(r.getId());
            vo.setCompetitionId(r.getCompetitionId());
            vo.setStudentId(r.getStudentId());
            vo.setTeamName(r.getTeamName());
            vo.setTrack(r.getTrack());
            if (r.getMemberStudentIds() != null && JSONUtil.isTypeJSON(r.getMemberStudentIds())) {
                vo.setMemberStudentIds(JSONUtil.toList(r.getMemberStudentIds(), Long.class));
            } else {
                vo.setMemberStudentIds(new ArrayList<>());
            }
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
            if ((vo.getReviewNote() == null || vo.getReviewNote().isEmpty())
                    && finalReviewNoteMap.containsKey(r.getId())) {
                vo.setReviewNote(finalReviewNoteMap.get(r.getId()));
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

    /**
     * 获取当前教师的学院，管理员返回 null 表示不限制
     */
    private String getTeacherCollege() {
        String role = com.etsaion.utils.UserContext.getUserRole();
        if ("admin".equalsIgnoreCase(role)) {
            return null; // 管理员不限制
        }
        if (!"teacher".equalsIgnoreCase(role)) {
            return null;
        }
        Long userId = com.etsaion.utils.UserContext.getUserId();
        if (userId == null) return null;
        User teacher = userService.getById(userId);
        return teacher != null ? teacher.getCollege() : null;
    }

    /**
     * 获取指定学院的所有学生 ID
     */
    private java.util.List<Long> getStudentIdsByCollege(String college) {
        if (college == null || college.isBlank()) return java.util.Collections.emptyList();
        return userService.list(new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .eq(User::getCollege, college)
                .select(User::getId))
                .stream().map(User::getId).collect(Collectors.toList());
    }
}
