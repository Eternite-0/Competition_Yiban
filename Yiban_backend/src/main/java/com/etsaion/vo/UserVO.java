package com.etsaion.vo;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UserVO {
    private Long id;
    private String username;
    private String realName;
    private String role;
    private String college;
    private String major;
    private String className;
    private String grade;
    private String comprehensiveAcademicYear;
    private BigDecimal comprehensiveScore;
    private Integer comprehensiveRank;
    private BigDecimal comprehensiveRankPercent;
}
