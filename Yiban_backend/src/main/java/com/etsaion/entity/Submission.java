package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("submission")
public class Submission {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long registrationId;
    private Long competitionId;
    private Long submitterId; // the student who actually uploaded
    private String fileName;
    private String fileUrl;
    private Long fileSize; // Bytes
    private LocalDateTime uploadDate;
    private String status; // 待审核, 已审核
    private String reviewNote; // 教师评语
    private Boolean approved; // 已审核时 true=通过, false=驳回; 待审核为 null
    private Boolean displayed; // 是否展示在优秀作品墙
}
