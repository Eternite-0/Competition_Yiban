package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.dto.ai.CompetitionDraftConfirmDTO;
import com.etsaion.dto.ai.CompetitionDraftParseUrlDTO;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.ai.AiCompetitionDraftService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.ai.AiCompetitionDraftVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Tag(name = "AI赛事导入")
@RestController
@RequestMapping("/api/ai/competition")
@RequireRole("admin")
public class AiCompetitionController {

    @Autowired
    private AiCompetitionDraftService aiCompetitionDraftService;

    @Operation(summary = "上传文档解析赛事草稿")
    @PostMapping("/parse-file")
    public Result<AiCompetitionDraftVO> parseFile(@RequestParam("file") MultipartFile file) {
        return Result.success(aiCompetitionDraftService.parseFile(UserContext.getUserId(), file));
    }

    @Operation(summary = "解析 URL 生成赛事草稿")
    @PostMapping("/parse-url")
    public Result<AiCompetitionDraftVO> parseUrl(@Validated @RequestBody CompetitionDraftParseUrlDTO dto) {
        return Result.success(aiCompetitionDraftService.parseUrl(UserContext.getUserId(), dto));
    }

    @Operation(summary = "SSE 实时进度解析 URL")
    @PostMapping(value = "/parse-url-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter parseUrlStream(@Validated @RequestBody CompetitionDraftParseUrlDTO dto) {
        SseEmitter emitter = new SseEmitter(180_000L);
        Long adminId = UserContext.getUserId();
        CompletableFuture.runAsync(() -> {
            try {
                AiCompetitionDraftVO result = aiCompetitionDraftService.parseUrlWithProgress(adminId, dto, event -> {
                    try {
                        emitter.send(SseEmitter.event().name("progress").data(event));
                    } catch (IOException ignored) {
                    }
                });
                emitter.send(SseEmitter.event().name("done").data(result));
                emitter.complete();
            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event().name("error")
                            .data(Map.of("message", e.getMessage() != null ? e.getMessage() : "解析失败")));
                } catch (IOException ignored) {
                }
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    @Operation(summary = "AI 草稿箱列表")
    @GetMapping("/drafts")
    public Result<Page<AiCompetitionDraftVO>> listDrafts(@RequestParam(defaultValue = "1") int current,
                                                         @RequestParam(defaultValue = "10") int size,
                                                         @RequestParam(required = false) String status,
                                                         @RequestParam(required = false) String keyword) {
        size = Math.min(Math.max(size, 1), 100);
        current = Math.max(current, 1);
        return Result.success(aiCompetitionDraftService.listDrafts(current, size, status, keyword));
    }

    @Operation(summary = "AI 草稿详情")
    @GetMapping("/drafts/{id}")
    public Result<AiCompetitionDraftVO> detail(@PathVariable Long id) {
        return Result.success(aiCompetitionDraftService.getDraftDetail(id));
    }

    @Operation(summary = "编辑 AI 草稿")
    @PutMapping("/drafts/{id}")
    public Result<AiCompetitionDraftVO> updateDraft(@PathVariable Long id, @RequestBody AiCompetitionDraftVO dto) {
        return Result.success(aiCompetitionDraftService.updateDraft(id, dto));
    }

    @Operation(summary = "确认 AI 草稿为赛事草稿")
    @PostMapping("/drafts/{id}/confirm")
    public Result<AiCompetitionDraftVO> confirmDraft(@PathVariable Long id,
                                                     @RequestBody(required = false) CompetitionDraftConfirmDTO dto) {
        return Result.success(aiCompetitionDraftService.confirmDraft(id, UserContext.getUserId(), dto));
    }

    @Operation(summary = "忽略 AI 草稿")
    @PostMapping("/drafts/{id}/ignore")
    public Result<AiCompetitionDraftVO> ignoreDraft(@PathVariable Long id,
                                                    @RequestBody(required = false) CompetitionDraftConfirmDTO dto) {
        return Result.success(aiCompetitionDraftService.ignoreDraft(id, UserContext.getUserId(), dto));
    }
}
