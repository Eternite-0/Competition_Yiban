package com.etsaion;

import com.etsaion.entity.Competition;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.AwardProofService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.UserService;
import com.etsaion.service.ai.AiCompetitionDraftService;
import com.etsaion.service.ai.AiTaskService;
import com.etsaion.service.ai.AssistantToolRegistry;
import com.etsaion.vo.CompetitionVO;
import com.etsaion.vo.StudentGrowthVO;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AssistantToolPermissionTest {

    @Test
    void studentToolsAreLimitedToOwnDataAndNoReviewSummary() {
        GrowthRecordService growthRecordService = mock(GrowthRecordService.class);
        AssistantToolRegistry registry = registry(mock(UserService.class), growthRecordService,
                mock(CompetitionService.class), mock(ReviewTaskService.class), mock(AiCompetitionDraftService.class));
        StudentGrowthVO ownGrowth = new StudentGrowthVO(4L,
                new StudentGrowthVO.RadarData(60, 60, 60, 60, 60), 0, 0);
        when(growthRecordService.getStudentGrowth(4L)).thenReturn(ownGrowth);

        assertSame(ownGrowth, registry.getStudentGrowth(4L, "student", 4L));

        BusinessException growthEx = assertThrows(BusinessException.class,
                () -> registry.getStudentGrowth(4L, "student", 5L));
        assertEquals(403, growthEx.getCode());
        assertEquals("学生只能查看自己的成长档案", growthEx.getMessage());

        BusinessException reviewEx = assertThrows(BusinessException.class,
                () -> registry.getReviewSummary("student"));
        assertEquals(403, reviewEx.getCode());
        assertEquals("无权查看审核统计", reviewEx.getMessage());
    }

    @Test
    void teacherCanReadSameCollegeGrowthButNotOtherCollege() {
        UserService userService = mock(UserService.class);
        GrowthRecordService growthRecordService = mock(GrowthRecordService.class);
        AssistantToolRegistry registry = registry(userService, growthRecordService,
                mock(CompetitionService.class), mock(ReviewTaskService.class), mock(AiCompetitionDraftService.class));

        User teacher = user(2L, "teacher", "计算机学院");
        User sameCollegeStudent = user(4L, "student", "计算机学院");
        User otherCollegeStudent = user(5L, "student", "外国语学院");
        StudentGrowthVO sameCollegeGrowth = new StudentGrowthVO(4L,
                new StudentGrowthVO.RadarData(70, 65, 66, 72, 80), 3, 1);

        when(userService.getById(2L)).thenReturn(teacher);
        when(userService.getById(4L)).thenReturn(sameCollegeStudent);
        when(userService.getById(5L)).thenReturn(otherCollegeStudent);
        when(growthRecordService.getStudentGrowth(4L)).thenReturn(sameCollegeGrowth);

        assertSame(sameCollegeGrowth, registry.getStudentGrowth(2L, "teacher", 4L));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> registry.getStudentGrowth(2L, "teacher", 5L));
        assertEquals(403, ex.getCode());
        assertEquals("无权查看其他学院学生的成长档案", ex.getMessage());
    }

    @Test
    void adminCanUseDraftSummaryAndViewUnpublishedCompetition() {
        CompetitionService competitionService = mock(CompetitionService.class);
        ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        AiCompetitionDraftService draftService = mock(AiCompetitionDraftService.class);
        AssistantToolRegistry registry = registry(mock(UserService.class), mock(GrowthRecordService.class),
                competitionService, reviewTaskService, draftService);

        when(draftService.count(any())).thenReturn(3L, 2L, 1L);
        Map<String, Object> summary = registry.getDraftCompetitionSummary("admin");
        assertEquals(3L, summary.get("pendingReview"));
        assertEquals(2L, summary.get("confirmed"));
        assertEquals(1L, summary.get("ignored"));

        Competition draftCompetition = new Competition();
        draftCompetition.setId(10L);
        draftCompetition.setName("内部草稿赛事");
        draftCompetition.setStatus("draft");
        CompetitionVO draftVO = new CompetitionVO();
        draftVO.setId(10L);
        draftVO.setName("内部草稿赛事");
        draftVO.setStatus("draft");
        when(competitionService.getById(10L)).thenReturn(draftCompetition);
        when(competitionService.toVO(draftCompetition)).thenReturn(draftVO);

        Map<String, Object> detail = registry.getCompetitionDetail(10L, "admin");
        assertEquals("draft", detail.get("status"));
        assertEquals("内部草稿赛事", detail.get("name"));

        BusinessException studentEx = assertThrows(BusinessException.class,
                () -> registry.getCompetitionDetail(10L, "student"));
        assertEquals(403, studentEx.getCode());
        assertEquals("无权查看未发布赛事", studentEx.getMessage());

        BusinessException teacherEx = assertThrows(BusinessException.class,
                () -> registry.getDraftCompetitionSummary("teacher"));
        assertEquals(403, teacherEx.getCode());
        assertEquals("当前角色无权使用该工具", teacherEx.getMessage());
    }

    @Test
    void teacherAndAdminCanReadReviewSummaryButStudentCannot() {
        ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        AssistantToolRegistry registry = registry(mock(UserService.class), mock(GrowthRecordService.class),
                mock(CompetitionService.class), reviewTaskService, mock(AiCompetitionDraftService.class));
        Map<String, Object> stats = Map.of("pending", 5, "approvedToday", 2);
        when(reviewTaskService.getStats()).thenReturn(stats);

        assertSame(stats, registry.getReviewSummary("teacher"));
        assertSame(stats, registry.getReviewSummary("admin"));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> registry.getReviewSummary("student"));
        assertEquals(403, ex.getCode());
        assertTrue(ex.getMessage().contains("无权查看审核统计"));
    }

    private AssistantToolRegistry registry(UserService userService,
                                           GrowthRecordService growthRecordService,
                                           CompetitionService competitionService,
                                           ReviewTaskService reviewTaskService,
                                           AiCompetitionDraftService draftService) {
        AssistantToolRegistry registry = new AssistantToolRegistry();
        ReflectionTestUtils.setField(registry, "competitionService", competitionService);
        ReflectionTestUtils.setField(registry, "registrationService", mock(RegistrationService.class));
        ReflectionTestUtils.setField(registry, "submissionService", mock(SubmissionService.class));
        ReflectionTestUtils.setField(registry, "awardProofService", mock(AwardProofService.class));
        ReflectionTestUtils.setField(registry, "reviewTaskService", reviewTaskService);
        ReflectionTestUtils.setField(registry, "growthRecordService", growthRecordService);
        ReflectionTestUtils.setField(registry, "userService", userService);
        ReflectionTestUtils.setField(registry, "aiTaskService", mock(AiTaskService.class));
        ReflectionTestUtils.setField(registry, "aiCompetitionDraftService", draftService);
        return registry;
    }

    private User user(Long id, String role, String college) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setCollege(college);
        return user;
    }
}
