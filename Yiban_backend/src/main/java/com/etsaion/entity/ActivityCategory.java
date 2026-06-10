package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("activity_category")
public class ActivityCategory {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String type; // competition, volunteer, other
    private String code;
    private String name;
    private String icon;
    private Integer sortOrder;
    private String status; // active, disabled
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
