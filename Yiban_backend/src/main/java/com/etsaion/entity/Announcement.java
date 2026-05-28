package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("announcement")
public class Announcement {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long competitionId;
    private Long stageId;
    private String title;
    private String content;
    private Long authorId;
    private String type;
    private Integer isPinned;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    // Accept both Boolean and Integer from JSON for isPinned
    public void setIsPinned(Object value) {
        if (value instanceof Boolean) {
            this.isPinned = (Boolean) value ? 1 : 0;
        } else if (value instanceof Integer) {
            this.isPinned = (Integer) value;
        } else if (value instanceof Number) {
            this.isPinned = ((Number) value).intValue();
        } else {
            this.isPinned = 0;
        }
    }
}
