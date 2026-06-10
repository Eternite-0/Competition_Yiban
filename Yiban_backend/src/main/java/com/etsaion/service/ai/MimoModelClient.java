package com.etsaion.service.ai;

import com.etsaion.config.AiProperties;
import com.etsaion.dto.ai.AiMessageDTO;
import com.etsaion.vo.ai.AiModelResponseVO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.etsaion.vo.ai.ToolCallVO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MimoModelClient {
    private static final Logger log = LoggerFactory.getLogger(MimoModelClient.class);
    private static final String MISSING_KEY_MESSAGE = "AI_API_KEY 未配置，无法调用 AI 模型服务";
    private static final int MAX_INTERACTIVE_TIMEOUT_SECONDS = 25;
    private static final int MAX_INTERACTIVE_RETRIES = 0;
    private static final int ERROR_LOG_LIMIT = 1200;
    private static final int ERROR_DETAIL_LIMIT = 180;

    private final AiProperties properties;
    private final ObjectMapper objectMapper;

    public MimoModelClient(AiProperties properties) {
        this.properties = properties;
        this.objectMapper = new ObjectMapper();
    }

    public AiModelResponseVO chatText(String systemPrompt, List<AiMessageDTO> messages) {
        List<Map<String, Object>> requestMessages = new ArrayList<>();
        if (StringUtils.hasText(systemPrompt)) {
            requestMessages.add(textMessage("system", systemPrompt));
        }
        if (messages != null) {
            for (AiMessageDTO message : messages) {
                requestMessages.add(textMessage(message.getRole(), message.getContent()));
            }
        }
        return sendChatRequest(requestMessages, false);
    }

    public AiModelResponseVO chatJson(String systemPrompt, String userPrompt, Map<String, Object> schemaHint) {
        String prompt = userPrompt;
        if (schemaHint != null && !schemaHint.isEmpty()) {
            prompt = userPrompt + "\n\n请严格返回 JSON，Schema 参考：" + toJson(schemaHint);
        }
        List<Map<String, Object>> requestMessages = new ArrayList<>();
        if (StringUtils.hasText(systemPrompt)) {
            requestMessages.add(textMessage("system", systemPrompt));
        }
        requestMessages.add(textMessage("user", prompt));
        return sendChatRequest(requestMessages, true);
    }

    public AiModelResponseVO chatVisionText(String systemPrompt, String userPrompt, List<String> imageUrls) {
        return sendVisionRequest(systemPrompt, userPrompt, imageUrls, false);
    }

    public AiModelResponseVO chatVisionJson(String systemPrompt, String imageUrl, String userPrompt,
                                            Map<String, Object> schemaHint) {
        return chatVisionJson(systemPrompt, List.of(imageUrl), userPrompt, schemaHint);
    }

    public AiModelResponseVO chatVisionJson(String systemPrompt, List<String> imageUrls, String userPrompt,
                                            Map<String, Object> schemaHint) {
        String prompt = schemaHint == null || schemaHint.isEmpty()
                ? userPrompt
                : userPrompt + "\n\n请严格返回 JSON，Schema 参考：" + toJson(schemaHint);
        return sendVisionRequest(systemPrompt, prompt, imageUrls, true);
    }

    /**
     * 支持 Function Calling 的对话方法。
     * @param systemPrompt 系统提示
     * @param messages     对话历史（含 user/assistant/tool 角色）
     * @param tools        工具定义列表（OpenAI function calling 格式）
     */
    public AiModelResponseVO chatWithTools(String systemPrompt, List<Map<String, Object>> messages,
                                           List<Map<String, Object>> tools) {
        List<Map<String, Object>> requestMessages = new ArrayList<>();
        if (StringUtils.hasText(systemPrompt)) {
            requestMessages.add(textMessage("system", systemPrompt));
        }
        if (messages != null) {
            requestMessages.addAll(messages);
        }
        return sendChatRequestWithTools(requestMessages, tools);
    }

    private AiModelResponseVO sendVisionRequest(String systemPrompt, String userPrompt,
                                                List<String> imageUrls, boolean jsonMode) {
        List<Map<String, Object>> requestMessages = new ArrayList<>();
        if (StringUtils.hasText(systemPrompt)) {
            requestMessages.add(textMessage("system", systemPrompt));
        }

        List<Map<String, Object>> content = new ArrayList<>();
        Map<String, Object> text = new LinkedHashMap<>();
        text.put("type", "text");
        text.put("text", StringUtils.hasText(userPrompt) ? userPrompt : "请分析图片内容。");
        content.add(text);

        if (imageUrls != null) {
            for (String imageUrl : imageUrls) {
                if (!StringUtils.hasText(imageUrl)) continue;
                Map<String, Object> image = new LinkedHashMap<>();
                image.put("type", "image_url");
                image.put("image_url", Map.of("url", imageUrl));
                content.add(image);
            }
        }

        Map<String, Object> user = new LinkedHashMap<>();
        user.put("role", "user");
        user.put("content", content);
        requestMessages.add(user);
        return sendChatRequest(requestMessages, jsonMode, effectiveVisionModel());
    }

    private AiModelResponseVO sendChatRequest(List<Map<String, Object>> messages, boolean jsonMode) {
        return sendChatRequest(messages, jsonMode, properties.getModel());
    }

    private AiModelResponseVO sendChatRequest(List<Map<String, Object>> messages, boolean jsonMode, String model) {
        if (!properties.hasApiKey()) {
            return AiModelResponseVO.error(MISSING_KEY_MESSAGE);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", StringUtils.hasText(model) ? model : properties.getModel());
        body.put("messages", messages);
        if (jsonMode) {
            body.put("response_format", Map.of("type", "json_object"));
        }

        return executeWithRetry(body);
    }

    private AiModelResponseVO sendChatRequestWithTools(List<Map<String, Object>> messages,
                                                       List<Map<String, Object>> tools) {
        if (!properties.hasApiKey()) {
            return AiModelResponseVO.error(MISSING_KEY_MESSAGE);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getModel());
        body.put("messages", messages);
        if (tools != null && !tools.isEmpty()) {
            body.put("tools", tools);
        }

        return executeWithRetry(body);
    }

    private AiModelResponseVO executeWithRetry(Map<String, Object> body) {
        String requestBody = toJson(body);
        int maxRetries = Math.min(Math.max(properties.getMaxRetries(), 0), MAX_INTERACTIVE_RETRIES);
        AiModelResponseVO lastFailure = null;
        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                HttpResponse<String> response = httpClient().send(buildRequest(requestBody), HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    return parseSuccess(response.body());
                }
                String responseBody = response.body();
                log.warn("AI model request failed: status={}, model={}, tools={}, messages={}, body={}",
                        response.statusCode(),
                        body.get("model"),
                        body.containsKey("tools"),
                        messageCount(body),
                        abbreviate(responseBody, ERROR_LOG_LIMIT));
                lastFailure = AiModelResponseVO.error(describeHttpError(response.statusCode(), responseBody),
                        response.statusCode(), responseBody);
            } catch (HttpTimeoutException e) {
                lastFailure = AiModelResponseVO.error("AI 模型响应超时，请稍后重试");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return AiModelResponseVO.error("AI 模型调用已取消");
            } catch (Exception e) {
                lastFailure = AiModelResponseVO.error("AI 模型调用失败: " + e.getMessage());
            }
        }
        return lastFailure != null ? lastFailure : AiModelResponseVO.error("AI 模型调用失败");
    }

    public static String describeHttpError(int statusCode, String rawBody) {
        String detail = cleanErrorDetail(extractErrorDetail(rawBody));
        String searchable = (detail + " " + (rawBody == null ? "" : rawBody)).toLowerCase();
        if (searchable.contains("support image input")) {
            return "当前 AI 视觉模型不支持图片输入，请检查 AI_VISION_MODEL 配置。";
        }
        if (searchable.contains("502 bad gateway") || searchable.contains("openresty")) {
            return "AI 模型服务网关异常（上游返回 502 Bad Gateway），请稍后重试，或检查 AI_BASE_URL / AI_MODEL / AI_VISION_MODEL 配置。";
        }
        if (statusCode == 401 || statusCode == 403) {
            return "AI_API_KEY 无效或没有访问该模型的权限，请检查环境变量配置。";
        }
        if (statusCode == 404) {
            return "AI 模型或接口地址不存在，请检查 AI_BASE_URL / AI_MODEL / AI_VISION_MODEL 配置。";
        }
        if (statusCode == 429) {
            return "AI 模型调用过于频繁或额度不足，请稍后重试。";
        }
        if (StringUtils.hasText(detail)) {
            return "AI 模型调用失败: HTTP " + statusCode + " - " + abbreviate(detail, ERROR_DETAIL_LIMIT);
        }
        return "AI 模型调用失败: HTTP " + statusCode;
    }

    private static String extractErrorDetail(String rawBody) {
        if (!StringUtils.hasText(rawBody)) {
            return "";
        }
        try {
            JsonNode root = new ObjectMapper().readTree(rawBody);
            JsonNode error = root.path("error");
            if (error.isTextual()) {
                return error.asText("");
            }
            JsonNode errorMessage = error.path("message");
            if (errorMessage.isTextual()) {
                return errorMessage.asText("");
            }
            JsonNode message = root.path("message");
            if (message.isTextual()) {
                return message.asText("");
            }
        } catch (Exception ignored) {
        }
        return rawBody;
    }

    private static String cleanErrorDetail(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value
                .replaceAll("(?is)<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static String abbreviate(String value, int maxLen) {
        if (value == null) {
            return "";
        }
        String compact = value.replaceAll("\\s+", " ").trim();
        if (compact.length() <= maxLen) {
            return compact;
        }
        return compact.substring(0, maxLen) + "...";
    }

    private int messageCount(Map<String, Object> body) {
        Object messages = body.get("messages");
        if (messages instanceof List<?> list) {
            return list.size();
        }
        return 0;
    }

    private HttpClient httpClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(effectiveTimeoutSeconds()))
                .build();
    }

    private HttpRequest buildRequest(String requestBody) {
        String baseUrl = properties.getBaseUrl();
        String url = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";
        return HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(effectiveTimeoutSeconds()))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + properties.getApiKey())
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();
    }

    private int effectiveTimeoutSeconds() {
        return Math.min(Math.max(properties.getTimeoutSeconds(), 1), MAX_INTERACTIVE_TIMEOUT_SECONDS);
    }

    private String effectiveVisionModel() {
        return StringUtils.hasText(properties.getVisionModel())
                ? properties.getVisionModel()
                : properties.getModel();
    }

    private AiModelResponseVO parseSuccess(String rawBody) throws Exception {
        JsonNode root = objectMapper.readTree(rawBody);
        JsonNode message = root.path("choices").path(0).path("message");

        String content = "";
        JsonNode contentNode = message.path("content");
        if (!contentNode.isMissingNode() && !contentNode.isNull()) {
            content = contentNode.asText("");
        }

        // 解析 tool_calls
        JsonNode toolCallsNode = message.path("tool_calls");
        if (toolCallsNode.isArray() && toolCallsNode.size() > 0) {
            List<ToolCallVO> toolCalls = new ArrayList<>();
            for (JsonNode tc : toolCallsNode) {
                ToolCallVO toolCall = new ToolCallVO();
                toolCall.setId(tc.path("id").asText(""));
                toolCall.setFunctionName(tc.path("function").path("name").asText(""));
                toolCall.setArguments(tc.path("function").path("arguments").asText("{}"));
                toolCalls.add(toolCall);
            }
            return AiModelResponseVO.withToolCalls(content, toolCalls, rawBody);
        }

        if (content.isEmpty()) {
            return AiModelResponseVO.error("AI 模型响应缺少 content", 200, rawBody);
        }
        return AiModelResponseVO.success(content, rawBody);
    }

    private Map<String, Object> textMessage(String role, String content) {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", StringUtils.hasText(role) ? role : "user");
        message.put("content", content == null ? "" : content);
        return message;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "{}";
        }
    }
}
