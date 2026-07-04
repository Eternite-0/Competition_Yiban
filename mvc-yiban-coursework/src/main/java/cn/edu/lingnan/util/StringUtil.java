package cn.edu.lingnan.util;

/**
 * 字符串工具类，避免 servlet 中出现重复的空值判断代码。
 */
public class StringUtil {
    private StringUtil() {
    }

    public static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    public static String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    public static int parseInt(String value, int defaultValue) {
        if (isBlank(value)) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
