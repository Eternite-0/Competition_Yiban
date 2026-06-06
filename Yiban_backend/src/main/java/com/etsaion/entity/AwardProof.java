package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("award_proof")
public class AwardProof {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long aiTaskId;
    private Long submitterId;
    private Long competitionId;
    private String competitionName;
    private String awardLevel;
    private LocalDateTime awardTime;
    private String organizer;
    private String winnerName;
    private String certificateNo;
    private String sealText;
    private String fileName;
    private String fileUrl;
    private String fileHash;
    private BigDecimal confidence;
    private String fieldConfidenceJson;
    private String evidenceJson;
    private String riskFlagsJson;
    private String status;
    private String reviewNote;
    private Long reviewerId;
    private LocalDateTime reviewTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
