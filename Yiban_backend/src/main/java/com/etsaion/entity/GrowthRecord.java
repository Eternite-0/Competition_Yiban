package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("growth_record")
public class GrowthRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long studentId;
    private Long competitionId;
    private String recordType; // competition/award/certificate
    private String title;
    private LocalDateTime happenTime;
}
