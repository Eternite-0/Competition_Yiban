package com.etsaion.controller;

import com.etsaion.dto.Result;
import com.etsaion.dto.AcademicSyncRequest;
import com.etsaion.exception.BusinessException;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.AcademicSyncService;
import com.etsaion.service.StudentAcademicReadService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.AcademicTermVO;
import com.etsaion.vo.StudentAcademicDashboardVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


import java.util.List;
import java.util.Map;

@Tag(name = "学生学业中心", description = "学生本人查看教务同步的成绩、课表与考试数据")
@RestController
@RequestMapping("/api/academic/self")
@RequireRole({"student"})
public class StudentAcademicController {
    private final StudentAcademicReadService academicReadService;
    private final AcademicSyncService academicSyncService;

    public StudentAcademicController(StudentAcademicReadService academicReadService, AcademicSyncService academicSyncService) {
        this.academicReadService = academicReadService;
        this.academicSyncService = academicSyncService;
    }

    @Operation(summary = "获取我的学业中心数据")
    @GetMapping("/dashboard")
    public Result<StudentAcademicDashboardVO> getDashboard(
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) String term) {
        return Result.success(academicReadService.getDashboard(currentStudentId(), academicYear, term));
    }

    @Operation(summary = "获取已同步的学期筛选项")
    @GetMapping("/terms")
    public Result<List<AcademicTermVO>> listTerms() {
        return Result.success(academicReadService.listTerms(currentStudentId()));
    }

    @Operation(summary = "获取教务 WebVPN 验证码")
    @PostMapping("/session/challenge")
    public Result<Map<String, Object>> beginChallenge(@RequestBody(required = false) Map<String, String> body) {
        String baseUrl = body == null ? null : body.get("baseUrl");
        return Result.success(academicSyncService.beginChallenge(currentStudentId(), baseUrl));
    }

    @Operation(summary = "登录教务系统并自动同步")
    @PostMapping("/session/login")
    public Result<Map<String, Object>> login(@RequestBody AcademicSyncRequest request) {
        return Result.success(academicSyncService.login(currentStudentId(), request));
    }

    @Operation(summary = "使用已登录教务会话重新同步")
    @PostMapping("/sync")
    public Result<com.etsaion.vo.StudentAcademicSnapshotVO> sync(@RequestBody AcademicSyncRequest request) {
        return Result.success(academicSyncService.syncForStudent(currentStudentId(), request));
    }

    @Operation(summary = "退出教务系统会话")
    @DeleteMapping("/session")
    public Result<Void> logout(@RequestParam(required = false) String sessionId) {
        academicSyncService.logout(currentStudentId(), sessionId);
        return Result.success();
    }

    private Long currentStudentId() {
        Long studentId = UserContext.getUserId();
        if (studentId == null) {
            throw new BusinessException(401, "请先登录");
        }
        return studentId;
    }
}
