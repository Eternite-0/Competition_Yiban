package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("submission_student")
public class SubmissionStudent {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long submissionId;
    private Long studentId;
}
