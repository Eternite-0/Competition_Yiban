package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("participation")
public class Participation {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long activityId;
    private Long studentId;
    private String teamName;
    private String track;
    private String memberStudentIds; // JSON array
    private String metadataJson;
    private String status; // submitted, in_review, approved, rejected, returned, cancelled
    private LocalDateTime submitDate;
    private String reviewNote;
    private Long reviewerId;
    private LocalDateTime reviewTime;
}
