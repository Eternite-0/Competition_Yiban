package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.dto.ReviewTaskActionDTO;
import com.etsaion.dto.ReviewTaskBatchActionDTO;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.ReviewTaskVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "教师审核工作台", description = "教师端统一处理赛事报名与成果审核待办")
@RestController
@RequestMapping("/api/teacher/workbench")
@RequireRole("teacher")
public class TeacherWorkbenchController {

    @Autowired
    private ReviewTaskService reviewTaskService;

    @Operation(summary = "教师待办任务列表")
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

    @Operation(summary = "教师待办统计")
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.success(reviewTaskService.getStats());
    }

    @Operation(summary = "教师处理单个待办")
    @PostMapping("/tasks/{id}/action")
    public Result<Void> handleTask(@PathVariable Long id, @Validated @RequestBody ReviewTaskActionDTO dto) {
        reviewTaskService.handleTask(id, UserContext.getUserId(), dto);
        return Result.success();
    }

    @Operation(summary = "教师批量处理待办")
    @PostMapping("/tasks/batch-action")
    public Result<Void> handleTasks(@Validated @RequestBody ReviewTaskBatchActionDTO dto) {
        reviewTaskService.handleTasks(UserContext.getUserId(), dto);
        return Result.success();
    }
}
