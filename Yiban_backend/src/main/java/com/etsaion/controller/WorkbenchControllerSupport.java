package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.dto.ReviewTaskActionDTO;
import com.etsaion.dto.ReviewTaskBatchActionDTO;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.ReviewTaskVO;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

/**
 * 统一工作台的端点集合。
 *
 * 管理员与教师看到的是同一个待办工作台，差别只在数据范围——
 * 教师被 {@code ReviewTaskService} 限定在本学院，管理员不限。
 * 此前这套端点在两个 controller 里逐字重复了一遍，
 * 现在共享同一份实现，子类只提供各自的路径前缀与角色。
 */
public abstract class WorkbenchControllerSupport {

    @Autowired
    protected ReviewTaskService reviewTaskService;

    @Operation(summary = "待办任务列表")
    @GetMapping("/tasks")
    public Result<Page<ReviewTaskVO>> listTasks(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String activityType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String keyword) {
        return Result.success(reviewTaskService.listTasks(current, size, status, activityType, targetType, keyword));
    }

    @Operation(summary = "待办统计")
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.success(reviewTaskService.getStats());
    }

    @Operation(summary = "处理单个待办")
    @PostMapping("/tasks/{id}/action")
    public Result<Void> handleTask(@PathVariable Long id, @Validated @RequestBody ReviewTaskActionDTO dto) {
        reviewTaskService.handleTask(id, UserContext.getUserId(), dto);
        return Result.success();
    }

    @Operation(summary = "批量处理待办")
    @PostMapping("/tasks/batch-action")
    public Result<Void> handleTasks(@Validated @RequestBody ReviewTaskBatchActionDTO dto) {
        reviewTaskService.handleTasks(UserContext.getUserId(), dto);
        return Result.success();
    }
}
