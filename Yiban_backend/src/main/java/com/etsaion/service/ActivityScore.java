package com.etsaion.service;

/**
 * 参赛活跃度评分。
 *
 * 这套加权只用于教师端的横向排名与导出，是官方综测分
 * （{@code comprehensive_score} 表，由 {@link ComprehensiveScoreService} 提供）
 * 之外的一个辅助口径。此前同一个公式在
 * {@code TeacherServiceImpl} 的两处和 {@code TeacherController} 导出 Excel 时
 * 各写了一遍魔数，页面上的排名分与导出的分谁也不保证跟谁一致。
 */
public final class ActivityScore {

    /** 每参加一次赛事的计分。 */
    private static final double PER_PARTICIPATION = 2.0;

    /** 每获得一项成果认定的计分。 */
    private static final double PER_AWARD = 15.0;

    private ActivityScore() {
    }

    public static double of(int participationCount, int awardCount) {
        return participationCount * PER_PARTICIPATION + awardCount * PER_AWARD;
    }
}
