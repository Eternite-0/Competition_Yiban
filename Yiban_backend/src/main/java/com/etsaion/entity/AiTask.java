package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("ai_task")
public class AiTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String taskType;
    private String status;
    private String sourceType;
    private String sourceUrl;
    private String sourceHash;
    private Long requesterId;
    private String requesterRole;
    private String promptVersion;
    private String modelName;
    private BigDecimal confidence;
    private String rawResultJson;
    private String resultJson;
    private String errorMessage;
    private LocalDateTime startTime;
    private LocalDateTime finishTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
