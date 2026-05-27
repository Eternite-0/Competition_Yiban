package com.etsaion.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class TeamApplyDTO {
    @NotNull(message = "团队ID不能为空")
    private Long teamId;

    @NotBlank(message = "申请角色不能为空")
    private String role;

    private String reason;
}
