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
import com.etsaion.vo.ReviewTaskVO;
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

    @Override
    @Transactional
    public ReviewTask createPending(String activityType, Long activityId, String targetType, Long targetId,
                                    Long submitterId, String title, LocalDateTime deadline, String payloadJson) {
        ReviewTask existing = this.getOne(new LambdaQueryWrapper<ReviewTask>()
                .eq(ReviewTask::getTargetType, targetType)
                .eq(ReviewTask::getTargetId, targetId)
                .in(ReviewTask::getStatus, "pending", "processing")
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
        task.setStatus("pending");
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
                .like(StrUtil.isNotBlank(keyword), ReviewTask::getTitle, keyword)
                .orderByAsc(ReviewTask::getDeadline)
                .orderByDesc(ReviewTask::getCreateTime);
        Page<ReviewTask> raw = this.page(page, wrapper);
        Page<ReviewTaskVO> voPage = new Page<>(raw.getCurrent(), raw.getSize(), raw.getTotal());
        voPage.setRecords(toVOList(raw.getRecords()));
        return voPage;
    }

    @Override
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("pending", this.count(new LambdaQueryWrapper<ReviewTask>().eq(ReviewTask::getStatus, "pending")));
        stats.put("processing", this.count(new LambdaQueryWrapper<ReviewTask>().eq(ReviewTask::getStatus, "processing")));
        stats.put("resolved", this.count(new LambdaQueryWrapper<ReviewTask>().eq(ReviewTask::getStatus, "resolved")));
        stats.put("competition", this.count(new LambdaQueryWrapper<ReviewTask>().eq(ReviewTask::getActivityType, "competition")));
        stats.put("volunteer", this.count(new LambdaQueryWrapper<ReviewTask>().eq(ReviewTask::getActivityType, "volunteer")));
        stats.put("overdue", this.count(new LambdaQueryWrapper<ReviewTask>()
                .eq(ReviewTask::getStatus, "pending")
                .lt(ReviewTask::getDeadline, LocalDateTime.now())));
        return stats;
    }

    @Override
    @Transactional
    public void handleTask(Long taskId, Long reviewerId, ReviewTaskActionDTO dto) {
        ReviewTask task = this.getById(taskId);
        if (task == null) {
            throw new BusinessException("待办任务不存在");
        }
        if (!"pending".equalsIgnoreCase(task.getStatus()) && !"processing".equalsIgnoreCase(task.getStatus())) {
            throw new BusinessException("该待办已处理");
        }

        String action = normalizeAction(dto.getAction());
        String note = dto.getReviewNote();
        if (("reject".equals(action) || "return".equals(action)) && StrUtil.isBlank(note)) {
            throw new BusinessException("驳回或退回补充时必须填写审核意见");
        }

        if ("registration".equalsIgnoreCase(task.getTargetType())) {
            registrationService.audit(task.getTargetId(), reviewerId, "approve".equals(action),
                    "return".equals(action) ? "【退回补充】" + note : note);
        } else if ("submission".equalsIgnoreCase(task.getTargetType())) {
            submissionService.reviewSubmission(reviewerId, task.getTargetId(), "approve".equals(action),
                    "return".equals(action) ? "【退回补充】" + note : note);
        } else if ("participation".equalsIgnoreCase(task.getTargetType())) {
            resolveParticipation(task, reviewerId, action, note);
        } else {
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
                .in(ReviewTask::getStatus, "pending", "processing"));
        for (ReviewTask task : tasks) {
            task.setStatus("resolved");
            task.setReviewerId(reviewerId);
            task.setReviewNote(reviewNote);
            task.setUpdateTime(LocalDateTime.now());
            this.updateById(task);
        }
    }

    private void resolveParticipation(ReviewTask task, Long reviewerId, String action, String note) {
        Participation participation = participationService.getById(task.getTargetId());
        if (participation == null) {
            throw new BusinessException("参与记录不存在");
        }

        String newStatus = "approve".equals(action) ? "approved" : ("return".equals(action) ? "returned" : "rejected");
        participation.setStatus(newStatus);
        participation.setReviewNote(note);
        participation.setReviewerId(reviewerId);
        participation.setReviewTime(LocalDateTime.now());
        participationService.updateById(participation);

        Activity activity = activityService.getById(participation.getActivityId());
        String activityTitle = activity != null ? activity.getTitle() : "未知活动";

        Message msg = new Message();
        msg.setFromUser(reviewerId);
        msg.setToUser(participation.getStudentId());
        msg.setTitle("approve".equals(action) ? "活动报名审核已通过" : ("return".equals(action) ? "活动报名需要补充材料" : "活动报名审核未通过"));
        msg.setContent(String.format("您提交的“%s”活动报名%s。%s", activityTitle,
                "approve".equals(action) ? "已审核通过" : ("return".equals(action) ? "已退回补充" : "未通过审核"),
                StrUtil.blankToDefault(note, "")));
        msg.setIsRead(0);
        msg.setCreateTime(LocalDateTime.now());
        messageService.save(msg);

        if ("approve".equals(action)) {
            GrowthRecord record = new GrowthRecord();
            record.setStudentId(participation.getStudentId());
            record.setCompetitionId(participation.getActivityId());
            record.setRecordType(activity != null && "volunteer".equalsIgnoreCase(activity.getType()) ? "volunteer" : "activity");
            record.setTitle(String.format("完成了“%s”活动报名审核", activityTitle));
            record.setHappenTime(LocalDateTime.now());
            growthRecordService.save(record);
        }
    }

    private List<ReviewTaskVO> toVOList(List<ReviewTask> tasks) {
        if (CollUtil.isEmpty(tasks)) return new ArrayList<>();
        List<Long> userIds = tasks.stream().map(ReviewTask::getSubmitterId)
                .filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());
        Map<Long, User> userMap = CollUtil.isEmpty(userIds) ? new HashMap<>()
                : userService.listByIds(userIds).stream().collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        return tasks.stream().map(task -> {
            ReviewTaskVO vo = new ReviewTaskVO();
            BeanUtils.copyProperties(task, vo);
            vo.setPayload(parsePayload(task.getPayloadJson()));
            User user = userMap.get(task.getSubmitterId());
            if (user != null) {
                vo.setSubmitterName(user.getRealName());
                vo.setSubmitterNo(user.getUsername());
                vo.setCollege(user.getCollege());
                vo.setMajor(user.getMajor());
                vo.setClassName(user.getClassName());
            }
            return vo;
        }).collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsePayload(String json) {
        if (StrUtil.isBlank(json) || !JSONUtil.isTypeJSON(json)) return new HashMap<>();
        return JSONUtil.toBean(json, Map.class);
    }

    private String normalizeAction(String action) {
        if ("approved".equalsIgnoreCase(action) || "approve".equalsIgnoreCase(action)) return "approve";
        if ("rejected".equalsIgnoreCase(action) || "reject".equalsIgnoreCase(action)) return "reject";
        if ("returned".equalsIgnoreCase(action) || "return".equalsIgnoreCase(action)) return "return";
        throw new BusinessException("不支持的审核动作");
    }
}
