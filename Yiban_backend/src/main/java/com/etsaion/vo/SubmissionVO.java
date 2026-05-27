package com.etsaion.vo;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class SubmissionVO {
    private Long id;
    private Long registrationId;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private LocalDateTime uploadDate;
    private String status; // 待审核 / 已审核
    private String reviewNote;
    private Boolean approved; // 审核通过=true, 驳回=false, 未审核=null
    private Boolean displayed;

    // joined fields
    private Long studentId;
    private String studentName;
    private String studentNo;
    private String college;
    private String major;
    private String className;

    private Long competitionId;
    private String competitionName;
    private String competitionLevel;
    private String competitionCategory;
    private List<String> competitionTags;

    // submitter info
    private Long submitterId;
    private String submitterName;

    // team members associated with this submission
    private List<TeamMemberVO> teamMembers;

    @Data
    public static class TeamMemberVO {
        private Long studentId;
        private String studentName;
        private String studentNo;
    }
}
