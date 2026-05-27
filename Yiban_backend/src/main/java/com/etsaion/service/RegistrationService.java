package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.RegistrationSubmitDTO;
import com.etsaion.entity.Registration;
import com.etsaion.vo.RegistrationVO;

import java.util.List;

public interface RegistrationService extends IService<Registration> {
    Registration submitRegistration(Long studentId, RegistrationSubmitDTO dto);
    List<RegistrationVO> getMyList(Long studentId);
    Page<RegistrationVO> getPendingAuditPage(int current, int size);
    void audit(Long id, Long teacherId, Boolean approve, String reviewNote);

    List<RegistrationVO> toVOList(List<Registration> regs);
    Page<RegistrationVO> toVOPage(Page<Registration> page);
}
