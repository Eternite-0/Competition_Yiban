package com.etsaion.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class StudentAcademicSnapshotVO {
    private Long id;
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
    /** 该页面只做平台风险测算，不代表教务处正式毕业审核结论。 */
    private boolean preliminary = true;
    private List<AcademicRiskVO> risks = new ArrayList<>();
    private List<StudentAcademicCourseVO> courses = new ArrayList<>();
}
