package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
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
import com.etsaion.service.CompetitionService;
import com.etsaion.service.CompetitionStageService;
import com.etsaion.service.ai.AiCompetitionDraftService;
import com.etsaion.service.ai.AiJsonSchemaService;
import com.etsaion.service.ai.AiTaskService;
import com.etsaion.service.ai.DocumentContentService;
import com.etsaion.service.ai.MimoModelClient;
import com.etsaion.vo.ai.AiCompetitionDraftVO;
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
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiCompetitionDraftServiceImpl extends ServiceImpl<AiCompetitionDraftMapper, AiCompetitionDraft>
        implements AiCompetitionDraftService {

    private static final Pattern DATE_TEXT_PATTERN =
            Pattern.compile("\\d{4}-\\d{2}-\\d{2}(?: \\d{2}:\\d{2}:\\d{2})?");

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

    @Override
    @Transactional
    public AiCompetitionDraftVO parseFile(Long adminId, MultipartFile file) {
        String text = documentContentService.readMultipartFile(file);
        String sourceUrl = file != null ? file.getOriginalFilename() : "uploaded-file";
        return parseText(adminId, "file", sourceUrl, sourceUrl, text);
    }

    @Override
    @Transactional
    public AiCompetitionDraftVO parseUrl(Long adminId, CompetitionDraftParseUrlDTO dto) {
        String text = documentContentService.readUrl(dto.getUrl());
        return parseText(adminId, "url", dto.getUrl(), dto.getUrl(), text);
    }

    @Override
    @Transactional
    public AiCompetitionDraftVO parseUrlWithProgress(Long adminId, CompetitionDraftParseUrlDTO dto,
                                                     Consumer<Map<String, String>> onProgress) {
        sendProgress(onProgress, "scraping", "正在抓取网页内容...");
        String text = documentContentService.readUrl(dto.getUrl());

        sendProgress(onProgress, "analyzing", "AI 正在分析赛事信息...");
        String trimmedText = StrUtil.maxLength(text, 50000);
        AiTask task = aiTaskService.createTask("competition_doc_parse", "url", dto.getUrl(),
                SecureUtil.sha256(trimmedText), adminId, "admin", "competition_parse_v1");
        aiTaskService.markRunning(task.getId());

        AiModelResponseVO response = mimoModelClient.chatJson(
                "你是高校赛事通知解析助手。只抽取文档中明确出现或可由上下文强推断的信息，必须返回严格 JSON。",
                "请从以下赛事通知内容抽取赛事字段，返回 {\"competitions\":[...]}。\n\n" + trimmedText,
                null);
        if (!response.isSuccess()) {
            aiTaskService.markFailed(task.getId(), response.getErrorMessage());
            throw new BusinessException(response.getErrorMessage());
        }

        sendProgress(onProgress, "generating", "正在生成赛事草稿...");
        JsonNode root = aiJsonSchemaService.validateCompetitionParseResult(response.getContent());
        aiTaskService.markSucceeded(task.getId(), response.getRawResponse(), root.toString(), null);
        JsonNode first = root.path("competitions").isArray() && root.path("competitions").size() > 0
                ? root.path("competitions").get(0)
                : root;
        AiCompetitionDraft draft = createDraftFromJson(task.getId(), "url", dto.getUrl(), dto.getUrl(), first);
        this.save(draft);
        return toVO(draft);
    }

    private void sendProgress(Consumer<Map<String, String>> callback, String step, String message) {
        if (callback == null) return;
        Map<String, String> event = new HashMap<>();
        event.put("step", step);
        event.put("message", message);
        callback.accept(event);
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
        competition.setCategory(StrUtil.blankToDefault(draft.getCategory(), "A"));
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

    private AiCompetitionDraftVO parseText(Long adminId, String sourceType, String sourceUrl, String sourceTitle, String text) {
        if (StrUtil.isBlank(text)) {
            throw new BusinessException("文档内容为空，无法生成赛事草稿");
        }
        String trimmedText = StrUtil.maxLength(text, 50000);
        AiTask task = aiTaskService.createTask("competition_doc_parse", sourceType, sourceUrl,
                SecureUtil.sha256(trimmedText), adminId, "admin", "competition_parse_v1");
        aiTaskService.markRunning(task.getId());

        AiModelResponseVO response = mimoModelClient.chatJson(
                "你是高校赛事通知解析助手。只抽取文档中明确出现或可由上下文强推断的信息，必须返回严格 JSON。",
                "请从以下赛事通知内容抽取赛事字段，返回 {\"competitions\":[...]}。\n\n" + trimmedText,
                null);
        if (!response.isSuccess()) {
            aiTaskService.markFailed(task.getId(), response.getErrorMessage());
            throw new BusinessException(response.getErrorMessage());
        }

        JsonNode root = aiJsonSchemaService.validateCompetitionParseResult(response.getContent());
        aiTaskService.markSucceeded(task.getId(), response.getRawResponse(), root.toString(), null);
        JsonNode first = root.path("competitions").isArray() && root.path("competitions").size() > 0
                ? root.path("competitions").get(0)
                : root;
        AiCompetitionDraft draft = createDraftFromJson(task.getId(), sourceType, sourceUrl, sourceTitle, first);
        this.save(draft);
        return toVO(draft);
    }

    private AiCompetitionDraft createDraftFromJson(Long aiTaskId, String sourceType, String sourceUrl,
                                                   String sourceTitle, JsonNode node) {
        AiCompetitionDraft draft = new AiCompetitionDraft();
        draft.setAiTaskId(aiTaskId);
        draft.setSourceType(sourceType);
        draft.setSourceUrl(sourceUrl);
        draft.setSourceTitle(StrUtil.blankToDefault(textAny(node, "sourceTitle", "source_title", "来源标题"), sourceTitle));
        draft.setName(textAny(node, "name", "competitionName", "competition_name", "赛事名称"));
        draft.setLevel(textAny(node, "level", "competitionLevel", "competition_level", "赛事级别"));
        draft.setCategory(textAny(node, "category", "competitionCategory", "competition_category", "赛事分类"));
        draft.setOrganizer(textAny(node, "organizer", "host", "主办方", "主办单位"));
        draft.setStartTime(parseTime(textAny(node, "startTime", "registrationStart", "registrationStartTime",
                "registration_start", "registration_start_time", "报名开始时间")));
        draft.setEndTime(parseTime(textAny(node, "endTime", "registrationEnd", "registrationEndTime",
                "registration_end", "registration_end_time", "报名截止时间")));
        draft.setCompetitionStart(parseTime(textAny(node, "competitionStart", "competitionStartTime",
                "competition_start", "competition_start_time", "比赛开始时间")));
        draft.setCompetitionEnd(parseTime(textAny(node, "competitionEnd", "competitionEndTime",
                "competition_end", "competition_end_time", "比赛结束时间")));
        draft.setMaxTeamSize(intAny(node, 1, "maxTeamSize", "max_team_size", "最大团队人数"));
        draft.setCoverUrl(textAny(node, "coverUrl", "cover_url", "封面图"));
        draft.setContent(firstNonBlank(text(node, "content"),
                textAny(node, "teamRequirements", "team_requirements"),
                textAny(node, "workRequirements", "work_requirements"),
                text(node, "组队要求"),
                text(node, "作品要求"),
                text(node, "奖项设置")));
        draft.setTags(arrayTextAny(node, "tags", "赛事标签"));
        draft.setTracks(arrayTextAny(node, "tracks", "赛道"));
        draft.setStagesJson(normalizeStages(nodeAny(node, "stages", "competitionPhases", "competition_phases", "比赛阶段")));
        JsonNode fieldConfidence = nodeAny(node, "fieldConfidence", "field_confidence");
        JsonNode evidence = nodeAny(node, "evidence");
        JsonNode riskFlags = nodeAny(node, "riskFlags", "risk_flags");
        if (fieldConfidence != null) draft.setFieldConfidenceJson(fieldConfidence.toString());
        if (evidence != null) draft.setEvidenceJson(evidence.toString());
        if (riskFlags != null) draft.setRiskFlagsJson(riskFlags.toString());
        applyDuplicateRisk(draft);
        draft.setStatus("pending_review");
        draft.setCreateTime(LocalDateTime.now());
        draft.setUpdateTime(LocalDateTime.now());
        return draft;
    }

    private void applyDuplicateRisk(AiCompetitionDraft draft) {
        if (StrUtil.isBlank(draft.getName())) return;
        Competition existing = competitionService.getOne(new LambdaQueryWrapper<Competition>()
                .eq(Competition::getName, draft.getName())
                .last("LIMIT 1"));
        if (existing != null) {
            draft.setDuplicateCompetitionId(existing.getId());
            draft.setDuplicateScore(BigDecimal.valueOf(1.0));
            String risks = normalizeJsonArray(draft.getRiskFlagsJson());
            List<String> riskList = JSONUtil.toList(risks, String.class);
            if (!riskList.contains("duplicate_competition_name")) {
                riskList.add("duplicate_competition_name");
            }
            draft.setRiskFlagsJson(JSONUtil.toJsonStr(riskList));
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
        if (JSONUtil.isTypeJSON(value)) return value;
        List<String> list = new ArrayList<>();
        for (String part : value.split(",")) {
            if (StrUtil.isNotBlank(part)) list.add(part.trim());
        }
        return JSONUtil.toJsonStr(list);
    }

    private String arrayText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && value.isArray() ? value.toString() : "[]";
    }

    private String arrayTextAny(JsonNode node, String... fields) {
        JsonNode value = nodeAny(node, fields);
        return value != null && value.isArray() ? value.toString() : "[]";
    }

    private String text(JsonNode node, String field) {
        if (node == null || !node.isObject()) return null;
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private String textAny(JsonNode node, String... fields) {
        JsonNode value = nodeAny(node, fields);
        return value == null || value.isNull() ? null : value.asText();
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
        return value != null && value.canConvertToInt() ? value.asInt() : defaultValue;
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
                putIfMissing(stage, "startTime", textAny(item, "startTime", "start_time", "开始时间"));
                putIfMissing(stage, "endTime", textAny(item, "endTime", "end_time", "结束时间"));
                putIfMissing(stage, "description", textAny(item, "description", "说明"));
                String timeRange = textAny(item, "timeRange", "time_range", "时间范围");
                List<String> dates = extractDateTexts(timeRange);
                if (!stage.hasNonNull("startTime") && !dates.isEmpty()) {
                    stage.put("startTime", dates.get(0));
                }
                if (!stage.hasNonNull("endTime") && dates.size() > 1) {
                    stage.put("endTime", dates.get(1));
                }
                stages.add(stage);
            } else if (item.isTextual()) {
                String raw = item.asText();
                List<String> dates = extractDateTexts(raw);
                ObjectNode stage = objectMapper.createObjectNode();
                stage.put("name", extractStageName(raw, order));
                if (!dates.isEmpty()) {
                    stage.put("startTime", dates.get(0));
                }
                if (dates.size() > 1) {
                    stage.put("endTime", dates.get(1));
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
                : DATE_TEXT_PATTERN.matcher(trimmed).replaceAll("");
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
        List<String> dates = new ArrayList<>();
        if (StrUtil.isBlank(raw)) {
            return dates;
        }
        Matcher matcher = DATE_TEXT_PATTERN.matcher(raw);
        while (matcher.find()) {
            dates.add(matcher.group());
        }
        return dates;
    }

    private LocalDateTime parseTime(String text) {
        if (StrUtil.isBlank(text)) return null;
        try {
            if (text.length() == 10) {
                return LocalDate.parse(text).atStartOfDay();
            }
            return LocalDateTime.parse(text, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (Exception e) {
            return null;
        }
    }
}
