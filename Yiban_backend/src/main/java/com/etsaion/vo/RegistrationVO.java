package com.etsaion.vo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RegistrationVO {
    private Long id;
    private Long competitionId;
    private String competitionName;
    private String competitionLevel;
    private String competitionCategory;
    private Long studentId;
    private String studentName;
    private String studentNo;
    private String college;
    private String major;
    private String className;
    private String teamName;
    private String status;
    private LocalDateTime submitDate;

    // submission attachment (latest submission for this registration)
    private String fileName;
    private String fileUrl;
    private Long fileSize;

    // review feedback from teacher
    private String reviewNote;
    private Boolean approved;
}
