package com.etsaion.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.entity.ClassInfo;
import com.etsaion.entity.Major;
import com.etsaion.entity.Message;
import com.etsaion.entity.StudentRoster;
import com.etsaion.entity.User;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Tag(name = "管理员接口", description = "专业、班级、花名册管理")
@RestController
@RequestMapping("/api/admin")
@RequireRole("admin")
public class AdminController {

    @Autowired
    private MajorService majorService;

    @Autowired
    private ClassInfoService classInfoService;

    @Autowired
    private StudentRosterService studentRosterService;

    @Autowired
    private UserService userService;

    @Autowired
    private MessageService messageService;

    // ==================== 专业管理 ====================

    @Operation(summary = "获取所有学院列表")
    @GetMapping("/colleges")
    public Result<List<String>> listColleges() {
        return Result.success(majorService.listColleges());
    }

    @Operation(summary = "获取专业列表")
    @GetMapping("/majors")
    public Result<List<Map<String, Object>>> listMajors(@RequestParam(required = false) String college) {
        return Result.success(majorService.listMajors(college));
    }

    @Operation(summary = "新增专业")
    @PostMapping("/majors")
    public Result<Major> createMajor(@RequestBody Map<String, String> body) {
        Major major = majorService.createMajor(body.get("name"), body.get("college"));
        return Result.success(major);
    }

    @Operation(summary = "编辑专业")
    @PutMapping("/majors/{id}")
    public Result<Major> updateMajor(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Major major = majorService.updateMajor(id, body.get("name"), body.get("college"), body.get("status"));
        return Result.success(major);
    }

    @Operation(summary = "删除专业")
    @DeleteMapping("/majors/{id}")
    public Result<Void> deleteMajor(@PathVariable Long id) {
        majorService.deleteMajor(id);
        return Result.success(null);
    }

    // ==================== 班级管理 ====================

    @Operation(summary = "获取班级列表")
    @GetMapping("/classes")
    public Result<List<Map<String, Object>>> listClasses(
            @RequestParam(required = false) String college,
            @RequestParam(required = false) Long majorId,
            @RequestParam(required = false) String grade) {
        return Result.success(classInfoService.listClasses(college, majorId, grade));
    }

    @Operation(summary = "新增班级")
    @PostMapping("/classes")
    public Result<ClassInfo> createClass(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String college = (String) body.get("college");
        Long majorId = body.get("majorId") != null ? Long.valueOf(body.get("majorId").toString()) : null;
        String grade = (String) body.get("grade");
        ClassInfo classInfo = classInfoService.createClass(name, college, majorId, grade);
        return Result.success(classInfo);
    }

    @Operation(summary = "编辑班级")
    @PutMapping("/classes/{id}")
    public Result<ClassInfo> updateClass(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String college = (String) body.get("college");
        Long majorId = body.get("majorId") != null ? Long.valueOf(body.get("majorId").toString()) : null;
        String grade = (String) body.get("grade");
        String status = (String) body.get("status");
        ClassInfo classInfo = classInfoService.updateClass(id, name, college, majorId, grade, status);
        return Result.success(classInfo);
    }

    @Operation(summary = "删除班级")
    @DeleteMapping("/classes/{id}")
    public Result<Void> deleteClass(@PathVariable Long id) {
        classInfoService.deleteClass(id);
        return Result.success(null);
    }

    // ==================== 花名册管理 ====================

    @Operation(summary = "获取花名册列表")
    @GetMapping("/roster")
    public Result<Page<Map<String, Object>>> listRoster(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String college,
            @RequestParam(required = false) Long majorId,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size) {
        return Result.success(studentRosterService.listRoster(keyword, college, majorId, grade, status, current, size));
    }

    @Operation(summary = "获取花名册统计")
    @GetMapping("/roster/stats")
    public Result<Map<String, Object>> getRosterStats() {
        return Result.success(studentRosterService.getStats());
    }

    @Operation(summary = "手动添加花名册记录")
    @PostMapping("/roster")
    public Result<StudentRoster> addRosterRecord(@RequestBody Map<String, Object> body) {
        String studentNo = (String) body.get("studentNo");
        String realName = (String) body.get("realName");
        String college = (String) body.get("college");
        Long majorId = body.get("majorId") != null ? Long.valueOf(body.get("majorId").toString()) : null;
        Long classId = body.get("classId") != null ? Long.valueOf(body.get("classId").toString()) : null;
        String grade = (String) body.get("grade");
        StudentRoster roster = studentRosterService.addRecord(studentNo, realName, college, majorId, classId, grade);
        return Result.success(roster);
    }

