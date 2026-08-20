package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.ActivityScore;
import com.etsaion.service.TeacherService;
import com.etsaion.utils.ExcelUtil;
import com.etsaion.vo.RegistrationVO;
import com.etsaion.vo.StudentComprehensiveVO;
import com.etsaion.vo.TeacherGrowthOverviewVO;
import com.etsaion.vo.UserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Tag(name = "教师端接口", description = "提供班级概况、学生参赛监控以及综测数据导出等功能")
@RestController
@RequestMapping("/api/teacher")
@RequireRole("teacher")
public class TeacherController {

    @Autowired
    private TeacherService teacherService;

    // ---- existing (updated) ----

    @Operation(summary = "获取教师仪表盘概览统计")
    @GetMapping("/dashboard")
    public Result<Map<String, Object>> getDashboard(
            @RequestParam(required = false) String college,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String major,
            @RequestParam(required = false) String className) {

        Map<String, Object> stats = teacherService.getDashboardStats(college, grade, major, className);
        return Result.success(stats);
    }

    @Operation(summary = "学生赛事监控列表")
    @GetMapping("/monitor/registrations")
    public Result<Page<RegistrationVO>> monitorEvents(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String studentName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String college,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String major) {

        Page<RegistrationVO> page = teacherService.monitorStudentEvents(current, size, studentName, status, className, college, grade, major);
        return Result.success(page);
    }

    @Operation(summary = "教师可查看的学生列表（按学院/班级/关键字过滤）")
    @GetMapping("/students")
    public Result<Page<UserVO>> listStudents(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String college,
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String major,
            @RequestParam(required = false) String sort) {

        return Result.success(teacherService.listStudentsPage(current, size, keyword, college, className, grade, major, sort));
    }

    @Operation(summary = "导出综测评分表 (Excel 流)")
    @GetMapping("/export/comprehensive")
    public void exportComprehensive(
            @RequestParam String academicYear,
            @RequestParam(required = false) String major,
            HttpServletResponse response) throws IOException {

        List<StudentComprehensiveVO> list = teacherService.getComprehensiveData(academicYear, major);

        Workbook workbook = ExcelUtil.export(
                list,
                "综合素质测评数据",
                new String[]{"学生姓名", "学号/工号", "学院", "专业", "班级", "参赛次数", "累计综测加分"}
        );

        String filename = URLEncoder.encode("综测数据_" + academicYear + ".xlsx", StandardCharsets.UTF_8.toString());
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + filename);
        response.setHeader("Cache-Control", "no-cache");

        workbook.write(response.getOutputStream());
        workbook.close();
    }

    // ---- cascade filter APIs ----

    @Operation(summary = "获取所有学院列表")
    @GetMapping("/colleges")
    public Result<List<String>> listColleges() {
        return Result.success(teacherService.listColleges());
    }

    @Operation(summary = "获取学院下的专业列表")
    @GetMapping("/majors")
    public Result<List<String>> listMajors(@RequestParam(required = false) String college) {
        return Result.success(teacherService.listMajors(college));
    }

    @Operation(summary = "获取年级列表")
    @GetMapping("/grades")
    public Result<List<String>> listGrades(
            @RequestParam(required = false) String college,
            @RequestParam(required = false) String major) {
        return Result.success(teacherService.listGrades(college, major));
    }

    @Operation(summary = "获取班级列表")
    @GetMapping("/classes")
    public Result<List<String>> listClasses(
            @RequestParam(required = false) String college,
            @RequestParam(required = false) String major,
            @RequestParam(required = false) String grade) {
        return Result.success(teacherService.listClasses(college, major, grade));
    }

    // ---- college overview ----

    @Operation(summary = "学院总览数据")
    @GetMapping("/college-overview")
    public Result<Map<String, Object>> collegeOverview(
            @RequestParam(required = false) String college,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String major) {

        return Result.success(teacherService.getCollegeOverview(college, grade, major));
    }

    // ---- student detail ----

    @Operation(summary = "学生详情")
    @GetMapping("/student-detail")
    public Result<Map<String, Object>> studentDetail(@RequestParam Long studentId) {
        return Result.success(teacherService.getStudentDetail(studentId));
    }

    @Operation(summary = "教师端学业风险预警数据")
    @GetMapping("/academic-warnings")
    public Result<Map<String, Object>> academicWarnings(
            @RequestParam(required = false) String college,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String major,
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) String keyword) {

        return Result.success(teacherService.getAcademicWarnings(college, grade, major, className, riskLevel, keyword));
    }

    // ---- trend ----

    @Operation(summary = "参赛趋势数据")
    @GetMapping("/trend")
    public Result<Map<String, Object>> trend(
            @RequestParam(required = false) String college,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String major) {
        return Result.success(teacherService.getTrend(college, grade, major));
    }

    @Operation(summary = "学院/班级校园成长画像总览")
    @GetMapping("/growth-overview")
    public Result<TeacherGrowthOverviewVO> growthOverview(
            @RequestParam(required = false) String college,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String major,
            @RequestParam(required = false) String className) {
        return Result.success(teacherService.getGrowthOverview(college, grade, major, className));
    }

    // ---- student export ----

    @Operation(summary = "导出学生个人报告")
    @GetMapping("/export/student-detail")
    public void exportStudentDetail(@RequestParam Long studentId, HttpServletResponse response) throws IOException {
        Map<String, Object> detail = teacherService.getStudentExportData(studentId);
        Map<String, Object> student = (Map<String, Object>) detail.get("student");

        String name = student != null ? (String) student.get("realName") : "学生";
        String filename = URLEncoder.encode(name + "_个人报告.xlsx", StandardCharsets.UTF_8.toString());

        // Simple export: create a basic Excel with student info and stats
        List<StudentComprehensiveVO> list = new ArrayList<>();
        if (student != null) {
            int totalComps = (Integer) detail.get("totalCompetitions");
            int totalAwards = (Integer) detail.get("totalAwards");
            double weightedScore = ActivityScore.of(totalComps, totalAwards);
            list.add(new StudentComprehensiveVO(
                    (String) student.get("realName"),
                    (String) student.get("username"),
                    (String) student.get("college"),
                    (String) student.get("major"),
                    (String) student.get("className"),
                    totalComps,
                    weightedScore
            ));
        }

        Workbook workbook = ExcelUtil.export(
                list,
                "学生个人报告",
                new String[]{"学生姓名", "学号", "学院", "专业", "班级", "参赛次数", "获奖数"}
        );

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + filename);
        response.setHeader("Cache-Control", "no-cache");
        workbook.write(response.getOutputStream());
        workbook.close();
    }
}
