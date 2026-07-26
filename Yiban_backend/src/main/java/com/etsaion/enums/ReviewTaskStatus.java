package com.etsaion.enums;

import java.util.Arrays;
import java.util.List;

/** 统一待办的状态。 */
public enum ReviewTaskStatus {

    PENDING("pending"),
    PROCESSING("processing"),
    RESOLVED("resolved");

    private final String value;

    ReviewTaskStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /** 尚未结案的状态：这两种待办才能被处理。 */
    public static final List<String> OPEN = List.of(PENDING.value, PROCESSING.value);

    public static ReviewTaskStatus from(String value) {
        if (value == null) return null;
        return Arrays.stream(values())
                .filter(s -> s.value.equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElse(null);
    }

    public static boolean isOpen(String value) {
        ReviewTaskStatus status = from(value);
        return status == PENDING || status == PROCESSING;
    }

    @Override
    public String toString() {
        return value;
    }
}
