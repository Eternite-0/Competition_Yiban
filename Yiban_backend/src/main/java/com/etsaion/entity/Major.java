package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("major")
public class Major {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String college;
    private String status; // active/inactive
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
