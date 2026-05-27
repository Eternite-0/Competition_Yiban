package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("team_application")
public class TeamApplication {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long teamId;
    private Long applicantId;
    private String role; // Role requested e.g. "后端开发"
    private String reason; // Application statement
    private String status; // pending/approved/rejected
    private LocalDateTime createTime;
}
