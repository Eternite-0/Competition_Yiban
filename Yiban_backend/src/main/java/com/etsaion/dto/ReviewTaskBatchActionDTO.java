package com.etsaion.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.Size;
import java.util.List;

@Data
public class ReviewTaskBatchActionDTO {
    @NotEmpty(message = "待办ID不能为空")
    @Size(max = 50, message = "批量操作不能超过50条")
    private List<Long> taskIds;

    @NotBlank(message = "审核动作不能为空")
    private String action;

    private String reviewNote;
}
