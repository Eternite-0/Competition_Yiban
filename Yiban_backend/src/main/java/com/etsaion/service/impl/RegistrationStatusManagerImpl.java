package com.etsaion.service.impl;

import com.etsaion.entity.Registration;
import com.etsaion.enums.AuditAction;
import com.etsaion.enums.RegistrationStatus;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.RegistrationStatusManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class RegistrationStatusManagerImpl implements RegistrationStatusManager {

    @Autowired
    @Lazy
    private RegistrationService registrationService;

    @Override
    public boolean markUnderReview(Registration registration) {
        if (registration == null) {
            throw new BusinessException("报名表不存在");
        }
        if (RegistrationStatus.UNDER_REVIEW == RegistrationStatus.from(registration.getStatus())) {
            return false;
        }
        registration.setStatus(RegistrationStatus.UNDER_REVIEW.getValue());
        registrationService.updateById(registration);
        log.info("报名进入审核中: 报名ID={}", registration.getId());
        return true;
    }

    @Override
    public RegistrationStatus applyAudit(Registration registration, AuditAction action) {
        requireReviewable(registration);

        RegistrationStatus result = RegistrationStatus.resultOf(action);
        registration.setStatus(result.getValue());
        registrationService.updateById(registration);
        log.info("报名审核落定: 报名ID={}, 动作={}, 状态={}", registration.getId(), action, result);
        return result;
    }

    @Override
    public void requireReviewable(Registration registration) {
        if (registration == null) {
            throw new BusinessException("报名表不存在");
        }
        if (!RegistrationStatus.isReviewable(registration.getStatus())) {
            throw new BusinessException("该报名申请已处理完毕");
        }
    }
}
