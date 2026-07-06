package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("activity")
public class Activity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String type; // competition, volunteer, culture_sports, other
    private String title;
    private String level;
    private String category;
    private String organizer;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime activityStart;
    private LocalDateTime activityEnd;
    private Integer maxTeamSize;
    private Integer maxParticipants;
    private String coverUrl;
    private String content;
    private String tags; // JSON array
    private String tracks; // JSON array
    private String location;
    private BigDecimal serviceHours;
    private String status; // draft, published, closed, archived
    private String configJson;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
