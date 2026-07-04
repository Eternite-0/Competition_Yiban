package com.etsaion.vo;

import java.math.BigDecimal;

public class ComprehensiveScoreVO {
    private Long id;
    private String academicYear;
    private String studentNo;
    private String realName;
    private String college;
    private String major;
    private String grade;
    private String className;
    private BigDecimal moralFinalScore;
    private BigDecimal sportsFinalScore;
    private BigDecimal abilityFinalScore;
    private BigDecimal academicScore;
    private BigDecimal comprehensiveScore;
    private Integer moralRank;
    private BigDecimal moralRankPercent;
    private Integer sportsRank;
    private BigDecimal sportsRankPercent;
    private Integer abilityRank;
    private BigDecimal abilityRankPercent;
    private Integer academicRank;
    private BigDecimal academicRankPercent;
    private Integer comprehensiveRank;
    private BigDecimal comprehensiveRankPercent;
    private Long rankTotal;
    private String rankScope;
    private String sourceFile;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }
    public String getStudentNo() { return studentNo; }
    public void setStudentNo(String studentNo) { this.studentNo = studentNo; }
    public String getRealName() { return realName; }
    public void setRealName(String realName) { this.realName = realName; }
    public String getCollege() { return college; }
    public void setCollege(String college) { this.college = college; }
    public String getMajor() { return major; }
    public void setMajor(String major) { this.major = major; }
    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }
    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }
    public BigDecimal getMoralFinalScore() { return moralFinalScore; }
    public void setMoralFinalScore(BigDecimal moralFinalScore) { this.moralFinalScore = moralFinalScore; }
    public BigDecimal getSportsFinalScore() { return sportsFinalScore; }
    public void setSportsFinalScore(BigDecimal sportsFinalScore) { this.sportsFinalScore = sportsFinalScore; }
    public BigDecimal getAbilityFinalScore() { return abilityFinalScore; }
    public void setAbilityFinalScore(BigDecimal abilityFinalScore) { this.abilityFinalScore = abilityFinalScore; }
    public BigDecimal getAcademicScore() { return academicScore; }
    public void setAcademicScore(BigDecimal academicScore) { this.academicScore = academicScore; }
    public BigDecimal getComprehensiveScore() { return comprehensiveScore; }
    public void setComprehensiveScore(BigDecimal comprehensiveScore) { this.comprehensiveScore = comprehensiveScore; }
    public Integer getMoralRank() { return moralRank; }
    public void setMoralRank(Integer moralRank) { this.moralRank = moralRank; }
    public BigDecimal getMoralRankPercent() { return moralRankPercent; }
    public void setMoralRankPercent(BigDecimal moralRankPercent) { this.moralRankPercent = moralRankPercent; }
    public Integer getSportsRank() { return sportsRank; }
    public void setSportsRank(Integer sportsRank) { this.sportsRank = sportsRank; }
    public BigDecimal getSportsRankPercent() { return sportsRankPercent; }
    public void setSportsRankPercent(BigDecimal sportsRankPercent) { this.sportsRankPercent = sportsRankPercent; }
    public Integer getAbilityRank() { return abilityRank; }
    public void setAbilityRank(Integer abilityRank) { this.abilityRank = abilityRank; }
    public BigDecimal getAbilityRankPercent() { return abilityRankPercent; }
    public void setAbilityRankPercent(BigDecimal abilityRankPercent) { this.abilityRankPercent = abilityRankPercent; }
    public Integer getAcademicRank() { return academicRank; }
    public void setAcademicRank(Integer academicRank) { this.academicRank = academicRank; }
    public BigDecimal getAcademicRankPercent() { return academicRankPercent; }
    public void setAcademicRankPercent(BigDecimal academicRankPercent) { this.academicRankPercent = academicRankPercent; }
    public Integer getComprehensiveRank() { return comprehensiveRank; }
    public void setComprehensiveRank(Integer comprehensiveRank) { this.comprehensiveRank = comprehensiveRank; }
    public BigDecimal getComprehensiveRankPercent() { return comprehensiveRankPercent; }
    public void setComprehensiveRankPercent(BigDecimal comprehensiveRankPercent) { this.comprehensiveRankPercent = comprehensiveRankPercent; }
    public Long getRankTotal() { return rankTotal; }
    public void setRankTotal(Long rankTotal) { this.rankTotal = rankTotal; }
    public String getRankScope() { return rankScope; }
    public void setRankScope(String rankScope) { this.rankScope = rankScope; }
    public String getSourceFile() { return sourceFile; }
    public void setSourceFile(String sourceFile) { this.sourceFile = sourceFile; }
}
