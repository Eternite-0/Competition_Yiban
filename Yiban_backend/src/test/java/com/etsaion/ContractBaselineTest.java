package com.etsaion;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.etsaion.controller.AdminWorkbenchController;
import com.etsaion.controller.CompetitionController;
import com.etsaion.controller.TeacherWorkbenchController;
import com.etsaion.dto.EventPublishDTO;
import com.etsaion.controller.GrowthController;
import com.etsaion.controller.RegistrationController;
import com.etsaion.dto.RegisterDTO;
import com.etsaion.dto.RegistrationSubmitDTO;
import com.etsaion.dto.Result;
import com.etsaion.entity.Competition;
import com.etsaion.entity.Registration;
import com.etsaion.entity.ReviewTask;
import com.etsaion.entity.Submission;
import com.etsaion.entity.User;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.SubmissionStudentService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.impl.GrowthRecordServiceImpl;
import com.etsaion.service.impl.RegistrationServiceImpl;
import com.etsaion.service.impl.TeacherServiceImpl;
import com.etsaion.service.UserService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.RegistrationVO;
import com.etsaion.vo.StudentGrowthVO;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ContractBaselineTest {

    @AfterEach
    void clearUserContext() {
        UserContext.remove();
    }

    @Test
    void publicRegistrationDtoAcceptsStudentAndTeacherRoles() {
        // 注册系统支持学生和教师两种角色注册
        boolean hasRoleField = Arrays.stream(RegisterDTO.class.getDeclaredFields())
                .anyMatch(field -> "role".equals(field.getName()));

        assertTrue(hasRoleField, "registration DTO must have role field for student/teacher registration");
    }

    @Test
    void registrationSubmitDtoCarriesTrackAndMembers() throws Exception {
        assertNotNull(RegistrationSubmitDTO.class.getDeclaredField("track"));
        assertNotNull(RegistrationSubmitDTO.class.getDeclaredField("memberStudentIds"));
    }

    @Test
    void activityApiContractExists() throws Exception {
        Class<?> controller = Class.forName("com.etsaion.controller.ActivityController");

        assertTrue(hasMethod(controller, "listActivities"));
        assertTrue(hasMethod(controller, "getActivityDetail"));
        assertTrue(hasMethod(controller, "saveActivity"));
        assertTrue(hasMethod(controller, "createParticipation"));
        assertTrue(hasMethod(controller, "listMyParticipations"));
    }

    @Test
    void adminWorkbenchApiContractExists() throws Exception {
        Class<?> controller = Class.forName("com.etsaion.controller.AdminWorkbenchController");

        assertTrue(hasMethod(controller, "listTasks"));
        assertTrue(hasMethod(controller, "stats"));
        assertTrue(hasMethod(controller, "handleTask"));
        assertTrue(hasMethod(controller, "handleTasks"));
    }

    @Test
    void studentCannotReadAnotherStudentsGrowth() {
        GrowthController controller = new GrowthController();
        ReflectionTestUtils.setField(controller, "growthRecordService", mock(GrowthRecordService.class));
        UserContext.set(new UserContext.UserInfo(1L, "student"));

        Result<?> result = controller.getRadarData(2L);

        assertEquals(403, result.getCode());
    }

    @Test
    void reviewTaskServiceHasBackfillMethod() throws Exception {
        assertNotNull(ReviewTaskService.class.getDeclaredMethod("backfillHistorical"));
    }

    @Test
    void registrationStatusIncludesReturnForSupplement() throws Exception {
        // Verify that the Registration entity can hold '退回补充' status
        Registration reg = new Registration();
        reg.setStatus("退回补充");
        assertEquals("退回补充", reg.getStatus());
    }

    @Test
    void reviewTaskTargetTypeAcceptsRegistration() throws Exception {
        ReviewTask task = new ReviewTask();
        task.setTargetType("registration");
        assertEquals("registration", task.getTargetType());
    }

    @Test
    void adminWorkbenchControllerHasBackfillEndpoint() throws Exception {
        assertTrue(hasMethod(AdminWorkbenchController.class, "backfill"));
    }

    @Test
    void teacherWorkbenchControllerExposesTaskActionsForTeachers() {
        RequireRole role = TeacherWorkbenchController.class.getAnnotation(RequireRole.class);

        assertNotNull(role);
        assertTrue(Arrays.asList(role.value()).contains("teacher"));
        assertTrue(hasMethod(TeacherWorkbenchController.class, "listTasks"));
        assertTrue(hasMethod(TeacherWorkbenchController.class, "stats"));
        assertTrue(hasMethod(TeacherWorkbenchController.class, "handleTask"));
    }

    @Test
    void growthAwardsOnlyCountApprovedSubmissions() {
        GrowthRecordServiceImpl service = new GrowthRecordServiceImpl();
        RegistrationService registrationService = mock(RegistrationService.class);
        SubmissionService submissionService = mock(SubmissionService.class);
        SubmissionStudentService submissionStudentService = mock(SubmissionStudentService.class);
        CompetitionService competitionService = mock(CompetitionService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setCompetitionId(10L);
        reg.setStudentId(4L);

        Submission approved = new Submission();
        approved.setId(1L);
        approved.setRegistrationId(1L);
        approved.setStatus("已审核");
        approved.setApproved(true);

        Submission rejected = new Submission();
        rejected.setId(2L);
        rejected.setRegistrationId(1L);
        rejected.setStatus("已审核");
        rejected.setApproved(false);

        Competition competition = new Competition();
        competition.setId(10L);
        competition.setCategory("A");

        when(registrationService.list(any(Wrapper.class))).thenReturn(List.of(reg));
        when(submissionService.list(any(Wrapper.class))).thenReturn(List.of(approved, rejected));
        when(submissionStudentService.list(any(Wrapper.class))).thenReturn(List.of());
        when(competitionService.getById(10L)).thenReturn(competition);

        ReflectionTestUtils.setField(service, "registrationService", registrationService);
        ReflectionTestUtils.setField(service, "submissionService", submissionService);
        ReflectionTestUtils.setField(service, "submissionStudentService", submissionStudentService);
        ReflectionTestUtils.setField(service, "competitionService", competitionService);

        StudentGrowthVO result = service.getStudentGrowth(4L);

        assertEquals(1, result.getAwards());
    }

    @Test
    void registrationVoIncludesReviewTaskNoteWhenNoSubmissionExists() {
        RegistrationServiceImpl service = new RegistrationServiceImpl();
        UserService userService = mock(UserService.class);
        CompetitionService competitionService = mock(CompetitionService.class);
        SubmissionService submissionService = mock(SubmissionService.class);
        ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(4L);
        reg.setCompetitionId(10L);
        reg.setStatus("退回补充");

        User student = new User();
        student.setId(4L);
        student.setUsername("20230101");
        student.setRealName("张三");

        Competition competition = new Competition();
        competition.setId(10L);
        competition.setName("蓝桥杯");

        ReviewTask task = new ReviewTask();
        task.setTargetType("registration");
        task.setTargetId(1L);
        task.setReviewNote("【退回补充】请补充指导老师信息");

        when(userService.listByIds(List.of(4L))).thenReturn(List.of(student));
        when(competitionService.listByIds(List.of(10L))).thenReturn(List.of(competition));
        when(submissionService.list(any(Wrapper.class))).thenReturn(List.of());
        when(reviewTaskService.list(any(Wrapper.class))).thenReturn(List.of(task));

        ReflectionTestUtils.setField(service, "userService", userService);
        ReflectionTestUtils.setField(service, "competitionService", competitionService);
        ReflectionTestUtils.setField(service, "submissionService", submissionService);
        ReflectionTestUtils.setField(service, "reviewTaskService", reviewTaskService);

        List<RegistrationVO> result = service.toVOList(List.of(reg));

        assertEquals("【退回补充】请补充指导老师信息", result.get(0).getReviewNote());
    }

    @Test
    void comprehensiveScoreOnlyCountsApprovedSubmissions() {
        TeacherServiceImpl service = new TeacherServiceImpl();
        UserService userService = mock(UserService.class);
        RegistrationService registrationService = mock(RegistrationService.class);
        SubmissionService submissionService = mock(SubmissionService.class);

        User student = new User();
        student.setId(4L);
        student.setUsername("20230101");
        student.setRealName("张三");

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(4L);

        Submission approved = new Submission();
        approved.setId(1L);
        approved.setRegistrationId(1L);
        approved.setStatus("已审核");
        approved.setApproved(true);

        Submission rejected = new Submission();
        rejected.setId(2L);
        rejected.setRegistrationId(1L);
        rejected.setStatus("已审核");
        rejected.setApproved(false);

        when(userService.list(any(Wrapper.class))).thenReturn(List.of(student));
        when(registrationService.list(any(Wrapper.class))).thenReturn(List.of(reg));
        when(submissionService.list(any(Wrapper.class))).thenReturn(List.of(approved, rejected));

        ReflectionTestUtils.setField(service, "userService", userService);
        ReflectionTestUtils.setField(service, "registrationService", registrationService);
        ReflectionTestUtils.setField(service, "submissionService", submissionService);

        assertEquals(17.0, service.getComprehensiveData("2025-2026", null).get(0).getComprehensiveScore());
    }

    @Test
    void teacherCollegeOptionsAreScopedToCurrentTeacherCollege() {
        TeacherServiceImpl service = new TeacherServiceImpl();
        UserService userService = mock(UserService.class);

        User teacher = new User();
        teacher.setId(2L);
        teacher.setRole("teacher");
        teacher.setCollege("计算机学院");

        UserContext.set(new UserContext.UserInfo(2L, "teacher"));
        when(userService.getById(2L)).thenReturn(teacher);

        ReflectionTestUtils.setField(service, "userService", userService);

        assertEquals(List.of("计算机学院"), service.listColleges());
    }

    @Test
    void competitionControllerContractExists() throws Exception {
        Class<?> controller = Class.forName("com.etsaion.controller.CompetitionController");
        assertTrue(hasMethod(controller, "listCompetitions"));
    }

    @Test
    void eventPublishDtoAcceptsDateOnlyValuesFromAdminDateInputs() throws Exception {
        String json = """
                {
                  "name": "测试赛事",
                  "level": "校级",
                  "category": "A",
                  "startTime": "2026-06-01",
                  "endTime": "2026-06-10",
                  "competitionStart": "2026-06-12",
                  "competitionEnd": "2026-06-13",
                  "maxTeamSize": 3,
                  "coverUrl": "https://cdn.example.com/uploads/cover.png"
                }
                """;

        EventPublishDTO dto = JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .build()
                .readValue(json, EventPublishDTO.class);

        assertEquals(LocalTime.MIDNIGHT, dto.getStartTime().toLocalTime());
        assertEquals(LocalTime.MIDNIGHT, dto.getCompetitionStart().toLocalTime());
    }

    /** 端点可能来自基类，看的是对外契约而非声明位置。 */
    private boolean hasMethod(Class<?> type, String name) {
        return Arrays.stream(type.getMethods())
                .map(Method::getName)
                .anyMatch(name::equals);
    }
}
