package com.etsaion.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotEmpty;
import java.util.List;

@Data
public class ReviewTaskBatchActionDTO {
    @NotEmpty(message = "待办ID不能为空")
    private List<Long> taskIds;

    @NotBlank(message = "审核动作不能为空")
    private String action;

    private String reviewNote;
}
