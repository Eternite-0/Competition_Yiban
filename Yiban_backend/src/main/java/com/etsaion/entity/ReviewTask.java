package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("review_task")
public class ReviewTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String activityType; // competition, volunteer
    private Long activityId;
    private String targetType; // registration, submission, participation
    private Long targetId;
    private Long submitterId;
    private String title;
    private String status; // pending, processing, resolved
    private String reviewNote;
    private Long reviewerId;
    private LocalDateTime deadline;
    private String payloadJson;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
