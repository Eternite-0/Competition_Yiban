package com.etsaion.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.Competition;
import com.etsaion.entity.CompetitionStage;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.CompetitionStageMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.CompetitionStageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CompetitionStageServiceImpl extends ServiceImpl<CompetitionStageMapper, CompetitionStage> implements CompetitionStageService {

    @Autowired
    private CompetitionService competitionService;

    @Override
    public List<Map<String, Object>> listByCompetition(Long competitionId) {
        List<CompetitionStage> stages = this.list(new LambdaQueryWrapper<CompetitionStage>()
                .eq(CompetitionStage::getCompetitionId, competitionId)
                .orderByAsc(CompetitionStage::getStageOrder));
        List<Map<String, Object>> result = new ArrayList<>();
        for (CompetitionStage stage : stages) {
            result.add(toMap(stage));
        }
        return result;
    }

    @Override
    public CompetitionStage createStage(Long competitionId, CompetitionStage stage) {
        Competition comp = competitionService.getById(competitionId);
        if (comp == null) {
            throw new BusinessException("赛事不存在");
        }
        stage.setCompetitionId(competitionId);
        if (stage.getStageOrder() == null) {
            long count = this.count(new LambdaQueryWrapper<CompetitionStage>()
                    .eq(CompetitionStage::getCompetitionId, competitionId));
            stage.setStageOrder((int) count + 1);
        }
        if (stage.getStatus() == null) {
            stage.setStatus("upcoming");
        }
        stage.setCreateTime(LocalDateTime.now());
        stage.setUpdateTime(LocalDateTime.now());
        this.save(stage);
        return stage;
    }

    @Override
    public CompetitionStage updateStage(Long stageId, CompetitionStage stage) {
        CompetitionStage existing = this.getById(stageId);
        if (existing == null) {
            throw new BusinessException("阶段不存在");
        }
        if (stage.getName() != null) existing.setName(stage.getName());
        if (stage.getStageOrder() != null) existing.setStageOrder(stage.getStageOrder());
        if (stage.getStartTime() != null) existing.setStartTime(stage.getStartTime());
        if (stage.getEndTime() != null) existing.setEndTime(stage.getEndTime());
        if (stage.getDescription() != null) existing.setDescription(stage.getDescription());
        if (stage.getStatus() != null) existing.setStatus(stage.getStatus());
        existing.setUpdateTime(LocalDateTime.now());
        this.updateById(existing);
        return existing;
    }

    @Override
    public void deleteStage(Long stageId) {
        CompetitionStage stage = this.getById(stageId);
        if (stage == null) {
            throw new BusinessException("阶段不存在");
        }
        this.removeById(stageId);
    }

    private Map<String, Object> toMap(CompetitionStage stage) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", stage.getId());
        m.put("competitionId", stage.getCompetitionId());
        m.put("name", stage.getName());
        m.put("stageOrder", stage.getStageOrder());
        m.put("startTime", stage.getStartTime());
        m.put("endTime", stage.getEndTime());
        m.put("description", stage.getDescription());
        m.put("status", stage.getStatus());
        return m;
    }
}
