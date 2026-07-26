package com.etsaion.enums;

import java.util.Arrays;

/** 待办指向的业务对象类型。 */
public enum ReviewTargetType {

    REGISTRATION("registration"),
    SUBMISSION("submission"),
    PARTICIPATION("participation");

    private final String value;

    ReviewTargetType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static ReviewTargetType from(String value) {
        if (value == null) return null;
        return Arrays.stream(values())
                .filter(t -> t.value.equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElse(null);
    }

    public boolean matches(String value) {
        return this.value.equalsIgnoreCase(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
