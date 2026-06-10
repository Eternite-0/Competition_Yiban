package com.etsaion.service.ai;

import com.etsaion.exception.BusinessException;
import com.etsaion.utils.DateTextUtil;
import com.etsaion.vo.ai.AiModelResponseVO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@Service
public class AiJsonSchemaService {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired(required = false)
    private MimoModelClient mimoModelClient;

    public JsonNode parseJson(String rawReply) {
        String json = extractJson(rawReply);
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            throw new BusinessException("AI 返回内容不是合法 JSON");
        }
    }

    public JsonNode parseJsonWithRepair(String rawReply, String schemaName) {
        try {
            return parseJson(rawReply);
        } catch (BusinessException e) {
            if (mimoModelClient == null) {
                throw e;
            }
            AiModelResponseVO repaired = mimoModelClient.chatJson(
                    "你是 JSON 修复助手。只修复语法，保留原字段含义，禁止补造缺失业务信息。",
                    "请把以下模型输出修复为合法 JSON。任务类型：" + schemaName + "\n\n" + rawReply,
                    null);
            if (!repaired.isSuccess()) {
                throw e;
            }
            return parseJson(repaired.getContent());
        }
    }

    public JsonNode validateCompetitionParseResult(String rawReply) {
        JsonNode root = parseJsonWithRepair(rawReply, "competition_parse");
        List<String> errors = new ArrayList<>();
        JsonNode competitions = root.get("competitions");
        if (competitions == null || !competitions.isArray()) {
            errors.add("competitions 必须是数组");
        } else {
            for (int i = 0; i < competitions.size(); i++) {
                JsonNode item = competitions.get(i);
                validateDateAny(item, errors, "startTime", "registrationStart", "registrationStartTime",
                        "registration_start", "registration_start_time", "报名开始时间");
                validateDateAny(item, errors, "endTime", "registrationEnd", "registrationEndTime",
                        "registration_end", "registration_end_time", "报名截止时间");
                validateDateAny(item, errors, "competitionStart", "competitionStartTime",
                        "competition_start", "competition_start_time", "比赛开始时间");
                validateDateAny(item, errors, "competitionEnd", "competitionEndTime",
                        "competition_end", "competition_end_time", "比赛结束时间");
                validateArrayAny(item, errors, "tags", "赛事标签");
                validateArrayAny(item, errors, "tracks", "赛道");
                validateArrayAny(item, errors, "riskFlags", "risk_flags");
                validateConfidenceObjectAny(item, errors, "fieldConfidence", "field_confidence");
            }
        }
        throwIfErrors(errors);
        return root;
    }

    public JsonNode validateCertificateResult(String rawReply) {
        JsonNode root = parseJsonWithRepair(rawReply, "certificate_recognition");
        List<String> errors = new ArrayList<>();
        validateDate(root, "awardTime", errors);
        validateConfidence(root, "confidence", errors);
        validateConfidenceObject(root, "fieldConfidence", errors);
        validateObject(root, "evidence", errors);
        validateArray(root, "riskFlags", errors);
        throwIfErrors(errors);
        return root;
    }

    public JsonNode validateCrawlerResult(String rawReply) {
        JsonNode root = parseJsonWithRepair(rawReply, "crawler_competition_extract");
        List<String> errors = new ArrayList<>();
        if (!root.has("isCompetitionPage") || !root.get("isCompetitionPage").isBoolean()) {
            errors.add("isCompetitionPage 必须是布尔值");
        }
        validateArray(root, "competitions", errors);
        validateConfidence(root, "confidence", errors);
        throwIfErrors(errors);
        return root;
    }

    public String extractJson(String rawReply) {
        if (!StringUtils.hasText(rawReply)) {
            throw new BusinessException("AI 返回内容为空");
        }
        String text = rawReply.trim();
        int fenceStart = text.indexOf("```");
        if (fenceStart >= 0) {
            int contentStart = text.indexOf('\n', fenceStart);
            int fenceEnd = text.indexOf("```", contentStart + 1);
            if (contentStart >= 0 && fenceEnd > contentStart) {
                return text.substring(contentStart + 1, fenceEnd).trim();
            }
        }

        int objectStart = firstJsonStart(text);
        int objectEnd = lastJsonEnd(text);
        if (objectStart >= 0 && objectEnd > objectStart) {
            return text.substring(objectStart, objectEnd + 1).trim();
        }
        throw new BusinessException("AI 返回内容中未找到 JSON");
    }

    private int firstJsonStart(String text) {
        int object = text.indexOf('{');
        int array = text.indexOf('[');
        if (object < 0) return array;
        if (array < 0) return object;
        return Math.min(object, array);
    }

    private int lastJsonEnd(String text) {
        int object = text.lastIndexOf('}');
        int array = text.lastIndexOf(']');
        return Math.max(object, array);
    }

    private void validateDate(JsonNode node, String field, List<String> errors) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || !StringUtils.hasText(value.asText())) {
            return;
        }
        String text = value.asText();
        if (DateTextUtil.parseFlexibleDateTime(text) == null) {
            errors.add(field + " 日期格式异常，应为 yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss");
        }
    }

    private void validateDateAny(JsonNode node, List<String> errors, String... fields) {
        for (String field : fields) {
            validateDate(node, field, errors);
        }
    }

    private void validateArray(JsonNode node, String field, List<String> errors) {
        JsonNode value = node.get(field);
        if (value != null && !value.isNull() && !value.isArray()) {
            errors.add(field + " 必须是数组");
        }
    }

    private void validateArrayAny(JsonNode node, List<String> errors, String... fields) {
        for (String field : fields) {
            validateArray(node, field, errors);
        }
    }

    private void validateObject(JsonNode node, String field, List<String> errors) {
        JsonNode value = node.get(field);
        if (value != null && !value.isNull() && !value.isObject()) {
            errors.add(field + " 必须是对象");
        }
    }

    private void validateConfidenceObject(JsonNode node, String field, List<String> errors) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return;
        }
        if (!value.isObject()) {
            errors.add(field + " 必须是对象");
            return;
        }
        value.fields().forEachRemaining(entry -> {
            if (!entry.getValue().isNumber() || entry.getValue().asDouble() < 0 || entry.getValue().asDouble() > 1) {
                errors.add(field + "." + entry.getKey() + " 置信度必须在 0 到 1 之间");
            }
        });
    }

    private void validateConfidenceObjectAny(JsonNode node, List<String> errors, String... fields) {
        for (String field : fields) {
            validateConfidenceObject(node, field, errors);
        }
    }

    private void validateConfidence(JsonNode node, String field, List<String> errors) {
        JsonNode value = node.get(field);
        if (value != null && !value.isNull()
                && (!value.isNumber() || value.asDouble() < 0 || value.asDouble() > 1)) {
            errors.add(field + " 置信度必须在 0 到 1 之间");
        }
    }

    private void throwIfErrors(List<String> errors) {
        if (!errors.isEmpty()) {
            throw new BusinessException(String.join("；", errors));
        }
    }
}
