package com.etsaion.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.TeamApplyDTO;
import com.etsaion.entity.TeamApplication;
import java.util.List;

public interface TeamApplicationService extends IService<TeamApplication> {
    TeamApplication applyToJoin(Long studentId, TeamApplyDTO dto);
    void handleApplication(Long captainId, Long applicationId, String status);
    List<TeamApplication> listApplicationsForTeam(Long captainId, Long teamId);
}
