package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("award_proof_student")
public class AwardProofStudent {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long awardProofId;
    private Long studentId;
    private LocalDateTime createTime;
}
