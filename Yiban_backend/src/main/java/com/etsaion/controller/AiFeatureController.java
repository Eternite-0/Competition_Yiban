package com.etsaion.controller;

import com.etsaion.dto.Result;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.ai.AiFeatureService;
import com.etsaion.utils.UserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "AI 赛事智能能力")
@RestController
@RequestMapping("/api/ai/features")
@RequireRole({"student", "teacher", "admin"})
public class AiFeatureController {

    @Autowired private AiFeatureService aiFeatureService;

    @GetMapping("/recommendations")
    @RequireRole("student")
    @Operation(summary = "个性化赛事推荐")
    public Result<Map<String, Object>> recommendations() {
        return Result.success(aiFeatureService.recommendCompetitions(UserContext.getUserId()));
    }

    @PostMapping("/precheck")
    @RequireRole("student")
    @Operation(summary = "报名材料 AI 预检")
    public Result<Map<String, Object>> precheck(@RequestParam Long competitionId, @RequestBody(required = false) Map<String, Object> payload) {
        return Result.success(aiFeatureService.precheckMaterials(UserContext.getUserId(), competitionId, payload));
    }

    @GetMapping("/team-matches")
    @RequireRole("student")
    @Operation(summary = "智能组队匹配")
    public Result<Map<String, Object>> teamMatches(@RequestParam Long competitionId, @RequestParam(required = false) String desiredRole) {
        return Result.success(aiFeatureService.matchTeamMembers(UserContext.getUserId(), competitionId, desiredRole));
    }

    @GetMapping("/teacher-cockpit")
    @RequireRole("teacher")
    @Operation(summary = "教师 AI 待办驾驶舱")
    public Result<Map<String, Object>> teacherCockpit() {
        return Result.success(aiFeatureService.teacherCockpit(UserContext.getUserId()));
    }

    @GetMapping("/admin-analytics")
    @RequireRole("admin")
    @Operation(summary = "管理员 AI 数据分析助手")
    public Result<Map<String, Object>> adminAnalytics() {
        return Result.success(aiFeatureService.adminAnalytics(UserContext.getUserId()));
    }
}
