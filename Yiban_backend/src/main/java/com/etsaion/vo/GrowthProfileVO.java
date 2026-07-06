package com.etsaion.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GrowthProfileVO {
    private Long studentId;
    private List<GrowthDimensionVO> dimensions = new ArrayList<>();
    private Integer totalCompetitions;
    private Integer totalAwards;
    private Integer totalActivities;
    private BigDecimal totalVolunteerHours;
    private Integer totalCultureSports;
    private List<GrowthTimelineItemVO> timeline = new ArrayList<>();
    private List<String> suggestions = new ArrayList<>();
}
