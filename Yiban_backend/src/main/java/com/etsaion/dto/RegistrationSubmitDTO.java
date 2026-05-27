package com.etsaion.dto;

import lombok.Data;
import javax.validation.constraints.NotNull;
import java.util.List;

@Data
public class RegistrationSubmitDTO {
    @NotNull(message = "赛事ID不能为空")
    private Long competitionId;

    private String teamName; // Name of their team, null for individual signup
    private String track;
    private List<Long> memberStudentIds;
}
