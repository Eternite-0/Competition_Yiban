package com.etsaion.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 教师端学业预警列表项。风险判断仅基于最近一次同步的教务数据，
 * 用于日常跟进，不替代教务处正式毕业审核结论。
 */
@Data
public class TeacherAcademicWarningVO {
    private Long studentId;
    private String username;
    private String realName;
    private String college;
    private String major;
    private String className;
    private String grade;

    private String riskLevel;
    private String riskLabel;
    private BigDecimal gpa;
    private BigDecimal requiredCredits;
    private BigDecimal earnedCredits;
    private BigDecimal missingCredits;
    private Integer failedCourses;
    private Integer missedCourses;
    private Integer inProgressCourses;
    private LocalDateTime syncedAt;
    private List<AcademicRiskVO> risks = new ArrayList<>();
}
