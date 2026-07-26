package com.etsaion.enums;

import java.util.Arrays;

/** 赛事状态。 */
public enum CompetitionStatus {

    /** 草稿，仅管理员可见。 */
    DRAFT("draft"),

    /** 已发布，学生可见可报名。 */
    PUBLISHED("published"),

    /** 已结束。 */
    CLOSED("closed");

    private final String value;

    CompetitionStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CompetitionStatus from(String value) {
        if (value == null) return null;
        return Arrays.stream(values())
                .filter(s -> s.value.equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElse(null);
    }

    public static boolean isPublished(String value) {
        return PUBLISHED == from(value);
    }

    public static boolean isDraft(String value) {
        return DRAFT == from(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
