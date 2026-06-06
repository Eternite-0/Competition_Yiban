package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("ai_competition_draft")
public class AiCompetitionDraft {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long aiTaskId;
    private Long competitionId;
    private String sourceType;
    private String sourceUrl;
    private String sourceTitle;
    private String name;
    private String level;
    private String category;
    private String organizer;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime competitionStart;
    private LocalDateTime competitionEnd;
    private Integer maxTeamSize;
    private String coverUrl;
    private String content;
    private String tags;
    private String tracks;
    private String stagesJson;
    private String fieldConfidenceJson;
    private String evidenceJson;
    private String riskFlagsJson;
    private Long duplicateCompetitionId;
    private BigDecimal duplicateScore;
    private String status;
    private Long reviewerId;
    private String reviewNote;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
