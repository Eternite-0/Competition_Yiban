package com.etsaion.enums;

import java.util.Arrays;
import java.util.List;

/**
 * 报名状态。
 *
 * 数据库 registration.status 存的是这些中文值本身，枚举只是给它们一个类型；
 * 读写数据库时用 {@link #getValue()} / {@link #from(String)} 转换。
 */
public enum RegistrationStatus {

    /** 学生已提交报名，等待审核。 */
    SUBMITTED("已提交"),

    /** 学生已上传成果，报名连同成果一起等待审核。 */
    UNDER_REVIEW("审核中"),

    /** 审核通过，报名生效。 */
    APPROVED("审核通过"),

    /** 材料不全被退回，学生可以补充后重新提交——这是独立状态，不是驳回的子类。 */
    RETURNED("退回补充"),

    /** 审核驳回，流程终止。 */
    REJECTED("审核驳回");

    private final String value;

    RegistrationStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /** 可被审核的状态：只有处在这两个状态的报名才能接受审核动作。 */
    public static final List<RegistrationStatus> REVIEWABLE = List.of(SUBMITTED, UNDER_REVIEW);

    /** 允许学生上传成果的状态。退回补充也在内，学生正是要靠上传来补齐材料。 */
    public static final List<RegistrationStatus> ACCEPTS_SUBMISSION = List.of(SUBMITTED, APPROVED, RETURNED);

    /** 已终结的状态：报名已有结论，不再占用待办。 */
    public static final List<RegistrationStatus> TERMINAL = List.of(APPROVED, RETURNED, REJECTED);

    public boolean isReviewable() {
        return REVIEWABLE.contains(this);
    }

    public boolean acceptsSubmission() {
        return ACCEPTS_SUBMISSION.contains(this);
    }

    public boolean isTerminal() {
        return TERMINAL.contains(this);
    }

    /** 数据库值 → 枚举，无法识别时返回 null（历史数据可能有本枚举未覆盖的值）。 */
    public static RegistrationStatus from(String value) {
        if (value == null) return null;
        return Arrays.stream(values())
                .filter(s -> s.value.equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElse(null);
    }

    public static boolean isReviewable(String value) {
        RegistrationStatus status = from(value);
        return status != null && status.isReviewable();
    }

    public static boolean acceptsSubmission(String value) {
        RegistrationStatus status = from(value);
        return status != null && status.acceptsSubmission();
    }

    /** 审核动作 → 报名的结果状态。 */
    public static RegistrationStatus resultOf(AuditAction action) {
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

    public static List<String> valuesOf(List<RegistrationStatus> statuses) {
        return statuses.stream().map(RegistrationStatus::getValue).collect(java.util.stream.Collectors.toList());
    }

    @Override
    public String toString() {
        return value;
    }
}
