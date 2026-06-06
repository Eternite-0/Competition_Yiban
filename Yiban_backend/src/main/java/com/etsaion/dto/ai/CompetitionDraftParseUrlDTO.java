package com.etsaion.dto.ai;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class CompetitionDraftParseUrlDTO {
    @NotBlank(message = "赛事网页 URL 不能为空")
    private String url;
}
