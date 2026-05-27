package com.etsaion.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class ParticipationVO {
    private Long id;
    private Long activityId;
    private String activityTitle;
    private String activityType;
    private Long studentId;
    private String studentName;
    private String studentNo;
    private String teamName;
    private String track;
    private List<Long> memberStudentIds;
    private Map<String, Object> metadata;
    private String status;
    private LocalDateTime submitDate;
    private String reviewNote;
}
