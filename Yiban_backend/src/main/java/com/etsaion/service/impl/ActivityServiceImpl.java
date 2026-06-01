package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.ActivitySaveDTO;
import com.etsaion.dto.ParticipationCreateDTO;
import com.etsaion.entity.Activity;
import com.etsaion.entity.Participation;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.ActivityMapper;
import com.etsaion.service.ActivityService;
import com.etsaion.service.ParticipationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.UserService;
import com.etsaion.vo.ActivityVO;
import com.etsaion.vo.ParticipationVO;
import org.springframework.beans.BeanUtils;
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

@Service
public class ActivityServiceImpl extends ServiceImpl<ActivityMapper, Activity> implements ActivityService {

    @Autowired
    private ParticipationService participationService;

    @Autowired
    private UserService userService;

    @Autowired
    @Lazy
    private ReviewTaskService reviewTaskService;

    @Override
    public Page<ActivityVO> listActivities(int current, int size, String type, String status, String keyword, boolean includePrivate) {
        Page<Activity> page = new Page<>(current, size);
        LambdaQueryWrapper<Activity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StrUtil.isNotBlank(type), Activity::getType, type)
                .like(StrUtil.isNotBlank(keyword), Activity::getTitle, keyword);

        if (includePrivate) {
            wrapper.eq(StrUtil.isNotBlank(status), Activity::getStatus, status);
        } else {
            wrapper.eq(Activity::getStatus, "published");
        }

        wrapper.orderByDesc(Activity::getCreateTime);
        Page<Activity> raw = this.page(page, wrapper);
        Page<ActivityVO> voPage = new Page<>(raw.getCurrent(), raw.getSize(), raw.getTotal());
        voPage.setRecords(raw.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return voPage;
    }

    @Override
    public ActivityVO getActivityDetail(Long id, boolean includePrivate) {
        Activity activity = this.getById(id);
        if (activity == null) {
            throw new BusinessException("活动不存在");
        }
        if (!includePrivate && !"published".equalsIgnoreCase(activity.getStatus())) {
            throw new BusinessException(403, "活动暂未发布");
        }
        return toVO(activity);
    }

    @Override
    @Transactional
    public ActivityVO saveActivity(Long id, ActivitySaveDTO dto) {
        Activity activity = id == null ? new Activity() : this.getById(id);
        if (activity == null) {
            throw new BusinessException("活动不存在");
        }

        BeanUtils.copyProperties(dto, activity, "tags", "tracks", "config", "createTime", "updateTime");
        activity.setType(StrUtil.blankToDefault(dto.getType(), "competition"));
        activity.setStatus(StrUtil.blankToDefault(dto.getStatus(), "draft"));
        activity.setTags(CollUtil.isNotEmpty(dto.getTags()) ? JSONUtil.toJsonStr(dto.getTags()) : "[]");
        activity.setTracks(CollUtil.isNotEmpty(dto.getTracks()) ? JSONUtil.toJsonStr(dto.getTracks()) : "[]");
        activity.setConfigJson(dto.getConfig() != null ? JSONUtil.toJsonStr(dto.getConfig()) : "{}");

        LocalDateTime now = LocalDateTime.now();
        activity.setUpdateTime(now);
        if (activity.getId() == null) {
            activity.setCreateTime(now);
            this.save(activity);
        } else {
            this.updateById(activity);
        }
        return toVO(activity);
    }

    @Override
    @Transactional
    public Participation createParticipation(Long studentId, Long activityId, ParticipationCreateDTO dto) {
        Activity activity = this.getById(activityId);
        if (activity == null) {
            throw new BusinessException("活动不存在");
        }
        if (!"published".equalsIgnoreCase(activity.getStatus())) {
            throw new BusinessException("活动暂未开放报名");
        }
        if (activity.getEndTime() != null && LocalDateTime.now().isAfter(activity.getEndTime())) {
            throw new BusinessException("活动报名已截止");
        }

        long exists = participationService.count(new LambdaQueryWrapper<Participation>()
                .eq(Participation::getActivityId, activityId)
                .eq(Participation::getStudentId, studentId)
                .notIn(Participation::getStatus, "rejected", "cancelled"));
        if (exists > 0) {
            throw new BusinessException("您已提交过该活动报名");
        }

        Set<Long> members = new LinkedHashSet<>();
        if (dto.getMemberStudentIds() != null) {
            dto.getMemberStudentIds().stream()
                    .filter(id -> id != null && !id.equals(studentId))
                    .forEach(members::add);
        }
        int participantCount = members.size() + 1;
        if (activity.getMaxTeamSize() != null && activity.getMaxTeamSize() > 0
                && participantCount > activity.getMaxTeamSize()) {
            throw new BusinessException("团队人数超过活动限制");
        }

        Participation participation = new Participation();
        participation.setActivityId(activityId);
        participation.setStudentId(studentId);
        participation.setTeamName(dto.getTeamName());
        participation.setTrack(dto.getTrack());
        participation.setMemberStudentIds(JSONUtil.toJsonStr(new ArrayList<>(members)));
        participation.setMetadataJson(dto.getMetadata() != null ? JSONUtil.toJsonStr(dto.getMetadata()) : "{}");
        participation.setStatus("submitted");
        participation.setSubmitDate(LocalDateTime.now());
        participationService.save(participation);

        Map<String, Object> payload = new HashMap<>();
        payload.put("activityTitle", activity.getTitle());
        payload.put("teamName", participation.getTeamName());
        payload.put("track", participation.getTrack());
        payload.put("memberStudentIds", new ArrayList<>(members));
        reviewTaskService.createPending(activity.getType(), activity.getId(), "participation",
                participation.getId(), studentId, "活动报名审核：" + activity.getTitle(),
                activity.getEndTime(), JSONUtil.toJsonStr(payload));

        return participation;
    }

