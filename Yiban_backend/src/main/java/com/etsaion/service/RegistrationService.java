package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.RegistrationSubmitDTO;
import com.etsaion.entity.Registration;
import com.etsaion.enums.AuditAction;
import com.etsaion.vo.RegistrationVO;

import java.util.List;

public interface RegistrationService extends IService<Registration> {
    Registration submitRegistration(Long studentId, RegistrationSubmitDTO dto);
    List<RegistrationVO> getMyList(Long studentId);
    Page<RegistrationVO> getPendingAuditPage(int current, int size);

    /**
     * 审核报名。
     *
     * @param reviewNote 审核意见纯文本，不含任何状态标记
     */
    void audit(Long id, Long teacherId, AuditAction action, String reviewNote);

    List<RegistrationVO> toVOList(List<Registration> regs);
    Page<RegistrationVO> toVOPage(Page<Registration> page);
}
