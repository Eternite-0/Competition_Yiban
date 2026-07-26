package com.etsaion;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.etsaion.dto.ReviewTaskActionDTO;
import com.etsaion.entity.Competition;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.Message;
import com.etsaion.entity.Registration;
import com.etsaion.entity.ReviewTask;
import com.etsaion.entity.Submission;
import com.etsaion.entity.SubmissionStudent;
import com.etsaion.enums.AuditAction;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.RegistrationMapper;
import com.etsaion.mapper.ReviewTaskMapper;
import com.etsaion.mapper.SubmissionMapper;
import com.etsaion.service.AwardProofService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.MessageService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.StudentStageProgressService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.SubmissionStudentService;
import com.etsaion.service.UserService;
import com.etsaion.service.RegistrationStatusManager;
import com.etsaion.service.impl.RegistrationServiceImpl;
import com.etsaion.service.impl.RegistrationStatusManagerImpl;
import com.etsaion.service.impl.ReviewTaskServiceImpl;
import com.etsaion.service.impl.SubmissionServiceImpl;
import com.etsaion.utils.UserContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 审核链路的行为契约。
 *
 * 这是重构的回归基线：无论审核动作在内部如何表达（历史上是
 * {@code Boolean approve} + {@code 【退回补充】} 文本前缀，现在是显式动作），
 * 三种动作产生的状态、通知与成长记录都必须与此处断言保持一致。
 */
class AuditFlowContractTest {

    private static final String NOTE = "请补充指导老师信息";

    @AfterEach
    void clearUserContext() {
        UserContext.remove();
    }

    // ==================== 报名审核三态 ====================

    @Test
    void registrationApproveMarksPassedAndRecordsGrowth() {
        RegistrationFixture f = new RegistrationFixture("已提交");

        f.approve("材料齐全");

        assertEquals("审核通过", f.registration.getStatus());
        assertEquals("competition", f.capturedGrowthRecord().getRecordType());
        assertTrue(f.capturedMessage().getTitle().contains("通过"));
    }

    @Test
    void registrationRejectMarksRejectedAndRecordsNoGrowth() {
        RegistrationFixture f = new RegistrationFixture("已提交");

        f.reject("材料不符合要求");

        assertEquals("审核驳回", f.registration.getStatus());
        verify(f.growthRecordService, never()).save(any(GrowthRecord.class));
        assertTrue(f.capturedMessage().getTitle().contains("驳回"));
    }

    @Test
    void registrationReturnForSupplementIsItsOwnStatusNotARejection() {
        RegistrationFixture f = new RegistrationFixture("已提交");

        f.returnForSupplement(NOTE);

        assertEquals("退回补充", f.registration.getStatus());
        verify(f.growthRecordService, never()).save(any(GrowthRecord.class));

        Message msg = f.capturedMessage();
        assertTrue(msg.getTitle().contains("补充"));
        assertTrue(msg.getContent().contains(NOTE));
        // 通知正文只展示教师写的意见，不泄漏内部状态标记
        assertFalse(msg.getContent().contains("【退回补充】"));
    }

    @Test
    void registrationAuditResolvesTheLinkedReviewTask() {
        RegistrationFixture f = new RegistrationFixture("已提交");

        f.approve("ok");

        verify(f.reviewTaskService).resolveTarget(eq("registration"), eq(1L), eq(2L), anyString());
    }

    @Test
    void registrationAuditIsRefusedOnceItLeftTheReviewableStates() {
        RegistrationFixture f = new RegistrationFixture("审核通过");

        BusinessException ex = assertThrows(BusinessException.class, () -> f.approve("ok"));

        assertTrue(ex.getMessage().contains("已处理"));
    }

    @Test
    void registrationAuditIsAllowedWhileUnderReview() {
        RegistrationFixture f = new RegistrationFixture("审核中");

        f.approve("ok");

        assertEquals("审核通过", f.registration.getStatus());
    }

    // ==================== 成果审核三态及其对报名状态的联动 ====================

    @Test
    void submissionApproveCascadesRegistrationToPassed() {
        SubmissionFixture f = new SubmissionFixture();

        f.approve("作品优秀");

        assertEquals("已审核", f.submission.getStatus());
        assertEquals(Boolean.TRUE, f.submission.getApproved());
        assertEquals("审核通过", f.registration.getStatus());
    }

