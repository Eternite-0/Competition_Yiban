package com.etsaion.controller;

import com.etsaion.dto.Result;
import com.etsaion.dto.ai.AiChatRequestDTO;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.ai.AiChatService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.ai.AiChatResponseVO;
import com.etsaion.vo.ai.AiConversationVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Tag(name = "AI智能体对话")
@RestController
@RequestMapping("/api/ai/chat")
@RequireRole({"student", "teacher", "admin"})
public class AiChatController {

    private static final int STREAM_CHUNK_TARGET = 4;
    private static final int STREAM_CHUNK_MAX = 8;
    private static final long STREAM_BASE_DELAY_MS = 55L;
    private static final long STREAM_PUNCTUATION_DELAY_MS = 120L;
    private static final long STREAM_LINE_BREAK_DELAY_MS = 170L;

    @Autowired
    private AiChatService aiChatService;

    @Operation(summary = "非流式智能体对话")
    @PostMapping
    public Result<AiChatResponseVO> chat(@Validated @RequestBody AiChatRequestDTO dto) {
        return Result.success(aiChatService.chat(UserContext.getUserId(), UserContext.getUserRole(), dto));
    }

    @Operation(summary = "SSE 智能体对话")
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@Validated @RequestBody AiChatRequestDTO dto) {
        SseEmitter emitter = new SseEmitter(120000L);
        Long userId = UserContext.getUserId();
        String role = UserContext.getUserRole();

        CompletableFuture.runAsync(() -> {
            try {
                AiChatResponseVO response = aiChatService.chat(userId, role, dto, message -> {
                    try {
                        emitter.send(SseEmitter.event().name("progress").data(Map.of("message", message)));
                    } catch (IOException ignored) {
                    }
                });
                streamAnswer(response.getAnswer(), emitter);
                emitter.send(SseEmitter.event().name("message").data(response));
                emitter.complete();
            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event().name("error")
                            .data(Map.of("message", e.getMessage() != null ? e.getMessage() : "AI 助手暂时不可用")));
                } catch (IOException ignored) {
                }
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    private void streamAnswer(String answer, SseEmitter emitter) throws IOException, InterruptedException {
        if (answer == null || answer.isBlank()) {
            return;
        }
        for (String chunk : splitAnswer(answer)) {
            if (chunk.isEmpty()) continue;
            emitter.send(SseEmitter.event().name("message").data(Map.of("delta", chunk)));
            Thread.sleep(streamDelay(chunk));
        }
    }

    private List<String> splitAnswer(String answer) {
        List<String> chunks = new java.util.ArrayList<>();
        StringBuilder buffer = new StringBuilder();
        for (int i = 0; i < answer.length(); i++) {
            char current = answer.charAt(i);
            buffer.append(current);
            boolean lineBreak = current == '\n';
            boolean punctuation = "。！？；;，,、：:".indexOf(current) >= 0;
            boolean hardLimit = buffer.length() >= STREAM_CHUNK_MAX;
            boolean regularBreak = buffer.length() >= STREAM_CHUNK_TARGET;
            boolean softBreak = buffer.length() >= 2 && (punctuation || lineBreak);
            if (hardLimit || regularBreak || softBreak) {
                chunks.add(buffer.toString());
                buffer.setLength(0);
            }
        }
        if (buffer.length() > 0) {
            chunks.add(buffer.toString());
        }
        return chunks;
    }

    private long streamDelay(String chunk) {
        if (chunk.contains("\n")) {
            return STREAM_LINE_BREAK_DELAY_MS;
        }
        char last = chunk.charAt(chunk.length() - 1);
        if ("。！？；;，,、：:".indexOf(last) >= 0) {
            return STREAM_PUNCTUATION_DELAY_MS;
        }
        return STREAM_BASE_DELAY_MS;
    }

    @Operation(summary = "获取当前用户 AI 会话列表")
    @GetMapping("/conversations")
    public Result<List<AiConversationVO>> listConversations() {
        return Result.success(aiChatService.listConversations(UserContext.getUserId()));
    }

    @Operation(summary = "获取当前用户 AI 会话详情")
    @GetMapping("/conversations/{id}")
    public Result<AiConversationVO> detail(@PathVariable Long id) {
        return Result.success(aiChatService.getConversationDetail(UserContext.getUserId(), id));
    }

    @Operation(summary = "删除当前用户 AI 会话")
    @DeleteMapping("/conversations/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        aiChatService.deleteConversation(UserContext.getUserId(), id);
        return Result.success();
    }
}
