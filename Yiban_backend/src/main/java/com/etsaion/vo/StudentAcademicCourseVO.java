package com.etsaion.vo;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class StudentAcademicCourseVO {
    private String requirementGroup;
    private String courseNo;
    private String courseName;
    private BigDecimal credit;
    private String courseStatus;
    private String maxGrade;
    private BigDecimal gradePoint;
    private Boolean needsAttention;
}
