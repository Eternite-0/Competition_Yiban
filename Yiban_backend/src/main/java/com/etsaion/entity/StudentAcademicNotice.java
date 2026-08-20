package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("student_academic_notice")
public class StudentAcademicNotice {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long syncId;
    private Long studentId;
    private String sourceNoticeId;
    private String noticeType;
    private String title;
    private String content;
    private LocalDateTime publishedAt;
    private Boolean isRead;
    private LocalDateTime createTime;
}
