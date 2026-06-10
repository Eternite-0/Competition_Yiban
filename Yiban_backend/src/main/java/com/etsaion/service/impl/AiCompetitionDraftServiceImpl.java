package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.SecureUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.ai.CompetitionDraftConfirmDTO;
import com.etsaion.dto.ai.CompetitionDraftParseUrlDTO;
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
import java.time.LocalDateTime;
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

    private static final String PROMPT_VERSION = "competition_parse_v2";
    private static final int MAX_PARSE_TEXT_LENGTH = 70000;
    private static final Pattern STAGE_NAME_DATE_PATTERN =
            Pattern.compile("\\d{4}[-/.年]\\d{1,2}[-/.月]\\d{1,2}日?(?:\\s*\\d{1,2}[:：]\\d{2}(?::\\d{2})?)?");

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
            aiTaskService.markFailed(task.getId(), response.getErrorMessage());
            throw new BusinessException(response.getErrorMessage());
        }

        JsonNode root = aiJsonSchemaService.validateCompetitionParseResult(response.getContent());
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
            result.getWarnings().add("no_competitions_detected");
            return result;
        }

        for (JsonNode item : competitions) {
            AiCompetitionDraft draft = createDraftFromJson(task.getId(), sourceType, sourceUrl, sourceTitle, item);
            document.getWarnings().forEach(warning -> addRisk(draft, warning));
            this.save(draft);
            result.getDrafts().add(toVO(draft));
        }
        return result;
    }

    private AiModelResponseVO callCompetitionParser(String sourceUrl,
                                                    String sourceTitle,
                                                    String text,
                                                    DocumentContentService.ExtractedDocument document) {
        String systemPrompt = "你是高校赛事通知解析助手。只抽取来源中明确出现或可由上下文强推断的信息，必须返回严格 JSON。";
        String userPrompt = """
                请从以下公开赛事来源中抽取一个或多个赛事，返回 {"competitions":[...]}。
                规则：
                1. 一个页面/文档包含多个赛事时，competitions 中必须拆成多条。
                2. 时间尽量规范为 yyyy-MM-dd HH:mm:ss；无法确定的字段留空，不要编造。
                3. 英文赛事保留原始名称，content 用中文概括；英文/国际/AI/科技/英语等适合作为 tags。
                4. 每个字段尽量给 fieldConfidence，证据写入 evidence，疑似重复/缺失/过期/动态页等写入 riskFlags。
                5. sourceUrl 优先使用具体详情页或附件链接，否则使用当前来源。

                字段：
                name, level, category, organizer, startTime, endTime, competitionStart, competitionEnd,
                maxTeamSize, coverUrl, content, tags, tracks, stages, fieldConfidence, evidence, riskFlags, sourceTitle, sourceUrl。

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

        Competition competition = new Competition();
        competition.setName(draft.getName());
        competition.setLevel(StrUtil.blankToDefault(draft.getLevel(), "校级"));
        competition.setCategory(activityCategoryService.resolveOrCreate("competition", StrUtil.blankToDefault(draft.getCategory(), "A")));
        competition.setOrganizer(draft.getOrganizer());
        competition.setStartTime(draft.getStartTime());
        competition.setEndTime(draft.getEndTime());
        competition.setCompetitionStart(draft.getCompetitionStart());
        competition.setCompetitionEnd(draft.getCompetitionEnd());
        competition.setMaxTeamSize(draft.getMaxTeamSize() != null ? Math.max(draft.getMaxTeamSize(), 1) : 1);
        competition.setCoverUrl(draft.getCoverUrl());
        competition.setSourceUrl(draft.getSourceUrl());
        competition.setContent(StrUtil.blankToDefault(draft.getContent(), ""));
        competition.setTags(normalizeJsonArray(draft.getTags()));
        competition.setTracks(normalizeJsonArray(draft.getTracks()));
        competition.setStatus("draft");
        competition.setCreateTime(LocalDateTime.now());
        competition.setUpdateTime(LocalDateTime.now());
        competitionService.save(competition);

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
        draft.setStagesJson(normalizeStages(nodeAny(node, "stages", "competitionPhases", "competition_phases", "timeline", "比赛阶段")));
        JsonNode fieldConfidence = nodeAny(node, "fieldConfidence", "field_confidence");
        JsonNode evidence = nodeAny(node, "evidence", "evidences");
        JsonNode riskFlags = nodeAny(node, "riskFlags", "risk_flags");
        if (fieldConfidence != null) draft.setFieldConfidenceJson(fieldConfidence.toString());
        if (evidence != null) draft.setEvidenceJson(evidence.toString());
        if (riskFlags != null) draft.setRiskFlagsJson(riskFlags.toString());
        applyQualityRisks(draft);
        applyDuplicateRisk(draft);
        draft.setStatus("pending_review");
        draft.setCreateTime(LocalDateTime.now());
        draft.setUpdateTime(LocalDateTime.now());
        return draft;
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
        Competition duplicate = findDuplicateCompetition(draft);
        if (duplicate != null) {
            draft.setDuplicateCompetitionId(duplicate.getId());
            draft.setDuplicateScore(BigDecimal.valueOf(1.0));
            addRisk(draft, "duplicate_competition");
        }
        if (hasDuplicatePendingDraft(draft)) {
            addRisk(draft, "duplicate_pending_draft");
        }
    }

    private Competition findDuplicateCompetition(AiCompetitionDraft draft) {
        try {
            if (StrUtil.isNotBlank(draft.getSourceUrl())) {
                Competition bySource = competitionService.getOne(new LambdaQueryWrapper<Competition>()
                        .eq(Competition::getSourceUrl, draft.getSourceUrl())
                        .last("LIMIT 1"));
                if (bySource != null) {
                    draft.setDuplicateScore(BigDecimal.ONE);
                    return bySource;
                }
            }
            if (StrUtil.isBlank(draft.getName())) {
                return null;
            }
            List<Competition> competitions = competitionService.list(new LambdaQueryWrapper<Competition>()
                    .isNotNull(Competition::getName));
            if (competitions == null) {
                return null;
            }
            String normalized = normalizeCompetitionName(draft.getName());
            Competition best = null;
            double bestScore = 0;
            for (Competition competition : competitions) {
                double score = similarity(normalized, normalizeCompetitionName(competition.getName()));
                if (score > bestScore) {
                    bestScore = score;
                    best = competition;
                }
            }
            if (best != null && bestScore >= 0.86) {
                draft.setDuplicateScore(BigDecimal.valueOf(bestScore));
                return best;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private boolean hasDuplicatePendingDraft(AiCompetitionDraft draft) {
        if (baseMapper == null) {
            return false;
        }
        try {
            List<AiCompetitionDraft> pending = this.list(new LambdaQueryWrapper<AiCompetitionDraft>()
                    .in(AiCompetitionDraft::getStatus, "pending_review", "confirmed"));
            if (pending == null) {
                return false;
            }
            String normalized = normalizeCompetitionName(draft.getName());
            for (AiCompetitionDraft item : pending) {
                if (StrUtil.isNotBlank(draft.getSourceUrl()) && draft.getSourceUrl().equals(item.getSourceUrl())) {
                    return true;
                }
                if (StrUtil.isNotBlank(normalized)
                        && similarity(normalized, normalizeCompetitionName(item.getName())) >= 0.9) {
                    return true;
                }
            }
        } catch (Exception ignored) {
        }
        return false;
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

    private String normalizeStages(JsonNode value) {
        if (value == null || !value.isArray()) {
            return "[]";
        }
        ArrayNode stages = objectMapper.createArrayNode();
        int order = 1;
        for (JsonNode item : value) {
            if (item.isObject()) {
                ObjectNode stage = item.deepCopy();
                putIfMissing(stage, "name", textAny(item, "name", "stageName", "stage_name", "阶段名称"));
                putIfMissing(stage, "startTime", normalizedTime(textAny(item, "startTime", "start_time", "开始时间")));
                putIfMissing(stage, "endTime", normalizedTime(textAny(item, "endTime", "end_time", "结束时间")));
                putIfMissing(stage, "description", textAny(item, "description", "说明"));
                String timeRange = textAny(item, "timeRange", "time_range", "时间范围");
                List<String> dates = extractDateTexts(timeRange);
                if (!stage.hasNonNull("startTime") && !dates.isEmpty()) {
                    stage.put("startTime", normalizedTime(dates.get(0)));
                }
                if (!stage.hasNonNull("endTime") && dates.size() > 1) {
                    stage.put("endTime", normalizedTime(dates.get(1)));
                }
                stages.add(stage);
            } else if (item.isTextual()) {
                String raw = item.asText();
                List<String> dates = extractDateTexts(raw);
                ObjectNode stage = objectMapper.createObjectNode();
                stage.put("name", extractStageName(raw, order));
                if (!dates.isEmpty()) {
                    stage.put("startTime", normalizedTime(dates.get(0)));
                }
                if (dates.size() > 1) {
                    stage.put("endTime", normalizedTime(dates.get(1)));
                }
                stage.put("description", raw);
                stages.add(stage);
            }
            order++;
        }
        return stages.toString();
    }

    private void putIfMissing(ObjectNode node, String field, String value) {
        if (!node.hasNonNull(field) && StrUtil.isNotBlank(value)) {
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

    private String normalizeCompetitionName(String name) {
        if (StrUtil.isBlank(name)) {
            return "";
        }
        return name.toLowerCase(Locale.ROOT)
                .replaceAll("(19|20)\\d{2}", "")
                .replaceAll("第[一二三四五六七八九十\\d]+届", "")
                .replaceAll("[\\p{Punct}\\s·•“”‘’（）()【】\\[\\]《》]+", "")
                .trim();
    }

    private double similarity(String a, String b) {
        if (StrUtil.isBlank(a) || StrUtil.isBlank(b)) {
            return 0;
        }
        if (a.equals(b)) {
            return 1;
        }
        int distance = levenshtein(a, b);
        int max = Math.max(a.length(), b.length());
        return max == 0 ? 0 : 1.0 - (distance * 1.0 / max);
    }

    private int levenshtein(String a, String b) {
        int[] prev = new int[b.length() + 1];
        int[] curr = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) prev[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            curr[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                curr[j] = Math.min(Math.min(curr[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost);
            }
            int[] tmp = prev;
            prev = curr;
            curr = tmp;
        }
        return prev[b.length()];
    }

    private String hashPreview(String value) {
        if (value == null) {
            return "";
        }
        return value.length() <= 120 ? value : value.substring(0, 120);
    }
}