    @Test
    void submissionRejectCascadesRegistrationToRejected() {
        SubmissionFixture f = new SubmissionFixture();

        f.reject("不符合要求");

        assertEquals("已审核", f.submission.getStatus());
        assertEquals(Boolean.FALSE, f.submission.getApproved());
        assertEquals("审核驳回", f.registration.getStatus());
    }

    @Test
    void submissionReturnLeavesApprovedUndecidedAndCascadesToRegistration() {
        SubmissionFixture f = new SubmissionFixture();

        f.returnForSupplement(NOTE);

        assertEquals("已审核", f.submission.getStatus());
        // 退回补充既不是通过也不是驳回，approved 保持未定
        assertNull(f.submission.getApproved());
        assertEquals("退回补充", f.registration.getStatus());
    }

    @Test
    void submissionReviewResolvesBothSubmissionAndRegistrationTasks() {
        SubmissionFixture f = new SubmissionFixture();

        f.approve("ok");

        verify(f.reviewTaskService).resolveTarget(eq("submission"), eq(5L), eq(2L), anyString());
        verify(f.reviewTaskService).resolveTarget(eq("registration"), eq(1L), eq(2L), anyString());
    }

    @Test
    void submissionReviewIsRefusedOnceAlreadyReviewed() {
        SubmissionFixture f = new SubmissionFixture();
        f.submission.setStatus("已审核");

        assertThrows(BusinessException.class, () -> f.approve("ok"));
    }

    // ==================== 统一待办把动作分发到对应领域服务 ====================

    @Test
    void workbenchRegistrationTaskDelegatesToRegistrationService() {
        TaskFixture f = new TaskFixture("registration", 1L);

        f.handle("approve", "ok");

        verify(f.registrationService).audit(eq(1L), eq(2L), eq(AuditAction.APPROVE), anyString());
    }

    @Test
    void workbenchSubmissionTaskDelegatesToSubmissionService() {
        TaskFixture f = new TaskFixture("submission", 5L);

        f.handle("approve", "ok");

        verify(f.submissionService).reviewSubmission(eq(2L), eq(5L), eq(AuditAction.APPROVE), anyString());
    }

    @Test
    void workbenchReturnActionReachesDomainServiceAsReturnNotRejection() {
        TaskFixture f = new TaskFixture("registration", 1L);

        f.handle("return", NOTE);

        // 退回补充作为独立动作抵达领域服务，而不是"驳回 + 意见带前缀"
        ArgumentCaptor<String> note = ArgumentCaptor.forClass(String.class);
        verify(f.registrationService).audit(eq(1L), eq(2L), eq(AuditAction.RETURN), note.capture());
        assertEquals(NOTE, note.getValue());
    }

    @Test
    void workbenchStripsLegacyReturnMarkerFromTheNote() {
        TaskFixture f = new TaskFixture("registration", 1L);

        // 旧调用方可能仍把标记写进意见里，入口要认得并剥掉
        f.handle("return", "【退回补充】" + NOTE);

        ArgumentCaptor<String> note = ArgumentCaptor.forClass(String.class);
        verify(f.registrationService).audit(eq(1L), eq(2L), eq(AuditAction.RETURN), note.capture());
        assertEquals(NOTE, note.getValue());
    }

    @Test
    void workbenchAwardProofTaskDelegatesToAwardProofService() {
        // 获奖证明的待办一直在建，但工作台不认这个类型，点开就报"不支持的待办类型"，
        // 逼得调用方另开一路数据源和一个专用端点
        TaskFixture f = new TaskFixture("award_proof", 7L);
        UserContext.set(new UserContext.UserInfo(2L, "teacher"));

        f.handle("approve", "证书属实");

        verify(f.awardProofService).reviewAwardProof(
                eq(2L), eq("teacher"), eq(7L), eq(AuditAction.APPROVE), anyString());
    }

    @Test
    void workbenchRefusesTaskTypesItCannotDispatch() {
        TaskFixture f = new TaskFixture("something_else", 1L);

        assertThrows(BusinessException.class, () -> f.handle("approve", "ok"));
    }

    @Test
    void workbenchRejectWithoutNoteIsRefused() {
        TaskFixture f = new TaskFixture("registration", 1L);

        assertThrows(BusinessException.class, () -> f.handle("reject", "  "));
    }

    @Test
    void workbenchReturnWithoutNoteIsRefused() {
        TaskFixture f = new TaskFixture("registration", 1L);

        assertThrows(BusinessException.class, () -> f.handle("return", null));
    }

