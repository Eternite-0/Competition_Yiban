package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("competition_source")
public class CompetitionSource {
    @TableId(type = IdType.AUTO)
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
    private Integer enabled;
    private LocalDateTime lastCrawlTime;
    private String lastCrawlStatus;
    private String lastErrorMessage;
    private Integer lastSuccessCount;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
