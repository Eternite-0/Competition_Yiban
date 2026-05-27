package com.etsaion.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.util.List;

@Data
public class TeamCreateDTO {
    @NotBlank(message = "团队名称不能为空")
    private String name;

    @NotNull(message = "关联赛事ID不能为空")
    private Long eventId;

    private List<String> requiredRoles; // Roles wanted, will be serialized to JSON
}
