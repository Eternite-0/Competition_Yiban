package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("student_academic_course")
public class StudentAcademicCourse {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long snapshotId;
    private Long syncId;
    private String requirementGroup;
    private String requirementCode;
    private String courseNo;
    private String courseName;
    private BigDecimal credit;
    private String courseStatus;
    private String displayTerm;
    private String courseCategory;
    private String courseNature;
    private String maxGrade;
    private BigDecimal gradePoint;
    private Boolean needsAttention;
    private LocalDateTime createTime;
}
