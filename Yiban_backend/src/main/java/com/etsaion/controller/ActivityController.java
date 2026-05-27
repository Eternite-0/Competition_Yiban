package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.ActivitySaveDTO;
import com.etsaion.dto.ParticipationCreateDTO;
import com.etsaion.dto.Result;
import com.etsaion.entity.Participation;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.ActivityService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.ActivityVO;
import com.etsaion.vo.ParticipationVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "统一活动接口", description = "承载赛事、志愿服务等活动的通用发布、报名与查询能力")
@RestController
@RequestMapping("/api")
public class ActivityController {

    @Autowired
    private ActivityService activityService;

    @Operation(summary = "统一活动分页列表")
    @GetMapping("/activities")
    public Result<Page<ActivityVO>> listActivities(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {

        boolean includePrivate = "admin".equalsIgnoreCase(UserContext.getUserRole());
        return Result.success(activityService.listActivities(current, size, type, status, keyword, includePrivate));
    }

    @Operation(summary = "统一活动详情")
    @GetMapping("/activities/{id}")
    public Result<ActivityVO> getActivityDetail(@PathVariable Long id) {
        boolean includePrivate = "admin".equalsIgnoreCase(UserContext.getUserRole());
        return Result.success(activityService.getActivityDetail(id, includePrivate));
    }

    @Operation(summary = "管理员创建活动")
    @PostMapping("/activities")
    @RequireRole("admin")
    public Result<ActivityVO> saveActivity(@Validated @RequestBody ActivitySaveDTO dto) {
        return Result.success(activityService.saveActivity(null, dto));
    }

    @Operation(summary = "管理员更新活动")
    @PutMapping("/activities/{id}")
    @RequireRole("admin")
    public Result<ActivityVO> updateActivity(@PathVariable Long id, @Validated @RequestBody ActivitySaveDTO dto) {
        return Result.success(activityService.saveActivity(id, dto));
    }

    @Operation(summary = "学生提交活动参与申请")
    @PostMapping("/activities/{id}/participations")
    @RequireRole("student")
    public Result<Participation> createParticipation(
            @PathVariable Long id,
            @RequestBody ParticipationCreateDTO dto) {
        return Result.success(activityService.createParticipation(UserContext.getUserId(), id, dto));
    }

    @Operation(summary = "当前学生的活动参与记录")
    @GetMapping("/me/participations")
    @RequireRole("student")
    public Result<List<ParticipationVO>> listMyParticipations() {
        return Result.success(activityService.listMyParticipations(UserContext.getUserId()));
    }
}
