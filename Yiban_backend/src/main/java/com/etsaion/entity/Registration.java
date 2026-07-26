package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("registration")
public class Registration {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long competitionId;
    private Long studentId;
    private String teamName; // Name of their team, null for individual signup
    private String track;
    private String memberStudentIds; // JSON array of student ids
    private String status; // 取值见 RegistrationStatus
    private LocalDateTime submitDate;
}
