package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.GrowthProfileService;
import com.etsaion.service.ComprehensiveScoreService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.StudentAccessPolicy;
import com.etsaion.service.UserService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.ComprehensiveScoreVO;
import com.etsaion.vo.GrowthProfileVO;
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
    private GrowthProfileService growthProfileService;

    @Autowired
    private UserService userService;

    @Autowired
    private ComprehensiveScoreService comprehensiveScoreService;

    @Autowired
    private StudentAccessPolicy studentAccessPolicy;

    /**
     * 解析目标学生并校验访问权限。
     *
     * 这段判断此前在本类的四个方法里各抄了一遍，且与
     * {@code TeacherServiceImpl} 的规则相左：那里没有学院的教师被拒绝，
     * 这里 {@code teacher.getCollege() != null} 的写法却把他放行了。
     * 现在统一由 {@link StudentAccessPolicy} 裁决。
     */
    private Long resolveAccessibleStudent(Long studentId) {
        Long targetStudentId = studentId != null ? studentId : UserContext.getUserId();
        if (targetStudentId == null) {
            throw new BusinessException(401, "请先登录或传入目标学生ID");
        }
        studentAccessPolicy.requireAccess(targetStudentId);
        return targetStudentId;
    }

    @Operation(summary = "根据学生ID获取能力画像雷达图数据与参赛汇总 (TS 格式对齐)")
    @GetMapping("/radar")
    @RequireRole({"student", "teacher", "admin"})
    public Result<StudentGrowthVO> getRadarData(@RequestParam(required = false) Long studentId) {
        return Result.success(growthRecordService.getStudentGrowth(resolveAccessibleStudent(studentId)));
    }

    @Operation(summary = "获取学生校园成长画像")
    @GetMapping("/profile")
    @RequireRole({"student", "teacher", "admin"})
    public Result<GrowthProfileVO> getGrowthProfile(
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String academicYear) {
        Long targetStudentId = resolveAccessibleStudent(studentId);
        return Result.success(growthProfileService.getStudentProfile(targetStudentId, academicYear));
    }

    @Operation(summary = "Get official comprehensive evaluation rank")
    @GetMapping("/comprehensive")
    @RequireRole({"student", "teacher", "admin"})
    public Result<ComprehensiveScoreVO> getComprehensiveScore(
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) String academicYear) {
        Long targetStudentId = resolveAccessibleStudent(studentId);

        User student = userService.getById(targetStudentId);
        if (student == null || !"student".equalsIgnoreCase(student.getRole())) {
            return Result.error(404, "student not found");
        }
        return Result.success(comprehensiveScoreService.getByStudentNo(student.getUsername(), academicYear));
    }

    @Operation(summary = "获取学生成长时间轴")
    @GetMapping("/timeline")
    @RequireRole({"student", "teacher", "admin"})
    public Result<Page<GrowthRecord>> getTimeline(
            @RequestParam(required = false) Long studentId,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size) {
        Long targetStudentId = resolveAccessibleStudent(studentId);
        return Result.success(growthRecordService.getTimelinePage(targetStudentId, current, size));
    }
}
