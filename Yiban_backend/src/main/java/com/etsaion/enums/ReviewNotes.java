package com.etsaion.enums;

/**
 * 审核意见文本的兼容层。
 *
 * 历史上"退回补充"没有独立表示，而是把 {@value #RETURN_MARKER} 前缀写进审核意见，
 * 靠 {@code startsWith} 反推动作。现在动作由 {@link AuditAction} 显式承载，
 * 审核意见回归纯文本——但仍有调用方在发送带前缀的意见，
 * 所以入口处需要识别并剥离它。
 *
 * 这个类是该前缀在后端唯一的存在处；除入口解析外，任何地方都不应再读它。
 */
public final class ReviewNotes {

    public static final String RETURN_MARKER = "【退回补充】";

    private ReviewNotes() {
    }

    /** 意见是否带退回标记。仅供入口解析旧格式调用方使用。 */
    public static boolean hasReturnMarker(String reviewNote) {
        return reviewNote != null && reviewNote.startsWith(RETURN_MARKER);
    }

    /** 剥离退回标记，得到教师真正写的意见。 */
    public static String strip(String reviewNote) {
        if (reviewNote == null) {
            return null;
        }
        return hasReturnMarker(reviewNote)
                ? reviewNote.substring(RETURN_MARKER.length()).trim()
                : reviewNote;
    }
}
