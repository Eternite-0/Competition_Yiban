package com.etsaion.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.*;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.StudentStageProgressMapper;
import com.etsaion.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StudentStageProgressServiceImpl extends ServiceImpl<StudentStageProgressMapper, StudentStageProgress> implements StudentStageProgressService {

    @Autowired
    private CompetitionStageService competitionStageService;

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private MessageService messageService;

    @Override
    public List<Map<String, Object>> getMyProgress(Long studentId) {
        List<StudentStageProgress> progressList = this.list(new LambdaQueryWrapper<StudentStageProgress>()
                .eq(StudentStageProgress::getStudentId, studentId)
                .orderByDesc(StudentStageProgress::getUpdateTime));

        if (progressList.isEmpty()) return new ArrayList<>();

        // Group by competition
        Map<Long, List<StudentStageProgress>> byComp = progressList.stream()
                .collect(Collectors.groupingBy(StudentStageProgress::getCompetitionId));

        // Batch load competitions and stages
        List<Long> compIds = new ArrayList<>(byComp.keySet());
        Map<Long, Competition> compMap = competitionService.listByIds(compIds).stream()
                .collect(Collectors.toMap(Competition::getId, c -> c, (a, b) -> a));

        List<Long> stageIds = progressList.stream().map(StudentStageProgress::getStageId)
                .filter(Objects::nonNull).distinct().collect(Collectors.toList());
        Map<Long, CompetitionStage> stageMap = competitionStageService.listByIds(stageIds).stream()
                .collect(Collectors.toMap(CompetitionStage::getId, s -> s, (a, b) -> a));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Long, List<StudentStageProgress>> entry : byComp.entrySet()) {
            Long compId = entry.getKey();
            Competition comp = compMap.get(compId);
            Map<String, Object> item = new HashMap<>();
            item.put("competitionId", compId);
            item.put("competitionName", comp != null ? comp.getName() : "未知赛事");
            item.put("competitionLevel", comp != null ? comp.getLevel() : "");

            // Build stage timeline
            List<Map<String, Object>> stages = new ArrayList<>();
            for (StudentStageProgress p : entry.getValue()) {
                CompetitionStage stage = stageMap.get(p.getStageId());
                Map<String, Object> s = new HashMap<>();
                s.put("progressId", p.getId());
                s.put("stageId", p.getStageId());
                s.put("stageName", stage != null ? stage.getName() : "未知阶段");
                s.put("stageOrder", stage != null ? stage.getStageOrder() : 0);
                s.put("startTime", stage != null ? stage.getStartTime() : null);
                s.put("endTime", stage != null ? stage.getEndTime() : null);
                s.put("description", stage != null ? stage.getDescription() : null);
                s.put("status", p.getStatus());
                s.put("submitTime", p.getSubmitTime());
                s.put("reviewTime", p.getReviewTime());
                s.put("reviewNote", p.getReviewNote());
                stages.add(s);
            }
            stages.sort(Comparator.comparingInt(m -> (Integer) m.get("stageOrder")));
            item.put("stages", stages);

            // Current stage
            Optional<Map<String, Object>> current = stages.stream()
                    .filter(s -> "in_progress".equals(s.get("status")) || "submitted".equals(s.get("status")))
                    .findFirst();
            current.ifPresent(s -> item.put("currentStage", s.get("stageName")));

            result.add(item);
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> getProgressByCompetition(Long studentId, Long competitionId) {
        List<StudentStageProgress> progressList = this.list(new LambdaQueryWrapper<StudentStageProgress>()
                .eq(StudentStageProgress::getStudentId, studentId)
                .eq(StudentStageProgress::getCompetitionId, competitionId)
                .orderByAsc(StudentStageProgress::getId));

        List<Long> stageIds = progressList.stream().map(StudentStageProgress::getStageId)
                .filter(Objects::nonNull).distinct().collect(Collectors.toList());
        Map<Long, CompetitionStage> stageMap = competitionStageService.listByIds(stageIds).stream()
                .collect(Collectors.toMap(CompetitionStage::getId, s -> s, (a, b) -> a));

        List<Map<String, Object>> result = new ArrayList<>();
        for (StudentStageProgress p : progressList) {
            CompetitionStage stage = stageMap.get(p.getStageId());
            Map<String, Object> s = new HashMap<>();
            s.put("progressId", p.getId());
            s.put("stageId", p.getStageId());
            s.put("stageName", stage != null ? stage.getName() : "未知阶段");
            s.put("stageOrder", stage != null ? stage.getStageOrder() : 0);
            s.put("startTime", stage != null ? stage.getStartTime() : null);
            s.put("endTime", stage != null ? stage.getEndTime() : null);
            s.put("description", stage != null ? stage.getDescription() : null);
            s.put("status", p.getStatus());
            s.put("submitTime", p.getSubmitTime());
            s.put("reviewTime", p.getReviewTime());
            s.put("reviewNote", p.getReviewNote());
            result.add(s);
        }
        return result;
    }

    @Override
    @Transactional
    public void updateProgress(Long progressId, String status, String reviewNote, Long reviewerId) {
        StudentStageProgress progress = this.getById(progressId);
        if (progress == null) {
            throw new BusinessException("进度记录不存在");
        }
        progress.setStatus(status);
        progress.setReviewNote(reviewNote);
        progress.setReviewerId(reviewerId);
        progress.setReviewTime(LocalDateTime.now());
        progress.setUpdateTime(LocalDateTime.now());
        this.updateById(progress);

        // Send notification to student
        CompetitionStage stage = competitionStageService.getById(progress.getStageId());
        Competition comp = competitionService.getById(progress.getCompetitionId());
        String compName = comp != null ? comp.getName() : "未知赛事";
        String stageName = stage != null ? stage.getName() : "未知阶段";

        String title;
        String content;
        if ("passed".equals(status)) {
            title = "阶段审核通过";
            content = String.format("您在[%s]的[%s]阶段已审核通过。%s", compName, stageName,
                    reviewNote != null ? "评语：" + reviewNote : "");
        } else if ("failed".equals(status)) {
            title = "阶段审核未通过";
            content = String.format("您在[%s]的[%s]阶段未通过审核。%s", compName, stageName,
                    reviewNote != null ? "原因：" + reviewNote : "");
        } else {
            title = "阶段状态更新";
            content = String.format("您在[%s]的[%s]阶段状态已更新为：%s", compName, stageName, status);
        }

        Message msg = new Message();
        msg.setFromUser(reviewerId);
        msg.setToUser(progress.getStudentId());
        msg.setTitle(title);
        msg.setContent(content);
        msg.setIsRead(0);
        msg.setCreateTime(LocalDateTime.now());
        messageService.save(msg);
    }

    @Override
    @Transactional
    public void batchAdvanceStage(Long stageId, List<Long> studentIds) {
        CompetitionStage currentStage = competitionStageService.getById(stageId);
        if (currentStage == null) {
            throw new BusinessException("阶段不存在");
        }

        // Find next stage
        CompetitionStage nextStage = competitionStageService.getOne(new LambdaQueryWrapper<CompetitionStage>()
                .eq(CompetitionStage::getCompetitionId, currentStage.getCompetitionId())
                .eq(CompetitionStage::getStageOrder, currentStage.getStageOrder() + 1)
                .last("LIMIT 1"));

        // Mark current stage as passed
        for (Long studentId : studentIds) {
            StudentStageProgress progress = this.getOne(new LambdaQueryWrapper<StudentStageProgress>()
                    .eq(StudentStageProgress::getStudentId, studentId)
                    .eq(StudentStageProgress::getStageId, stageId)
                    .last("LIMIT 1"));
            if (progress != null) {
                progress.setStatus("passed");
                progress.setReviewTime(LocalDateTime.now());
                progress.setUpdateTime(LocalDateTime.now());
                this.updateById(progress);
            }

            // Create progress for next stage
            if (nextStage != null) {
                StudentStageProgress nextProgress = new StudentStageProgress();
                nextProgress.setStudentId(studentId);
                nextProgress.setCompetitionId(currentStage.getCompetitionId());
                nextProgress.setStageId(nextStage.getId());
                nextProgress.setRegistrationId(progress != null ? progress.getRegistrationId() : null);
                nextProgress.setStatus("in_progress");
                nextProgress.setCreateTime(LocalDateTime.now());
                nextProgress.setUpdateTime(LocalDateTime.now());
                this.save(nextProgress);

                // Notify student
                Competition comp = competitionService.getById(currentStage.getCompetitionId());
                String compName = comp != null ? comp.getName() : "未知赛事";
                Message msg = new Message();
                msg.setFromUser(0L);
                msg.setToUser(studentId);
                msg.setTitle("恭喜晋级！");
                msg.setContent(String.format("您在[%s]中已通过[%s]阶段，进入[%s]阶段。请关注下一阶段的要求和时间节点。", compName, currentStage.getName(), nextStage.getName()));
                msg.setIsRead(0);
                msg.setCreateTime(LocalDateTime.now());
                messageService.save(msg);
            }
        }
    }

    @Override
    public void initProgressForRegistration(Long studentId, Long competitionId, Long registrationId) {
        // Find the first stage for this competition
        CompetitionStage firstStage = competitionStageService.getOne(new LambdaQueryWrapper<CompetitionStage>()
                .eq(CompetitionStage::getCompetitionId, competitionId)
                .orderByAsc(CompetitionStage::getStageOrder)
                .last("LIMIT 1"));

        if (firstStage == null) return;

        // Check if already exists
        long existing = this.count(new LambdaQueryWrapper<StudentStageProgress>()
                .eq(StudentStageProgress::getStudentId, studentId)
                .eq(StudentStageProgress::getStageId, firstStage.getId()));
        if (existing > 0) return;

        StudentStageProgress progress = new StudentStageProgress();
        progress.setStudentId(studentId);
        progress.setCompetitionId(competitionId);
        progress.setStageId(firstStage.getId());
        progress.setRegistrationId(registrationId);
        progress.setStatus("in_progress");
        progress.setCreateTime(LocalDateTime.now());
        progress.setUpdateTime(LocalDateTime.now());
        this.save(progress);
    }
}
