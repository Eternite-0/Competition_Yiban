package com.etsaion.vo.ai;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CompetitionSourceVO {
    private Long id;
    private String name;
    private String url;
    private String sourceType;
    private String crawlFrequency;
    private String language;
    private Integer crawlDepth;
    private Integer maxPages;
    private String allowPatterns;
    private String denyPatterns;
    private Boolean enabled;
    private LocalDateTime lastCrawlTime;
    private String lastCrawlStatus;
    private String lastErrorMessage;
    private Integer lastSuccessCount;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
