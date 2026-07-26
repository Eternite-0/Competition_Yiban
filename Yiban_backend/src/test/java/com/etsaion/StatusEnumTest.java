package com.etsaion;

import com.etsaion.enums.AuditAction;
import com.etsaion.enums.ParticipationStatus;
import com.etsaion.enums.RegistrationStatus;
import com.etsaion.enums.ReviewNotes;
import com.etsaion.enums.ReviewTaskStatus;
import com.etsaion.enums.SubmissionStatus;
import com.etsaion.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 状态枚举与旧格式兼容层的契约。 */
class StatusEnumTest {

    // ==================== 数据库值往返 ====================

    @Test
    void registrationStatusRoundTripsThroughItsDatabaseValue() {
        for (RegistrationStatus status : RegistrationStatus.values()) {
            assertEquals(status, RegistrationStatus.from(status.getValue()));
        }
    }

    @Test
    void submissionStatusRoundTripsThroughItsDatabaseValue() {
        for (SubmissionStatus status : SubmissionStatus.values()) {
            assertEquals(status, SubmissionStatus.from(status.getValue()));
        }
    }

    @Test
    void participationStatusRoundTripsThroughItsDatabaseValue() {
        for (ParticipationStatus status : ParticipationStatus.values()) {
            assertEquals(status, ParticipationStatus.from(status.getValue()));
        }
    }

    @Test
    void unknownStatusValueYieldsNullRatherThanThrowing() {
        // 历史数据可能带有枚举未覆盖的值，解析不能炸
        assertNull(RegistrationStatus.from("待完善"));
        assertNull(RegistrationStatus.from(null));
        assertNull(SubmissionStatus.from("不存在"));
    }

    // ==================== 状态分组 ====================

    @Test
    void onlySubmittedAndUnderReviewAreReviewable() {
        assertTrue(RegistrationStatus.SUBMITTED.isReviewable());
        assertTrue(RegistrationStatus.UNDER_REVIEW.isReviewable());
        assertFalse(RegistrationStatus.APPROVED.isReviewable());
        assertFalse(RegistrationStatus.RETURNED.isReviewable());
        assertFalse(RegistrationStatus.REJECTED.isReviewable());
    }

    @Test
    void returnedRegistrationStillAcceptsSubmissions() {
        // 退回补充的本意就是让学生重新上传材料
        assertTrue(RegistrationStatus.RETURNED.acceptsSubmission());
        assertTrue(RegistrationStatus.SUBMITTED.acceptsSubmission());
        assertTrue(RegistrationStatus.APPROVED.acceptsSubmission());
        assertFalse(RegistrationStatus.REJECTED.acceptsSubmission());
    }

    @Test
    void deadDraftStatusIsNeitherReviewableNorSubmittable() {
        assertFalse(RegistrationStatus.isReviewable("待完善"));
        assertFalse(RegistrationStatus.acceptsSubmission("待完善"));
    }

    @Test
    void openTaskStatusesCoverPendingAndProcessing() {
        assertTrue(ReviewTaskStatus.isOpen("pending"));
        assertTrue(ReviewTaskStatus.isOpen("processing"));
        assertFalse(ReviewTaskStatus.isOpen("resolved"));
        assertFalse(ReviewTaskStatus.isOpen(null));
    }

    // ==================== 审核动作 → 结果状态 ====================

    @Test
    void eachActionMapsToItsOwnRegistrationStatus() {
        assertEquals(RegistrationStatus.APPROVED, RegistrationStatus.resultOf(AuditAction.APPROVE));
        assertEquals(RegistrationStatus.RETURNED, RegistrationStatus.resultOf(AuditAction.RETURN));
        assertEquals(RegistrationStatus.REJECTED, RegistrationStatus.resultOf(AuditAction.REJECT));
    }

    @Test
    void eachActionMapsToItsOwnParticipationStatus() {
        assertEquals(ParticipationStatus.APPROVED, ParticipationStatus.resultOf(AuditAction.APPROVE));
        assertEquals(ParticipationStatus.RETURNED, ParticipationStatus.resultOf(AuditAction.RETURN));
        assertEquals(ParticipationStatus.REJECTED, ParticipationStatus.resultOf(AuditAction.REJECT));
    }

    @Test
    void returnLeavesTheSubmissionVerdictUndecided() {
        assertEquals(Boolean.TRUE, SubmissionStatus.approvedFlagOf(AuditAction.APPROVE));
        assertEquals(Boolean.FALSE, SubmissionStatus.approvedFlagOf(AuditAction.REJECT));
        // 退回补充不是驳回，结论未定
        assertNull(SubmissionStatus.approvedFlagOf(AuditAction.RETURN));
    }

    @Test
    void onlyRejectAndReturnRequireANote() {
        assertFalse(AuditAction.APPROVE.requiresNote());
        assertTrue(AuditAction.REJECT.requiresNote());
        assertTrue(AuditAction.RETURN.requiresNote());
    }

    // ==================== 动作解析 ====================

    @Test
    void actionParsingAcceptsPastParticipleAndCasing() {
        // 历史前端与批量接口传过这些写法
        assertEquals(AuditAction.APPROVE, AuditAction.from("approve"));
        assertEquals(AuditAction.APPROVE, AuditAction.from("approved"));
        assertEquals(AuditAction.APPROVE, AuditAction.from("APPROVE"));
        assertEquals(AuditAction.REJECT, AuditAction.from("rejected"));
        assertEquals(AuditAction.RETURN, AuditAction.from(" returned "));
    }

    @Test
    void unknownActionIsRefused() {
        assertThrows(BusinessException.class, () -> AuditAction.from("maybe"));
        assertThrows(BusinessException.class, () -> AuditAction.from(null));
    }

    // ==================== 旧格式兼容 ====================

    @Test
    void legacyBooleanPlusPrefixStillResolvesToTheRightAction() {
        assertEquals(AuditAction.APPROVE, AuditAction.fromLegacy(true, null));
        assertEquals(AuditAction.REJECT, AuditAction.fromLegacy(false, "材料不符"));
        assertEquals(AuditAction.RETURN, AuditAction.fromLegacy(false, "【退回补充】请补材料"));
        // approve 为空按驳回处理，与旧的 Boolean.TRUE.equals 语义一致
        assertEquals(AuditAction.REJECT, AuditAction.fromLegacy(null, "无"));
    }

    @Test
    void stripRemovesTheReturnMarkerAndLeavesPlainNotesAlone() {
        assertEquals("请补材料", ReviewNotes.strip("【退回补充】请补材料"));
        assertEquals("请补材料", ReviewNotes.strip("【退回补充】 请补材料 "));
        assertEquals("材料不符", ReviewNotes.strip("材料不符"));
        assertNull(ReviewNotes.strip(null));
    }

    @Test
    void markerIsOnlyRecognisedAsAPrefix() {
        // 出现在意见正文中间的同名文字不该被当成状态标记
        assertFalse(ReviewNotes.hasReturnMarker("请注意【退回补充】的填写要求"));
        assertTrue(ReviewNotes.hasReturnMarker("【退回补充】请补材料"));
        assertFalse(ReviewNotes.hasReturnMarker(null));
    }
}
