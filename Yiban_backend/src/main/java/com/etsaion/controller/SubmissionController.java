package com.etsaion.controller;

import cn.hutool.core.map.MapUtil;
import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.entity.Submission;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.SubmissionService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.SubmissionVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Tag(name = "成果文件上传与审核", description = "学生成果附件上传提交、教师审批成果接口")
@RestController
@RequestMapping("/api/submission")
public class SubmissionController {

    @Autowired
    private SubmissionService submissionService;

    @Value("${file.upload-path}")
    private String uploadPath;

    @Operation(summary = "模拟文件/成果上传接口")
    @PostMapping("/upload")
    @RequireRole({"student", "admin", "teacher"})
    public Result<Map<String, Object>> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return Result.error("文件不能为空");
        }

        // Validate file size (50MB max)
        if (file.getSize() > 50 * 1024 * 1024) {
            return Result.error("文件大小不能超过50MB");
        }

        // Validate file type
        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String ext = originalFilename.contains(".") ? originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase() : "";
            Set<String> allowedExts = Set.of(".pdf", ".doc", ".docx", ".zip", ".jpg", ".jpeg", ".png", ".gif", ".webp");
            if (!ext.isEmpty() && !allowedExts.contains(ext)) {
                return Result.error("不支持的文件类型，允许: " + String.join(", ", allowedExts));
            }
        }

        try {
            // Resolve to absolute path so storage is consistent regardless of JVM cwd
            File dir = new File(uploadPath).getAbsoluteFile();
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // Create a unique file name
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            String newFilename = IdUtil.simpleUUID() + ext;
            File targetFile = new File(dir, newFilename);
            
            // Save to physical disk
            file.transferTo(targetFile);

            // Return file details mapped virtual URL
            String fileUrl = "/files/" + newFilename;
            Map<String, Object> data = MapUtil.<String, Object>builder()
                    .put("fileName", originalFilename)
                    .put("fileUrl", fileUrl)
                    .put("fileSize", file.getSize())
                    .build();

            return Result.success(data);
        } catch (IOException e) {
            return Result.error(500, "文件上传磁盘错误：" + e.getMessage());
        }
    }

    @Operation(summary = "学生提交成果附件")
    @PostMapping("/submit")
    @RequireRole("student")
    public Result<Submission> submitSubmission(
            @RequestParam Long registrationId,
            @RequestParam String fileName,
            @RequestParam String fileUrl,
            @RequestParam(required = false) Long fileSize) {
        
        Long studentId = UserContext.getUserId();
        Submission sub = submissionService.submitSubmission(studentId, registrationId, fileName, fileUrl, fileSize);
        return Result.success(sub);
    }

    @Operation(summary = "学生提交成果附件（支持团队代传）")
    @PostMapping("/submit-team")
    @RequireRole("student")
    public Result<List<Submission>> submitTeamSubmission(
            @RequestParam Long competitionId,
            @RequestParam String fileName,
            @RequestParam String fileUrl,
            @RequestParam(required = false) Long fileSize,
            @RequestParam List<Long> studentIds) {

        Long submitterId = UserContext.getUserId();
        List<Submission> subs = submissionService.submitTeamSubmission(submitterId, competitionId, fileName, fileUrl, fileSize, studentIds);
        return Result.success(subs);
    }

    @Operation(summary = "学生查询自己的成果列表")
    @GetMapping("/my")
    @RequireRole("student")
    public Result<List<SubmissionVO>> getMySubmissions() {
        Long studentId = UserContext.getUserId();
        List<SubmissionVO> list = submissionService.listMySubmissions(studentId);
        return Result.success(list);
    }

    @Operation(summary = "教师/管理员审批成果接口")
    @PostMapping("/review")
    @RequireRole({"admin", "teacher"})
    public Result<Void> reviewSubmission(
            @RequestParam Long submissionId,
            @RequestParam Boolean approve,
            @RequestParam(required = false) String reviewNote) {

        Long teacherId = UserContext.getUserId();
        submissionService.reviewSubmission(teacherId, submissionId, approve, reviewNote);
        return Result.success();
    }

    @Operation(summary = "管理员/教师分页查询成果列表")
    @GetMapping("/list")
    @RequireRole({"admin", "teacher"})
    public Result<Page<SubmissionVO>> listSubmissions(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {

        Page<SubmissionVO> page = submissionService.listSubmissions(current, size, status, keyword);
        return Result.success(page);
    }

    @Operation(summary = "优秀作品展示墙（已审核通过且被标记展示）")
    @GetMapping("/excellent")
    public Result<List<SubmissionVO>> listExcellent() {
        return Result.success(submissionService.listExcellent());
    }

    @Operation(summary = "管理员切换优秀作品展示状态")
    @PostMapping("/admin/toggle-display")
    @RequireRole("admin")
    public Result<Void> toggleDisplay(
            @RequestParam Long submissionId,
            @RequestParam Boolean displayed) {
        submissionService.toggleDisplay(submissionId, displayed);
        return Result.success();
    }

    @Operation(summary = "管理员编辑优秀作品评语/简介")
    @PostMapping("/admin/update-note")
    @RequireRole("admin")
    public Result<Void> updateReviewNote(
            @RequestParam Long submissionId,
            @RequestParam(required = false) String reviewNote) {
        submissionService.updateReviewNote(submissionId, reviewNote);
        return Result.success();
    }

    @Operation(summary = "管理员手动录入优秀作品（直接创建已审核的展示作品）")
    @PostMapping("/admin/create-excellent")
    @RequireRole("admin")
    public Result<Submission> adminCreateExcellent(
            @RequestParam Long competitionId,
            @RequestParam String fileName,
            @RequestParam String fileUrl,
            @RequestParam(required = false) Long fileSize,
            @RequestParam(required = false) String reviewNote) {
        Submission sub = submissionService.adminCreateExcellent(competitionId, fileName, fileUrl, fileSize, reviewNote);
        return Result.success(sub);
    }
}
