package com.etsaion.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.CompetitionStage;

import java.util.List;
import java.util.Map;

public interface CompetitionStageService extends IService<CompetitionStage> {
    List<Map<String, Object>> listByCompetition(Long competitionId);
    CompetitionStage createStage(Long competitionId, CompetitionStage stage);
    CompetitionStage updateStage(Long stageId, CompetitionStage stage);
    void deleteStage(Long stageId);
}
