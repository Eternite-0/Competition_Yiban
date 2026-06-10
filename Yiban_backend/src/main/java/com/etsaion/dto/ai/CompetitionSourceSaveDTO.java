package com.etsaion.dto.ai;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class CompetitionSourceSaveDTO {
    @NotBlank(message = "来源名称不能为空")
    private String name;
    @NotBlank(message = "来源 URL 不能为空")
    private String url;
    private String sourceType;
    private String crawlFrequency;
    private String language;
    private Integer crawlDepth;
    private Integer maxPages;
    private String allowPatterns;
    private String denyPatterns;
    private Boolean enabled;
}
