package com.etsaion;

import com.etsaion.service.ai.CompetitionScheduleExtractor;
import com.etsaion.service.ai.CompetitionScheduleExtractor.TimeWindow;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 赛事通知里各种时间写法的解析契约。 */
class CompetitionScheduleExtractorTest {

    private final CompetitionScheduleExtractor extractor = new CompetitionScheduleExtractor();

    @Test
    void registrationRangeIsReadAsAWindow() {
        List<TimeWindow> windows = extractor.extractRegistrationWindows(
                "报名时间：2026年3月1日 至 2026年3月31日");

        assertEquals(1, windows.size());
        assertEquals(LocalDateTime.of(2026, 3, 1, 0, 0, 0), windows.get(0).getStart());
        // 只写到日的结束时间按当天最后一刻算，否则截止当天会被排除在外
        assertEquals(LocalDateTime.of(2026, 3, 31, 23, 59, 59), windows.get(0).getEnd());
    }

    @Test
    void endDateInheritsTheYearWhenOmitted() {
        List<TimeWindow> windows = extractor.extractRegistrationWindows(
                "报名时间：2026年3月1日—3月31日");

        assertEquals(1, windows.size());
        assertEquals(2026, windows.get(0).getEnd().getYear());
    }

    @Test
    void explicitClockTimeIsPreserved() {
        List<TimeWindow> windows = extractor.extractRegistrationWindows(
                "报名时间：2026年3月1日 09:00 至 2026年3月31日 18:00");

        assertEquals(LocalDateTime.of(2026, 3, 1, 9, 0, 0), windows.get(0).getStart());
        assertEquals(LocalDateTime.of(2026, 3, 31, 18, 0, 0), windows.get(0).getEnd());
    }

    @Test
    void aSubmissionDeadlineBecomesAnInstantaneousWindow() {
        List<TimeWindow> windows = extractor.extractRegistrationWindows(
                "提交作品截止：2026年4月10日");

        assertEquals(1, windows.size());
        assertEquals(windows.get(0).getStart(), windows.get(0).getEnd());
        assertEquals(LocalDateTime.of(2026, 4, 10, 23, 59, 59), windows.get(0).getEnd());
    }

    @Test
    void theReversedWordingOfTheDeadlineIsCurrentlyIgnored() {
        // 正则接受"提交作品截止"和"作品提交截止"两种语序，但随后的判断只放行前者，
        // 所以后一种写法会被匹配到又丢弃。这是既有行为，此处仅作记录，
        // 改动它会影响已抓取通知的解析结果，应作为单独的决定。
        assertTrue(extractor.extractRegistrationWindows("作品提交截止：2026年4月10日").isEmpty());
    }

    @Test
    void identicalWindowsAreCollapsed() {
        List<TimeWindow> windows = extractor.extractRegistrationWindows(
                "报名时间：2026年3月1日 至 2026年3月31日。报名时间：2026年3月1日 至 2026年3月31日");

        assertEquals(1, windows.size());
    }

    @Test
    void noTimesMeansNoWindows() {
        assertTrue(extractor.extractRegistrationWindows("本次比赛面向全体在校生").isEmpty());
        assertTrue(extractor.extractRegistrationWindows(null).isEmpty());
    }

    // ==================== 精确到旬的比赛时间 ====================

    @Test
    void earlyMonthCoversTheFirstTenDays() {
        TimeWindow window = extractor.approximateMonthWindow("决赛", 2026, 5, "上旬", "原文");

        assertEquals(LocalDateTime.of(2026, 5, 1, 0, 0, 0), window.getStart());
        assertEquals(LocalDateTime.of(2026, 5, 10, 23, 59, 59), window.getEnd());
    }

    @Test
    void midMonthCoversTheEleventhToTwentieth() {
        TimeWindow window = extractor.approximateMonthWindow("决赛", 2026, 5, "中旬", "原文");

        assertEquals(LocalDateTime.of(2026, 5, 11, 0, 0, 0), window.getStart());
        assertEquals(LocalDateTime.of(2026, 5, 20, 23, 59, 59), window.getEnd());
    }

    @Test
    void lateMonthRunsToTheRealEndOfTheMonth() {
        TimeWindow february = extractor.approximateMonthWindow("决赛", 2026, 2, "下旬", "原文");

        assertEquals(LocalDateTime.of(2026, 2, 21, 0, 0, 0), february.getStart());
        assertEquals(28, february.getEnd().getDayOfMonth());
    }

    @Test
    void aMonthWithNoQualifierCoversAllOfIt() {
        TimeWindow window = extractor.approximateMonthWindow("决赛", 2026, 5, "", "原文");

        assertEquals(1, window.getStart().getDayOfMonth());
        assertEquals(31, window.getEnd().getDayOfMonth());
    }

    @Test
    void animpossibleMonthYieldsNothing() {
        org.junit.jupiter.api.Assertions.assertNull(
                extractor.approximateMonthWindow("决赛", 2026, 13, "", "原文"));
    }

    @Test
    void approximateCompetitionTimeIsReadFromProse() {
        List<TimeWindow> windows = extractor.extractApproximateCompetitionWindows(
                "全国总决赛时间：2026年5月中旬");

        assertEquals(1, windows.size());
        assertEquals("全国总决赛", windows.get(0).getName());
        assertEquals(LocalDateTime.of(2026, 5, 11, 0, 0, 0), windows.get(0).getStart());
    }

    // ==================== 阶段命名 ====================

    @Test
    void stageNameIsTakenFromTheSurroundingText() {
        List<TimeWindow> windows = extractor.extractRegistrationWindows(
                "报名时间：2026年3月1日 至 2026年3月31日");

        assertEquals("报名", windows.get(0).getName());
    }

    @Test
    void competitionStagesAreNamedByRound() {
        assertEquals("全国选拔赛", extractor.extractApproximateCompetitionWindows(
                "全国选拔赛时间：2026年4月中旬").get(0).getName());
        assertEquals("全国总决赛", extractor.extractApproximateCompetitionWindows(
                "总决赛时间：2026年5月中旬").get(0).getName());
    }

    @Test
    void theMatchedTextIsKeptAsEvidence() {
        TimeWindow window = extractor.extractRegistrationWindows(
                "报名时间：2026年3月1日 至 2026年3月31日").get(0);

        // 原文留作证据，人工核验时能追溯这个时间是从哪读出来的
        assertTrue(window.getSource().contains("2026年3月1日"));
        assertTrue(window.evidenceText().contains("2026-03-01"));
    }
}
