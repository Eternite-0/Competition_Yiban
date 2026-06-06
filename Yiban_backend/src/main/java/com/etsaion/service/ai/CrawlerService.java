package com.etsaion.service.ai;

import com.etsaion.dto.ai.CompetitionDraftParseUrlDTO;
import com.etsaion.entity.AiTask;
import com.etsaion.entity.CompetitionSource;
import com.etsaion.exception.BusinessException;
import com.etsaion.vo.ai.AiModelResponseVO;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;

@Service
public class CrawlerService {

    @Autowired
    private AiCompetitionDraftService aiCompetitionDraftService;

    @Autowired
    private DocumentContentService documentContentService;

    @Autowired
    private AiTaskService aiTaskService;

    @Autowired
    private MimoModelClient mimoModelClient;

    @Autowired
    private AiJsonSchemaService aiJsonSchemaService;

    public int crawlSource(CompetitionSource source) {
        if (source == null) {
            throw new BusinessException("赛事来源不存在");
        }
        if (source.getEnabled() != null && source.getEnabled() == 0) {
            throw new BusinessException("禁用来源不会被采集");
        }
        String pageText = documentContentService.readUrl(source.getUrl());
        AiTask task = aiTaskService.createTask("crawler_parse", "url", source.getUrl(),
                cn.hutool.crypto.SecureUtil.sha256(pageText), null, "admin", "crawler_competition_extract_v1");
        aiTaskService.markRunning(task.getId());

        AiModelResponseVO response = mimoModelClient.chatJson(
                "你是高校赛事网页识别助手。判断网页是否包含赛事通知，并返回严格 JSON。",
                "请判断以下公开网页内容是否为赛事页面。若是，返回 isCompetitionPage=true、sourceTitle、confidence、competitions 数组；若不是，competitions 为空。\n\n"
                        + cn.hutool.core.util.StrUtil.maxLength(pageText, 30000),
                Map.of("isCompetitionPage", true, "sourceTitle", "", "competitions", java.util.List.of(), "confidence", 0.0));
        if (!response.isSuccess()) {
            aiTaskService.markFailed(task.getId(), response.getErrorMessage());
            throw new BusinessException(response.getErrorMessage());
        }
        JsonNode crawlerResult = aiJsonSchemaService.validateCrawlerResult(response.getContent());
        BigDecimal confidence = crawlerResult.has("confidence") && crawlerResult.get("confidence").isNumber()
                ? BigDecimal.valueOf(crawlerResult.get("confidence").asDouble()) : null;
        aiTaskService.markSucceeded(task.getId(), response.getRawResponse(), crawlerResult.toString(), confidence);
        if (!crawlerResult.path("isCompetitionPage").asBoolean(false)) {
            return 0;
        }

        CompetitionDraftParseUrlDTO dto = new CompetitionDraftParseUrlDTO();
        dto.setUrl(source.getUrl());
        aiCompetitionDraftService.parseUrl(null, dto);
        return 1;
    }
}
