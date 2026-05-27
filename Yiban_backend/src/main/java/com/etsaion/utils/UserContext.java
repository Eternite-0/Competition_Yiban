package com.etsaion.utils;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class UserContext {
    private static final ThreadLocal<UserInfo> THREAD_LOCAL = new ThreadLocal<>();

    public static void set(UserInfo userInfo) {
        THREAD_LOCAL.set(userInfo);
    }

    public static UserInfo get() {
        return THREAD_LOCAL.get();
    }

    public static Long getUserId() {
        UserInfo userInfo = THREAD_LOCAL.get();
        return userInfo != null ? userInfo.getUserId() : null;
    }

    public static String getUserRole() {
        UserInfo userInfo = THREAD_LOCAL.get();
        return userInfo != null ? userInfo.getRole() : null;
    }

    public static void remove() {
        THREAD_LOCAL.remove();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long userId;
        private String role;
    }
}
