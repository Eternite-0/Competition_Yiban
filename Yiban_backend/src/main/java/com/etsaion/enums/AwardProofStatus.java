package com.etsaion.enums;

import java.util.Arrays;

/**
 * 获奖证明状态。
 *
 * 与其他领域不同，这里用过去分词形式存库（approved 而非 approve），
 * 因此不能直接复用 {@link AuditAction#getValue()}。
 */
public enum AwardProofStatus {

    PENDING("pending"),
    APPROVED("approved"),
    RETURNED("returned"),
    REJECTED("rejected");

    private final String value;

    AwardProofStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static AwardProofStatus from(String value) {
        if (value == null) return null;
        return Arrays.stream(values())
                .filter(s -> s.value.equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElse(null);
    }

    public static boolean isPending(String value) {
        return PENDING == from(value);
    }

    /** 审核动作 → 获奖证明的结果状态。 */
    public static AwardProofStatus resultOf(AuditAction action) {
        switch (action) {
            case APPROVE:
                return APPROVED;
            case RETURN:
                return RETURNED;
            case REJECT:
                return REJECTED;
            default:
                throw new IllegalArgumentException("未知审核动作: " + action);
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
