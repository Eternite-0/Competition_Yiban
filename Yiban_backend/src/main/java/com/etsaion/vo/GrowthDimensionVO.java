package com.etsaion.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GrowthDimensionVO {
    private String key;
    private String label;
    private Integer score;
    private Integer maxScore;
    private Integer evidenceCount;
    private String summary;
}
