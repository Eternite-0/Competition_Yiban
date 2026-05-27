package com.etsaion.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class ReviewTaskVO {
    private Long id;
    private String activityType;
    private Long activityId;
    private String targetType;
    private Long targetId;
    private Long submitterId;
    private String submitterName;
    private String submitterNo;
    private String college;
    private String major;
    private String className;
    private String title;
    private String status;
    private String reviewNote;
    private LocalDateTime deadline;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Map<String, Object> payload;
}
