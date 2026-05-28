package com.etsaion.controller;

import com.etsaion.dto.Result;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.StudentStageProgressService;
import com.etsaion.utils.UserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "学生阶段进度")
@RestController
@RequestMapping("/api/student/progress")
public class StudentStageProgressController {

    @Autowired
    private StudentStageProgressService studentStageProgressService;

    @Operation(summary = "学生查看自己的阶段进度")
    @GetMapping("/my")
    @RequireRole("student")
    public Result<List<Map<String, Object>>> getMyProgress() {
        Long studentId = UserContext.getUserId();
        return Result.success(studentStageProgressService.getMyProgress(studentId));
    }

    @Operation(summary = "查看某赛事的阶段进度")
    @GetMapping("/competition/{competitionId}")
    @RequireRole("student")
    public Result<List<Map<String, Object>>> getProgressByCompetition(@PathVariable Long competitionId) {
        Long studentId = UserContext.getUserId();
        return Result.success(studentStageProgressService.getProgressByCompetition(studentId, competitionId));
    }

    @Operation(summary = "更新进度状态")
    @PostMapping("/{progressId}/update")
    @RequireRole({"admin", "teacher"})
    public Result<Void> updateProgress(
            @PathVariable Long progressId,
            @RequestBody Map<String, Object> body) {
        String status = (String) body.get("status");
        String reviewNote = (String) body.get("reviewNote");
        Long reviewerId = UserContext.getUserId();
        studentStageProgressService.updateProgress(progressId, status, reviewNote, reviewerId);
        return Result.success();
    }

    @Operation(summary = "批量晋级到下一阶段")
    @PostMapping("/stage/{stageId}/batch-advance")
    @RequireRole({"admin", "teacher"})
    public Result<Void> batchAdvanceStage(
            @PathVariable Long stageId,
            @RequestBody Map<String, List<Long>> body) {
        List<Long> studentIds = body.get("studentIds");
        studentStageProgressService.batchAdvanceStage(stageId, studentIds);
        return Result.success();
    }
}
