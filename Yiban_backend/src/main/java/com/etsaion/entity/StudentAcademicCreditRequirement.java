package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("student_academic_credit_requirement")
public class StudentAcademicCreditRequirement {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long snapshotId;
    private String requirementCode;
    private String requirementName;
    private BigDecimal requiredCredits;
    private BigDecimal earnedCredits;
    private BigDecimal missingCredits;
    private Integer sortOrder;
    private LocalDateTime createTime;
}
