package com.etsaion.service.ai;

import cn.hutool.core.util.StrUtil;

import java.util.Locale;

/**
 * 赛事名称的归一化与相似度比较。
 *
 * 同一个赛事在不同来源上的写法差异集中在年份、届次和标点上，
 * 去掉这些之后再比编辑距离，才能认出"2026 第九届 XX 大赛"和"XX大赛"是同一个。
 */
public final class CompetitionNameMatcher {

    /** 判定为同一赛事的相似度阈值。 */
    public static final double DUPLICATE_THRESHOLD = 0.86;

    /** 草稿之间的判重更严一些，避免把系列赛的不同赛道合并掉。 */
    public static final double DRAFT_DUPLICATE_THRESHOLD = 0.9;

    private CompetitionNameMatcher() {
    }

    public static String normalize(String name) {
        if (StrUtil.isBlank(name)) {
            return "";
        }
        return name.toLowerCase(Locale.ROOT)
                .replaceAll("(19|20)\\d{2}", "")
                .replaceAll("第[一二三四五六七八九十\\d]+届", "")
                .replaceAll("[\\p{Punct}\\s·•“”‘’（）()【】\\[\\]《》]+", "")
                .trim();
    }

    public static double similarity(String a, String b) {
        if (StrUtil.isBlank(a) || StrUtil.isBlank(b)) {
            return 0;
        }
        if (a.equals(b)) {
            return 1;
        }
        // 长度差本身就超过阈值允许的编辑量时，不必算距离
        int max = Math.max(a.length(), b.length());
        if (max == 0) {
            return 0;
        }
        return 1.0 - (levenshtein(a, b) * 1.0 / max);
    }

    private static int levenshtein(String a, String b) {
        int[] prev = new int[b.length() + 1];
        int[] curr = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) prev[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            curr[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                curr[j] = Math.min(Math.min(curr[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost);
            }
            int[] tmp = prev;
            prev = curr;
            curr = tmp;
        }
        return prev[b.length()];
    }
}
