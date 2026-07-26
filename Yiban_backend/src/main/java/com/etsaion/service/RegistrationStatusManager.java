package com.etsaion.service;

import com.etsaion.entity.Registration;
import com.etsaion.enums.AuditAction;
import com.etsaion.enums.RegistrationStatus;

/**
 * 报名状态的唯一写入方。
 *
 * 此前 registration.status 有四个写入点，分散在报名服务和成果服务里
 * （成果服务会反手改报名表），三分支流转被完整复制了两遍，
 * 两个服务还因此 {@code @Lazy} 循环依赖。状态机没有主人，
 * 于是出现了"另一条路径已经把报名审掉、待办却还挂着"这类只能靠打补丁兜的场景。
 *
 * 现在所有状态变更都从这里走，转换的合法性也在这里校验。
 */
public interface RegistrationStatusManager {

    /**
     * 学生上传成果后，报名进入审核中。
     *
     * @return 是否真的发生了状态变更（已经在审核中则不变）
     */
    boolean markUnderReview(Registration registration);

    /**
     * 应用审核结论。
     *
     * @param registration 目标报名，调用方需保证非空
     * @param action       审核动作
     * @return 落定后的状态
     */
    RegistrationStatus applyAudit(Registration registration, AuditAction action);

    /**
     * 校验报名是否处在可审核状态，否则抛业务异常。
     */
    void requireReviewable(Registration registration);
}
