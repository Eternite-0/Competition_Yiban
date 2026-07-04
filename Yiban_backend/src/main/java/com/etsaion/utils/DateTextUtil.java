package com.etsaion.utils;

import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class DateTextUtil {
    private static final List<DateTimeFormatter> DATE_TIME_FORMATTERS = List.of(
            formatter("uuuu-MM-dd HH:mm:ss"),
            formatter("uuuu-MM-dd HH:mm"),
            formatter("uuuu/M/d HH:mm:ss"),
            formatter("uuuu/M/d HH:mm"),
            formatter("uuuu.M.d HH:mm:ss"),
            formatter("uuuu.M.d HH:mm"),
            formatter("uuuu年M月d日 HH:mm:ss"),
            formatter("uuuu年M月d日 HH:mm"),
            formatter("uuuu年M月d日H:mm:ss"),
            formatter("uuuu年M月d日H:mm"),
            formatter("uuuu年M月d日 HH时mm分"),
            formatter("uuuu年M月d日HH时mm分"),
            formatter("uuuu年M月d日 HH时"),
            formatter("uuuu年M月d日HH时")
    );

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            formatter("uuuu-MM-dd"),
            formatter("uuuu/M/d"),
            formatter("uuuu.M.d"),
            formatter("uuuu年M月d日"),
            englishFormatter("MMMM d, uuuu"),
            englishFormatter("MMM d, uuuu"),
            englishFormatter("d MMMM uuuu"),
            englishFormatter("d MMM uuuu")
    );

    private static final Pattern[] DATE_PATTERNS = new Pattern[]{
            Pattern.compile("\\d{4}-\\d{1,2}-\\d{1,2}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?"),
            Pattern.compile("\\d{4}/\\d{1,2}/\\d{1,2}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?"),
            Pattern.compile("\\d{4}\\.\\d{1,2}\\.\\d{1,2}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?"),
            Pattern.compile("\\d{4}年\\d{1,2}月\\d{1,2}日(?:\\s*\\d{1,2}(?:[:：]\\d{2})?(?:[:：]\\d{2})?)?(?:时(?:\\d{1,2}分?)?)?"),
            Pattern.compile("(?i)(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4}"),
            Pattern.compile("(?i)\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{4}")
    };

    private DateTextUtil() {
    }

    public static LocalDateTime parseFlexibleDateTime(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String text = cleanup(raw);
        LocalDateTime direct = parseExact(text);
        if (direct != null) {
            return direct;
        }
        for (String candidate : extractDateCandidates(text)) {
            LocalDateTime parsed = parseExact(candidate);
            if (parsed != null) {
                return parsed;
            }
        }
        return null;
    }

    public static List<String> extractDateCandidates(String raw) {
        List<String> result = new ArrayList<>();
        if (!StringUtils.hasText(raw)) {
            return result;
        }
        String text = cleanup(raw);
        for (Pattern pattern : DATE_PATTERNS) {
            Matcher matcher = pattern.matcher(text);
            while (matcher.find()) {
                String candidate = cleanup(matcher.group());
                if (StringUtils.hasText(candidate) && !result.contains(candidate)) {
                    result.add(candidate);
                }
            }
        }
        return result;
    }

    private static LocalDateTime parseExact(String text) {
        String normalized = text.replace('：', ':')
                .replaceAll("\\s+", " ")
                .replaceAll("(?i)Sept\\.", "Sep")
                .replaceAll("(?i)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\.", "$1")
                .trim();
        for (DateTimeFormatter formatter : DATE_TIME_FORMATTERS) {
            try {
                return LocalDateTime.parse(normalized, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(normalized, formatter).atStartOfDay();
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private static String cleanup(String text) {
        return text == null ? "" : text
                .replaceAll("(\\d)\\s+(?=年|月|日)", "$1")
                .replaceAll("(?<=年|月|日)\\s+(?=\\d)", "")
                .replace("截至", "")
                .replace("截止至", "")
                .replace("报名截止时间", "")
                .replace("报名开始时间", "")
                .replace("比赛开始时间", "")
                .replace("比赛结束时间", "")
                .replaceAll("[：:，,；;。]+$", "")
                .trim();
    }

    private static DateTimeFormatter formatter(String pattern) {
        return new DateTimeFormatterBuilder()
                .parseCaseInsensitive()
                .appendPattern(pattern)
                .toFormatter(Locale.CHINA)
                .withResolverStyle(ResolverStyle.STRICT);
    }

    private static DateTimeFormatter englishFormatter(String pattern) {
        return new DateTimeFormatterBuilder()
                .parseCaseInsensitive()
                .appendPattern(pattern)
                .toFormatter(Locale.ENGLISH)
                .withResolverStyle(ResolverStyle.STRICT);
    }
}
