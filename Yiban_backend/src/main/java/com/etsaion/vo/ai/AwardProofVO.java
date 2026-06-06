package com.etsaion.vo.ai;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AwardProofVO {
    private Long id;
    private Long aiTaskId;
    private Long submitterId;
    private String submitterName;
    private String submitterNo;
    private String college;
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
    private List<TeamMemberVO> students;

    @Data
    public static class TeamMemberVO {
        private Long studentId;
        private String studentName;
        private String studentNo;
        private String college;
        private String major;
        private String className;
    }
}
