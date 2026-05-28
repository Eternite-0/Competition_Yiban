package com.etsaion.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.StudentStageProgress;

import java.util.List;
import java.util.Map;

public interface StudentStageProgressService extends IService<StudentStageProgress> {
    List<Map<String, Object>> getMyProgress(Long studentId);
    List<Map<String, Object>> getProgressByCompetition(Long studentId, Long competitionId);
    void updateProgress(Long progressId, String status, String reviewNote, Long reviewerId);
    void batchAdvanceStage(Long stageId, List<Long> studentIds);
    void initProgressForRegistration(Long studentId, Long competitionId, Long registrationId);
}
