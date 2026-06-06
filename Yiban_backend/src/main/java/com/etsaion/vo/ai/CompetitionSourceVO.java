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
    private Boolean enabled;
    private LocalDateTime lastCrawlTime;
    private String lastCrawlStatus;
    private String lastErrorMessage;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
