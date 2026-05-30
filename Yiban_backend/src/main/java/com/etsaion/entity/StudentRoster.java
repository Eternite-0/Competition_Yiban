package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("student_roster")
public class StudentRoster {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String studentNo;
    private String realName;
    private String college;
    private Long majorId;
    private Long classId;
    private String grade;
    private String status; // pending(未注册)/registered(已注册)
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
