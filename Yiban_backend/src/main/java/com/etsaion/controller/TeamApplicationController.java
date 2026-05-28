package com.etsaion.controller;

import com.etsaion.dto.Result;
import com.etsaion.dto.TeamApplyDTO;
import com.etsaion.entity.TeamApplication;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.TeamApplicationService;
import com.etsaion.utils.UserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "组队申请")
@RestController
@RequestMapping("/api/team")
@RequireRole("student")
public class TeamApplicationController {

    @Autowired
    private TeamApplicationService teamApplicationService;

    @Operation(summary = "申请加入队伍")
    @PostMapping("/apply")
    public Result<TeamApplication> apply(@RequestBody TeamApplyDTO dto) {
        Long studentId = UserContext.getUserId();
        if (studentId == null) {
            return Result.error(401, "请先登录");
        }
        return Result.success(teamApplicationService.applyToJoin(studentId, dto));
    }

    @Operation(summary = "查看我的申请记录")
    @GetMapping("/applications/mine")
    public Result<List<TeamApplication>> myApplications() {
        Long studentId = UserContext.getUserId();
        if (studentId == null) {
            return Result.error(401, "请先登录");
        }
        List<TeamApplication> list = teamApplicationService.list(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<TeamApplication>()
                        .eq(TeamApplication::getApplicantId, studentId)
                        .orderByDesc(TeamApplication::getCreateTime));
        return Result.success(list);
    }

    @Operation(summary = "队长查看某帖子的申请列表")
    @GetMapping("/applications/{teamId}")
    public Result<List<TeamApplication>> listForTeam(@PathVariable Long teamId) {
        Long captainId = UserContext.getUserId();
        if (captainId == null) {
            return Result.error(401, "请先登录");
        }
        return Result.success(teamApplicationService.listApplicationsForTeam(captainId, teamId));
    }

    @Operation(summary = "队长处理申请（通过/拒绝）")
    @PostMapping("/application/{id}/handle")
    public Result<Void> handle(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long captainId = UserContext.getUserId();
        if (captainId == null) {
            return Result.error(401, "请先登录");
        }
        String status = body.get("status");
        teamApplicationService.handleApplication(captainId, id, status);
        return Result.success();
    }
}
