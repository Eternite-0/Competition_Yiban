package com.etsaion.service.ai;

import com.etsaion.dto.ai.CompetitionDraftParseUrlDTO;
import com.etsaion.entity.CompetitionSource;
import com.etsaion.exception.BusinessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CrawlerService {

    @Autowired
    private AiCompetitionDraftService aiCompetitionDraftService;

    public int crawlSource(CompetitionSource source) {
        if (source == null) {
            throw new BusinessException("赛事来源不存在");
        }
        if (source.getEnabled() != null && source.getEnabled() == 0) {
            throw new BusinessException("禁用来源不会被采集");
        }
        CompetitionDraftParseUrlDTO dto = new CompetitionDraftParseUrlDTO();
        dto.setUrl(source.getUrl());
        return aiCompetitionDraftService.parseUrlBatch(null, dto, "crawler").getDrafts().size();
    }
}
