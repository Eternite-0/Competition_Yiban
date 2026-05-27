package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.AuditDTO;
import com.etsaion.dto.RegistrationSubmitDTO;
import com.etsaion.dto.Result;
import com.etsaion.entity.Registration;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.RegistrationService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.RegistrationVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "赛事报名管理", description = "学生赛事报名及教师/辅导员审核接口")
@RestController
@RequestMapping("/api/registration")
public class RegistrationController {

    @Autowired
    private RegistrationService registrationService;

    @Operation(summary = "学生发起赛事报名")
    @PostMapping("/submit")
    @RequireRole("student")
    public Result<Registration> submitRegistration(@Validated @RequestBody RegistrationSubmitDTO dto) {
        Long studentId = UserContext.getUserId();
        Registration reg = registrationService.submitRegistration(studentId, dto);
        return Result.success(reg);
    }

    @Operation(summary = "学生查询自己的报名列表")
    @GetMapping("/my")
    @RequireRole("student")
    public Result<List<RegistrationVO>> getMyRegistrations() {
        Long studentId = UserContext.getUserId();
        List<RegistrationVO> list = registrationService.getMyList(studentId);
        return Result.success(list);
    }

    @Operation(summary = "教师/管理员分页获取待审核的报名列表")
    @GetMapping("/pending")
    @RequireRole({"admin", "teacher"})
    public Result<Page<RegistrationVO>> getPendingRegistrations(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size) {

        Page<RegistrationVO> page = registrationService.getPendingAuditPage(current, size);
        return Result.success(page);
    }

    @Operation(summary = "教师/管理员审核审批接口")
    @PostMapping("/audit")
    @RequireRole({"admin", "teacher"})
    public Result<Void> auditRegistration(
            @RequestParam Long registrationId,
            @Validated @RequestBody AuditDTO dto) {
        
        Long teacherId = UserContext.getUserId();
        registrationService.audit(registrationId, teacherId, dto.getApprove(), dto.getReviewNote());
        return Result.success();
    }
}
