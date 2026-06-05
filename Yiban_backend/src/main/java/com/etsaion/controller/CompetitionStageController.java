package com.etsaion.controller;

import com.etsaion.dto.Result;
import com.etsaion.entity.CompetitionStage;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.CompetitionStageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "赛事阶段管理")
@RestController
@RequestMapping("/api/competition/{competitionId}/stages")
public class CompetitionStageController {

    @Autowired
    private CompetitionStageService competitionStageService;

    @Autowired
    private CompetitionService competitionService;

    @Operation(summary = "获取赛事阶段列表")
    @GetMapping
    public Result<List<Map<String, Object>>> listStages(@PathVariable Long competitionId) {
        // 非管理员只能查看已发布赛事的阶段
        if (!"admin".equalsIgnoreCase(com.etsaion.utils.UserContext.getUserRole())) {
            com.etsaion.entity.Competition comp = competitionService.getById(competitionId);
            if (comp == null || !"published".equalsIgnoreCase(comp.getStatus())) {
                return Result.error(404, "赛事不存在");
            }
        }
        return Result.success(competitionStageService.listByCompetition(competitionId));
    }

    @Operation(summary = "创建赛事阶段")
    @PostMapping
    @RequireRole("admin")
    public Result<CompetitionStage> createStage(@PathVariable Long competitionId, @Validated @RequestBody CompetitionStage stage) {
        return Result.success(competitionStageService.createStage(competitionId, stage));
    }

    @Operation(summary = "更新赛事阶段")
    @PutMapping("/{stageId}")
    @RequireRole("admin")
    public Result<CompetitionStage> updateStage(@PathVariable Long stageId, @RequestBody CompetitionStage stage) {
        return Result.success(competitionStageService.updateStage(stageId, stage));
    }

    @Operation(summary = "删除赛事阶段")
    @DeleteMapping("/{stageId}")
    @RequireRole("admin")
    public Result<Void> deleteStage(@PathVariable Long stageId) {
        competitionStageService.deleteStage(stageId);
        return Result.success();
    }
}
