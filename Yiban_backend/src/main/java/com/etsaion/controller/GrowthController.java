package com.etsaion.controller;

import com.etsaion.dto.Result;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.StudentGrowthVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "学生成长雷达统计", description = "提供获取学生参赛汇总和五维雷达画像接口")
@RestController
@RequestMapping("/api/growth")
public class GrowthController {

    @Autowired
    private GrowthRecordService growthRecordService;

    @Operation(summary = "根据学生ID获取能力画像雷达图数据与参赛汇总 (TS 格式对齐)")
    @GetMapping("/radar")
    @RequireRole({"student", "teacher", "admin"})
    public Result<StudentGrowthVO> getRadarData(@RequestParam(required = false) Long studentId) {
        Long targetStudentId = studentId;
        if (targetStudentId == null) {
            targetStudentId = UserContext.getUserId();
        }
        
        if (targetStudentId == null) {
            return Result.error(401, "请先登录或传入目标学生ID");
        }

        StudentGrowthVO growth = growthRecordService.getStudentGrowth(targetStudentId);
        return Result.success(growth);
    }

    @Operation(summary = "获取学生成长时间轴")
    @GetMapping("/timeline")
    @RequireRole({"student", "teacher", "admin"})
    public Result<List<GrowthRecord>> getTimeline(@RequestParam(required = false) Long studentId) {
        Long targetStudentId = studentId;
        if (targetStudentId == null) {
            targetStudentId = UserContext.getUserId();
        }
        if (targetStudentId == null) {
            return Result.error(401, "请先登录或传入目标学生ID");
        }
        return Result.success(growthRecordService.getTimeline(targetStudentId));
    }
}
