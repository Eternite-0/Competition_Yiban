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
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiChatServiceImpl implements AiChatService {

    private static final int MAX_IMAGE_COUNT = 4;
    private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private static final Pattern IMAGE_DATA_URL = Pattern.compile(
            "^data:image/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=\\r\\n]+)$",
            Pattern.CASE_INSENSITIVE);

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
        List<String> imageDataUrls = validateImageDataUrls(dto.getImageDataUrls());
        String userText = StrUtil.blankToDefault(StrUtil.trim(dto.getMessage()), "请分析图片附件。");
        AiConversation conversation = findOrCreateConversation(userId, role, dto);
        String persistedMessage = imageDataUrls.isEmpty()
                ? userText
                : userText + "\n[图片附件 " + imageDataUrls.size() + " 张]";
        saveMessage(conversation.getId(), "user", persistedMessage, null);
        Map<String, Object> toolContext = assistantToolRegistry.buildToolContext(userId, role, userText);

        String answer = callModel(role, userText, toolContext, imageDataUrls);
        saveMessage(conversation.getId(), "assistant", answer, JSONUtil.toJsonStr(toolContext));

        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setUpdateTime(LocalDateTime.now());
        aiConversationService.updateById(conversation);

        AiChatResponseVO response = new AiChatResponseVO();
        response.setConversationId(conversation.getId());
        response.setAnswer(answer);
        response.setToolContext(toolContext);
        response.setCreateTime(LocalDateTime.now());
        return response;
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

    private String callModel(String role, String userMessage, Map<String, Object> toolContext,
                             List<String> imageDataUrls) {
        String systemPrompt = "你是易赛通平台助手。必须基于工具数据回答，不越权，不直接执行发布、审核或提交等写操作。";
        String prompt = "当前角色：" + role
                + "\n工具数据：" + JSONUtil.toJsonStr(toolContext)
                + "\n用户问题：" + userMessage;
        AiModelResponseVO response;
        if (imageDataUrls.isEmpty()) {
            List<AiMessageDTO> messages = new ArrayList<>();
            messages.add(new AiMessageDTO("user", prompt));
            response = mimoModelClient.chatText(systemPrompt, messages);
        } else {
            response = mimoModelClient.chatVisionText(systemPrompt, prompt, imageDataUrls);
        }
        if (response.isSuccess()) {
            return response.getContent();
        }
        return "AI 模型暂不可用，以下是平台实时数据摘要：" + JSONUtil.toJsonStr(toolContext);
    }

    private List<String> validateImageDataUrls(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
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