    @Test
    void workbenchApproveWithoutNoteIsAllowed() {
        TaskFixture f = new TaskFixture("registration", 1L);

        f.handle("approve", null);

        verify(f.registrationService).audit(eq(1L), eq(2L), eq(AuditAction.APPROVE), any());
    }

    @Test
    void workbenchUnknownActionIsRefused() {
        TaskFixture f = new TaskFixture("registration", 1L);

        assertThrows(BusinessException.class, () -> f.handle("maybe", "ok"));
    }

    @Test
    void workbenchAlreadyResolvedTaskCannotBeHandledAgain() {
        TaskFixture f = new TaskFixture("registration", 1L);
        f.task.setStatus("resolved");

        assertThrows(BusinessException.class, () -> f.handle("approve", "ok"));
    }

    @Test
    void workbenchHandledTaskIsResolved() {
        TaskFixture f = new TaskFixture("registration", 1L);

        f.handle("approve", "ok");

        verify(f.reviewTaskMapper).updateById(any(ReviewTask.class));
    }

    // ==================== 测试夹具 ====================

    /**
     * 真实的状态管理器配 mock 的持久化。
     * 状态迁移规则是被测行为的一部分，不该被 mock 掉；
     * 落库与否不影响断言——实体是按引用共享的。
     */
    private static RegistrationStatusManager statusManager(RegistrationService registrationService) {
        RegistrationStatusManagerImpl manager = new RegistrationStatusManagerImpl();
        ReflectionTestUtils.setField(manager, "registrationService", registrationService);
        return manager;
    }

    /**
     * 报名审核夹具：一条待审报名 + 全部协作者的 mock。
     * approve/reject/returnForSupplement 三个方法封装了"如何表达审核动作"，
     * 重构改变服务签名时只需要改这三处，断言不动。
     */
    private static final class RegistrationFixture {
        final RegistrationServiceImpl service = new RegistrationServiceImpl();
        final RegistrationMapper mapper = mock(RegistrationMapper.class);
        final CompetitionService competitionService = mock(CompetitionService.class);
        final MessageService messageService = mock(MessageService.class);
        final GrowthRecordService growthRecordService = mock(GrowthRecordService.class);
        final UserService userService = mock(UserService.class);
        final SubmissionService submissionService = mock(SubmissionService.class);
        final ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        final Registration registration = new Registration();

        RegistrationFixture(String status) {
            registration.setId(1L);
            registration.setStudentId(4L);
            registration.setCompetitionId(10L);
            registration.setStatus(status);

            Competition comp = new Competition();
            comp.setId(10L);
            comp.setName("蓝桥杯");

            when(mapper.selectById(1L)).thenReturn(registration);
            when(competitionService.getById(10L)).thenReturn(comp);
            when(submissionService.list(any(Wrapper.class))).thenReturn(List.of());

            ReflectionTestUtils.setField(service, "baseMapper", mapper);
            ReflectionTestUtils.setField(service, "competitionService", competitionService);
            ReflectionTestUtils.setField(service, "messageService", messageService);
            ReflectionTestUtils.setField(service, "growthRecordService", growthRecordService);
            ReflectionTestUtils.setField(service, "userService", userService);
            ReflectionTestUtils.setField(service, "submissionService", submissionService);
            ReflectionTestUtils.setField(service, "reviewTaskService", reviewTaskService);
            ReflectionTestUtils.setField(service, "studentStageProgressService",
                    mock(StudentStageProgressService.class));
            ReflectionTestUtils.setField(service, "registrationStatusManager",
                    statusManager(mock(RegistrationService.class)));
        }

        void approve(String note) {
            service.audit(1L, 2L, AuditAction.APPROVE, note);
        }

        void reject(String note) {
            service.audit(1L, 2L, AuditAction.REJECT, note);
        }

        void returnForSupplement(String note) {
            service.audit(1L, 2L, AuditAction.RETURN, note);
        }

        Message capturedMessage() {
            ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
            verify(messageService).save(captor.capture());
            return captor.getValue();
        }

        GrowthRecord capturedGrowthRecord() {
            ArgumentCaptor<GrowthRecord> captor = ArgumentCaptor.forClass(GrowthRecord.class);
            verify(growthRecordService).save(captor.capture());
            return captor.getValue();
        }
    }

