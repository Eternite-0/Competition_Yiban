package com.etsaion.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class ReviewDTO {
    @NotNull(message = "成果ID不能为空")
    private Long achievementId;

    @NotBlank(message = "审核状态不能为空")
    private String status; // approved / rejected

    private String comment; // review feedback comments
}
