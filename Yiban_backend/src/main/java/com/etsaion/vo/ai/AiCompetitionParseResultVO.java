package com.etsaion.vo.ai;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AiCompetitionParseResultVO {
    private Long taskId;
    private String sourceType;
    private String sourceUrl;
    private String sourceTitle;
    private List<AiCompetitionDraftVO> drafts = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();
}
