package com.etsaion.dto.ai;

import lombok.Data;

@Data
public class CompetitionDraftConfirmDTO {
    private String reviewNote;

    /**
     * 是否在确认草稿时直接发布赛事。默认 false，保持原有“创建草稿”的行为。
     */
    private Boolean publish;
}
