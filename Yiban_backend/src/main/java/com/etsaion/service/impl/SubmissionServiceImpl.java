package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.Competition;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.Message;
import com.etsaion.entity.Registration;
import com.etsaion.entity.Submission;
import com.etsaion.entity.SubmissionStudent;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.SubmissionMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.MessageService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.SubmissionStudentService;
import com.etsaion.service.UserService;
import com.etsaion.vo.SubmissionVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SubmissionServiceImpl extends ServiceImpl<SubmissionMapper, Submission> implements SubmissionService {

    @Autowired
    @Lazy
    private RegistrationService registrationService;

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private MessageService messageService;

    @Autowired
    private GrowthRecordService growthRecordService;

    @Autowired
    private UserService userService;

    @Autowired
    private SubmissionStudentService submissionStudentService;

    @Autowired
    @Lazy
    private ReviewTaskService reviewTaskService;

    @Override
    @Transactional
    public Submission submitSubmission(Long studentId, Long registrationId, String fileName, String fileUrl, Long fileSize) {
        Registration reg = registrationService.getById(registrationId);
        if (reg == null) {
            throw new BusinessException("关联的报名表不存在");
        }
        if (!reg.getStudentId().equals(studentId)) {
            throw new BusinessException("您无权为此报名表提交成果附件");
        }

        reg.setStatus("审核中");
        registrationService.updateById(reg);

        Submission sub = new Submission();
        sub.setRegistrationId(registrationId);
        sub.setCompetitionId(reg.getCompetitionId());
        sub.setSubmitterId(studentId);
        sub.setFileName(fileName);
        sub.setFileUrl(fileUrl);
        sub.setFileSize(fileSize != null ? fileSize : 0L);
        sub.setUploadDate(LocalDateTime.now());
        sub.setStatus("待审核");
        sub.setReviewNote(null);
        sub.setApproved(null);
        sub.setDisplayed(false);

        this.save(sub);

        // also link the submitter themselves
        SubmissionStudent ss = new SubmissionStudent();
        ss.setSubmissionId(sub.getId());
        ss.setStudentId(studentId);
        submissionStudentService.save(ss);

        Competition comp = competitionService.getById(reg.getCompetitionId());
        String compName = comp != null ? comp.getName() : "未知赛事";
        reviewTaskService.createPending("competition", reg.getCompetitionId(), "submission",
                sub.getId(), studentId, "成果审核：" + compName,
                comp != null ? comp.getCompetitionEnd() : null,
                JSONUtil.toJsonStr(Map.of(
                        "competitionName", compName,
                        "fileName", fileName,
                        "registrationId", registrationId
                )));

        return sub;
    }

    @Override
    @Transactional
    public List<Submission> submitTeamSubmission(Long submitterId, Long competitionId, String fileName, String fileUrl, Long fileSize, List<Long> studentIds) {
        Competition comp = competitionService.getById(competitionId);
        if (comp == null) {
            throw new BusinessException("赛事不存在");
        }
        if (CollUtil.isEmpty(studentIds)) {
            throw new BusinessException("至少选择一名关联学生");
        }

        Submission sub = new Submission();
        sub.setRegistrationId(null);
        sub.setCompetitionId(competitionId);
        sub.setSubmitterId(submitterId);
        sub.setFileName(fileName);
        sub.setFileUrl(fileUrl);
        sub.setFileSize(fileSize != null ? fileSize : 0L);
        sub.setUploadDate(LocalDateTime.now());
        sub.setStatus("待审核");
        sub.setReviewNote(null);
        sub.setApproved(null);
        sub.setDisplayed(false);

        this.save(sub);

        // link all students
        List<SubmissionStudent> links = studentIds.stream().map(sid -> {
            SubmissionStudent ss = new SubmissionStudent();
            ss.setSubmissionId(sub.getId());
            ss.setStudentId(sid);
            return ss;
        }).collect(Collectors.toList());
        submissionStudentService.saveBatch(links);

        reviewTaskService.createPending("competition", competitionId, "submission",
                sub.getId(), submitterId, "团队成果审核：" + comp.getName(), comp.getCompetitionEnd(),
                JSONUtil.toJsonStr(Map.of(
                        "competitionName", comp.getName(),
                        "fileName", fileName,
                        "studentIds", studentIds
                )));

        List<Submission> result = new ArrayList<>();
        result.add(sub);
        return result;
    }

    @Override
    @Transactional
    public void reviewSubmission(Long teacherId, Long submissionId, Boolean approve, String reviewNote) {
        Submission sub = this.getById(submissionId);
        if (sub == null) {
            throw new BusinessException("成果附件记录不存在");
        }
        if (!"待审核".equalsIgnoreCase(sub.getStatus())) {
            throw new BusinessException("该成果已审核过，请勿重复处理");
        }

        // Resolve competition name
        Long compId = sub.getCompetitionId();
        if (compId == null && sub.getRegistrationId() != null) {
            Registration reg = registrationService.getById(sub.getRegistrationId());
            if (reg != null) compId = reg.getCompetitionId();
        }
        Competition comp = compId != null ? competitionService.getById(compId) : null;
        String compName = comp != null ? comp.getName() : "未知赛事";

        sub.setStatus("已审核");
        sub.setReviewNote(reviewNote);
        sub.setApproved(Boolean.TRUE.equals(approve));
        this.updateById(sub);
        reviewTaskService.resolveTarget("submission", submissionId, teacherId, reviewNote);

        // Update registration status if linked
        if (sub.getRegistrationId() != null) {
            Registration reg = registrationService.getById(sub.getRegistrationId());
            if (reg != null) {
                reg.setStatus(Boolean.TRUE.equals(approve) ? "审核通过" : "审核驳回");
                registrationService.updateById(reg);
            }
        }

        // Notify all linked students
        List<SubmissionStudent> links = submissionStudentService.list(
                new LambdaQueryWrapper<SubmissionStudent>().eq(SubmissionStudent::getSubmissionId, submissionId));
        List<Long> notifyStudentIds = links.stream().map(SubmissionStudent::getStudentId).collect(Collectors.toList());

        String title = Boolean.TRUE.equals(approve) ? "您的成果附件已审核通过" : "您的成果附件已被驳回";
        String content;
        if (Boolean.TRUE.equals(approve)) {
            content = String.format("恭喜！您在“%s”中提交的成果文件“%s”已审核通过。评语：%s", compName, sub.getFileName(), reviewNote);
        } else {
            content = String.format("很遗憾，您在“%s”中提交的成果文件“%s”未通过审核。驳回理由：%s", compName, sub.getFileName(), reviewNote);
        }

        for (Long sid : notifyStudentIds) {
            Message msg = new Message();
            msg.setFromUser(teacherId);
            msg.setToUser(sid);
            msg.setTitle(title);
            msg.setContent(content);
            msg.setIsRead(0);
            msg.setCreateTime(LocalDateTime.now());
            messageService.save(msg);

            if (Boolean.TRUE.equals(approve)) {
                GrowthRecord record = new GrowthRecord();
                record.setStudentId(sid);
                record.setCompetitionId(compId);
                record.setRecordType("award");
                record.setTitle(String.format("完成了在“%s”中的成果提交并审核通过", compName));
                record.setHappenTime(LocalDateTime.now());
                growthRecordService.save(record);
            }
        }
    }

    @Override
    public Page<SubmissionVO> listSubmissions(int current, int size, String status, String keyword) {
        Page<Submission> page = new Page<>(current, size);
        LambdaQueryWrapper<Submission> wrapper = new LambdaQueryWrapper<>();

        if ("审核通过".equals(status)) {
            wrapper.eq(Submission::getStatus, "已审核").eq(Submission::getApproved, true);
        } else if ("审核驳回".equals(status)) {
            wrapper.eq(Submission::getStatus, "已审核").eq(Submission::getApproved, false);
        } else if (StrUtil.isNotBlank(status)) {
            wrapper.eq(Submission::getStatus, status);
        }

        if (StrUtil.isNotBlank(keyword)) {
            wrapper.like(Submission::getFileName, keyword);
        }
        wrapper.orderByDesc(Submission::getUploadDate);

        Page<Submission> raw = this.page(page, wrapper);
        Page<SubmissionVO> voPage = new Page<>(raw.getCurrent(), raw.getSize(), raw.getTotal());
        voPage.setRecords(joinSubmissionVOs(raw.getRecords()));
        return voPage;
    }

    @Override
    public List<SubmissionVO> listMySubmissions(Long studentId) {
        // Find submissions linked to this student via submission_student
        List<SubmissionStudent> links = submissionStudentService.list(
                new LambdaQueryWrapper<SubmissionStudent>().eq(SubmissionStudent::getStudentId, studentId));
        if (CollUtil.isEmpty(links)) return new ArrayList<>();

        List<Long> subIds = links.stream().map(SubmissionStudent::getSubmissionId).distinct().collect(Collectors.toList());
        List<Submission> subs = this.listByIds(subIds);
        subs.sort((a, b) -> b.getUploadDate().compareTo(a.getUploadDate()));
        return joinSubmissionVOs(subs);
    }

    @Override
    public List<SubmissionVO> listExcellent() {
        List<Submission> list = this.list(new LambdaQueryWrapper<Submission>()
                .eq(Submission::getStatus, "已审核")
                .eq(Submission::getApproved, true)
                .eq(Submission::getDisplayed, true)
                .orderByDesc(Submission::getUploadDate));
        return joinSubmissionVOs(list);
    }

    @Override
    public void toggleDisplay(Long submissionId, Boolean displayed) {
        Submission sub = this.getById(submissionId);
        if (sub == null) {
            throw new BusinessException("成果附件记录不存在");
        }
        if (Boolean.TRUE.equals(displayed)) {
            if (!"已审核".equals(sub.getStatus()) || !Boolean.TRUE.equals(sub.getApproved())) {
                throw new BusinessException("只能展示审核通过的作品");
            }
        }
        sub.setDisplayed(Boolean.TRUE.equals(displayed));
        this.updateById(sub);
    }

    @Override
    public void updateReviewNote(Long submissionId, String reviewNote) {
        Submission sub = this.getById(submissionId);
        if (sub == null) {
            throw new BusinessException("成果附件记录不存在");
        }
        sub.setReviewNote(reviewNote);
        this.updateById(sub);
    }

    @Override
    @Transactional
    public Submission adminCreateExcellent(Long competitionId, String fileName, String fileUrl, Long fileSize, String reviewNote) {
        Competition comp = competitionService.getById(competitionId);
        if (comp == null) {
            throw new BusinessException("关联的赛事不存在");
        }

        Submission sub = new Submission();
        sub.setRegistrationId(null);
        sub.setCompetitionId(competitionId);
        sub.setFileName(fileName);
        sub.setFileUrl(fileUrl);
        sub.setFileSize(fileSize != null ? fileSize : 0L);
        sub.setUploadDate(LocalDateTime.now());
        sub.setStatus("已审核");
        sub.setReviewNote(reviewNote);
        sub.setApproved(true);
        sub.setDisplayed(true);
        this.save(sub);
        return sub;
    }

    private List<SubmissionVO> joinSubmissionVOs(List<Submission> subs) {
        if (CollUtil.isEmpty(subs)) return new ArrayList<>();

        // Registration-based lookups (for legacy submissions)
        List<Long> regIds = subs.stream().map(Submission::getRegistrationId)
                .filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());
        Map<Long, Registration> regMap = CollUtil.isEmpty(regIds) ? Collections.emptyMap()
                : registrationService.listByIds(regIds).stream()
                    .collect(Collectors.toMap(Registration::getId, r -> r, (a, b) -> a));

        // Collect all competition IDs (from both direct field and registration)
        List<Long> compIds = subs.stream().map(s -> {
            if (s.getCompetitionId() != null) return s.getCompetitionId();
            Registration r = regMap.get(s.getRegistrationId());
            return r != null ? r.getCompetitionId() : null;
        }).filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());

        // Collect all student IDs (submitter + registration student)
        List<Long> studentIds = new ArrayList<>();
        subs.stream().map(Submission::getSubmitterId).filter(java.util.Objects::nonNull).forEach(studentIds::add);
        regMap.values().stream().map(Registration::getStudentId).filter(java.util.Objects::nonNull).forEach(studentIds::add);
        studentIds = studentIds.stream().distinct().collect(Collectors.toList());

        Map<Long, User> studentMap = CollUtil.isEmpty(studentIds) ? Collections.emptyMap()
                : userService.listByIds(studentIds).stream()
                    .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        Map<Long, Competition> compMap = CollUtil.isEmpty(compIds) ? Collections.emptyMap()
                : competitionService.listByIds(compIds).stream()
                    .collect(Collectors.toMap(Competition::getId, c -> c, (a, b) -> a));

        // Batch-load submission_student links
        List<Long> subIds = subs.stream().map(Submission::getId).collect(Collectors.toList());
        Map<Long, List<SubmissionStudent>> linksMap = submissionStudentService.list(
                new LambdaQueryWrapper<SubmissionStudent>().in(SubmissionStudent::getSubmissionId, subIds))
                .stream().collect(Collectors.groupingBy(SubmissionStudent::getSubmissionId));

        // Collect all student IDs from links for team member lookup
        List<Long> allLinkedStudentIds = linksMap.values().stream()
                .flatMap(List::stream).map(SubmissionStudent::getStudentId)
                .filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());
        Map<Long, User> linkedStudentMap = CollUtil.isEmpty(allLinkedStudentIds) ? Collections.emptyMap()
                : userService.listByIds(allLinkedStudentIds).stream()
                    .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        return subs.stream().map(s -> {
            SubmissionVO vo = new SubmissionVO();
            vo.setId(s.getId());
            vo.setRegistrationId(s.getRegistrationId());
            vo.setFileName(s.getFileName());
            vo.setFileUrl(s.getFileUrl());
            vo.setFileSize(s.getFileSize());
            vo.setUploadDate(s.getUploadDate());
            vo.setStatus(s.getStatus());
            vo.setReviewNote(s.getReviewNote());
            vo.setApproved(s.getApproved());
            vo.setDisplayed(Boolean.TRUE.equals(s.getDisplayed()));

            // Student info: prefer registration student, fallback to submitter
            Long effectiveStudentId = null;
            Registration r = regMap.get(s.getRegistrationId());
            if (r != null) {
                effectiveStudentId = r.getStudentId();
            } else if (s.getSubmitterId() != null) {
                effectiveStudentId = s.getSubmitterId();
            }
            if (effectiveStudentId != null) {
                User u = studentMap.get(effectiveStudentId);
                if (u != null) {
                    vo.setStudentId(u.getId());
                    vo.setStudentName(u.getRealName());
                    vo.setStudentNo(u.getUsername());
                    vo.setCollege(u.getCollege());
                    vo.setMajor(u.getMajor());
                    vo.setClassName(u.getClassName());
                }
            }

            // Competition info: prefer direct field, fallback to registration
            Long effectiveCompId = s.getCompetitionId();
            if (effectiveCompId == null && r != null) {
                effectiveCompId = r.getCompetitionId();
            }
            if (effectiveCompId != null) {
                Competition c = compMap.get(effectiveCompId);
                if (c != null) {
                    vo.setCompetitionId(c.getId());
                    vo.setCompetitionName(c.getName());
                    vo.setCompetitionLevel(c.getLevel());
                    vo.setCompetitionCategory(c.getCategory());
                    String tags = c.getTags();
                    if (StrUtil.isNotBlank(tags) && JSONUtil.isTypeJSON(tags)) {
                        vo.setCompetitionTags(JSONUtil.toList(tags, String.class));
                    } else {
                        vo.setCompetitionTags(new ArrayList<>());
                    }
                }
            }

            // Submitter info
            if (s.getSubmitterId() != null) {
                User submitter = studentMap.get(s.getSubmitterId());
                if (submitter != null) {
                    vo.setSubmitterId(submitter.getId());
                    vo.setSubmitterName(submitter.getRealName());
                }
            }

            // Team members from submission_student
            List<SubmissionStudent> links = linksMap.getOrDefault(s.getId(), Collections.emptyList());
            List<SubmissionVO.TeamMemberVO> teamMembers = links.stream().map(link -> {
                User u = linkedStudentMap.get(link.getStudentId());
                if (u == null) return null;
                SubmissionVO.TeamMemberVO tm = new SubmissionVO.TeamMemberVO();
                tm.setStudentId(u.getId());
                tm.setStudentName(u.getRealName());
                tm.setStudentNo(u.getUsername());
                return tm;
            }).filter(java.util.Objects::nonNull).collect(Collectors.toList());
            vo.setTeamMembers(teamMembers);

            return vo;
        }).collect(Collectors.toList());
    }
}
