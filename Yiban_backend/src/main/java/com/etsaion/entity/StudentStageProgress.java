package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("student_stage_progress")
public class StudentStageProgress {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long studentId;
    private Long competitionId;
    private Long stageId;
    private Long registrationId;
    private String status;
    private LocalDateTime submitTime;
    private LocalDateTime reviewTime;
    private String reviewNote;
    private Long reviewerId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
