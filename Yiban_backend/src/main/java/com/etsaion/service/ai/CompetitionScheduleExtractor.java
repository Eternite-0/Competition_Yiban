package com.etsaion.service.ai;

import cn.hutool.core.util.StrUtil;
import com.etsaion.utils.DateTextUtil;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 从赛事通知原文里读出报名与比赛的时间窗口。
 *
 * 通知的写法五花八门——"报名时间：2026年3月1日—3月31日"、"作品提交截止：4月10日"、
 * "全国选拔赛时间：2026年5月中旬"——模型未必都能抽准，这里用规则兜一道底。
 * 从 {@code AiCompetitionDraftServiceImpl} 拆出，那里这套正则与它的近百个
 * 其他私有方法混在一起。
 */
@Component
public class CompetitionScheduleExtractor {

    public static final DateTimeFormatter NORMALIZED_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /** 一个日期时间的写法，供下面几个模式复用。 */
    private static final String DATE_TIME_TOKEN =
            "(?:(?:20\\d{2})\\s*年\\s*)?\\d{1,2}\\s*月\\s*\\d{1,2}\\s*日(?:\\s*\\d{1,2}(?:[:：]\\d{2}){0,2})?";

    private static final Pattern DATE_TIME_PATTERN = Pattern.compile(
            "(?:(20\\d{2})\\s*年\\s*)?(\\d{1,2})\\s*月\\s*(\\d{1,2})\\s*日(?:\\s*(\\d{1,2})(?:[:：](\\d{2}))?(?:[:：](\\d{2}))?)?");

    /** 「报名时间：X 至 Y」 */
    private static final Pattern REGISTRATION_RANGE_PATTERN = Pattern.compile(
            "([^\\n。；;]{0,120}?(?:报名|提交作品)[^\\n。；;]{0,80}?)[:：]?\\s*("
                    + DATE_TIME_TOKEN + ")\\s*(?:—|–|-|至|到|~|～)\\s*(" + DATE_TIME_TOKEN + ")");

    /** 「作品提交截止：X」——只有截止点，没有区间 */
    private static final Pattern SUBMISSION_DEADLINE_PATTERN = Pattern.compile(
            "([^\\n。；;]{0,120}?(?:提交作品截止|作品提交截止)[^\\n。；;]{0,40}?)[:：]?\\s*(" + DATE_TIME_TOKEN + ")");

    /** 「决赛时间：2026年5月中旬」——精确到旬 */
    private static final Pattern APPROX_COMPETITION_TIME_PATTERN = Pattern.compile(
            "([^\\n。；;]{0,60}?(?:选拔赛|决赛|总决赛|比赛|竞赛)[^\\n。；;]{0,30}?时间)\\s*[:：]?\\s*(20\\d{2})"
                    + "\\s*年\\s*(\\d{1,2})\\s*月\\s*(中上旬|上旬|中旬|下旬)?(?!\\s*\\d{1,2}\\s*日)");

    /** 报名窗口。 */
    public List<TimeWindow> extractRegistrationWindows(String sourceText) {
        List<TimeWindow> windows = new ArrayList<>();
        if (StrUtil.isBlank(sourceText)) {
            return windows;
        }

        Matcher matcher = REGISTRATION_RANGE_PATTERN.matcher(sourceText);
        while (matcher.find()) {
            LocalDateTime start = parseDateTime(matcher.group(2), null, false);
            // 「3月1日—3月31日」里结束时间常常省略年份，沿用开始时间的
            Integer startYear = start == null ? null : start.getYear();
            LocalDateTime end = parseDateTime(matcher.group(3), startYear, true);
            if (start == null || end == null) continue;
            windows.add(new TimeWindow(registrationStageName(matcher.group(1), windows.size() + 1),
                    start, end, matcher.group(0)));
        }

        Matcher deadlineMatcher = SUBMISSION_DEADLINE_PATTERN.matcher(sourceText);
        while (deadlineMatcher.find()) {
            if (!deadlineMatcher.group(1).contains("提交作品截止")) continue;
            LocalDateTime deadline = parseDateTime(deadlineMatcher.group(2), null, true);
            if (deadline == null) continue;
            // 只有截止点时，起止取同一时刻
            windows.add(new TimeWindow(registrationStageName(deadlineMatcher.group(1), windows.size() + 1),
                    deadline, deadline, deadlineMatcher.group(0)));
        }
        return dedupe(windows);
    }

    /** 只写到某月某旬的比赛时间。 */
    public List<TimeWindow> extractApproximateCompetitionWindows(String sourceText) {
        List<TimeWindow> windows = new ArrayList<>();
        if (StrUtil.isBlank(sourceText)) {
            return windows;
        }
        Matcher matcher = APPROX_COMPETITION_TIME_PATTERN.matcher(sourceText);
        while (matcher.find()) {
            TimeWindow window = approximateMonthWindow(
                    competitionStageName(matcher.group(1)),
                    Integer.parseInt(matcher.group(2)),
                    Integer.parseInt(matcher.group(3)),
                    StrUtil.blankToDefault(matcher.group(4), ""),
                    matcher.group(0));
            if (window != null) {
                windows.add(window);
            }
        }
        return dedupe(windows);
    }

