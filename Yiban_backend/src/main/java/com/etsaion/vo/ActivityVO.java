package com.etsaion.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class ActivityVO {
    private Long id;
    private String type;
    private String title;
    private String level;
    private String category;
    private String organizer;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime activityStart;
    private LocalDateTime activityEnd;
    private Integer maxTeamSize;
    private Integer maxParticipants;
    private String coverUrl;
    private String content;
    private List<String> tags;
    private List<String> tracks;
    private String location;
    private BigDecimal serviceHours;
    private String status;
    private Map<String, Object> config;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
