package com.etsaion.enums;

import java.util.Arrays;

/**
 * 成果状态。
 *
 * 只有"待审核"和"已审核"两态；审核结论由 submission.approved 承载：
 * true=通过，false=驳回，null=退回补充（未定）。
 */
public enum SubmissionStatus {

    PENDING("待审核"),
    REVIEWED("已审核");

    private final String value;

    SubmissionStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static SubmissionStatus from(String value) {
        if (value == null) return null;
        return Arrays.stream(values())
                .filter(s -> s.value.equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElse(null);
    }

    public static boolean isPending(String value) {
        return PENDING == from(value);
    }

    /**
     * 审核动作 → approved 字段。
     * 退回补充是"还没有结论"，因此为 null，而不是 false。
     */
    public static Boolean approvedFlagOf(AuditAction action) {
        switch (action) {
            case APPROVE:
                return Boolean.TRUE;
            case RETURN:
                return null;
            case REJECT:
                return Boolean.FALSE;
            default:
                throw new IllegalArgumentException("未知审核动作: " + action);
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
