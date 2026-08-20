package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("student_academic_grade")
public class StudentAcademicGrade {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long syncId;
    private Long studentId;
    private String academicYear;
    private String term;
    private String courseNo;
    private String courseName;
    private String teachingClass;
    private String teacherName;
    private BigDecimal credit;
    private String courseCategory;
    private String courseNature;
    private String scoreText;
    private BigDecimal scoreNumeric;
    private BigDecimal gradePoint;
    private String examType;
    private String offeringCollege;
    private String courseMark;
    private Boolean isPassed;
    private LocalDateTime createTime;
}
