package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("message")
public class Message {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long fromUser; // 0 for System
    private Long toUser;
    private String title;
    private String content;
    private Integer isRead; // 0=Unread, 1=Read
    private LocalDateTime createTime;
}
