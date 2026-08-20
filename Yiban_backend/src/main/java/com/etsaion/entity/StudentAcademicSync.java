package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("student_academic_sync")
public class StudentAcademicSync {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long studentId;
    private String studentNo;
    private String source;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private Long snapshotId;
    private Integer gradeCount;
    private Integer planCourseCount;
    private Integer scheduleCount;
    private Integer examCount;
    private Integer noticeCount;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
