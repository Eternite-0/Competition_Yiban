package com.etsaion.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentGrowthVO {
    private Long studentId;
    private RadarData radarData;
    private Integer totalCompetitions;
    private Integer awards;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RadarData {
        private Integer innovation;    // 创新能力
        private Integer engineering;   // 工程实践
        private Integer programming;   // 编程能力
        private Integer writing;       // 文档写作
        private Integer teamwork;      // 团队协作
    }
}
