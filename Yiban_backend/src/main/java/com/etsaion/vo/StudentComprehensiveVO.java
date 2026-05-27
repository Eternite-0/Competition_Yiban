package com.etsaion.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentComprehensiveVO {
    private String realName;
    private String username; // 学号
    private String college;
    private String major;
    private String className;
    private Integer participationCount; // 参赛次数
    private Double comprehensiveScore; // 综测分数
}
