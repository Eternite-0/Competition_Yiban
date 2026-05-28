package com.etsaion.dto;

import com.etsaion.config.FlexibleStringListDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.util.List;

@Data
public class TeamPostCreateDTO {
    @NotNull(message = "关联赛事ID不能为空")
    private Long competitionId;

    @NotBlank(message = "招募招贤公告内容不能为空")
    private String content;

    @JsonDeserialize(using = FlexibleStringListDeserializer.class)
    private List<String> rolesNeeded; // List of roles needed (to be serialized to JSON)
}
