package com.etsaion.enums;

import java.util.Arrays;

/** 活动参与状态。与报名不同，这一组用英文值存库。 */
public enum ParticipationStatus {

    SUBMITTED("submitted"),
    IN_REVIEW("in_review"),
    APPROVED("approved"),
    RETURNED("returned"),
    REJECTED("rejected"),
    CANCELLED("cancelled");

    private final String value;

    ParticipationStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static ParticipationStatus from(String value) {
        if (value == null) return null;
        return Arrays.stream(values())
                .filter(s -> s.value.equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElse(null);
    }

    /** 审核动作 → 参与记录的结果状态。 */
    public static ParticipationStatus resultOf(AuditAction action) {
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
