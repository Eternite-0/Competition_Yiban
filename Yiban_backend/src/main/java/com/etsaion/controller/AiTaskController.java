package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.ai.AiTaskService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.ai.AiTaskVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@Tag(name = "AI任务中心")
@RestController
@RequestMapping("/api/ai/task")
@RequireRole({"student", "teacher", "admin"})
public class AiTaskController {

    @Autowired
    private AiTaskService aiTaskService;

    @Operation(summary = "查询 AI 任务详情")
    @GetMapping("/{id}")
    public Result<AiTaskVO> getTask(@PathVariable Long id) {
        return Result.success(aiTaskService.getVisibleTask(id, UserContext.getUserId(), UserContext.getUserRole()));
    }

    @Operation(summary = "管理员分页查询 AI 任务")
    @GetMapping("/list")
    @RequireRole("admin")
    public Result<Page<AiTaskVO>> listTasks(@RequestParam(defaultValue = "1") int current,
                                            @RequestParam(defaultValue = "10") int size,
                                            @RequestParam(required = false) String taskType,
                                            @RequestParam(required = false) String status) {
        size = Math.min(Math.max(size, 1), 100);
        current = Math.max(current, 1);
        return Result.success(aiTaskService.listAdminTasks(current, size, taskType, status));
    }

    @Operation(summary = "管理员重试失败 AI 任务")
    @PostMapping("/{id}/retry")
    @RequireRole("admin")
    public Result<AiTaskVO> retryTask(@PathVariable Long id) {
        return Result.success(aiTaskService.retryFailedTask(id));
    }
}
