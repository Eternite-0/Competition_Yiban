package com.etsaion.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.util.List;

@Data
public class RegistrationSubmitDTO {
    @NotNull(message = "赛事ID不能为空")
    private Long competitionId;

    @NotBlank(message = "队伍名称不能为空")
    private String teamName; // Name of their team, null for individual signup
    private String track;
    private List<Long> memberStudentIds;
}
