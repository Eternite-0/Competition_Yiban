package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("competition")
public class Competition {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String level; // 国家级/省级/校级/院级
    private String category;
    private LocalDateTime startTime; // 报名开始
    private LocalDateTime endTime; // 报名截止
    private LocalDateTime competitionStart;
    private LocalDateTime competitionEnd;
    private Integer maxTeamSize;
    private String coverUrl;
    private String sourceUrl; // 赛事官网/公告链接
    private String content; // 富文本赛事简介/要求
    private String organizer; // 主办单位
    private String tags; // JSON-encoded array of tag strings, e.g. ["AI","学科竞赛"]
    private String tracks; // JSON-encoded array of track strings, e.g. ["软件开发","AI大模型"]
    private String status; // draft/published/closed

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
