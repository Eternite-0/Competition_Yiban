package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.User;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.UserService;
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

    @Autowired
    private UserService userService;

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
        if ("student".equalsIgnoreCase(UserContext.getUserRole())
                && !targetStudentId.equals(UserContext.getUserId())) {
            return Result.error(403, "学生只能查看自己的成长档案");
        }
        if ("teacher".equalsIgnoreCase(UserContext.getUserRole())) {
            Long teacherId = UserContext.getUserId();
            User teacher = userService.getById(teacherId);
            User student = userService.getById(targetStudentId);
            if (teacher != null && student != null && teacher.getCollege() != null
                    && !teacher.getCollege().equals(student.getCollege())) {
                return Result.error(403, "无权查看其他学院学生的成长档案");
            }
        }

        StudentGrowthVO growth = growthRecordService.getStudentGrowth(targetStudentId);
        return Result.success(growth);
    }

    @Operation(summary = "获取学生成长时间轴")
    @GetMapping("/timeline")
    @RequireRole({"student", "teacher", "admin"})
    public Result<Page<GrowthRecord>> getTimeline(
            @RequestParam(required = false) Long studentId,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size) {
        Long targetStudentId = studentId;
        if (targetStudentId == null) {
            targetStudentId = UserContext.getUserId();
        }
        if (targetStudentId == null) {
            return Result.error(401, "请先登录或传入目标学生ID");
        }
        if ("student".equalsIgnoreCase(UserContext.getUserRole())
                && !targetStudentId.equals(UserContext.getUserId())) {
            return Result.error(403, "学生只能查看自己的成长档案");
        }
        if ("teacher".equalsIgnoreCase(UserContext.getUserRole())) {
            Long teacherId = UserContext.getUserId();
            User teacher = userService.getById(teacherId);
            User student = userService.getById(targetStudentId);
            if (teacher != null && student != null && teacher.getCollege() != null
                    && !teacher.getCollege().equals(student.getCollege())) {
                return Result.error(403, "无权查看其他学院学生的成长档案");
            }
        }
        return Result.success(growthRecordService.getTimelinePage(targetStudentId, current, size));
    }
}
