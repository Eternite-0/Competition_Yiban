package com.etsaion.dto;

import com.etsaion.enums.AuditAction;
import lombok.Data;

/**
 * 审核请求。
 *
 * 优先读 {@link #action}；缺省时回落到 {@link #approve} + 审核意见前缀的旧约定，
 * 以兼容尚未升级的调用方。
 */
@Data
public class AuditDTO {

    /** approve / reject / return。 */
    private String action;

    /** 旧字段：true 通过，false 驳回；"退回补充"靠审核意见的前缀区分。 */
    private Boolean approve;

    /** 驳回理由或评语。 */
    private String reviewNote;

    public AuditAction resolveAction() {
        return action != null && !action.isBlank()
                ? AuditAction.from(action)
                : AuditAction.fromLegacy(approve, reviewNote);
    }
}