    @Operation(summary = "编辑花名册记录")
    @PutMapping("/roster/{id}")
    public Result<StudentRoster> updateRosterRecord(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String realName = (String) body.get("realName");
        String college = (String) body.get("college");
        Long majorId = body.get("majorId") != null ? Long.valueOf(body.get("majorId").toString()) : null;
        Long classId = body.get("classId") != null ? Long.valueOf(body.get("classId").toString()) : null;
        String grade = (String) body.get("grade");
        StudentRoster roster = studentRosterService.updateRecord(id, realName, college, majorId, classId, grade);
        return Result.success(roster);
    }

    @Operation(summary = "删除花名册记录")
    @DeleteMapping("/roster/{id}")
    public Result<Void> deleteRosterRecord(@PathVariable Long id) {
        studentRosterService.deleteRecord(id);
        return Result.success(null);
    }

    @Operation(summary = "批量导入花名册")
    @PostMapping("/roster/import")
    public Result<Map<String, Object>> importRoster(@RequestBody List<Map<String, String>> records) {
        return Result.success(studentRosterService.importRecords(records));
    }

    @Operation(summary = "Excel 导入花名册")
    @PostMapping("/roster/upload-excel")
    public Result<Map<String, Object>> uploadExcel(@RequestParam("file") MultipartFile file) {
        return Result.success(studentRosterService.importFromExcel(file));
    }

    // ==================== 注册审核（教师） ====================

    @Operation(summary = "获取待审核教师列表")
    @GetMapping("/registrations/pending")
    public Result<List<Map<String, Object>>> listPendingTeachers() {
        List<User> teachers = userService.list(new LambdaQueryWrapper<User>()
                .eq(User::getRole, "teacher")
                .eq(User::getStatus, "pending_approval")
                .orderByDesc(User::getId));

        List<Map<String, Object>> result = teachers.stream().map(u -> {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("realName", u.getRealName());
            m.put("college", u.getCollege());
            return m;
        }).collect(Collectors.toList());

        return Result.success(result);
    }

    @Operation(summary = "审核通过教师注册")
    @PostMapping("/registrations/approve")
    public Result<Void> approveTeacher(@RequestBody Map<String, Long> body) {
        Long userId = body.get("userId");
        User user = userService.getById(userId);
        if (user == null || !"teacher".equals(user.getRole())) {
            return Result.error("用户不存在或不是教师");
        }
        if (!"pending_approval".equals(user.getStatus())) {
            return Result.error("该用户不在待审核状态");
        }

        user.setStatus("active");
        userService.updateById(user);

        // 发送站内消息
        Message msg = new Message();
        msg.setFromUser(0L); // 系统消息
        msg.setToUser(userId);
        msg.setTitle("注册审核通过");
        msg.setContent("您的教师账号已审核通过，现在可以正常登录系统。");
        msg.setIsRead(0);
        msg.setCreateTime(LocalDateTime.now());
        messageService.save(msg);

        log.info("教师注册审核通过: {}", user.getUsername());
        return Result.success(null);
    }

    @Operation(summary = "审核驳回教师注册")
    @PostMapping("/registrations/reject")
    public Result<Void> rejectTeacher(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String reason = (String) body.get("reason");

        User user = userService.getById(userId);
        if (user == null || !"teacher".equals(user.getRole())) {
            return Result.error("用户不存在或不是教师");
        }
        if (!"pending_approval".equals(user.getStatus())) {
            return Result.error("该用户不在待审核状态");
        }

        user.setStatus("rejected");
        userService.updateById(user);

        // 发送站内消息
        Message msg = new Message();
        msg.setFromUser(0L);
        msg.setToUser(userId);
        msg.setTitle("注册审核未通过");
        String cleanReason = sanitizeInput(reason);
        msg.setContent("很抱歉，您的教师注册审核未通过。原因：" + (cleanReason != null ? cleanReason : "请联系管理员了解详情"));
        msg.setIsRead(0);
        msg.setCreateTime(LocalDateTime.now());
        messageService.save(msg);

        log.info("教师注册审核驳回: {}, 原因: {}", user.getUsername(), reason);
        return Result.success(null);
    }

    /**
     * 清理用户输入，去除 HTML 标签防止 XSS
     */
    private String sanitizeInput(String input) {
        if (input == null) return null;
        // 去除 HTML 标签
        String cleaned = input.replaceAll("<[^>]*>", "");
        // 去除 javascript: 协议
        cleaned = cleaned.replaceAll("(?i)javascript\\s*:", "");
        // 去除 on 事件属性模式
        cleaned = cleaned.replaceAll("(?i)on\\w+\\s*=", "");
        return cleaned.trim();
    }
}
