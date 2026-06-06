package com.etsaion.dto.ai;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class AwardProofReviewDTO {
    @NotNull(message = "获奖证明 ID 不能为空")
    private Long id;
    @NotBlank(message = "审核动作不能为空")
    private String action;
    private String reviewNote;
}