    /** 成果审核夹具：一条待审成果，关联到一条报名。 */
    private static final class SubmissionFixture {
        final SubmissionServiceImpl service = new SubmissionServiceImpl();
        final SubmissionMapper mapper = mock(SubmissionMapper.class);
        final RegistrationService registrationService = mock(RegistrationService.class);
        final CompetitionService competitionService = mock(CompetitionService.class);
        final MessageService messageService = mock(MessageService.class);
        final GrowthRecordService growthRecordService = mock(GrowthRecordService.class);
        final UserService userService = mock(UserService.class);
        final SubmissionStudentService submissionStudentService = mock(SubmissionStudentService.class);
        final ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        final Submission submission = new Submission();
        final Registration registration = new Registration();

        SubmissionFixture() {
            submission.setId(5L);
            submission.setRegistrationId(1L);
            submission.setCompetitionId(10L);
            submission.setSubmitterId(4L);
            submission.setFileName("作品.pdf");
            submission.setStatus("待审核");

            registration.setId(1L);
            registration.setStudentId(4L);
            registration.setCompetitionId(10L);
            registration.setStatus("审核中");

            Competition comp = new Competition();
            comp.setId(10L);
            comp.setName("蓝桥杯");

            SubmissionStudent link = new SubmissionStudent();
            link.setSubmissionId(5L);
            link.setStudentId(4L);

            when(mapper.selectById(5L)).thenReturn(submission);
            when(registrationService.getById(1L)).thenReturn(registration);
            when(competitionService.getById(10L)).thenReturn(comp);
            when(submissionStudentService.list(any(Wrapper.class))).thenReturn(List.of(link));
            when(growthRecordService.count(any(Wrapper.class))).thenReturn(0L);

            ReflectionTestUtils.setField(service, "baseMapper", mapper);
            ReflectionTestUtils.setField(service, "registrationService", registrationService);
            ReflectionTestUtils.setField(service, "competitionService", competitionService);
            ReflectionTestUtils.setField(service, "messageService", messageService);
            ReflectionTestUtils.setField(service, "growthRecordService", growthRecordService);
            ReflectionTestUtils.setField(service, "userService", userService);
            ReflectionTestUtils.setField(service, "submissionStudentService", submissionStudentService);
            ReflectionTestUtils.setField(service, "reviewTaskService", reviewTaskService);
            ReflectionTestUtils.setField(service, "registrationStatusManager", statusManager(registrationService));
        }

        void approve(String note) {
            service.reviewSubmission(2L, 5L, AuditAction.APPROVE, note);
        }

        void reject(String note) {
            service.reviewSubmission(2L, 5L, AuditAction.REJECT, note);
        }

        void returnForSupplement(String note) {
            service.reviewSubmission(2L, 5L, AuditAction.RETURN, note);
        }
    }

    /** 统一待办夹具：一条 pending 待办，领域服务全部 mock 掉以验证分发。 */
    private static final class TaskFixture {
        final ReviewTaskServiceImpl service = new ReviewTaskServiceImpl();
        final ReviewTaskMapper reviewTaskMapper = mock(ReviewTaskMapper.class);
        final RegistrationService registrationService = mock(RegistrationService.class);
        final SubmissionService submissionService = mock(SubmissionService.class);
        final AwardProofService awardProofService = mock(AwardProofService.class);
        final UserService userService = mock(UserService.class);
        final ReviewTask task = new ReviewTask();

        TaskFixture(String targetType, Long targetId) {
            task.setId(9L);
            task.setTargetType(targetType);
            task.setTargetId(targetId);
            task.setSubmitterId(4L);
            task.setStatus("pending");

            when(reviewTaskMapper.selectById(9L)).thenReturn(task);
            when(reviewTaskMapper.selectList(any())).thenReturn(List.of(task));

            ReflectionTestUtils.setField(service, "baseMapper", reviewTaskMapper);
            ReflectionTestUtils.setField(service, "registrationService", registrationService);
            ReflectionTestUtils.setField(service, "submissionService", submissionService);
            ReflectionTestUtils.setField(service, "awardProofService", awardProofService);
            ReflectionTestUtils.setField(service, "userService", userService);
        }

        void handle(String action, String note) {
            ReviewTaskActionDTO dto = new ReviewTaskActionDTO();
            dto.setAction(action);
            dto.setReviewNote(note);
            service.handleTask(9L, 2L, dto);
        }
    }
}
