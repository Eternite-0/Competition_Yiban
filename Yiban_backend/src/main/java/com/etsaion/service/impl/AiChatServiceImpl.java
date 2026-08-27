package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.etsaion.dto.ai.AiChatRequestDTO;
import com.etsaion.dto.ai.AiMessageDTO;
import com.etsaion.entity.AiConversation;
import com.etsaion.entity.AiMessage;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.ai.AiChatService;
import com.etsaion.service.ai.AiArtifactService;
import com.etsaion.service.ai.AiConversationService;
import com.etsaion.service.ai.AiMessageService;
import com.etsaion.service.ai.AssistantToolRegistry;
import com.etsaion.service.ai.MimoModelClient;
import com.etsaion.vo.ai.AiChatResponseVO;
import com.etsaion.vo.ai.AiConversationVO;
import com.etsaion.vo.ai.AiArtifactVO;
import com.etsaion.vo.ai.AiModelResponseVO;
import com.etsaion.vo.ai.ToolCallVO;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    private static final Pattern CLASS_NAME_PATTERN = Pattern.compile("20\\d{2}[\\u4e00-\\u9fa5A-Za-z0-9（）()]+?\\d+班");
    private static final Pattern STUDENT_NO_PATTERN = Pattern.compile("\\b20\\d{10}\\b");

    private static final String SYSTEM_PROMPT = """
            你是易赛通高校赛事报名管理平台的 AI 助手。
            你的职责是帮助用户查询赛事、报名、成果、审核、学生信息等平台数据，并在用户需要时生成可下载的临时文件产物。

            规则：
            1. 必须基于工具返回的真实数据回答，不要编造。
            2. 禁止修改业务数据（发布、审核、提交、删除、改状态等）；允许生成临时 DOCX/XLSX 文件产物。
            3. 回答要简洁、清爽，优先使用短段落和项目符号。
            4. 不要使用 Emoji、颜文字或夸张语气。
            5. 尽量不要使用 Markdown 表格；小面板里表格不易阅读，改用分组列表。
            6. 如果工具返回空数据，如实告知用户。
            7. 如果用户问题与平台无关，可以正常闲聊，但不要调用工具。
            8. 当用户要求导出、下载、生成表格、生成文档、生成通知稿或汇总报告时，先查询必要数据，再调用文件产物工具。
            9. 生成文件时只能使用工具参数里的结构化标题、段落、列和行，不要生成路径或文件名。
            """;

    @Autowired
    private AiConversationService aiConversationService;

    @Autowired
    private AiMessageService aiMessageService;

    @Autowired
    private AssistantToolRegistry assistantToolRegistry;

    @Autowired
    private AiArtifactService aiArtifactService;

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

        AiChatResponseVO directComprehensiveAnswer = tryAnswerComprehensiveRankDirectly(
                conversation, userId, role, userText, progress);
        if (directComprehensiveAnswer != null) {
            return directComprehensiveAnswer;
        }

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
                Object parsedToolResult = JSONUtil.parse(result);
                putToolContext(usedToolContext, toolCall.getFunctionName(), parsedToolResult);
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

        List<AiArtifactVO> artifacts = extractArtifacts(usedToolContext);
        if (artifacts.isEmpty()) {
            List<AiArtifactVO> autoArtifacts = createRequestedArtifactsIfMissing(
                    userText, finalAnswer, usedToolContext, progress);
            if (!autoArtifacts.isEmpty()) {
                artifacts = autoArtifacts;
                usedToolContext.put("auto_artifacts", autoArtifacts);
                finalAnswer = removeArtifactRefusal(finalAnswer);
            }
        }
        finalAnswer = normalizeArtifactAnswer(finalAnswer, artifacts);

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
        vo.setArtifacts(artifacts);
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
            case "get_my_comprehensive_score", "get_student_comprehensive_score",
                    "find_student_comprehensive_score", "get_class_comprehensive_ranking" -> "综测排名";
            case "get_my_participations" -> "活动记录";
            case "get_my_messages" -> "站内消息";
            case "get_announcements" -> "公告";
            case "search_students", "get_student_detail" -> "学生信息";
            case "get_pending_reviews" -> "待审核任务";
            case "get_college_overview" -> "学院总览";
            case "get_pending_drafts" -> "赛事草稿";
            case "get_ai_task_stats" -> "AI 任务";
            case "get_user_stats" -> "用户统计";
            case "get_personalized_recommendations" -> "个性化赛事推荐";
            case "check_registration_materials" -> "报名材料预检";
            case "match_team_members" -> "智能组队匹配";
            case "get_teacher_ai_cockpit" -> "教师待办驾驶舱";
            case "get_admin_ai_report" -> "赛事运行简报";
            case "create_excel_artifact" -> "Excel 文件";
            case "create_docx_artifact" -> "DOCX 文件";
            default -> "平台数据";
        };
        if (toolName.startsWith("create_")) {
            return start ? "正在生成" + target : "已生成" + target;
        }
        return start ? "正在查询" + target : "已读取" + target;
    }

    private void putToolContext(Map<String, Object> usedToolContext, String toolName, Object value) {
        if (!usedToolContext.containsKey(toolName)) {
            usedToolContext.put(toolName, value);
            return;
        }
        Object existing = usedToolContext.get(toolName);
        if (existing instanceof List<?> existingList) {
            List<Object> next = new ArrayList<>(existingList);
            next.add(value);
            usedToolContext.put(toolName, next);
        } else {
            List<Object> next = new ArrayList<>();
            next.add(existing);
            next.add(value);
            usedToolContext.put(toolName, next);
        }
    }

    private AiChatResponseVO tryAnswerComprehensiveRankDirectly(
            AiConversation conversation,
            Long userId,
            String role,
            String userText,
            Consumer<String> progress) {
        if (!isComprehensiveRankQuestion(userText)) {
            return null;
        }
        String toolName = "teacher".equalsIgnoreCase(role)
                ? "get_student_comprehensive_score"
                : "get_my_comprehensive_score";
        String argsJson = "{}";
        if ("teacher".equalsIgnoreCase(role)) {
            String className = extractClassName(userText);
            if (className != null) {
                String metric = isAcademicRankQuestion(userText) ? "academic" : "comprehensive";
                String tableArgs = JSONUtil.toJsonStr(Map.of("class_name", className, "metric", metric));
                emitProgress(progress, "正在查询班级综测排名");
                String toolResult = assistantToolRegistry.executeTool("get_class_comprehensive_ranking", tableArgs, userId, role);
                Object parsed = JSONUtil.parse(toolResult);
                Map<String, Object> toolContext = new LinkedHashMap<>();
                toolContext.put("get_class_comprehensive_ranking", parsed);
                emitProgress(progress, "已读取班级排名");

                String answer = summarizeClassRanking(parsed);
                saveMessage(conversation.getId(), "assistant", answer, JSONUtil.toJsonStr(toolContext));
                conversation.setLastMessageAt(LocalDateTime.now());
                conversation.setUpdateTime(LocalDateTime.now());
                aiConversationService.updateById(conversation);

                AiChatResponseVO vo = new AiChatResponseVO();
                vo.setConversationId(conversation.getId());
                vo.setAnswer(answer);
                vo.setToolContext(toolContext);
                vo.setArtifacts(List.of());
                vo.setCreateTime(LocalDateTime.now());
                return vo;
            }
            Long studentId = extractStudentId(userText);
            if (studentId == null) {
                String keyword = extractStudentKeyword(userText);
                if (keyword == null) {
                    return null;
                }
                toolName = "find_student_comprehensive_score";
                argsJson = JSONUtil.toJsonStr(Map.of("keyword", keyword));
            } else {
                argsJson = JSONUtil.toJsonStr(Map.of("student_id", studentId));
            }
        } else if (!"student".equalsIgnoreCase(role)) {
            return null;
        }

        emitProgress(progress, "正在查询综测排名");
        String toolResult = assistantToolRegistry.executeTool(toolName, argsJson, userId, role);
        Object parsed = JSONUtil.parse(toolResult);
        Map<String, Object> toolContext = new LinkedHashMap<>();
        toolContext.put(toolName, parsed);
        emitProgress(progress, "已读取综测排名");

        String answer = summarizeComprehensiveRank(parsed);
        saveMessage(conversation.getId(), "assistant", answer, JSONUtil.toJsonStr(toolContext));
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setUpdateTime(LocalDateTime.now());
        aiConversationService.updateById(conversation);

        AiChatResponseVO vo = new AiChatResponseVO();
        vo.setConversationId(conversation.getId());
        vo.setAnswer(answer);
        vo.setToolContext(toolContext);
        vo.setArtifacts(List.of());
        vo.setCreateTime(LocalDateTime.now());
        return vo;
    }

    private boolean isComprehensiveRankQuestion(String text) {
        String normalized = StrUtil.blankToDefault(text, "").toLowerCase();
        boolean asksRank = normalized.contains("排名")
                || normalized.contains("名次")
                || normalized.contains("百分比")
                || normalized.contains("percent")
                || normalized.contains("rank");
        boolean asksOfficialScore = normalized.contains("综测")
                || normalized.contains("绩点")
                || normalized.contains("gpa")
                || normalized.contains("学业")
                || extractClassName(text) != null;
        return asksOfficialScore && asksRank;
    }

    private boolean isAcademicRankQuestion(String text) {
        String normalized = StrUtil.blankToDefault(text, "").toLowerCase();
        return normalized.contains("绩点") || normalized.contains("gpa") || normalized.contains("学业");
    }

    private Long extractStudentId(String text) {
        Matcher matcher = Pattern.compile("student[_\\s-]*id\\D*(\\d+)|学生id\\D*(\\d+)", Pattern.CASE_INSENSITIVE)
                .matcher(StrUtil.blankToDefault(text, ""));
        if (!matcher.find()) {
            return null;
        }
        String value = matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String extractClassName(String text) {
        Matcher matcher = CLASS_NAME_PATTERN.matcher(StrUtil.blankToDefault(text, ""));
        return matcher.find() ? matcher.group() : null;
    }

    private String extractStudentKeyword(String text) {
        String value = StrUtil.blankToDefault(text, "");
        Matcher studentNoMatcher = STUDENT_NO_PATTERN.matcher(value);
        if (studentNoMatcher.find()) {
            return studentNoMatcher.group();
        }
        Matcher nameMatcher = Pattern.compile("(?:查(?:一下)?|查询|看看|看下)([\\u4e00-\\u9fa5]{2,4})(?:的)?(?:综测|绩点|学业|排名|信息)")
                .matcher(value);
        if (nameMatcher.find()) {
            return nameMatcher.group(1);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String summarizeComprehensiveRank(Object parsed) {
        if (!(parsed instanceof Map<?, ?> raw)) {
            return "暂未查询到官方综测排名。";
        }
        Map<String, Object> payload = (Map<String, Object>) raw;
        if (!Boolean.TRUE.equals(payload.get("found"))) {
            return "暂未查询到官方综测排名。";
        }
        String rank = String.valueOf(payload.getOrDefault("comprehensiveRank", "暂无"));
        String total = payload.get("rankTotal") == null ? "" : " / " + payload.get("rankTotal");
        String percent = formatPercent(payload.get("comprehensiveRankPercent"));
        String scope = String.valueOf(payload.getOrDefault("rankScope", "本专业"));
        String academicYear = String.valueOf(payload.getOrDefault("academicYear", "官方综测"));
        return "官方综测排名：" + rank + total + " 名；百分比：" + percent + "；范围：" + scope
                + "；学年：" + academicYear + "。该排名按学生所在年级和专业统计，不按全校重新计算。";
    }

    @SuppressWarnings("unchecked")
    private String summarizeClassRanking(Object parsed) {
        if (!(parsed instanceof Map<?, ?> raw)) {
            return "暂未查询到班级排名数据。";
        }
        Map<String, Object> payload = (Map<String, Object>) raw;
        if (payload.get("error") != null) {
            return String.valueOf(payload.get("error"));
        }
        int total = toInt(payload.get("total"), 0);
        if (total == 0) {
            return "暂未查询到该班级的官方排名数据。";
        }
        String title = String.valueOf(payload.getOrDefault("title", "班级排名"));
        String academicYear = String.valueOf(payload.getOrDefault("academicYear", "官方综测"));
        String metric = String.valueOf(payload.getOrDefault("metric", "comprehensive"));
        String metricName = "academic".equals(metric) ? "学业成绩" : "综测";
        String topText = "";
        Object previewRows = payload.get("previewRows");
        if (previewRows instanceof List<?> rows && !rows.isEmpty() && rows.get(0) instanceof Map<?, ?> first) {
            Object name = first.get("姓名");
            Object rank = "academic".equals(metric) ? first.get("学业名次") : first.get("综测名次");
            Object score = "academic".equals(metric) ? first.get("学业成绩") : first.get("综测分");
            topText = "，当前第一名：" + name + "（" + metricName + "名次 " + rank + "，分数 " + score + "）";
        }
        return "已查询到" + title + "，共 " + total + " 人，学年：" + academicYear + topText
                + "。完整表格请点击下方“查看详细”。";
    }

    private int toInt(Object value, int fallback) {
        if (value == null) return fallback;
        if (value instanceof Number number) return number.intValue();
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private String formatPercent(Object value) {
        if (value == null) {
            return "暂无";
        }
        try {
            double number = Double.parseDouble(String.valueOf(value));
            return String.format(java.util.Locale.ROOT, "%.1f%%", number * 100.0);
        } catch (NumberFormatException e) {
            return String.valueOf(value);
        }
    }

    private List<AiArtifactVO> extractArtifacts(Map<String, Object> usedToolContext) {
        List<AiArtifactVO> artifacts = new ArrayList<>();
        collectArtifacts(usedToolContext, artifacts);
        Set<String> seenUrls = new HashSet<>();
        return artifacts.stream()
                .filter(artifact -> artifact.getUrl() != null && seenUrls.add(artifact.getUrl()))
                .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private void collectArtifacts(Object value, List<AiArtifactVO> artifacts) {
        if (value == null) return;
        if (value instanceof AiArtifactVO artifact) {
            artifacts.add(artifact);
            return;
        }
        if (value instanceof JSONObject json) {
            Object artifact = json.get("artifact");
            if (artifact != null) {
                collectArtifacts(artifact, artifacts);
                return;
            }
            if (json.containsKey("url") && json.containsKey("type")) {
                artifacts.add(json.toBean(AiArtifactVO.class));
            }
            return;
        }
        if (value instanceof Map<?, ?> map) {
            Object artifact = map.get("artifact");
            if (artifact != null) {
                collectArtifacts(artifact, artifacts);
                return;
            }
            if (map.containsKey("url") && map.containsKey("type")) {
                AiArtifactVO vo = new AiArtifactVO();
                vo.setId(valueToString(map.get("id")));
                vo.setName(valueToString(map.get("name")));
                vo.setType(valueToString(map.get("type")));
                vo.setUrl(valueToString(map.get("url")));
                vo.setDescription(valueToString(map.get("description")));
                artifacts.add(vo);
                return;
            }
            map.values().forEach(item -> collectArtifacts(item, artifacts));
            return;
        }
        if (value instanceof Collection<?> collection) {
            collection.forEach(item -> collectArtifacts(item, artifacts));
        }
    }

    private String normalizeArtifactAnswer(String answer, List<AiArtifactVO> artifacts) {
        if (artifacts == null || artifacts.isEmpty()) {
            return StrUtil.blankToDefault(answer, "已完成。");
        }
        String base = StrUtil.blankToDefault(answer, "已生成文件，可在下方下载。");
        String cleaned = stripArtifactDownloadLinks(base);
        return StrUtil.blankToDefault(cleaned.trim(), "已生成文件，可在下方下载。");
    }

    private String stripArtifactDownloadLinks(String answer) {
        return StrUtil.blankToDefault(answer, "")
                .replaceAll("(?m)^\\s*(?:[-*]\\s*)?(?:\\*\\*)?(?:下载链接|下载地址|文件链接|生成文件)[:：]?(?:\\*\\*)?\\s*\\[[^\\]]+]\\(/api/file/serve/[^)]+\\)\\s*$", "")
                .replaceAll("(?m)^\\s*[-*]\\s*\\[[^\\]]+]\\(/api/file/serve/[^)]+\\)\\s*$", "")
                .replaceAll("(?m)^\\s*(?:\\*\\*)?(?:下载链接|下载地址|文件链接|生成文件)[:：]?(?:\\*\\*)?\\s*$\\R?", "")
                .replaceAll("\\n{3,}", "\n\n");
    }

    private List<AiArtifactVO> createRequestedArtifactsIfMissing(
            String userText,
            String finalAnswer,
            Map<String, Object> usedToolContext,
            Consumer<String> progress
    ) {
        if (usedToolContext.isEmpty()) return List.of();
        boolean wantsExcel = wantsExcel(userText);
        boolean wantsDocx = wantsDocx(userText);
        if (!wantsExcel && !wantsDocx) return List.of();

        List<AiArtifactVO> artifacts = new ArrayList<>();
        ExportTable table = buildExportTable(usedToolContext);
        if (wantsExcel && table != null) {
            emitProgress(progress, "正在自动生成 Excel 文件");
            artifacts.add(aiArtifactService.createExcelArtifact(
                    artifactTitle(userText, "AI数据导出"),
                    "根据本次对话查询到的平台数据自动生成",
                    table.columns(),
                    table.rows(),
                    "查询结果"
            ));
        }
        if (wantsDocx) {
            emitProgress(progress, "正在自动生成 DOCX 文件");
            artifacts.add(aiArtifactService.createDocxArtifact(
                    artifactTitle(userText, "AI查询结果汇总"),
                    "根据本次对话查询到的平台数据自动生成",
                    docParagraphs(userText, finalAnswer),
                    table == null ? List.of() : table.columns(),
                    table == null ? List.of() : table.rows()
            ));
        }
        return artifacts;
    }

    private boolean wantsExcel(String text) {
        String value = StrUtil.blankToDefault(text, "").toLowerCase();
        return value.contains("excel")
                || value.contains("xlsx")
                || value.contains("表格")
                || value.contains("导出")
                || value.contains("下载表")
                || value.contains("电子表");
    }

    private boolean wantsDocx(String text) {
        String value = StrUtil.blankToDefault(text, "").toLowerCase();
        return value.contains("docx")
                || value.contains("word")
                || value.contains("文档")
                || value.contains("报告")
                || value.contains("通知稿")
                || value.contains("汇总");
    }

    private String removeArtifactRefusal(String answer) {
        String value = StrUtil.blankToDefault(answer, "");
        if (value.contains("无法直接生成") || value.contains("只能查询数据") || value.contains("无法生成 Excel")
                || value.contains("无法生成 Word") || value.contains("无法生成 DOCX")) {
            return "已根据本次查询结果生成文件，可在下方下载。";
        }
        return value;
    }

    private String artifactTitle(String userText, String fallback) {
        String text = StrUtil.blankToDefault(userText, fallback)
                .replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("[\\\\/:*?\"<>|]", " ")
                .trim();
        if (text.length() > 24) {
            text = text.substring(0, 24);
        }
        return StrUtil.blankToDefault(text, fallback);
    }

    private List<String> docParagraphs(String userText, String finalAnswer) {
        List<String> paragraphs = new ArrayList<>();
        paragraphs.add("用户需求：" + StrUtil.blankToDefault(userText, "本次 AI 查询任务"));
        String answer = StrUtil.blankToDefault(finalAnswer, "").trim();
        if (StrUtil.isNotBlank(answer) && !answer.contains("无法直接生成") && !answer.contains("只能查询数据")) {
            for (String paragraph : answer.split("\\n+")) {
                String cleaned = paragraph.replaceAll("^[-*]\\s*", "").trim();
                if (StrUtil.isNotBlank(cleaned)) {
                    paragraphs.add(cleaned);
                }
            }
        } else {
            paragraphs.add("已根据平台工具查询结果整理生成本文档。");
        }
        return paragraphs;
    }

    private ExportTable buildExportTable(Map<String, Object> usedToolContext) {
        for (Map.Entry<String, Object> entry : usedToolContext.entrySet()) {
            String toolName = entry.getKey();
            if (toolName.startsWith("create_") || "auto_artifacts".equals(toolName)) continue;
            List<Map<String, String>> records = extractRecords(entry.getValue());
            if (records.isEmpty()) continue;
            List<String> columns = new ArrayList<>();
            for (Map<String, String> record : records) {
                for (String key : record.keySet()) {
                    if (!columns.contains(key)) {
                        columns.add(key);
                    }
                    if (columns.size() >= 24) break;
                }
                if (columns.size() >= 24) break;
            }
            if (columns.isEmpty()) continue;
            List<List<String>> rows = records.stream()
                    .limit(500)
                    .map(record -> columns.stream()
                            .map(column -> StrUtil.blankToDefault(record.get(column), ""))
                            .collect(Collectors.toList()))
                    .collect(Collectors.toList());
            return new ExportTable(columns, rows);
        }
        return null;
    }

    private List<Map<String, String>> extractRecords(Object value) {
        List<Map<String, String>> records = new ArrayList<>();
        collectRecords(value, records);
        return records;
    }

    private void collectRecords(Object value, List<Map<String, String>> records) {
        if (value == null || records.size() >= 500) return;
        if (value instanceof JSONObject json) {
            Object artifact = json.get("artifact");
            if (artifact != null) return;
            for (String key : List.of("records", "items", "list", "data", "rows")) {
                Object nested = json.get(key);
                if (nested != null) {
                    collectRecords(nested, records);
                    if (!records.isEmpty()) return;
                }
            }
            Map<String, String> record = new LinkedHashMap<>();
            flattenRecord(json, "", record, 0);
            if (!record.isEmpty() && !record.containsKey("error")) records.add(record);
            return;
        }
        if (value instanceof Map<?, ?> map) {
            Object artifact = map.get("artifact");
            if (artifact != null) return;
            for (String key : List.of("records", "items", "list", "data", "rows")) {
                Object nested = map.get(key);
                if (nested != null) {
                    collectRecords(nested, records);
                    if (!records.isEmpty()) return;
                }
            }
            Map<String, String> record = new LinkedHashMap<>();
            flattenRecord(map, "", record, 0);
            if (!record.isEmpty() && !record.containsKey("error")) records.add(record);
            return;
        }
        if (value instanceof Iterable<?> iterable) {
            for (Object item : iterable) {
                if (records.size() >= 500) break;
                collectRecords(item, records);
            }
            return;
        }
        records.add(Map.of("内容", valueToString(value)));
    }

    private void flattenRecord(Object value, String prefix, Map<String, String> record, int depth) {
        if (value == null || record.size() >= 24) return;
        if (value instanceof JSONObject json) {
            for (Map.Entry<String, Object> entry : json.entrySet()) {
                flattenEntry(entry.getKey(), entry.getValue(), prefix, record, depth);
                if (record.size() >= 24) break;
            }
            return;
        }
        if (value instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                flattenEntry(valueToString(entry.getKey()), entry.getValue(), prefix, record, depth);
                if (record.size() >= 24) break;
            }
        }
    }

    private void flattenEntry(String key, Object value, String prefix, Map<String, String> record, int depth) {
        if (StrUtil.isBlank(key) || value == null) return;
        String column = StrUtil.isBlank(prefix) ? key : prefix + "." + key;
        if (isScalar(value) || depth >= 1) {
            record.put(column, compactValue(value));
            return;
        }
        if (value instanceof JSONObject || value instanceof Map<?, ?>) {
            flattenRecord(value, column, record, depth + 1);
            return;
        }
        record.put(column, compactValue(value));
    }

    private boolean isScalar(Object value) {
        return value instanceof CharSequence
                || value instanceof Number
                || value instanceof Boolean
                || value instanceof java.time.temporal.Temporal;
    }

    private String compactValue(Object value) {
        if (value == null) return "";
        if (value instanceof Iterable<?> iterable) {
            List<String> values = new ArrayList<>();
            for (Object item : iterable) {
                if (values.size() >= 5) break;
                values.add(valueToString(item));
            }
            return String.join("、", values);
        }
        String text = valueToString(value);
        return text.length() <= 240 ? text : text.substring(0, 240);
    }

    private String valueToString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private record ExportTable(List<String> columns, List<List<String>> rows) {}

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
