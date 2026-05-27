package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("team_post")
public class TeamPost {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long authorId;
    private Long competitionId;
    private String content;
    private String rolesNeeded; // JSON array of roles e.g., ["后端开发", "UI"]
    private LocalDateTime date;
    private String status; // 招募中, 已满员
}
