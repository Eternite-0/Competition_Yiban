package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.etsaion.dto.ai.AiChatRequestDTO;
import com.etsaion.dto.ai.AiMessageDTO;
import com.etsaion.entity.AiConversation;
import com.etsaion.entity.AiMessage;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.ai.AiChatService;
import com.etsaion.service.ai.AiConversationService;
import com.etsaion.service.ai.AiMessageService;
import com.etsaion.service.ai.AssistantToolRegistry;
import com.etsaion.service.ai.MimoModelClient;
import com.etsaion.vo.ai.AiChatResponseVO;
import com.etsaion.vo.ai.AiConversationVO;
import com.etsaion.vo.ai.AiModelResponseVO;
import com.etsaion.vo.ai.ToolCallVO;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiChatServiceImpl implements AiChatService {

    private static final int MAX_IMAGE_COUNT = 4;
    private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private static final int MAX_TOOL_ROUNDS = 3;
    private static final Pattern IMAGE_DATA_URL = Pattern.compile(
            "^data:image/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=\\r\\n]+)$",
            Pattern.CASE_INSENSITIVE);

    private static final String SYSTEM_PROMPT = """
            你是易赛通高校赛事报名管理平台的 AI 助手。
            你的职责是帮助用户查询赛事、报名、成果、审核、学生信息等平台数据。

            规则：
            1. 必须基于工具返回的真实数据回答，不要编造。
            2. 不执行任何写操作（发布、审核、提交、删除等）。
            3. 回答要简洁、清爽，优先使用短段落和项目符号。
            4. 不要使用 Emoji、颜文字或夸张语气。
            5. 尽量不要使用 Markdown 表格；小面板里表格不易阅读，改用分组列表。
            6. 如果工具返回空数据，如实告知用户。
            7. 如果用户问题与平台无关，可以正常闲聊，但不要调用工具。
            """;

    @Autowired
    private AiConversationService aiConversationService;

    @Autowired
    private AiMessageService aiMessageService;

    @Autowired
    private AssistantToolRegistry assistantToolRegistry;

    @Autowired
    private MimoModelClient mimoModelClient;

    @Override
    @Transactional
    public AiChatResponseVO chat(Long userId, String role, AiChatRequestDTO dto) {
        return chat(userId, role, dto, null);
    }

    @Override
    @Transactional
    public AiChatResponseVO chat(Long userId, String role, AiChatRequestDTO dto, Consumer<String> progress) {
        emitProgress(progress, "正在理解问题");
        List<String> imageDataUrls = validateImageDataUrls(dto.getImageDataUrls());
        String userText = StrUtil.blankToDefault(StrUtil.trim(dto.getMessage()), "请分析图片附件。");
        AiConversation conversation = findOrCreateConversation(userId, role, dto);

        // 保存用户消息
        String persistedMessage = imageDataUrls.isEmpty()
                ? userText
                : userText + "\n[图片附件 " + imageDataUrls.size() + " 张]";
        saveMessage(conversation.getId(), "user", persistedMessage, null);

        // 构建对话历史
        List<Map<String, Object>> messages = buildConversationHistory(conversation.getId(), userText, imageDataUrls);

        // 获取工具定义
        List<Map<String, Object>> tools = assistantToolRegistry.getToolDefinitions(userId, role);

        emitProgress(progress, "正在判断是否需要查询数据");
        // Function Calling 循环
        String finalAnswer = "";
        Map<String, Object> usedToolContext = new LinkedHashMap<>();
        for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
            AiModelResponseVO response = callModel(messages, tools, imageDataUrls, round == 0);

            if (!response.isSuccess()) {
                finalAnswer = "AI 模型暂不可用：" + response.getErrorMessage();
                break;
            }

            // 模型没有调用工具，直接返回文本回答
            if (!response.hasToolCalls()) {
                finalAnswer = StrUtil.blankToDefault(response.getContent(), "暂无回复");
                break;
            }

            // 模型请求调用工具
            // 把 assistant 的 tool_calls 消息加入历史
            Map<String, Object> assistantMsg = new LinkedHashMap<>();
            assistantMsg.put("role", "assistant");
            assistantMsg.put("content", response.getContent() != null ? response.getContent() : "");
            assistantMsg.put("tool_calls", response.getToolCalls().stream().map(tc -> {
                Map<String, Object> tcMap = new LinkedHashMap<>();
                tcMap.put("id", tc.getId());
                tcMap.put("type", "function");
                tcMap.put("function", Map.of("name", tc.getFunctionName(), "arguments", tc.getArguments()));
                return tcMap;
            }).collect(Collectors.toList()));
            messages.add(assistantMsg);

            // 执行每个 tool_call，把结果作为 tool message 追加
            for (ToolCallVO toolCall : response.getToolCalls()) {
                emitProgress(progress, toolProgressMessage(toolCall.getFunctionName(), true));
                String result = assistantToolRegistry.executeTool(
                        toolCall.getFunctionName(), toolCall.getArguments(), userId, role);
                usedToolContext.put(toolCall.getFunctionName(), JSONUtil.parse(result));
                emitProgress(progress, toolProgressMessage(toolCall.getFunctionName(), false));

                Map<String, Object> toolMsg = new LinkedHashMap<>();
                toolMsg.put("role", "tool");
                toolMsg.put("tool_call_id", toolCall.getId());
                toolMsg.put("content", result);
                messages.add(toolMsg);
            }
        }

        if (StrUtil.isBlank(finalAnswer) && !usedToolContext.isEmpty()) {
            emitProgress(progress, "正在根据已读取数据生成回复");
            messages.add(Map.of("role", "user", "content", "请基于以上工具结果直接用中文回答，不要再调用工具。"));
            AiModelResponseVO summaryResponse = mimoModelClient.chatWithTools(SYSTEM_PROMPT, messages, List.of());
            if (summaryResponse.isSuccess() && StrUtil.isNotBlank(summaryResponse.getContent())) {
                finalAnswer = summaryResponse.getContent();
            } else {
                finalAnswer = "已读取相关平台数据，但暂时未能整理成完整回复。你可以换个更具体的问题再试一次。";
            }
        }

        emitProgress(progress, "正在整理回答");
        // 保存助手消息
        saveMessage(conversation.getId(), "assistant", finalAnswer, JSONUtil.toJsonStr(usedToolContext));
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setUpdateTime(LocalDateTime.now());
        aiConversationService.updateById(conversation);

        AiChatResponseVO vo = new AiChatResponseVO();
        vo.setConversationId(conversation.getId());
        vo.setAnswer(finalAnswer);
        vo.setToolContext(usedToolContext);
        vo.setCreateTime(LocalDateTime.now());
        return vo;
    }

    @Override
    public List<AiConversationVO> listConversations(Long userId) {
        return aiConversationService.list(new LambdaQueryWrapper<AiConversation>()
                        .eq(AiConversation::getUserId, userId)
                        .orderByDesc(AiConversation::getLastMessageAt)
                        .orderByDesc(AiConversation::getCreateTime))
                .stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    public AiConversationVO getConversationDetail(Long userId, Long conversationId) {
        AiConversation conversation = requireConversation(userId, conversationId);
        AiConversationVO vo = toVO(conversation);
        vo.setMessages(aiMessageService.list(new LambdaQueryWrapper<AiMessage>()
                .eq(AiMessage::getConversationId, conversationId)
                .orderByAsc(AiMessage::getCreateTime)));
        return vo;
    }

    @Override
    @Transactional
    public void deleteConversation(Long userId, Long conversationId) {
        requireConversation(userId, conversationId);
        aiMessageService.remove(new LambdaQueryWrapper<AiMessage>().eq(AiMessage::getConversationId, conversationId));
        aiConversationService.removeById(conversationId);
    }

    private void emitProgress(Consumer<String> progress, String message) {
        if (progress == null || StrUtil.isBlank(message)) return;
        progress.accept(message);
    }

    private String toolProgressMessage(String toolName, boolean start) {
        String target = switch (toolName) {
            case "search_competitions", "get_competition_detail" -> "赛事信息";
            case "get_my_registrations" -> "报名记录";
            case "get_my_submissions" -> "成果记录";
            case "get_my_award_proofs", "get_award_proof_audit" -> "获奖证明";
            case "get_my_growth" -> "成长档案";
            case "get_my_participations" -> "活动记录";
            case "get_my_messages" -> "站内消息";
            case "get_announcements" -> "公告";
            case "search_students", "get_student_detail" -> "学生信息";
            case "get_pending_reviews" -> "待审核任务";
            case "get_college_overview" -> "学院总览";
            case "get_pending_drafts" -> "赛事草稿";
            case "get_ai_task_stats" -> "AI 任务";
            case "get_user_stats" -> "用户统计";
            default -> "平台数据";
        };
        return start ? "正在查询" + target : "已读取" + target;
    }

    // ────────────── 对话历史构建 ──────────────

    private List<Map<String, Object>> buildConversationHistory(Long conversationId, String currentMessage,
                                                                List<String> imageDataUrls) {
        List<Map<String, Object>> messages = new ArrayList<>();

        // 加载历史消息（最近 20 条，排除当前这条）
        List<AiMessage> history = aiMessageService.list(new LambdaQueryWrapper<AiMessage>()
                .eq(AiMessage::getConversationId, conversationId)
                .ne(AiMessage::getContent, currentMessage)
                .orderByDesc(AiMessage::getCreateTime)
                .last("LIMIT 20"));

        // 反转为时间正序
        for (int i = history.size() - 1; i >= 0; i--) {
            AiMessage msg = history.get(i);
            Map<String, Object> msgMap = new LinkedHashMap<>();
            msgMap.put("role", msg.getRole());
            msgMap.put("content", msg.getContent() != null ? msg.getContent() : "");
            messages.add(msgMap);
        }

        // 添加当前用户消息（带图片）
        if (imageDataUrls.isEmpty()) {
            messages.add(Map.of("role", "user", "content", currentMessage));
        } else {
            List<Object> content = new ArrayList<>();
            content.add(Map.of("type", "text", "text", currentMessage));
            for (String url : imageDataUrls) {
                content.add(Map.of("type", "image_url", "image_url", Map.of("url", url)));
            }
            Map<String, Object> userMsg = new LinkedHashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", content);
            messages.add(userMsg);
        }

        return messages;
    }

    // ────────────── 模型调用 ──────────────

    private AiModelResponseVO callModel(List<Map<String, Object>> messages,
                                         List<Map<String, Object>> tools,
                                         List<String> imageDataUrls,
                                         boolean isFirstRound) {
        // 如果有图片，第一轮用 vision 调用（不带 tools）
        if (isFirstRound && !imageDataUrls.isEmpty()) {
            String userText = extractUserText(messages);
            return mimoModelClient.chatVisionText(SYSTEM_PROMPT, userText, imageDataUrls);
        }
        return mimoModelClient.chatWithTools(SYSTEM_PROMPT, messages, tools);
    }

    private String extractUserText(List<Map<String, Object>> messages) {
        for (int i = messages.size() - 1; i >= 0; i--) {
            Object content = messages.get(i).get("content");
            if (content instanceof String) return (String) content;
        }
        return "";
    }

    // ────────────── 会话管理 ──────────────

    private AiConversation findOrCreateConversation(Long userId, String role, AiChatRequestDTO dto) {
        if (dto.getConversationId() != null) {
            return requireConversation(userId, dto.getConversationId());
        }
        AiConversation conversation = new AiConversation();
        conversation.setUserId(userId);
        conversation.setRole(role);
        String title = StrUtil.blankToDefault(StrUtil.trim(dto.getMessage()), "图片对话");
        conversation.setTitle(StrUtil.maxLength(title, 30));
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setCreateTime(LocalDateTime.now());
        conversation.setUpdateTime(LocalDateTime.now());
        aiConversationService.save(conversation);
        return conversation;
    }

    private AiConversation requireConversation(Long userId, Long conversationId) {
        AiConversation conversation = aiConversationService.getById(conversationId);
        if (conversation == null || !userId.equals(conversation.getUserId())) {
            throw new BusinessException(403, "无权查看该对话");
        }
        return conversation;
    }

    private void saveMessage(Long conversationId, String role, String content, String toolResultJson) {
        AiMessage message = new AiMessage();
        message.setConversationId(conversationId);
        message.setRole(role);
        message.setContent(content);
        message.setToolResultJson(toolResultJson);
        message.setCreateTime(LocalDateTime.now());
        aiMessageService.save(message);
    }

    // ────────────── 工具方法 ──────────────

    private List<String> validateImageDataUrls(List<String> values) {
        if (values == null || values.isEmpty()) return List.of();
        if (values.size() > MAX_IMAGE_COUNT) {
            throw new BusinessException("单次最多上传 " + MAX_IMAGE_COUNT + " 张图片");
        }
        List<String> validated = new ArrayList<>();
        for (String value : values) {
            Matcher matcher = IMAGE_DATA_URL.matcher(StrUtil.blankToDefault(value, ""));
            if (!matcher.matches()) {
                throw new BusinessException("附件仅支持 PNG、JPG、WebP 或 GIF 图片");
            }
            try {
                byte[] decoded = Base64.getMimeDecoder().decode(matcher.group(2));
                if (decoded.length > MAX_IMAGE_BYTES) {
                    throw new BusinessException("单张图片不能超过 5MB");
                }
            } catch (IllegalArgumentException e) {
                throw new BusinessException("图片附件内容无效");
            }
            validated.add(value);
        }
        return validated;
    }

    private AiConversationVO toVO(AiConversation conversation) {
        AiConversationVO vo = new AiConversationVO();
        BeanUtils.copyProperties(conversation, vo);
        return vo;
    }
}
