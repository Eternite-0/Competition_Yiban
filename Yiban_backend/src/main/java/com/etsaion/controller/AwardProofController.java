package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.dto.ai.AwardProofReviewDTO;
import com.etsaion.dto.ai.AwardProofSubmitDTO;
import com.etsaion.dto.ai.CertificateRecognizeDTO;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.AwardProofService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.ai.AwardProofVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Tag(name = "AI获奖证明")
@RestController
@RequestMapping("/api")
@RequireRole({"student", "teacher", "admin"})
public class AwardProofController {

    @Autowired
    private AwardProofService awardProofService;

    @Operation(summary = "AI 识别证书")
    @PostMapping("/ai/certificate/recognize")
    @RequireRole("student")
    public Result<AwardProofVO> recognizeCertificate(@Validated @RequestBody CertificateRecognizeDTO dto) {
        return Result.success(awardProofService.recognizeCertificate(UserContext.getUserId(), dto));
    }

    @Operation(summary = "提交获奖证明审核")
    @PostMapping("/award-proof/submit")
    @RequireRole("student")
    public Result<AwardProofVO> submitAwardProof(@Validated @RequestBody AwardProofSubmitDTO dto) {
        return Result.success(awardProofService.submitAwardProof(UserContext.getUserId(), dto));
    }

    @Operation(summary = "我的获奖证明")
    @GetMapping("/award-proof/my")
    @RequireRole("student")
    public Result<Page<AwardProofVO>> listMine(@RequestParam(defaultValue = "1") int current,
                                               @RequestParam(defaultValue = "10") int size) {
        size = Math.min(Math.max(size, 1), 100);
        current = Math.max(current, 1);
        return Result.success(awardProofService.listMyAwardProofs(UserContext.getUserId(), current, size));
    }

    @Operation(summary = "获奖证明审核列表")
    @GetMapping("/award-proof/audit-list")
    @RequireRole({"teacher", "admin"})
    public Result<Page<AwardProofVO>> listAudit(@RequestParam(defaultValue = "1") int current,
                                                @RequestParam(defaultValue = "10") int size,
                                                @RequestParam(required = false) String status) {
        size = Math.min(Math.max(size, 1), 100);
        current = Math.max(current, 1);
        return Result.success(awardProofService.listAuditAwardProofs(
                UserContext.getUserId(), UserContext.getUserRole(), current, size, status));
    }

    @Operation(summary = "获奖证明详情")
    @GetMapping("/award-proof/{id}")
    public Result<AwardProofVO> detail(@PathVariable Long id) {
        return Result.success(awardProofService.getAwardProofDetail(id, UserContext.getUserId(), UserContext.getUserRole()));
    }

    @Operation(summary = "审核获奖证明")
    @PostMapping("/award-proof/review")
    @RequireRole({"teacher", "admin"})
    public Result<Void> review(@Validated @RequestBody AwardProofReviewDTO dto) {
        awardProofService.reviewAwardProof(UserContext.getUserId(), UserContext.getUserRole(), dto);
        return Result.success();
    }
}