    @Override
    public List<ParticipationVO> listMyParticipations(Long studentId) {
        List<Participation> list = participationService.list(new LambdaQueryWrapper<Participation>()
                .eq(Participation::getStudentId, studentId)
                .orderByDesc(Participation::getSubmitDate));
        if (CollUtil.isEmpty(list)) return new ArrayList<>();

        return joinParticipationVOs(list, studentId);
    }

    @Override
    public Page<ParticipationVO> listMyParticipationsPage(Long studentId, int current, int size) {
        Page<Participation> page = participationService.page(new Page<>(current, size),
                new LambdaQueryWrapper<Participation>()
                        .eq(Participation::getStudentId, studentId)
                        .orderByDesc(Participation::getSubmitDate));
        Page<ParticipationVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(joinParticipationVOs(page.getRecords(), studentId));
        return voPage;
    }

    private List<ParticipationVO> joinParticipationVOs(List<Participation> list, Long studentId) {
        if (CollUtil.isEmpty(list)) return new ArrayList<>();

        List<Long> activityIds = list.stream().map(Participation::getActivityId).distinct().collect(Collectors.toList());
        Map<Long, Activity> activityMap = CollUtil.isEmpty(activityIds) ? Collections.emptyMap()
                : this.listByIds(activityIds).stream().collect(Collectors.toMap(Activity::getId, a -> a, (a, b) -> a));
        User user = userService.getById(studentId);

        return list.stream().map(p -> {
            ParticipationVO vo = new ParticipationVO();
            vo.setId(p.getId());
            vo.setActivityId(p.getActivityId());
            vo.setStudentId(p.getStudentId());
            vo.setTeamName(p.getTeamName());
            vo.setTrack(p.getTrack());
            vo.setMemberStudentIds(parseLongList(p.getMemberStudentIds()));
            vo.setMetadata(parseMap(p.getMetadataJson()));
            vo.setStatus(p.getStatus());
            vo.setSubmitDate(p.getSubmitDate());
            vo.setReviewNote(p.getReviewNote());
            Activity activity = activityMap.get(p.getActivityId());
            if (activity != null) {
                vo.setActivityTitle(activity.getTitle());
                vo.setActivityType(activity.getType());
            }
            if (user != null) {
                vo.setStudentName(user.getRealName());
                vo.setStudentNo(user.getUsername());
            }
            return vo;
        }).collect(Collectors.toList());
    }

    @Override
    public ActivityVO toVO(Activity activity) {
        if (activity == null) return null;
        ActivityVO vo = new ActivityVO();
        BeanUtils.copyProperties(activity, vo);
        vo.setTags(parseStringList(activity.getTags()));
        vo.setTracks(parseStringList(activity.getTracks()));
        vo.setConfig(parseMap(activity.getConfigJson()));
        return vo;
    }

    private List<String> parseStringList(String json) {
        if (StrUtil.isBlank(json) || !JSONUtil.isTypeJSON(json)) return new ArrayList<>();
        return JSONUtil.toList(json, String.class);
    }

    private List<Long> parseLongList(String json) {
        if (StrUtil.isBlank(json) || !JSONUtil.isTypeJSON(json)) return new ArrayList<>();
        return JSONUtil.toList(json, Long.class);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseMap(String json) {
        if (StrUtil.isBlank(json) || !JSONUtil.isTypeJSON(json)) return new HashMap<>();
        return JSONUtil.toBean(json, Map.class);
    }
}
