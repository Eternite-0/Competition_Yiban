package com.etsaion.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeacherGrowthOverviewVO {
    private Integer totalStudents;
    private List<GrowthDimensionVO> averageDimensions = new ArrayList<>();
    private Map<String, Long> activityTypeDistribution = new LinkedHashMap<>();
    private BigDecimal totalVolunteerHours = BigDecimal.ZERO;
    private Integer lowParticipationCount;
    private List<LowParticipationStudentVO> lowParticipationStudents = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowParticipationStudentVO {
        private Long studentId;
        private String studentNo;
        private String studentName;
        private String major;
        private String className;
        private Integer evidenceCount;
    }
}
