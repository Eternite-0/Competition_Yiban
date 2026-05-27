package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.TeacherService;
import com.etsaion.utils.ExcelUtil;
import com.etsaion.vo.RegistrationVO;
import com.etsaion.vo.StudentComprehensiveVO;
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
import java.util.List;
import java.util.Map;

@Tag(name = "教师与辅导员端接口", description = "提供班级概况、学生参赛监控以及综测数据导出等功能")
@RestController
@RequestMapping("/api/teacher")
@RequireRole("teacher")
public class TeacherController {

    @Autowired
    private TeacherService teacherService;

    @Operation(summary = "获取辅导员仪表盘概览统计")
    @GetMapping("/dashboard")
    public Result<Map<String, Object>> getDashboard(
            @RequestParam(required = false) String college) {
        
        Map<String, Object> stats = teacherService.getDashboardStats(college);
        return Result.success(stats);
    }

    @Operation(summary = "学生赛事监控列表")
    @GetMapping("/monitor/registrations")
    public Result<Page<RegistrationVO>> monitorEvents(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String studentName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String className) {

        Page<RegistrationVO> page = teacherService.monitorStudentEvents(current, size, studentName, status, className);
        return Result.success(page);
    }

    @Operation(summary = "教师可查看的学生列表（按学院/班级/关键字过滤）")
    @GetMapping("/students")
    public Result<List<UserVO>> listStudents(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String college,
            @RequestParam(required = false) String className) {

        List<UserVO> list = teacherService.listStudents(keyword, college, className);
        return Result.success(list);
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
                new String[]{"学生姓名", "学号/工号", "班级专业信息", "参赛次数", "累计综测加分"}
        );

        // Configure response headers for file download
        String filename = URLEncoder.encode("综测数据_" + academicYear + ".xlsx", StandardCharsets.UTF_8.toString());
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + filename);
        response.setHeader("Cache-Control", "no-cache");

        workbook.write(response.getOutputStream());
        workbook.close();
    }
}
