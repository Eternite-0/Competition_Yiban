package com.etsaion.enums;

import com.etsaion.exception.BusinessException;

/**
 * 审核动作。
 *
 * 这三个动作是审核链路唯一的输入。此前"退回补充"没有自己的表示，
 * 而是编码在审核意见的 {@code 【退回补充】} 文本前缀里，判定散落在前后端十余处；
 * 现在它是一等公民。
 */
public enum AuditAction {

    APPROVE("approve"),
    REJECT("reject"),
    RETURN("return");

    private final String value;

    AuditAction(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public boolean isApprove() {
        return this == APPROVE;
    }

    /** 驳回和退回补充都必须写明理由。 */
    public boolean requiresNote() {
        return this == REJECT || this == RETURN;
    }

    /**
     * 解析动作字符串。兼容过去分词形式（approved/rejected/returned），
     * 历史前端与批量接口都传过这种写法。
     */
    public static AuditAction from(String action) {
        if (action == null) {
            throw new BusinessException("不支持的审核动作");
        }
        String normalized = action.trim().toLowerCase();
        switch (normalized) {
            case "approve":
            case "approved":
                return APPROVE;
            case "reject":
            case "rejected":
                return REJECT;
            case "return":
            case "returned":
                return RETURN;
            default:
                throw new BusinessException("不支持的审核动作");
        }
    }

    /**
     * 兼容旧的布尔审核入参：{@code approve=true} 即通过，
     * 否则看审核意见是否带 {@code 【退回补充】} 前缀来区分退回与驳回。
     *
     * 仅供尚未迁移到显式动作的调用方过渡使用。
     */
    public static AuditAction fromLegacy(Boolean approve, String reviewNote) {
        if (Boolean.TRUE.equals(approve)) {
            return APPROVE;
        }
        return ReviewNotes.hasReturnMarker(reviewNote) ? RETURN : REJECT;
    }

    @Override
    public String toString() {
        return value;
    }
}
