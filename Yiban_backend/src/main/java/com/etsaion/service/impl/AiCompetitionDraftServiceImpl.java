package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.SecureUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.EventPublishDTO;
import com.etsaion.dto.ai.CompetitionDraftConfirmDTO;
import com.etsaion.dto.ai.CompetitionDraftParseUrlDTO;
import com.etsaion.enums.CompetitionStatus;
import com.etsaion.service.CompetitionPublishService;
import com.etsaion.service.ai.CompetitionScheduleExtractor;
import com.etsaion.service.ai.CompetitionScheduleExtractor.TimeWindow;
import com.etsaion.service.ai.DraftDedupService;
import com.etsaion.entity.AiCompetitionDraft;
import com.etsaion.entity.AiTask;
import com.etsaion.entity.Competition;
import com.etsaion.entity.CompetitionStage;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.AiCompetitionDraftMapper;
import com.etsaion.service.ActivityCategoryService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.CompetitionStageService;
import com.etsaion.service.ai.AiCompetitionDraftService;
import com.etsaion.service.ai.AiJsonSchemaService;
import com.etsaion.service.ai.AiTaskService;
import com.etsaion.service.ai.DocumentContentService;
import com.etsaion.service.ai.MimoModelClient;
import com.etsaion.utils.DateTextUtil;
import com.etsaion.vo.ai.AiCompetitionDraftVO;
import com.etsaion.vo.ai.AiCompetitionParseResultVO;
import com.etsaion.vo.ai.AiModelResponseVO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiCompetitionDraftServiceImpl extends ServiceImpl<AiCompetitionDraftMapper, AiCompetitionDraft>
        implements AiCompetitionDraftService {

    private static final String PROMPT_VERSION = "competition_parse_v3_autofill";
    private static final int MAX_PARSE_TEXT_LENGTH = 70000;
    private static final Pattern STAGE_NAME_DATE_PATTERN =
            Pattern.compile("\\d{4}[-/.年]\\d{1,2}[-/.月]\\d{1,2}日?(?:\\s*\\d{1,2}[:：]\\d{2}(?::\\d{2})?)?");
    private static final DateTimeFormatter NORMALIZED_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String SOURCE_DATE_TIME_TOKEN =
            "(?:(?:20\\d{2})\\s*年\\s*)?\\d{1,2}\\s*月\\s*\\d{1,2}\\s*日(?:\\s*\\d{1,2}(?:[:：]\\d{2}){0,2})?";
    private static final Pattern SOURCE_DATE_TIME_PATTERN = Pattern.compile(
            "(?:(20\\d{2})\\s*年\\s*)?(\\d{1,2})\\s*月\\s*(\\d{1,2})\\s*日(?:\\s*(\\d{1,2})(?:[:：](\\d{2}))?(?:[:：](\\d{2}))?)?");
    private static final Pattern REGISTRATION_RANGE_PATTERN = Pattern.compile(
            "([^\\n。；;]{0,120}?(?:报名|提交作品)[^\\n。；;]{0,80}?)[:：]?\\s*(" + SOURCE_DATE_TIME_TOKEN + ")\\s*(?:—|–|-|至|到|~|～)\\s*(" + SOURCE_DATE_TIME_TOKEN + ")");
    private static final Pattern SUBMISSION_DEADLINE_PATTERN = Pattern.compile(
            "([^\\n。；;]{0,120}?(?:提交作品截止|作品提交截止)[^\\n。；;]{0,40}?)[:：]?\\s*(" + SOURCE_DATE_TIME_TOKEN + ")");
    private static final Pattern APPROX_COMPETITION_TIME_PATTERN = Pattern.compile(
            "([^\\n。；;]{0,60}?(?:选拔赛|决赛|总决赛|比赛|竞赛)[^\\n。；;]{0,30}?时间)\\s*[:：]?\\s*(20\\d{2})\\s*年\\s*(\\d{1,2})\\s*月\\s*(中上旬|上旬|中旬|下旬)?(?!\\s*\\d{1,2}\\s*日)");
    private static final Pattern APPROX_MONTH_TEXT_PATTERN = Pattern.compile(
            "(20\\d{2})\\s*年\\s*(\\d{1,2})\\s*月\\s*(中上旬|上旬|中旬|下旬)?(?!\\s*\\d{1,2}\\s*日)");
    private static final List<String> KNOWN_TRACKS = List.of(
            "软件赛", "电子赛", "人工智能赛", "视觉艺术设计赛", "数字科技创新赛", "中数杯 AIGC 数字内容创意设计大赛");

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private DocumentContentService documentContentService;

    @Autowired
    private AiTaskService aiTaskService;

    @Autowired
    private MimoModelClient mimoModelClient;

    @Autowired
    private AiJsonSchemaService aiJsonSchemaService;

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private CompetitionPublishService competitionPublishService;

    @Autowired
    private DraftDedupService draftDedupService;

    @Autowired
    private CompetitionScheduleExtractor scheduleExtractor;

    @Autowired
    private CompetitionStageService competitionStageService;

    @Autowired
    private ActivityCategoryService activityCategoryService;

    @Override
    @Transactional
    public AiCompetitionDraftVO parseFile(Long adminId, MultipartFile file) {
        return firstDraftOrThrow(parseFileBatch(adminId, file));
    }

    @Override
    @Transactional
    public AiCompetitionParseResultVO parseFileBatch(Long adminId, MultipartFile file) {
        DocumentContentService.ExtractedDocument document = documentContentService.readMultipartFileDetailed(file);
        String sourceUrl = file != null ? file.getOriginalFilename() : "uploaded-file";
        return parseDocument(adminId, "file", sourceUrl, sourceUrl, document);
    }

    @Override
    @Transactional
    public AiCompetitionDraftVO parseUrl(Long adminId, CompetitionDraftParseUrlDTO dto) {
        return firstDraftOrThrow(parseUrlBatch(adminId, dto));
    }

    @Override
    @Transactional
    public AiCompetitionParseResultVO parseUrlBatch(Long adminId, CompetitionDraftParseUrlDTO dto) {
        return parseUrlBatch(adminId, dto, "url");
    }

    @Override
    @Transactional
    public AiCompetitionParseResultVO parseUrlBatch(Long adminId, CompetitionDraftParseUrlDTO dto, String sourceType) {
        DocumentContentService.ExtractedDocument document = documentContentService.readUrlDetailed(dto.getUrl());
        return parseDocument(adminId, StrUtil.blankToDefault(sourceType, "url"),
                StrUtil.blankToDefault(document.getSourceUrl(), dto.getUrl()),
                StrUtil.blankToDefault(document.getSourceTitle(), dto.getUrl()),
                document);
    }

    @Override
    @Transactional
    public AiCompetitionDraftVO parseUrlWithProgress(Long adminId, CompetitionDraftParseUrlDTO dto,
                                                     Consumer<Map<String, String>> onProgress) {
        return firstDraftOrThrow(parseUrlBatchWithProgress(adminId, dto, onProgress));
    }

    @Override
    @Transactional
    public AiCompetitionParseResultVO parseUrlBatchWithProgress(Long adminId, CompetitionDraftParseUrlDTO dto,
                                                                Consumer<Map<String, String>> onProgress) {
        sendProgress(onProgress, "scraping", "正在抓取网页内容...");
        DocumentContentService.ExtractedDocument document = documentContentService.readUrlDetailed(dto.getUrl());
        sendProgress(onProgress, "analyzing", "AI 正在分析赛事信息...");
        AiCompetitionParseResultVO result = parseDocument(adminId, "url",
                StrUtil.blankToDefault(document.getSourceUrl(), dto.getUrl()),
                StrUtil.blankToDefault(document.getSourceTitle(), dto.getUrl()),
                document);
        sendProgress(onProgress, "generating", "已生成 " + result.getDrafts().size() + " 条赛事草稿");
        return result;
    }

    private void sendProgress(Consumer<Map<String, String>> callback, String step, String message) {
        if (callback == null) return;
        Map<String, String> event = new LinkedHashMap<>();
        event.put("step", step);
        event.put("message", message);
        callback.accept(event);
    }

    private AiCompetitionDraftVO firstDraftOrThrow(AiCompetitionParseResultVO result) {
        if (result != null && result.getDrafts() != null && !result.getDrafts().isEmpty()) {
            return result.getDrafts().get(0);
        }
        String warning = result == null || result.getWarnings() == null || result.getWarnings().isEmpty()
                ? "未识别到可用赛事信息"
                : String.join("；", result.getWarnings());
        throw new BusinessException(warning);
    }

    @Override
    @Transactional
    public int ingestCrawledPage(Long adminId, String sourceType, String sourceUrl, String sourceTitle,
                                 DocumentContentService.ExtractedDocument document) {
        if (document == null) {
            return 0;
        }
        String text = StrUtil.blankToDefault(document.getText(), "");
        if (StrUtil.isBlank(text) && (document.getImageDataUrls() == null || document.getImageDataUrls().isEmpty())) {
            return 0;
        }
        if (hasPendingDraftForUrl(sourceUrl)) {
            return 0;
        }
        if (!looksLikeCompetitionPage(sourceTitle, text)) {
            return 0;
        }

        try {
            AiCompetitionParseResultVO result = parseDocument(adminId,
                    StrUtil.blankToDefault(sourceType, "crawler"),
                    sourceUrl, sourceTitle, document);
            return result == null || result.getDrafts() == null ? 0 : result.getDrafts().size();
        } catch (BusinessException e) {
            // 采集链路单页失败不阻断其它页
            return 0;
        }
    }

    private AiCompetitionParseResultVO parseDocument(Long adminId,
                                                     String sourceType,
                                                     String sourceUrl,
                                                     String sourceTitle,
                                                     DocumentContentService.ExtractedDocument document) {
        String text = StrUtil.maxLength(StrUtil.blankToDefault(document.getText(), ""), MAX_PARSE_TEXT_LENGTH);
        List<String> imageDataUrls = document.getImageDataUrls();
        if (StrUtil.isBlank(text) && imageDataUrls.isEmpty()) {
            throw new BusinessException("文档内容为空，无法生成赛事草稿");
        }

        String sourceHash = SecureUtil.sha256(text + "|" + String.join("|",
                imageDataUrls.stream().map(this::hashPreview).collect(Collectors.toList())));
        AiTask task = aiTaskService.createTask("competition_doc_parse", sourceType, sourceUrl,
                sourceHash, adminId, "admin", PROMPT_VERSION);
        aiTaskService.markRunning(task.getId());

        AiModelResponseVO response = callCompetitionParser(sourceUrl, sourceTitle, text, document);
        if (!response.isSuccess()) {
            // 无 AI 或模型失败：规则兜底，保证来源采集/URL 导入仍能出草稿
            AiCompetitionParseResultVO fallback = saveRuleBasedDrafts(
                    task.getId(), adminId, sourceType, sourceUrl, sourceTitle, text, document);
            if (!fallback.getDrafts().isEmpty()) {
                aiTaskService.markSucceeded(task.getId(),
                        "{\"mode\":\"rule_based\",\"error\":\""
                                + StrUtil.maxLength(StrUtil.blankToDefault(response.getErrorMessage(), ""), 200)
                                + "\"}",
                        "{\"competitions\":" + fallback.getDrafts().size() + "}",
                        BigDecimal.valueOf(0.45));
                return fallback;
            }
            aiTaskService.markFailed(task.getId(), response.getErrorMessage());
            throw new BusinessException(response.getErrorMessage());
        }

        JsonNode root;
        try {
            root = aiJsonSchemaService.validateCompetitionParseResult(response.getContent());
        } catch (BusinessException e) {
            AiCompetitionParseResultVO fallback = saveRuleBasedDrafts(
                    task.getId(), adminId, sourceType, sourceUrl, sourceTitle, text, document);
            if (!fallback.getDrafts().isEmpty()) {
                aiTaskService.markSucceeded(task.getId(), response.getRawResponse(),
                        "{\"mode\":\"rule_based_after_schema_fail\"}", BigDecimal.valueOf(0.45));
                return fallback;
            }
            aiTaskService.markFailed(task.getId(), e.getMessage());
            throw e;
        }

        BigDecimal confidence = averageRootConfidence(root);
        aiTaskService.markSucceeded(task.getId(), response.getRawResponse(), root.toString(), confidence);

        AiCompetitionParseResultVO result = new AiCompetitionParseResultVO();
        result.setTaskId(task.getId());
        result.setSourceType(sourceType);
        result.setSourceUrl(sourceUrl);
        result.setSourceTitle(sourceTitle);
        result.getWarnings().addAll(document.getWarnings());

        JsonNode competitions = root.path("competitions");
        if (!competitions.isArray() || competitions.size() == 0) {
            AiCompetitionParseResultVO fallback = saveRuleBasedDrafts(
                    task.getId(), adminId, sourceType, sourceUrl, sourceTitle, text, document);
            if (!fallback.getDrafts().isEmpty()) {
                result.getDrafts().addAll(fallback.getDrafts());
                result.getWarnings().add("rule_based_fallback");
                return result;
            }
            result.getWarnings().add("no_competitions_detected");
            return result;
        }

        for (JsonNode item : competitions) {
            AiCompetitionDraft draft = createDraftFromJson(task.getId(), sourceType, sourceUrl, sourceTitle, item);
            applyAutoFillCorrections(draft, text);
            document.getWarnings().forEach(warning -> addRisk(draft, warning));
            applyQualityRisks(draft);
            applyDuplicateRisk(draft);
            this.save(draft);
            result.getDrafts().add(toVO(draft));
        }
        return result;
    }

    private AiCompetitionParseResultVO saveRuleBasedDrafts(Long taskId,
                                                           Long adminId,
                                                           String sourceType,
                                                           String sourceUrl,
                                                           String sourceTitle,
                                                           String text,
                                                           DocumentContentService.ExtractedDocument document) {
        AiCompetitionParseResultVO result = new AiCompetitionParseResultVO();
        result.setTaskId(taskId);
        result.setSourceType(sourceType);
        result.setSourceUrl(sourceUrl);
        result.setSourceTitle(sourceTitle);
        if (document != null && document.getWarnings() != null) {
            result.getWarnings().addAll(document.getWarnings());
        }
        result.getWarnings().add("rule_based_extract");

        if (hasPendingDraftForUrl(sourceUrl) || !looksLikeCompetitionPage(sourceTitle, text)) {
            result.getWarnings().add("no_competitions_detected");
            return result;
        }

        AiCompetitionDraft draft = buildRuleBasedDraft(taskId, sourceType, sourceUrl, sourceTitle, text);
        if (draft == null || StrUtil.isBlank(draft.getName())) {
            result.getWarnings().add("no_competitions_detected");
            return result;
        }
        if (document != null) {
            document.getWarnings().forEach(warning -> addRisk(draft, warning));
        }
        addRisk(draft, "rule_based_extract");
        applyAutoFillCorrections(draft, text);
        applyQualityRisks(draft);
        applyDuplicateRisk(draft);
        this.save(draft);
        result.getDrafts().add(toVO(draft));
        return result;
    }

    private AiCompetitionDraft buildRuleBasedDraft(Long taskId, String sourceType, String sourceUrl,
                                                   String sourceTitle, String text) {
        String name = extractCompetitionName(sourceTitle, text);
        if (StrUtil.isBlank(name) || name.length() < 4) {
            return null;
        }
        // 过滤站点首页/导航类标题
        if (isGenericSiteTitle(name)) {
            String fromBody = extractCompetitionNameFromBody(text);
            if (StrUtil.isNotBlank(fromBody)) {
                name = fromBody;
            } else {
                return null;
            }
        }

        AiCompetitionDraft draft = new AiCompetitionDraft();
        draft.setAiTaskId(taskId);
        draft.setSourceType(StrUtil.blankToDefault(sourceType, "crawler"));
        draft.setSourceUrl(sourceUrl);
        draft.setSourceTitle(StrUtil.blankToDefault(sourceTitle, name));
        draft.setName(StrUtil.maxLength(name, 200));
        draft.setLevel(normalizeCompetitionLevel(null, text + " " + name));
        draft.setCategory(normalizeCompetitionCategory(null, text + " " + name));
        draft.setOrganizer(extractOrganizer(text));
        draft.setContent(buildContentFromSource(text));
        draft.setMaxTeamSize(1);
        draft.setTags("[]");
        draft.setTracks("[]");
        draft.setFieldConfidenceJson("{\"name\":0.55,\"content\":0.4,\"level\":0.35,\"category\":0.35}");
        draft.setEvidenceJson("{\"name\":\"" + escapeJson(name) + "\"}");
        draft.setStatus("pending_review");
        draft.setCreateTime(LocalDateTime.now());
        draft.setUpdateTime(LocalDateTime.now());
        return draft;
    }

    private String extractCompetitionName(String sourceTitle, String text) {
        String title = StrUtil.blankToDefault(sourceTitle, "").trim();
        title = title.replaceAll("(?i)^来源标题[:：]\\s*", "");
        title = title.replaceAll("\\s*[-_|｜].*$", "").trim();
        if (StrUtil.isNotBlank(title) && !isGenericSiteTitle(title) && title.length() >= 4) {
            return title;
        }
        return extractCompetitionNameFromBody(text);
    }

    private String extractCompetitionNameFromBody(String text) {
        if (StrUtil.isBlank(text)) {
            return null;
        }
        String[] lines = text.split("[\\r\\n]+");
        Pattern named = Pattern.compile(
                ".{0,40}?(?:全国|中国|国际|省级|大学生)?[^\\n]{0,40}?(?:竞赛|大赛|比赛|挑战赛|hackathon|contest)[^\\n]{0,30}",
                Pattern.CASE_INSENSITIVE);
        for (String line : lines) {
            String cleaned = line.replaceAll("^来源标题[:：]\\s*", "")
                    .replaceAll("^\\d+\\.\\s*", "")
                    .trim();
            if (cleaned.length() < 6 || cleaned.length() > 80) {
                continue;
            }
            if (cleaned.startsWith("附件链接") || cleaned.startsWith("可能的详情页")
                    || cleaned.startsWith("摘要") || cleaned.startsWith("发布时间")) {
                continue;
            }
            Matcher matcher = named.matcher(cleaned);
            if (matcher.find()) {
                return matcher.group().trim();
            }
        }
        return null;
    }

    private boolean isGenericSiteTitle(String name) {
        String n = StrUtil.blankToDefault(name, "").trim();
        if (n.isEmpty()) {
            return true;
        }
        return n.matches(".*(首页|主页|网站|官网|登录|注册|关于我们|联系我们).*")
                || n.equalsIgnoreCase("home")
                || n.equalsIgnoreCase("index")
                || n.length() < 4;
    }

    private String extractOrganizer(String text) {
        if (StrUtil.isBlank(text)) {
            return null;
        }
        Matcher matcher = Pattern.compile(
                "(?:主办单位|主办方|主办|承办单位|承办)[:：\\s]*([^\\n。；;]{2,80})")
                .matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private boolean looksLikeCompetitionPage(String sourceTitle, String text) {
        String corpus = (StrUtil.blankToDefault(sourceTitle, "") + " " + StrUtil.blankToDefault(text, ""))
                .toLowerCase(Locale.ROOT);
        if (corpus.length() < 40) {
            return false;
        }
        return containsAnyText(corpus,
                "竞赛", "大赛", "比赛", "挑战赛", "赛事", "报名", "hackathon",
                "competition", "contest", "challenge", "国赛", "省赛", "选拔赛");
    }

    private boolean hasPendingDraftForUrl(String sourceUrl) {
        if (StrUtil.isBlank(sourceUrl) || baseMapper == null) {
            return false;
        }
        try {
            Long count = this.count(new LambdaQueryWrapper<AiCompetitionDraft>()
                    .eq(AiCompetitionDraft::getSourceUrl, sourceUrl)
                    .in(AiCompetitionDraft::getStatus, "pending_review", "confirmed"));
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private String escapeJson(String value) {
        return StrUtil.blankToDefault(value, "")
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    private AiModelResponseVO callCompetitionParser(String sourceUrl,
                                                    String sourceTitle,
                                                    String text,
                                                    DocumentContentService.ExtractedDocument document) {
        String systemPrompt = "你是高校赛事通知解析助手。目标是生成可自动填入发布表单的赛事草稿，必须返回严格 JSON。";
        String userPrompt = """
                请从以下公开赛事来源中抽取一个或多个赛事，返回 {"competitions":[...]}。
                规则：
                1. 一个页面/文档包含多个赛事时，competitions 中必须拆成多条。
                2. 尽量生成可直接回填表单的完整字段；日期字段优先输出 yyyy-MM-dd HH:mm:ss。
                3. 多个报名窗口必须全部写入 stages，并将最早开始/最晚截止作为 startTime/endTime。
                4. 月份/上旬/中旬/下旬等模糊比赛时间也要写入 stages，riskFlags 标记 approximate_competition_time。
                5. content 用中文整合参赛对象、竞赛类别、报名方式、官网与注意事项，避免只写一句摘要。
                6. 英文赛事保留原始名称；英文/国际/AI/科技/英语/软件/信息技术等适合作为 tags。
                7. 每个字段尽量给 fieldConfidence，证据写入 evidence，疑似重复/缺失/过期/动态页等写入 riskFlags。
                8. sourceUrl 优先使用具体详情页或附件链接，否则使用当前来源。

                字段：
                name, level, category, organizer, startTime, endTime, competitionStart, competitionEnd,
                maxTeamSize, coverUrl, content, tags, tracks, stages, registrationWindows, approximateTimeRanges,
                fieldConfidence, evidence, riskFlags, sourceTitle, sourceUrl。

                来源标题：%s
                来源 URL：%s
                抽取警告：%s

                文本内容：
                %s
                """.formatted(
                StrUtil.blankToDefault(sourceTitle, ""),
                StrUtil.blankToDefault(sourceUrl, ""),
                JSONUtil.toJsonStr(document.getWarnings()),
                StrUtil.blankToDefault(text, ""));

        if (StrUtil.isBlank(text) && !document.getImageDataUrls().isEmpty()) {
            return mimoModelClient.chatVisionJson(systemPrompt,
                    document.getImageDataUrls().stream().limit(3).collect(Collectors.toList()),
                    userPrompt,
                    competitionParseSchema());
        }
        return mimoModelClient.chatJson(systemPrompt, userPrompt, competitionParseSchema());
    }

    private Map<String, Object> competitionParseSchema() {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("name", "赛事名称");
        item.put("level", "国家级/省级/校级/院级/国际/其他");
        item.put("category", "A/B/C/英语/科技/创新创业/其他");
        item.put("organizer", "主办单位");
        item.put("startTime", "yyyy-MM-dd HH:mm:ss");
        item.put("endTime", "yyyy-MM-dd HH:mm:ss");
        item.put("competitionStart", "yyyy-MM-dd HH:mm:ss");
        item.put("competitionEnd", "yyyy-MM-dd HH:mm:ss");
        item.put("maxTeamSize", 1);
        item.put("content", "中文摘要、组队要求、作品要求、奖项设置");
        item.put("tags", List.of("AI", "科技"));
        item.put("tracks", List.of("赛道"));
        item.put("stages", List.of(Map.of("name", "报名", "startTime", "", "endTime", "", "description", "")));
        item.put("registrationWindows", List.of(Map.of("name", "软件赛报名", "startTime", "yyyy-MM-dd HH:mm:ss", "endTime", "yyyy-MM-dd HH:mm:ss")));
        item.put("approximateTimeRanges", List.of(Map.of("name", "全国选拔赛", "text", "2026年4月")));
        item.put("fieldConfidence", Map.of("name", 0.95, "endTime", 0.9));
        item.put("evidence", Map.of("name", "原文证据片段"));
        item.put("riskFlags", List.of("missing_registration_end"));
        item.put("sourceTitle", "来源标题");
        item.put("sourceUrl", "https://...");
        return Map.of("competitions", List.of(item));
    }

    @Override
    public Page<AiCompetitionDraftVO> listDrafts(int current, int size, String status, String keyword) {
        Page<AiCompetitionDraft> page = this.page(new Page<>(current, size), new LambdaQueryWrapper<AiCompetitionDraft>()
                .eq(StrUtil.isNotBlank(status), AiCompetitionDraft::getStatus, status)
                .like(StrUtil.isNotBlank(keyword), AiCompetitionDraft::getName, keyword)
                .orderByDesc(AiCompetitionDraft::getUpdateTime)
                .orderByDesc(AiCompetitionDraft::getCreateTime));
        return toVOPage(page);
    }

    @Override
    public AiCompetitionDraftVO getDraftDetail(Long id) {
        return toVO(requireDraft(id));
    }

    @Override
    @Transactional
    public AiCompetitionDraftVO updateDraft(Long id, AiCompetitionDraftVO dto) {
        AiCompetitionDraft draft = requireDraft(id);
        if (dto.getSourceTitle() != null) draft.setSourceTitle(dto.getSourceTitle());
        if (dto.getName() != null) draft.setName(dto.getName());
        if (dto.getLevel() != null) draft.setLevel(dto.getLevel());
        if (dto.getCategory() != null) draft.setCategory(dto.getCategory());
        if (dto.getOrganizer() != null) draft.setOrganizer(dto.getOrganizer());
        if (dto.getStartTime() != null) draft.setStartTime(dto.getStartTime());
        if (dto.getEndTime() != null) draft.setEndTime(dto.getEndTime());
        if (dto.getCompetitionStart() != null) draft.setCompetitionStart(dto.getCompetitionStart());
        if (dto.getCompetitionEnd() != null) draft.setCompetitionEnd(dto.getCompetitionEnd());
        if (dto.getMaxTeamSize() != null) draft.setMaxTeamSize(dto.getMaxTeamSize());
        if (dto.getCoverUrl() != null) draft.setCoverUrl(dto.getCoverUrl());
        if (dto.getContent() != null) draft.setContent(dto.getContent());
        if (dto.getTags() != null) draft.setTags(dto.getTags());
        if (dto.getTracks() != null) draft.setTracks(dto.getTracks());
        if (dto.getStagesJson() != null) draft.setStagesJson(dto.getStagesJson());
        if (dto.getFieldConfidenceJson() != null) draft.setFieldConfidenceJson(dto.getFieldConfidenceJson());
        if (dto.getEvidenceJson() != null) draft.setEvidenceJson(dto.getEvidenceJson());
        if (dto.getRiskFlagsJson() != null) draft.setRiskFlagsJson(dto.getRiskFlagsJson());
        draft.setUpdateTime(LocalDateTime.now());
        this.updateById(draft);
        return toVO(draft);
    }

    @Override
    @Transactional
    public AiCompetitionDraftVO confirmDraft(Long id, Long adminId, CompetitionDraftConfirmDTO dto) {
        AiCompetitionDraft draft = requireDraft(id);
        if ("confirmed".equalsIgnoreCase(draft.getStatus())) {
            return toVO(draft);
        }
        if (StrUtil.isBlank(draft.getName())) {
            throw new BusinessException("草稿赛事名称不能为空");
        }

        // 走与发布接口相同的通道：同一套默认值、同一套校验。
        // 直接 save 会写出发布接口写不出的数据。
        Competition competition = competitionPublishService.create(
                toPublishDTO(draft), CompetitionStatus.DRAFT.getValue());

        createStages(competition.getId(), draft.getStagesJson());

        draft.setCompetitionId(competition.getId());
        draft.setStatus("confirmed");
        draft.setReviewerId(adminId);
        draft.setReviewNote(dto != null ? dto.getReviewNote() : null);
        draft.setUpdateTime(LocalDateTime.now());
        this.updateById(draft);
        return toVO(draft);
    }

    @Override
    @Transactional
    public AiCompetitionDraftVO ignoreDraft(Long id, Long adminId, CompetitionDraftConfirmDTO dto) {
        AiCompetitionDraft draft = requireDraft(id);
        draft.setStatus("ignored");
        draft.setReviewerId(adminId);
        draft.setReviewNote(dto != null ? dto.getReviewNote() : null);
        draft.setUpdateTime(LocalDateTime.now());
        this.updateById(draft);
        return toVO(draft);
    }

    /**
     * 把草稿翻译成发布请求。
     *
     * 草稿字段是抽取出来的，可能缺失；这里补齐发布接口要求的必填项，
     * 缺失的用与人工发布一致的兜底值。
     */
    private EventPublishDTO toPublishDTO(AiCompetitionDraft draft) {
        EventPublishDTO dto = new EventPublishDTO();
        dto.setName(draft.getName());
        dto.setLevel(StrUtil.blankToDefault(draft.getLevel(), "校级"));
        dto.setCategory(StrUtil.blankToDefault(draft.getCategory(), "A"));
        dto.setOrganizer(draft.getOrganizer());
        dto.setStartTime(draft.getStartTime() != null ? draft.getStartTime() : LocalDateTime.now());
        dto.setEndTime(draft.getEndTime() != null ? draft.getEndTime() : dto.getStartTime().plusMonths(1));
        dto.setCompetitionStart(draft.getCompetitionStart());
        dto.setCompetitionEnd(draft.getCompetitionEnd());
        dto.setMaxTeamSize(draft.getMaxTeamSize() != null ? Math.max(draft.getMaxTeamSize(), 1) : 1);
        dto.setCoverUrl(draft.getCoverUrl());
        dto.setSourceUrl(draft.getSourceUrl());
        dto.setContent(StrUtil.blankToDefault(draft.getContent(), ""));
        dto.setTags(jsonArrayToList(draft.getTags()));
        dto.setTracks(jsonArrayToList(draft.getTracks()));
        return dto;
    }

    private List<String> jsonArrayToList(String value) {
        String normalized = normalizeJsonArray(value);
        return JSONUtil.isTypeJSONArray(normalized)
                ? JSONUtil.toList(normalized, String.class)
                : new ArrayList<>();
    }

    private AiCompetitionDraft createDraftFromJson(Long aiTaskId, String sourceType, String sourceUrl,
                                                   String sourceTitle, JsonNode node) {
        AiCompetitionDraft draft = new AiCompetitionDraft();
        draft.setAiTaskId(aiTaskId);
        draft.setSourceType(sourceType);
        draft.setSourceUrl(StrUtil.blankToDefault(textAny(node, "sourceUrl", "source_url", "sourceURL", "来源 URL", "来源链接"), sourceUrl));
        draft.setSourceTitle(StrUtil.blankToDefault(textAny(node, "sourceTitle", "source_title", "title", "来源标题"), sourceTitle));
        draft.setName(textAny(node, "name", "competitionName", "competition_name", "赛事名称", "competitionTitle", "title"));
        draft.setLevel(textAny(node, "level", "competitionLevel", "competition_level", "赛事级别"));
        draft.setCategory(textAny(node, "category", "competitionCategory", "competition_category", "赛事分类", "type"));
        draft.setOrganizer(textAny(node, "organizer", "host", "hosts", "sponsor", "主办方", "主办单位"));
        draft.setStartTime(parseTime(textAny(node, "startTime", "registrationStart", "registrationStartTime",
                "registration_start", "registration_start_time", "报名开始时间")));
        draft.setEndTime(parseTime(textAny(node, "endTime", "registrationEnd", "registrationEndTime",
                "deadline", "registration_deadline", "registration_end", "registration_end_time", "报名截止时间")));
        draft.setCompetitionStart(parseTime(textAny(node, "competitionStart", "competitionStartTime",
                "competition_start", "competition_start_time", "eventStart", "比赛开始时间")));
        draft.setCompetitionEnd(parseTime(textAny(node, "competitionEnd", "competitionEndTime",
                "competition_end", "competition_end_time", "eventEnd", "比赛结束时间")));
        draft.setMaxTeamSize(intAny(node, 1, "maxTeamSize", "max_team_size", "teamSize", "team_size", "最大团队人数"));
        draft.setCoverUrl(textAny(node, "coverUrl", "cover_url", "image", "封面图"));
        draft.setContent(firstNonBlank(text(node, "content"),
                textAny(node, "summary", "description", "简介"),
                textAny(node, "teamRequirements", "team_requirements"),
                textAny(node, "workRequirements", "work_requirements"),
                text(node, "组队要求"),
                text(node, "作品要求"),
                text(node, "奖项设置")));
        draft.setTags(enrichTags(arrayTextAny(node, "tags", "keywords", "赛事标签"), draft));
        draft.setTracks(arrayTextAny(node, "tracks", "track", "赛道"));
        draft.setStagesJson(normalizeStages(node, "stages", "registrationWindows", "registration_windows",
                "approximateTimeRanges", "approximate_time_ranges", "competitionPhases", "competition_phases",
                "timeline", "比赛阶段"));
        JsonNode fieldConfidence = nodeAny(node, "fieldConfidence", "field_confidence");
        JsonNode evidence = nodeAny(node, "evidence", "evidences");
        JsonNode riskFlags = nodeAny(node, "riskFlags", "risk_flags");
        if (fieldConfidence != null) draft.setFieldConfidenceJson(fieldConfidence.toString());
        if (evidence != null) draft.setEvidenceJson(evidence.toString());
        if (riskFlags != null) draft.setRiskFlagsJson(riskFlags.toString());
        applyRegistrationTimelineFromStages(draft);
        applyCompetitionTimelineFromStages(draft);
        draft.setStatus("pending_review");
        draft.setCreateTime(LocalDateTime.now());
        draft.setUpdateTime(LocalDateTime.now());
        return draft;
    }

    private void applyAutoFillCorrections(AiCompetitionDraft draft, String sourceText) {
        normalizeDraftLevelAndCategory(draft, sourceText);
        enrichTracksFromSource(draft, sourceText);
        enrichTagsFromSource(draft, sourceText);
        enrichContentFromSource(draft, sourceText);

        List<TimeWindow> registrationWindows = scheduleExtractor.extractRegistrationWindows(sourceText);
        if (!registrationWindows.isEmpty()) {
            LocalDateTime start = registrationWindows.stream()
                    .map(window -> window.getStart())
                    .filter(time -> time != null)
                    .min(LocalDateTime::compareTo)
                    .orElse(null);
            LocalDateTime end = registrationWindows.stream()
                    .map(window -> window.getEnd())
                    .filter(time -> time != null)
                    .max(LocalDateTime::compareTo)
                    .orElse(null);
            if (start != null && !start.equals(draft.getStartTime())) {
                draft.setStartTime(start);
                addRisk(draft, "registration_time_corrected_from_source");
            }
            if (end != null && !end.equals(draft.getEndTime())) {
                draft.setEndTime(end);
                addRisk(draft, "registration_time_corrected_from_source");
            }
            if (registrationWindows.size() > 1) {
                addRisk(draft, "multiple_registration_windows");
            }
            mergeStages(draft, registrationWindows);
            addEvidence(draft, "registrationWindows", registrationWindows.stream()
                    .map(TimeWindow::evidenceText)
                    .collect(Collectors.joining("；")));
        }

        List<TimeWindow> approximateCompetitionWindows = scheduleExtractor.extractApproximateCompetitionWindows(sourceText);
        if (!approximateCompetitionWindows.isEmpty()) {
            LocalDateTime start = approximateCompetitionWindows.stream()
                    .map(window -> window.getStart())
                    .min(LocalDateTime::compareTo)
                    .orElse(null);
            LocalDateTime end = approximateCompetitionWindows.stream()
                    .map(window -> window.getEnd())
                    .max(LocalDateTime::compareTo)
                    .orElse(null);
            if (start != null) draft.setCompetitionStart(start);
            if (end != null) draft.setCompetitionEnd(end);
            addRisk(draft, "approximate_competition_time");
            if (approximateCompetitionWindows.size() > 1) {
                addRisk(draft, "multi_stage_competition_time");
            }
            mergeStages(draft, approximateCompetitionWindows);
            addEvidence(draft, "approximateCompetitionTime", approximateCompetitionWindows.stream()
                    .map(TimeWindow::evidenceText)
                    .collect(Collectors.joining("；")));
        }

        if (draft.getEndTime() != null) {
            removeRisk(draft, "missing_registration_end");
        }
    }

    private void applyRegistrationTimelineFromStages(AiCompetitionDraft draft) {
        List<TimeWindow> registrationWindows = stageWindows(draft, true);
        if (registrationWindows.isEmpty()) {
            return;
        }
        LocalDateTime start = registrationWindows.stream()
                .map(window -> window.getStart())
                .min(LocalDateTime::compareTo)
                .orElse(null);
        LocalDateTime end = registrationWindows.stream()
                .map(window -> window.getEnd())
                .max(LocalDateTime::compareTo)
                .orElse(null);
        if (draft.getStartTime() == null && start != null) {
            draft.setStartTime(start);
        }
        if (draft.getEndTime() == null && end != null) {
            draft.setEndTime(end);
        }
        if (registrationWindows.size() > 1) {
            addRisk(draft, "multiple_registration_windows");
        }
    }

    private void applyCompetitionTimelineFromStages(AiCompetitionDraft draft) {
        List<TimeWindow> competitionWindows = stageWindows(draft, false);
        if (competitionWindows.isEmpty()) {
            return;
        }
        LocalDateTime start = competitionWindows.stream()
                .map(window -> window.getStart())
                .min(LocalDateTime::compareTo)
                .orElse(null);
        LocalDateTime end = competitionWindows.stream()
                .map(window -> window.getEnd())
                .max(LocalDateTime::compareTo)
                .orElse(null);
        if (draft.getCompetitionStart() == null && start != null) {
            draft.setCompetitionStart(start);
        }
        if (draft.getCompetitionEnd() == null && end != null) {
            draft.setCompetitionEnd(end);
        }
        boolean hasApproximate = competitionWindows.stream()
                .anyMatch(window -> APPROX_MONTH_TEXT_PATTERN.matcher(window.getSource()).find());
        if (hasApproximate) {
            addRisk(draft, "approximate_competition_time");
        }
        if (competitionWindows.size() > 1) {
            addRisk(draft, "multi_stage_competition_time");
        }
    }

    private List<TimeWindow> stageWindows(AiCompetitionDraft draft, boolean registration) {
        List<TimeWindow> windows = new ArrayList<>();
        if (!JSONUtil.isTypeJSONArray(draft.getStagesJson())) {
            return windows;
        }
        try {
            JsonNode stages = objectMapper.readTree(draft.getStagesJson());
            if (!stages.isArray()) {
                return windows;
            }
            for (JsonNode stage : stages) {
                String name = stage.path("name").asText("");
                String description = stage.path("description").asText("");
                boolean matches = registration
                        ? looksRegistrationStage(name, description)
                        : looksCompetitionStage(name, description);
                if (!matches) {
                    continue;
                }
                LocalDateTime start = parseTime(stage.path("startTime").asText(null));
                LocalDateTime end = parseTime(stage.path("endTime").asText(null));
                if (start != null && end != null) {
                    windows.add(new TimeWindow(name, start, end, description));
                }
            }
        } catch (Exception ignored) {
            return windows;
        }
        return windows;
    }

    private boolean looksRegistrationStage(String name, String description) {
        String text = StrUtil.blankToDefault(name, "") + " " + StrUtil.blankToDefault(description, "");
        return containsAnyText(text, "报名", "提交作品");
    }

    private boolean looksCompetitionStage(String name, String description) {
        String text = StrUtil.blankToDefault(name, "") + " " + StrUtil.blankToDefault(description, "");
        if (containsAnyText(text, "报名", "提交作品")) {
            return false;
        }
        return containsAnyText(text, "选拔赛", "决赛", "总决赛", "比赛", "竞赛", "评审", "答辩");
    }

    private void normalizeDraftLevelAndCategory(AiCompetitionDraft draft, String sourceText) {
        String corpus = lowerCorpus(draft.getName(), draft.getLevel(), draft.getCategory(), draft.getOrganizer(),
                draft.getContent(), draft.getTags(), draft.getTracks(), sourceText);
        draft.setLevel(normalizeCompetitionLevel(draft.getLevel(), corpus));
        draft.setCategory(normalizeCompetitionCategory(draft.getCategory(), corpus));
    }

    private String normalizeCompetitionLevel(String raw, String corpus) {
        String value = StrUtil.blankToDefault(raw, "").trim();
        String fallbackCorpus = StrUtil.isBlank(value) || "其他".equals(value) ? corpus : "";
        if (containsAnyText(value, "国家级", "全国", "全国赛", "国赛", "国际", "国际赛", "global", "international", "教育部", "工信部", "工业和信息化部")
                || containsAnyText(fallbackCorpus, "全国", "国家级", "教育部", "工信部", "工业和信息化部")) {
            return "国家级";
        }
        if (containsAnyText(value, "省赛", "省级", "省教育厅") || containsAnyText(fallbackCorpus, "省赛", "省级", "省教育厅")) {
            return "省级";
        }
        if (containsAnyText(value, "校赛", "校内", "学校", "校级") || containsAnyText(fallbackCorpus, "校赛", "校内", "学校")) {
            return "校级";
        }
        if (containsAnyText(value, "院赛", "学院", "院级") || containsAnyText(fallbackCorpus, "院赛", "学院")) {
            return "院级";
        }
        if ("其他".equals(value)) {
            return "";
        }
        return value;
    }

    private String normalizeCompetitionCategory(String raw, String corpus) {
        String value = StrUtil.blankToDefault(raw, "").trim();
        if ("A".equalsIgnoreCase(value)
                || containsAnyText(value, "科技", "信息技术", "软件", "AI", "人工智能")
                || (StrUtil.isBlank(value) && containsAnyText(corpus, "科技", "信息技术", "软件", "ai", "人工智能", "蓝桥杯"))) {
            return "A";
        }
        if ("B".equalsIgnoreCase(value)
                || containsAnyText(value, "创业", "商业")
                || (StrUtil.isBlank(value) && containsAnyText(corpus, "创业", "商业"))) {
            return "B";
        }
        if ("C".equalsIgnoreCase(value)
                || containsAnyText(value, "文化", "艺术")
                || (StrUtil.isBlank(value) && containsAnyText(corpus, "文化", "艺术"))) {
            return "C";
        }
        if (containsAnyText(value, "算法", "编程", "程序设计") || (StrUtil.isBlank(value) && containsAnyText(corpus, "算法", "编程", "程序设计"))) {
            return "algorithm";
        }
        if (containsAnyText(value, "设计", "视觉") || (StrUtil.isBlank(value) && containsAnyText(corpus, "设计", "视觉"))) {
            return "design";
        }
        return value;
    }

    private void enrichTracksFromSource(AiCompetitionDraft draft, String sourceText) {
        List<String> tracks = jsonList(draft.getTracks());
        String corpus = StrUtil.blankToDefault(sourceText, "") + " " + StrUtil.blankToDefault(draft.getContent(), "");
        for (String track : KNOWN_TRACKS) {
            if (corpus.contains(track)) {
                addIfAbsent(tracks, track);
            }
        }
        draft.setTracks(JSONUtil.toJsonStr(tracks));
    }

    private void enrichTagsFromSource(AiCompetitionDraft draft, String sourceText) {
        List<String> tags = jsonList(draft.getTags());
        String corpus = lowerCorpus(draft.getName(), draft.getContent(), draft.getTracks(), sourceText);
        if (containsAnyText(corpus, "ai", "人工智能", "aigc")) addIfAbsent(tags, "AI");
        if (containsAnyText(corpus, "科技", "技术", "信息技术")) addIfAbsent(tags, "科技");
        if (containsAnyText(corpus, "软件")) addIfAbsent(tags, "软件");
        if (containsAnyText(corpus, "信息技术")) addIfAbsent(tags, "信息技术");
        draft.setTags(JSONUtil.toJsonStr(tags));
    }

    private void enrichContentFromSource(AiCompetitionDraft draft, String sourceText) {
        String extracted = buildContentFromSource(sourceText);
        if (StrUtil.isBlank(extracted)) {
            return;
        }
        if (StrUtil.isBlank(draft.getContent())) {
            draft.setContent(extracted);
        } else if (draft.getContent().length() < 120 && !draft.getContent().contains(extracted)) {
            draft.setContent(draft.getContent() + "\n" + extracted);
        }
    }

    private String buildContentFromSource(String sourceText) {
        if (StrUtil.isBlank(sourceText)) {
            return "";
        }
        List<String> snippets = new ArrayList<>();
        for (String sentence : sourceText.split("[。；;\\n]") ) {
            String text = sentence.replaceAll("\\s+", " ").trim();
            if (text.length() < 8 || text.length() > 220) continue;
            if (containsAnyText(text, "联系人", "联系方式", "联系电话", "手机号", "手机", "邮箱", "QQ群", "qq")) continue;
            if (containsAnyText(text, "参赛对象", "全日制在校大学生", "项目类别", "竞赛类别", "报名方式", "官方网站", "注意事项")) {
                addIfAbsent(snippets, text);
            }
            if (snippets.size() >= 5) break;
        }
        return String.join("。", snippets);
    }

    private void mergeStages(AiCompetitionDraft draft, List<TimeWindow> windows) {
        if (windows.isEmpty()) {
            return;
        }
        ArrayNode stages = objectMapper.createArrayNode();
        if (JSONUtil.isTypeJSONArray(draft.getStagesJson())) {
            try {
                JsonNode existing = objectMapper.readTree(draft.getStagesJson());
                if (existing.isArray()) {
                    existing.forEach(stages::add);
                }
            } catch (Exception ignored) {
            }
        }
        for (TimeWindow window : windows) {
            if (hasStage(stages, window)) continue;
            ObjectNode stage = objectMapper.createObjectNode();
            stage.put("name", window.getName());
            stage.put("startTime", formatTime(window.getStart()));
            stage.put("endTime", formatTime(window.getEnd()));
            stage.put("description", window.getSource());
            stages.add(stage);
        }
        draft.setStagesJson(stages.toString());
    }

    private boolean hasStage(ArrayNode stages, TimeWindow window) {
        for (JsonNode stage : stages) {
            if (window.getName().equals(stage.path("name").asText())
                    && formatTime(window.getStart()).equals(stage.path("startTime").asText())
                    && formatTime(window.getEnd()).equals(stage.path("endTime").asText())) {
                return true;
            }
        }
        return false;
    }

    private void addEvidence(AiCompetitionDraft draft, String key, String value) {
        if (StrUtil.isBlank(value)) {
            return;
        }
        ObjectNode evidence = objectMapper.createObjectNode();
        if (JSONUtil.isTypeJSON(draft.getEvidenceJson())) {
            try {
                JsonNode existing = objectMapper.readTree(draft.getEvidenceJson());
                if (existing.isObject()) {
                    existing.fields().forEachRemaining(entry -> evidence.set(entry.getKey(), entry.getValue()));
                } else {
                    evidence.put("modelEvidence", existing.toString());
                }
            } catch (Exception ignored) {
            }
        } else if (StrUtil.isNotBlank(draft.getEvidenceJson())) {
            evidence.put("modelEvidence", draft.getEvidenceJson());
        }
        evidence.put(key, value);
        draft.setEvidenceJson(evidence.toString());
    }

    private List<String> jsonList(String raw) {
        List<String> list = new ArrayList<>();
        if (JSONUtil.isTypeJSONArray(raw)) {
            list.addAll(JSONUtil.toList(raw, String.class));
        } else if (StrUtil.isNotBlank(raw)) {
            list.addAll(splitList(raw));
        }
        return list;
    }

    private String lowerCorpus(String... values) {
        return String.join(" ", java.util.Arrays.stream(values)
                .map(value -> StrUtil.blankToDefault(value, ""))
                .collect(Collectors.toList())).toLowerCase(Locale.ROOT);
    }

    private boolean containsAnyText(String text, String... values) {
        String source = StrUtil.blankToDefault(text, "").toLowerCase(Locale.ROOT);
        for (String value : values) {
            if (source.contains(value.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private String formatTime(LocalDateTime time) {
        return CompetitionScheduleExtractor.formatTime(time);
    }

    private void applyQualityRisks(AiCompetitionDraft draft) {
        if (StrUtil.isBlank(draft.getName())) {
            addRisk(draft, "missing_name");
        }
        if (draft.getEndTime() == null) {
            addRisk(draft, "missing_registration_end");
        }
        if (StrUtil.isBlank(draft.getContent())) {
            addRisk(draft, "missing_content");
        }
        BigDecimal average = averageFieldConfidence(draft.getFieldConfidenceJson());
        if (average != null && average.compareTo(BigDecimal.valueOf(0.65)) < 0) {
            addRisk(draft, "low_confidence");
        }
    }

    private void applyDuplicateRisk(AiCompetitionDraft draft) {
        Competition duplicate = draftDedupService.findDuplicateCompetition(draft);
        if (duplicate != null) {
            draft.setDuplicateCompetitionId(duplicate.getId());
            draft.setDuplicateScore(BigDecimal.valueOf(1.0));
            addRisk(draft, "duplicate_competition");
        }
        if (draftDedupService.hasDuplicatePendingDraft(draft)) {
            addRisk(draft, "duplicate_pending_draft");
        }
    }

    private void createStages(Long competitionId, String stagesJson) {
        if (StrUtil.isBlank(stagesJson) || !JSONUtil.isTypeJSON(stagesJson)) return;
        JsonNode stages;
        try {
            stages = objectMapper.readTree(stagesJson);
        } catch (Exception e) {
            return;
        }
        if (!stages.isArray()) return;
        int order = 1;
        for (JsonNode node : stages) {
            String raw = node.isTextual() ? node.asText() : null;
            String name = node.isTextual() ? extractStageName(raw, order)
                    : textAny(node, "name", "stageName", "stage_name", "阶段名称");
            if (StrUtil.isBlank(name)) {
                name = "阶段" + order;
            }
            CompetitionStage stage = new CompetitionStage();
            stage.setName(name);
            stage.setStageOrder(order++);
            String timeRange = node.isTextual() ? raw : textAny(node, "timeRange", "time_range", "时间范围");
            List<String> dateTexts = extractDateTexts(timeRange);
            stage.setStartTime(parseTime(!dateTexts.isEmpty()
                    ? dateTexts.get(0)
                    : textAny(node, "startTime", "start_time", "开始时间")));
            stage.setEndTime(parseTime(dateTexts.size() > 1
                    ? dateTexts.get(1)
                    : textAny(node, "endTime", "end_time", "结束时间")));
            stage.setDescription(node.isTextual() ? raw : textAny(node, "description", "说明"));
            stage.setStatus("upcoming");
            competitionStageService.createStage(competitionId, stage);
        }
    }

    private AiCompetitionDraft requireDraft(Long id) {
        AiCompetitionDraft draft = this.getById(id);
        if (draft == null) {
            throw new BusinessException("AI 赛事草稿不存在");
        }
        return draft;
    }

    private Page<AiCompetitionDraftVO> toVOPage(Page<AiCompetitionDraft> page) {
        Page<AiCompetitionDraftVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return voPage;
    }

    private AiCompetitionDraftVO toVO(AiCompetitionDraft draft) {
        AiCompetitionDraftVO vo = new AiCompetitionDraftVO();
        BeanUtils.copyProperties(draft, vo);
        return vo;
    }

    private String normalizeJsonArray(String value) {
        if (StrUtil.isBlank(value)) return "[]";
        if (JSONUtil.isTypeJSONArray(value)) return value;
        if (JSONUtil.isTypeJSON(value)) {
            return "[]";
        }
        List<String> list = splitList(value);
        return JSONUtil.toJsonStr(list);
    }

    private String arrayTextAny(JsonNode node, String... fields) {
        JsonNode value = nodeAny(node, fields);
        if (value == null || value.isNull()) {
            return "[]";
        }
        if (value.isArray()) {
            return value.toString();
        }
        if (value.isTextual()) {
            return JSONUtil.toJsonStr(splitList(value.asText()));
        }
        return "[]";
    }

    private String text(JsonNode node, String field) {
        if (node == null || !node.isObject()) return null;
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private String textAny(JsonNode node, String... fields) {
        JsonNode value = nodeAny(node, fields);
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isArray()) {
            List<String> parts = new ArrayList<>();
            value.forEach(item -> {
                String text = item.asText();
                if (StrUtil.isNotBlank(text)) {
                    parts.add(text);
                }
            });
            return String.join("、", parts);
        }
        return value.asText();
    }

    private JsonNode nodeAny(JsonNode node, String... fields) {
        if (node == null || !node.isObject()) return null;
        for (String field : fields) {
            JsonNode value = node.get(field);
            if (value != null && !value.isNull()) {
                return value;
            }
        }
        return null;
    }

    private int intAny(JsonNode node, int defaultValue, String... fields) {
        JsonNode value = nodeAny(node, fields);
        if (value == null || value.isNull()) {
            return defaultValue;
        }
        if (value.canConvertToInt()) {
            return Math.max(value.asInt(), defaultValue);
        }
        Matcher matcher = Pattern.compile("\\d+").matcher(value.asText(""));
        int max = defaultValue;
        while (matcher.find()) {
            max = Math.max(max, Integer.parseInt(matcher.group()));
        }
        return max;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StrUtil.isNotBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private String normalizeStages(JsonNode root, String... fields) {
        ArrayNode stages = objectMapper.createArrayNode();
        int order = 1;
        if (root != null && root.isObject()) {
            for (String field : fields) {
                order = appendNormalizedStages(stages, root.get(field), order);
            }
        } else {
            appendNormalizedStages(stages, root, order);
        }
        return stages.toString();
    }

    private String normalizeStages(JsonNode value) {
        ArrayNode stages = objectMapper.createArrayNode();
        appendNormalizedStages(stages, value, 1);
        return stages.toString();
    }

    private int appendNormalizedStages(ArrayNode stages, JsonNode value, int order) {
        if (value == null || !value.isArray()) {
            return order;
        }
        for (JsonNode item : value) {
            ObjectNode stage = null;
            if (item.isObject()) {
                stage = item.deepCopy();
                putIfMissing(stage, "name", textAny(item, "name", "stageName", "stage_name", "阶段名称"));
                putIfMissing(stage, "name", "阶段" + order);
                putIfMissing(stage, "startTime", normalizedTime(textAny(item, "startTime", "start_time", "开始时间")));
                putIfMissing(stage, "endTime", normalizedTime(textAny(item, "endTime", "end_time", "结束时间")));
                String timeRange = firstNonBlank(textAny(item, "timeRange", "time_range", "时间范围"),
                        textAny(item, "text", "raw", "originalText", "原文"));
                putIfMissing(stage, "description", firstNonBlank(textAny(item, "description", "说明"), timeRange));
                List<String> dates = extractDateTexts(timeRange);
                if (!hasNonBlank(stage, "startTime") && !dates.isEmpty()) {
                    stage.put("startTime", normalizedTime(dates.get(0)));
                }
                if (!hasNonBlank(stage, "endTime") && dates.size() > 1) {
                    stage.put("endTime", normalizedTime(dates.get(1)));
                }
                TimeWindow approximate = approximateMonthWindowFromText(
                        StrUtil.blankToDefault(stage.path("name").asText(null), "阶段" + order), timeRange);
                if (approximate != null) {
                    if (!hasNonBlank(stage, "startTime")) {
                        stage.put("startTime", formatTime(approximate.getStart()));
                    }
                    if (!hasNonBlank(stage, "endTime")) {
                        stage.put("endTime", formatTime(approximate.getEnd()));
                    }
                }
            } else if (item.isTextual()) {
                String raw = item.asText();
                List<String> dates = extractDateTexts(raw);
                stage = objectMapper.createObjectNode();
                stage.put("name", extractStageName(raw, order));
                if (!dates.isEmpty()) {
                    stage.put("startTime", normalizedTime(dates.get(0)));
                }
                if (dates.size() > 1) {
                    stage.put("endTime", normalizedTime(dates.get(1)));
                }
                stage.put("description", raw);
                TimeWindow approximate = approximateMonthWindowFromText(stage.path("name").asText("阶段" + order), raw);
                if (approximate != null) {
                    putIfMissing(stage, "startTime", formatTime(approximate.getStart()));
                    putIfMissing(stage, "endTime", formatTime(approximate.getEnd()));
                }
            }
            if (stage != null) {
                addStageIfAbsent(stages, stage);
            }
            order++;
        }
        return order;
    }

    private TimeWindow approximateMonthWindowFromText(String name, String text) {
        Matcher matcher = APPROX_MONTH_TEXT_PATTERN.matcher(StrUtil.blankToDefault(text, ""));
        if (!matcher.find()) {
            return null;
        }
        int year = Integer.parseInt(matcher.group(1));
        int month = Integer.parseInt(matcher.group(2));
        return scheduleExtractor.approximateMonthWindow(
                name, year, month, StrUtil.blankToDefault(matcher.group(3), ""), matcher.group(0));
    }

    private void addStageIfAbsent(ArrayNode stages, ObjectNode stage) {
        String name = stage.path("name").asText("");
        String startTime = stage.path("startTime").asText("");
        String endTime = stage.path("endTime").asText("");
        String description = stage.path("description").asText("");
        for (JsonNode existing : stages) {
            if (name.equals(existing.path("name").asText(""))
                    && startTime.equals(existing.path("startTime").asText(""))
                    && endTime.equals(existing.path("endTime").asText(""))
                    && description.equals(existing.path("description").asText(""))) {
                return;
            }
        }
        stages.add(stage);
    }

    private boolean hasNonBlank(JsonNode node, String field) {
        return node != null && node.hasNonNull(field) && StrUtil.isNotBlank(node.path(field).asText());
    }

    private void putIfMissing(ObjectNode node, String field, String value) {
        if (node != null && !hasNonBlank(node, field) && StrUtil.isNotBlank(value)) {
            node.put(field, value);
        }
    }

    private String extractStageName(String raw, int order) {
        if (StrUtil.isBlank(raw)) {
            return "阶段" + order;
        }
        String trimmed = raw.trim();
        int splitIndex = firstSeparatorIndex(trimmed);
        String candidate = splitIndex > 0 ? trimmed.substring(0, splitIndex)
                : STAGE_NAME_DATE_PATTERN.matcher(trimmed).replaceAll("");
        candidate = candidate.replaceAll("[：:，,；;\\s]+$", "").trim();
        return StrUtil.blankToDefault(candidate, "阶段" + order);
    }

    private int firstSeparatorIndex(String text) {
        int result = -1;
        for (String separator : new String[]{"：", ":", "，", ",", "；", ";"}) {
            int index = text.indexOf(separator);
            if (index > 0 && (result < 0 || index < result)) {
                result = index;
            }
        }
        return result;
    }

    private List<String> extractDateTexts(String raw) {
        return DateTextUtil.extractDateCandidates(raw);
    }

    private LocalDateTime parseTime(String text) {
        return DateTextUtil.parseFlexibleDateTime(text);
    }

    private String normalizedTime(String text) {
        LocalDateTime time = parseTime(text);
        return time == null ? text : time.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    private List<String> splitList(String raw) {
        List<String> list = new ArrayList<>();
        if (StrUtil.isBlank(raw)) {
            return list;
        }
        for (String part : raw.split("[,，、;；\\n]")) {
            if (StrUtil.isNotBlank(part)) {
                list.add(part.trim());
            }
        }
        return list;
    }

    private String enrichTags(String tagsJson, AiCompetitionDraft draft) {
        List<String> tags = new ArrayList<>();
        if (JSONUtil.isTypeJSONArray(tagsJson)) {
            tags.addAll(JSONUtil.toList(tagsJson, String.class));
        }
        String joined = String.join(" ", StrUtil.blankToDefault(draft.getName(), ""),
                StrUtil.blankToDefault(draft.getContent(), ""),
                StrUtil.blankToDefault(draft.getSourceUrl(), "")).toLowerCase(Locale.ROOT);
        if (looksEnglish(joined)) addIfAbsent(tags, "英语");
        if (isLikelyInternational(draft.getSourceUrl()) || joined.contains("global") || joined.contains("international")) {
            addIfAbsent(tags, "国际");
        }
        if ((joined.contains("ai") || joined.contains("artificial intelligence") || joined.contains("machine learning")
                || joined.contains("data science") || joined.contains("人工智能"))
                && !containsAny(tags, "AI", "人工智能")) {
            addIfAbsent(tags, "AI");
        }
        if (joined.contains("hackathon") || joined.contains("challenge") || joined.contains("software")
                || joined.contains("科技") || joined.contains("软件")) {
            addIfAbsent(tags, "科技");
        }
        return JSONUtil.toJsonStr(tags);
    }

    private boolean looksEnglish(String text) {
        if (StrUtil.isBlank(text)) {
            return false;
        }
        int letters = 0;
        int asciiLetters = 0;
        for (char c : text.toCharArray()) {
            if (Character.isLetter(c)) {
                letters++;
                if (c < 128) {
                    asciiLetters++;
                }
            }
        }
        return letters > 10 && asciiLetters * 1.0 / letters > 0.75;
    }

    private boolean isLikelyInternational(String sourceUrl) {
        if (StrUtil.isBlank(sourceUrl)) {
            return false;
        }
        String lower = sourceUrl.toLowerCase(Locale.ROOT);
        return lower.startsWith("https://www.kaggle.com")
                || lower.contains("devpost.com")
                || lower.contains("drivendata.org")
                || lower.contains("aicrowd.com")
                || lower.contains("zindi.africa")
                || lower.contains("challenge.gov")
                || lower.contains("nasa.gov");
    }

    private void addIfAbsent(List<String> list, String value) {
        if (!list.contains(value)) {
            list.add(value);
        }
    }

    private boolean containsAny(List<String> list, String... values) {
        for (String value : values) {
            if (list.contains(value)) {
                return true;
            }
        }
        return false;
    }

    private void addRisk(AiCompetitionDraft draft, String risk) {
        List<String> risks = new ArrayList<>();
        if (JSONUtil.isTypeJSONArray(draft.getRiskFlagsJson())) {
            risks.addAll(JSONUtil.toList(draft.getRiskFlagsJson(), String.class));
        } else if (StrUtil.isNotBlank(draft.getRiskFlagsJson())) {
            risks.addAll(splitList(draft.getRiskFlagsJson()));
        }
        addIfAbsent(risks, risk);
        draft.setRiskFlagsJson(JSONUtil.toJsonStr(risks));
    }

    private void removeRisk(AiCompetitionDraft draft, String risk) {
        if (!JSONUtil.isTypeJSONArray(draft.getRiskFlagsJson())) {
            return;
        }
        List<String> risks = JSONUtil.toList(draft.getRiskFlagsJson(), String.class).stream()
                .filter(item -> !risk.equals(item))
                .collect(Collectors.toList());
        draft.setRiskFlagsJson(JSONUtil.toJsonStr(risks));
    }

    private BigDecimal averageFieldConfidence(String raw) {
        if (StrUtil.isBlank(raw) || !JSONUtil.isTypeJSON(raw)) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(raw);
            List<Double> values = new ArrayList<>();
            if (node.isObject()) {
                node.fields().forEachRemaining(entry -> {
                    if (entry.getValue().isNumber()) values.add(entry.getValue().asDouble());
                });
            } else if (node.isArray()) {
                node.forEach(item -> {
                    JsonNode value = item.path("confidence");
                    if (value.isNumber()) values.add(value.asDouble());
                });
            }
            if (values.isEmpty()) {
                return null;
            }
            return BigDecimal.valueOf(values.stream().mapToDouble(Double::doubleValue).average().orElse(0));
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal averageRootConfidence(JsonNode root) {
        List<Double> values = new ArrayList<>();
        JsonNode competitions = root.path("competitions");
        if (competitions.isArray()) {
            competitions.forEach(item -> {
                JsonNode confidence = item.path("fieldConfidence");
                if (confidence.isObject()) {
                    confidence.fields().forEachRemaining(entry -> {
                        if (entry.getValue().isNumber()) values.add(entry.getValue().asDouble());
                    });
                }
            });
        }
        if (values.isEmpty()) {
            return null;
        }
        return BigDecimal.valueOf(values.stream().mapToDouble(Double::doubleValue).average().orElse(0));
    }

    private String hashPreview(String value) {
        if (value == null) {
            return "";
        }
        return value.length() <= 120 ? value : value.substring(0, 120);
    }
}
