package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("student_academic_snapshot")
public class StudentAcademicSnapshot {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long studentId;
    private String studentNo;
    private Long syncId;
    private String source;
    private BigDecimal gpa;
    private BigDecimal requiredCredits;
    private BigDecimal earnedCredits;
    private BigDecimal missingCredits;
    private Integer plannedTotalCourses;
    private Integer plannedPassedCourses;
    private Integer plannedFailedCourses;
    private Integer plannedMissedCourses;
    private Integer plannedInProgressCourses;
    private String riskLevel;
    private LocalDateTime syncedAt;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
