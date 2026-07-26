package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.ReviewTaskActionDTO;
import com.etsaion.dto.ReviewTaskBatchActionDTO;
import com.etsaion.entity.Activity;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.Message;
import com.etsaion.entity.Participation;
import com.etsaion.entity.ReviewTask;
import com.etsaion.entity.User;
import com.etsaion.enums.AuditAction;
import com.etsaion.enums.ParticipationStatus;
import com.etsaion.enums.RegistrationStatus;
import com.etsaion.enums.ReviewNotes;
import com.etsaion.enums.ReviewTargetType;
import com.etsaion.enums.ReviewTaskStatus;
import com.etsaion.enums.SubmissionStatus;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.ReviewTaskMapper;
import com.etsaion.service.ActivityService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.MessageService;
import com.etsaion.service.ParticipationService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.UserService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.ReviewTaskVO;
import lombok.extern.slf4j.Slf4j;
import com.etsaion.entity.Competition;
import com.etsaion.entity.Registration;
import com.etsaion.entity.Submission;
import com.etsaion.service.CompetitionService;
import com.etsaion.mapper.RegistrationMapper;
import com.etsaion.mapper.SubmissionMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ReviewTaskServiceImpl extends ServiceImpl<ReviewTaskMapper, ReviewTask> implements ReviewTaskService {

    @Autowired
    private UserService userService;

    @Autowired
    private ParticipationService participationService;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private MessageService messageService;

    @Autowired
    private GrowthRecordService growthRecordService;

    @Autowired
    @Lazy
    private RegistrationService registrationService;

    @Autowired
    @Lazy
    private SubmissionService submissionService;

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private RegistrationMapper registrationMapper;

    @Autowired
    private SubmissionMapper submissionMapper;

    @Override
    @Transactional
    public ReviewTask createPending(String activityType, Long activityId, String targetType, Long targetId,
                                    Long submitterId, String title, LocalDateTime deadline, String payloadJson) {
        ReviewTask existing = this.getOne(new LambdaQueryWrapper<ReviewTask>()
                .eq(ReviewTask::getTargetType, targetType)
                .eq(ReviewTask::getTargetId, targetId)
                .in(ReviewTask::getStatus, ReviewTaskStatus.OPEN)
                .last("LIMIT 1"));
        if (existing != null) {
            return existing;
        }

        ReviewTask task = new ReviewTask();
        task.setActivityType(StrUtil.blankToDefault(activityType, "competition"));
        task.setActivityId(activityId);
        task.setTargetType(targetType);
        task.setTargetId(targetId);
        task.setSubmitterId(submitterId);
        task.setTitle(title);
        task.setStatus(ReviewTaskStatus.PENDING.getValue());
        task.setDeadline(deadline);
        task.setPayloadJson(StrUtil.blankToDefault(payloadJson, "{}"));
        task.setCreateTime(LocalDateTime.now());
        task.setUpdateTime(LocalDateTime.now());
        this.save(task);
        return task;
    }

    @Override
    public Page<ReviewTaskVO> listTasks(int current, int size, String status, String activityType,
                                        String targetType, String keyword) {
        Page<ReviewTask> page = new Page<>(current, size);
        LambdaQueryWrapper<ReviewTask> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StrUtil.isNotBlank(status), ReviewTask::getStatus, status)
                .eq(StrUtil.isNotBlank(activityType), ReviewTask::getActivityType, activityType)
                .eq(StrUtil.isNotBlank(targetType), ReviewTask::getTargetType, targetType)
                .like(StrUtil.isNotBlank(keyword), ReviewTask::getTitle, keyword);

        // Apply college filter at query level for teachers
        String scopedCollege = currentReviewerCollege();
        if (StrUtil.isNotBlank(scopedCollege)) {
            List<User> collegeStudents = userService.list(new LambdaQueryWrapper<User>()
                    .eq(User::getRole, "student")
                    .eq(User::getCollege, scopedCollege)
                    .select(User::getId));
            List<Long> collegeStudentIds = collegeStudents.stream().map(User::getId).collect(Collectors.toList());
            if (collegeStudentIds.isEmpty()) {
                Page<ReviewTaskVO> emptyPage = new Page<>(current, size, 0);
                emptyPage.setRecords(new ArrayList<>());
                return emptyPage;
            }
            wrapper.in(ReviewTask::getSubmitterId, collegeStudentIds);
        }

        wrapper.orderByAsc(ReviewTask::getDeadline)
                .orderByDesc(ReviewTask::getCreateTime);
        Page<ReviewTask> raw = this.page(page, wrapper);
        Page<ReviewTaskVO> voPage = new Page<>(raw.getCurrent(), raw.getSize(), raw.getTotal());
        voPage.setRecords(toVOList(raw.getRecords()));
        return voPage;
    }

    private String currentReviewerCollege() {
        String role = UserContext.getUserRole();
        if (!"teacher".equalsIgnoreCase(role)) {
            return null;
        }
        Long userId = UserContext.getUserId();
        if (userId == null) {
            return null;
        }
        User reviewer = userService.getById(userId);
        return reviewer != null ? reviewer.getCollege() : null;
    }

    @Override
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();

        String college = currentReviewerCollege();
        java.util.List<Long> collegeStudentIds = null;
        if (StrUtil.isNotBlank(college)) {
            collegeStudentIds = userService.list(new LambdaQueryWrapper<User>()
                    .eq(User::getRole, "student")
                    .eq(User::getCollege, college)
                    .select(User::getId))
                    .stream().map(User::getId).collect(Collectors.toList());
            if (collegeStudentIds.isEmpty()) {
                for (ReviewTaskStatus status : ReviewTaskStatus.values()) {
                    stats.put(status.getValue(), 0L);
                }
                stats.put("competition", 0L);
                stats.put("volunteer", 0L);
                stats.put("culture_sports", 0L);
                stats.put("overdue", 0L);
                return stats;
            }
        }

        final java.util.List<Long> ids = collegeStudentIds;

        for (ReviewTaskStatus status : ReviewTaskStatus.values()) {
            stats.put(status.getValue(), this.count(buildStatsWrapper(ids, status.getValue(), null, null)));
        }
        stats.put("competition", this.count(buildStatsWrapper(ids, null, "competition", null)));
        stats.put("volunteer", this.count(buildStatsWrapper(ids, null, "volunteer", null)));
        stats.put("culture_sports", this.count(buildStatsWrapper(ids, null, "culture_sports", null)));
        stats.put("overdue", this.count(
                buildStatsWrapper(ids, ReviewTaskStatus.PENDING.getValue(), null, true)));
        return stats;
    }

    private LambdaQueryWrapper<ReviewTask> buildStatsWrapper(
            java.util.List<Long> studentIds, String status, String activityType, Boolean overdue) {
        LambdaQueryWrapper<ReviewTask> w = new LambdaQueryWrapper<>();
        if (studentIds != null) {
            w.in(ReviewTask::getSubmitterId, studentIds);
        }
        if (status != null) w.eq(ReviewTask::getStatus, status);
        if (activityType != null) w.eq(ReviewTask::getActivityType, activityType);
        if (Boolean.TRUE.equals(overdue)) w.lt(ReviewTask::getDeadline, LocalDateTime.now());
        return w;
    }

    @Override
    @Transactional
    public void handleTask(Long taskId, Long reviewerId, ReviewTaskActionDTO dto) {
        ReviewTask task = this.getById(taskId);
        if (task == null) {
            throw new BusinessException("待办任务不存在");
        }
        if (!ReviewTaskStatus.isOpen(task.getStatus())) {
            throw new BusinessException("该待办已处理");
        }

        AuditAction action = AuditAction.from(dto.getAction());
        // 审核意见一律以纯文本流转；旧调用方可能还带着退回标记，在入口剥掉
        String note = ReviewNotes.strip(dto.getReviewNote());
        log.info("处理待办任务: taskId={}, 动作={}, 类型={}", taskId, action, task.getTargetType());
        if (action.requiresNote() && StrUtil.isBlank(note)) {
            throw new BusinessException("驳回或退回补充时必须填写审核意见");
        }

        ReviewTargetType targetType = ReviewTargetType.from(task.getTargetType());
        if (targetType == null) {
            throw new BusinessException("不支持的待办类型");
        }
        switch (targetType) {
            case REGISTRATION:
                registrationService.audit(task.getTargetId(), reviewerId, action, note);
                break;
            case SUBMISSION:
                submissionService.reviewSubmission(reviewerId, task.getTargetId(), action, note);
                break;
            case PARTICIPATION:
                resolveParticipation(task, reviewerId, action, note);
                break;
            default:
                throw new BusinessException("不支持的待办类型");
        }

        resolveTarget(task.getTargetType(), task.getTargetId(), reviewerId, note);
    }

    @Override
    @Transactional
    public void handleTasks(Long reviewerId, ReviewTaskBatchActionDTO dto) {
        for (Long taskId : dto.getTaskIds()) {
            ReviewTaskActionDTO action = new ReviewTaskActionDTO();
            action.setAction(dto.getAction());
            action.setReviewNote(dto.getReviewNote());
            handleTask(taskId, reviewerId, action);
        }
    }

    @Override
    @Transactional
    public void resolveTarget(String targetType, Long targetId, Long reviewerId, String reviewNote) {
        List<ReviewTask> tasks = this.list(new LambdaQueryWrapper<ReviewTask>()
                .eq(ReviewTask::getTargetType, targetType)
                .eq(ReviewTask::getTargetId, targetId)
                .in(ReviewTask::getStatus, ReviewTaskStatus.OPEN));
        for (ReviewTask task : tasks) {
            task.setStatus(ReviewTaskStatus.RESOLVED.getValue());
            task.setReviewerId(reviewerId);
            task.setReviewNote(reviewNote);
            task.setUpdateTime(LocalDateTime.now());
            this.updateById(task);
        }
    }

    private void resolveParticipation(ReviewTask task, Long reviewerId, AuditAction action, String note) {
        Participation participation = participationService.getById(task.getTargetId());
        if (participation == null) {
            throw new BusinessException("参与记录不存在");
        }

        participation.setStatus(ParticipationStatus.resultOf(action).getValue());
        participation.setReviewNote(note);
        participation.setReviewerId(reviewerId);
        participation.setReviewTime(LocalDateTime.now());
        participationService.updateById(participation);

        Activity activity = activityService.getById(participation.getActivityId());
        String activityTitle = activity != null ? activity.getTitle() : "未知活动";

        String title;
        String outcome;
        switch (action) {
            case APPROVE:
                title = "活动报名审核已通过";
                outcome = "已审核通过";
                break;
            case RETURN:
                title = "活动报名需要补充材料";
                outcome = "已退回补充";
                break;
            case REJECT:
            default:
                title = "活动报名审核未通过";
                outcome = "未通过审核";
                break;
        }

        Message msg = new Message();
        msg.setFromUser(reviewerId);
        msg.setToUser(participation.getStudentId());
        msg.setTitle(title);
        msg.setContent(String.format("您提交的“%s”活动报名%s。%s", activityTitle, outcome,
                StrUtil.blankToDefault(note, "")));
        msg.setIsRead(0);
        msg.setCreateTime(LocalDateTime.now());
        messageService.save(msg);

        if (action.isApprove()) {
            GrowthRecord record = new GrowthRecord();
            record.setStudentId(participation.getStudentId());
            record.setCompetitionId(participation.getActivityId());
            record.setRecordType(activity != null ? StrUtil.blankToDefault(activity.getType(), "activity") : "activity");
            record.setTitle(String.format("完成了“%s”活动报名审核", activityTitle));
            record.setHappenTime(LocalDateTime.now());
            growthRecordService.save(record);
        }
    }

    @Override
    @Transactional
    public int backfillHistorical() {
        int created = 0;

        for (Registration reg : registrationMapper.selectList(null)) {
            Competition comp = competitionService.getById(reg.getCompetitionId());
            String compName = comp != null ? comp.getName() : "未知赛事";
            String payload = JSONUtil.toJsonStr(java.util.Map.of(
                    "competitionName", compName,
                    "teamName", StrUtil.nullToEmpty(reg.getTeamName()),
                    "track", StrUtil.nullToEmpty(reg.getTrack())
            ));

            RegistrationStatus status = RegistrationStatus.from(reg.getStatus());
            if (status == null) {
                continue;
            }
            created += backfillOne(ReviewTargetType.REGISTRATION, reg.getId(), reg.getCompetitionId(),
                    reg.getStudentId(), "赛事报名审核：" + compName,
                    comp != null ? comp.getEndTime() : null, payload,
                    status.isReviewable(), reg.getSubmitDate());
        }

        for (Submission sub : submissionMapper.selectList(null)) {
            Long compId = sub.getCompetitionId();
            if (compId == null && sub.getRegistrationId() != null) {
                Registration reg = registrationMapper.selectById(sub.getRegistrationId());
                if (reg != null) compId = reg.getCompetitionId();
            }
            Competition comp = compId != null ? competitionService.getById(compId) : null;
            String compName = comp != null ? comp.getName() : "未知赛事";

            java.util.Map<String, Object> subPayload = new java.util.HashMap<>();
            subPayload.put("competitionName", compName);
            subPayload.put("fileName", StrUtil.nullToEmpty(sub.getFileName()));
            subPayload.put("registrationId", sub.getRegistrationId());

            SubmissionStatus status = SubmissionStatus.from(sub.getStatus());
            if (status == null) {
                continue;
            }
            created += backfillOne(ReviewTargetType.SUBMISSION, sub.getId(), compId,
                    sub.getSubmitterId(), "成果审核：" + compName,
                    comp != null ? comp.getCompetitionEnd() : null, JSONUtil.toJsonStr(subPayload),
                    status == SubmissionStatus.PENDING, sub.getUploadDate());
        }

        return created;
    }

    /**
     * 给一条历史记录补一个待办：还没审的补 pending，审完的补一条已结案的存档。
     * 已经有对应待办则跳过，因此可以重复执行。
     *
     * @return 是否新建了待办（0 或 1）
     */
    private int backfillOne(ReviewTargetType targetType, Long targetId, Long activityId, Long submitterId,
                            String title, LocalDateTime deadline, String payload,
                            boolean stillOpen, LocalDateTime happenedAt) {
        boolean exists = this.getOne(new LambdaQueryWrapper<ReviewTask>()
                .eq(ReviewTask::getTargetType, targetType.getValue())
                .eq(ReviewTask::getTargetId, targetId)
                .in(ReviewTask::getStatus, stillOpen
                        ? ReviewTaskStatus.OPEN
                        : List.of(ReviewTaskStatus.RESOLVED.getValue()))
                .last("LIMIT 1")) != null;
        if (exists) {
            return 0;
        }

        if (stillOpen) {
            createPending("competition", activityId, targetType.getValue(),
                    targetId, submitterId, title, deadline, payload);
        } else {
            ReviewTask task = new ReviewTask();
            task.setActivityType("competition");
            task.setActivityId(activityId);
            task.setTargetType(targetType.getValue());
            task.setTargetId(targetId);
            task.setSubmitterId(submitterId);
            task.setTitle(title);
            task.setStatus(ReviewTaskStatus.RESOLVED.getValue());
            task.setDeadline(deadline);
            task.setPayloadJson(payload);
            task.setCreateTime(happenedAt);
            task.setUpdateTime(happenedAt);
            this.save(task);
        }
        return 1;
    }

    private List<ReviewTaskVO> toVOList(List<ReviewTask> tasks) {
        if (CollUtil.isEmpty(tasks)) return new ArrayList<>();
        List<Long> userIds = tasks.stream().map(ReviewTask::getSubmitterId)
                .filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());
        Map<Long, User> userMap = CollUtil.isEmpty(userIds) ? new HashMap<>()
                : userService.listByIds(userIds).stream().collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        // Batch-load submissions for 'submission' targets
        List<Long> subTargetIds = tasks.stream()
                .filter(t -> ReviewTargetType.SUBMISSION.matches(t.getTargetType()))
                .map(ReviewTask::getTargetId).filter(java.util.Objects::nonNull)
                .distinct().collect(Collectors.toList());
        Map<Long, Submission> subMap = CollUtil.isEmpty(subTargetIds) ? new HashMap<>()
                : submissionMapper.selectBatchIds(subTargetIds).stream()
                    .collect(Collectors.toMap(Submission::getId, s -> s, (a, b) -> a));

        // For 'registration' targets, find the latest linked submission to get fileUrl/fileName
        List<Long> regTargetIds = tasks.stream()
                .filter(t -> ReviewTargetType.REGISTRATION.matches(t.getTargetType()))
                .map(ReviewTask::getTargetId).filter(java.util.Objects::nonNull)
                .distinct().collect(Collectors.toList());
        Map<Long, Submission> regSubMap = new HashMap<>();
        if (!CollUtil.isEmpty(regTargetIds)) {
            List<Submission> regSubs = submissionMapper.selectList(
                    new LambdaQueryWrapper<Submission>()
                            .in(Submission::getRegistrationId, regTargetIds)
                            .orderByDesc(Submission::getUploadDate));
            for (Submission s : regSubs) {
                regSubMap.putIfAbsent(s.getRegistrationId(), s);
            }
        }

        return tasks.stream().map(task -> {
            ReviewTaskVO vo = new ReviewTaskVO();
            BeanUtils.copyProperties(task, vo);
            Map<String, Object> payload = parsePayload(task.getPayloadJson());
            User user = userMap.get(task.getSubmitterId());
            if (user != null) {
                vo.setSubmitterName(user.getRealName());
                vo.setSubmitterNo(user.getUsername());
                vo.setCollege(user.getCollege());
                vo.setMajor(user.getMajor());
                vo.setClassName(user.getClassName());
            }

            Submission sub = null;
            if (ReviewTargetType.SUBMISSION.matches(task.getTargetType())) {
                sub = subMap.get(task.getTargetId());
            } else if (ReviewTargetType.REGISTRATION.matches(task.getTargetType())) {
                sub = regSubMap.get(task.getTargetId());
            }
            if (sub != null) {
                if (StrUtil.isNotBlank(sub.getFileUrl())) payload.putIfAbsent("fileUrl", sub.getFileUrl());
                if (StrUtil.isNotBlank(sub.getFileName())) payload.putIfAbsent("fileName", sub.getFileName());
                if (sub.getFileSize() != null) payload.putIfAbsent("fileSize", sub.getFileSize());
            }
            vo.setPayload(payload);
            return vo;
        }).collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsePayload(String json) {
        if (StrUtil.isBlank(json) || !JSONUtil.isTypeJSON(json)) return new HashMap<>();
        return JSONUtil.toBean(json, Map.class);
    }

}