    /** 把"某月上旬/中旬/下旬"落成具体的起止日。 */
    public TimeWindow approximateMonthWindow(String name, int year, int month, String qualifier, String source) {
        if (month < 1 || month > 12) {
            return null;
        }
        int startDay = 1;
        int endDay = YearMonth.of(year, month).lengthOfMonth();
        if ("上旬".equals(qualifier)) {
            endDay = 10;
        } else if ("中旬".equals(qualifier)) {
            startDay = 11;
            endDay = 20;
        } else if ("下旬".equals(qualifier)) {
            startDay = 21;
        } else if ("中上旬".equals(qualifier)) {
            endDay = 20;
        }
        return new TimeWindow(name,
                LocalDateTime.of(LocalDate.of(year, month, startDay), LocalTime.MIN),
                LocalDateTime.of(LocalDate.of(year, month, endDay), LocalTime.of(23, 59, 59)),
                source);
    }

    /**
     * 解析一个日期时间片段。
     *
     * @param fallbackYear              原文省略年份时采用的年份
     * @param endOfDayWhenTimeMissing   没写时刻的，按当天结束还是开始算
     */
    LocalDateTime parseDateTime(String raw, Integer fallbackYear, boolean endOfDayWhenTimeMissing) {
        Matcher matcher = DATE_TIME_PATTERN.matcher(StrUtil.blankToDefault(raw, ""));
        if (!matcher.find()) {
            return DateTextUtil.parseFlexibleDateTime(raw);
        }
        int year = matcher.group(1) != null
                ? Integer.parseInt(matcher.group(1))
                : (fallbackYear == null ? 0 : fallbackYear);
        if (year == 0) {
            return null;
        }
        int month = Integer.parseInt(matcher.group(2));
        int day = Integer.parseInt(matcher.group(3));
        boolean hasHour = matcher.group(4) != null;
        int hour = hasHour ? Integer.parseInt(matcher.group(4)) : (endOfDayWhenTimeMissing ? 23 : 0);
        int minute = matcher.group(5) == null
                ? (endOfDayWhenTimeMissing && !hasHour ? 59 : 0) : Integer.parseInt(matcher.group(5));
        int second = matcher.group(6) == null
                ? (endOfDayWhenTimeMissing && !hasHour ? 59 : 0) : Integer.parseInt(matcher.group(6));
        return LocalDateTime.of(year, month, day, hour, minute, second);
    }

    /** 从匹配到的上下文里提炼阶段名，提炼不出就按序号命名。 */
    String registrationStageName(String rawContext, int order) {
        String context = StrUtil.blankToDefault(rawContext, "")
                .replaceAll(".*[（(]\\d+[）)]", "")
                .replaceAll("^[\\s\\d.、]+", "")
                .replace("全国选拔赛报名时间", "")
                .replace("报名及提交作品时间", "报名及提交作品")
                .replace("报名时间", "报名")
                .replaceAll("\\s+", "")
                .trim();
        if (StrUtil.isBlank(context) || context.length() > 40) {
            return "报名窗口" + order;
        }
        return context;
    }

    String competitionStageName(String rawContext) {
        String context = StrUtil.blankToDefault(rawContext, "");
        if (context.contains("选拔赛")) return "全国选拔赛";
        if (context.contains("总决赛") || context.contains("决赛")) return "全国总决赛";
        return StrUtil.blankToDefault(context.replace("时间", "").replaceAll("\\s+", "").trim(), "比赛阶段");
    }

    private List<TimeWindow> dedupe(List<TimeWindow> windows) {
        List<TimeWindow> result = new ArrayList<>();
        for (TimeWindow window : windows) {
            boolean duplicate = result.stream().anyMatch(item ->
                    item.getName().equals(window.getName())
                            && item.getStart().equals(window.getStart())
                            && item.getEnd().equals(window.getEnd()));
            if (!duplicate) {
                result.add(window);
            }
        }
        return result;
    }

    public static String formatTime(LocalDateTime time) {
        return time == null ? "" : time.format(NORMALIZED_TIME_FORMATTER);
    }

    /** 一个带出处的时间窗口。出处会作为证据留在草稿里，供人工核验。 */
    public static final class TimeWindow {
        private final String name;
        private final LocalDateTime start;
        private final LocalDateTime end;
        private final String source;

        public TimeWindow(String name, LocalDateTime start, LocalDateTime end, String source) {
            this.name = StrUtil.blankToDefault(name, "阶段");
            this.start = start;
            this.end = end;
            this.source = StrUtil.blankToDefault(source, "").replaceAll("\\s+", " ").trim();
        }

        public String getName() {
            return name;
        }

        public LocalDateTime getStart() {
            return start;
        }

        public LocalDateTime getEnd() {
            return end;
        }

        public String getSource() {
            return source;
        }

        public String evidenceText() {
            return name + "：" + formatTime(start) + " 至 " + formatTime(end) + "（" + source + "）";
        }
    }
}
