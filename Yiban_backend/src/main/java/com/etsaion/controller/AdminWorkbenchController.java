package com.etsaion.controller;

import com.etsaion.dto.Result;
import com.etsaion.interceptor.RequireRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "管理员统一工作台", description = "统一处理赛事、志愿活动等审核待办")
@RestController
@RequestMapping("/api/admin/workbench")
@RequireRole("admin")
public class AdminWorkbenchController extends WorkbenchControllerSupport {

    /** 补齐历史待办是管理员独有的运维动作。 */
    @Operation(summary = "补齐历史待办（幂等）")
    @PostMapping("/tasks/backfill")
    public Result<Map<String, Object>> backfill() {
        int created = reviewTaskService.backfillHistorical();
        return Result.success(Map.of("created", created));
    }
}
