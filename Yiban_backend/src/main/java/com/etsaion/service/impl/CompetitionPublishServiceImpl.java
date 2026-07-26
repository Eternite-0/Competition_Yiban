package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.etsaion.dto.EventPublishDTO;
import com.etsaion.entity.Competition;
import com.etsaion.enums.CompetitionStatus;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.ActivityCategoryService;
import com.etsaion.service.CompetitionPublishService;
import com.etsaion.service.CompetitionService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.validation.ConstraintViolation;
import javax.validation.Validator;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CompetitionPublishServiceImpl implements CompetitionPublishService {

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private ActivityCategoryService activityCategoryService;

    @Autowired
    private Validator validator;

    @Override
    @Transactional
    public Competition create(EventPublishDTO dto, String defaultStatus) {
        // 校验放在服务里而不是 controller 上，非 HTTP 的调用方（AI 草稿确认）
        // 才不会绕过这些约束写出发布接口写不出的数据
        validate(dto);

        Competition comp = new Competition();
        BeanUtils.copyProperties(dto, comp, "tags", "tracks", "status", "category");
        comp.setCategory(resolveCategory(dto.getCategory()));
        comp.setTags(toJsonArray(dto.getTags()));
        comp.setTracks(toJsonArray(dto.getTracks()));
        comp.setStatus(StrUtil.blankToDefault(dto.getStatus(),
                StrUtil.blankToDefault(defaultStatus, CompetitionStatus.PUBLISHED.getValue())));
        comp.setContent(StrUtil.nullToEmpty(dto.getContent()));
        comp.setCreateTime(LocalDateTime.now());
        comp.setUpdateTime(LocalDateTime.now());

        competitionService.save(comp);
        return comp;
    }

    @Override
    @Transactional
    public Competition update(Long id, EventPublishDTO dto) {
        Competition comp = competitionService.getById(id);
        if (comp == null) {
            throw new BusinessException("赛事不存在");
        }

        // 只覆盖调用方给出的字段，否则局部更新会把未提交的字段清空
        if (dto.getName() != null) comp.setName(dto.getName());
        if (dto.getLevel() != null) comp.setLevel(dto.getLevel());
        if (dto.getCategory() != null) comp.setCategory(resolveCategory(dto.getCategory()));
        if (dto.getOrganizer() != null) comp.setOrganizer(dto.getOrganizer());
        if (dto.getStartTime() != null) comp.setStartTime(dto.getStartTime());
        if (dto.getEndTime() != null) comp.setEndTime(dto.getEndTime());
        if (dto.getCompetitionStart() != null) comp.setCompetitionStart(dto.getCompetitionStart());
        if (dto.getCompetitionEnd() != null) comp.setCompetitionEnd(dto.getCompetitionEnd());
        if (dto.getMaxTeamSize() != null) comp.setMaxTeamSize(dto.getMaxTeamSize());
        if (dto.getCoverUrl() != null) comp.setCoverUrl(dto.getCoverUrl());
        if (dto.getSourceUrl() != null) comp.setSourceUrl(dto.getSourceUrl());
        if (dto.getContent() != null) comp.setContent(dto.getContent());
        if (CollUtil.isNotEmpty(dto.getTags())) comp.setTags(toJsonArray(dto.getTags()));
        if (CollUtil.isNotEmpty(dto.getTracks())) comp.setTracks(toJsonArray(dto.getTracks()));
        if (StrUtil.isNotBlank(dto.getStatus())) comp.setStatus(dto.getStatus());
        comp.setUpdateTime(LocalDateTime.now());

        competitionService.updateById(comp);
        return comp;
    }

    private void validate(EventPublishDTO dto) {
        Set<ConstraintViolation<EventPublishDTO>> violations = validator.validate(dto);
        if (!violations.isEmpty()) {
            throw new BusinessException(violations.stream()
                    .map(ConstraintViolation::getMessage)
                    .sorted()
                    .collect(Collectors.joining("；")));
        }
    }

    private String resolveCategory(String category) {
        return activityCategoryService.resolveOrCreate("competition", category);
    }

    private String toJsonArray(List<String> values) {
        return CollUtil.isEmpty(values) ? "[]" : JSONUtil.toJsonStr(values);
    }
}
