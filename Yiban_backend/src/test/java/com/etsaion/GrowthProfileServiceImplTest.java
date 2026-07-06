package com.etsaion;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.etsaion.entity.Activity;
import com.etsaion.entity.Participation;
import com.etsaion.entity.User;
import com.etsaion.service.ActivityService;
import com.etsaion.service.ParticipationService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.UserService;
import com.etsaion.service.impl.ActivityCategoryServiceImpl;
import com.etsaion.service.impl.GrowthProfileServiceImpl;
import com.etsaion.service.impl.TeacherServiceImpl;
import com.etsaion.vo.GrowthDimensionVO;
import com.etsaion.vo.GrowthProfileVO;
import com.etsaion.vo.TeacherGrowthOverviewVO;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GrowthProfileServiceImplTest {

    @Test
    void activityCategoryAcceptsCultureSportsAsFirstClassType() {
        ActivityCategoryServiceImpl service = new ActivityCategoryServiceImpl();

        String normalized = ReflectionTestUtils.invokeMethod(service, "normalizeType", "culture_sports");
        String icon = ReflectionTestUtils.invokeMethod(service, "defaultIcon", "culture_sports");

        assertEquals("culture_sports", normalized);
        assertEquals("sports_soccer", icon);
    }

    @Test
    void profileCountsOnlyApprovedVolunteerAndCultureSportsParticipation() {
        GrowthProfileServiceImpl service = new GrowthProfileServiceImpl();
        RegistrationService registrationService = mock(RegistrationService.class);
        SubmissionService submissionService = mock(SubmissionService.class);
        ParticipationService participationService = mock(ParticipationService.class);
        ActivityService activityService = mock(ActivityService.class);

        Activity volunteer = new Activity();
        volunteer.setId(11L);
        volunteer.setType("volunteer");
        volunteer.setTitle("校园迎新志愿服务");
        volunteer.setServiceHours(new BigDecimal("3.5"));

        Activity culture = new Activity();
        culture.setId(12L);
        culture.setType("culture_sports");
        culture.setTitle("院运会开幕式");

        Participation approvedVolunteer = new Participation();
        approvedVolunteer.setId(101L);
        approvedVolunteer.setStudentId(7L);
        approvedVolunteer.setActivityId(11L);
        approvedVolunteer.setStatus("approved");

        Participation approvedCulture = new Participation();
        approvedCulture.setId(102L);
        approvedCulture.setStudentId(7L);
        approvedCulture.setActivityId(12L);
        approvedCulture.setStatus("approved");

        Participation pendingVolunteer = new Participation();
        pendingVolunteer.setId(103L);
        pendingVolunteer.setStudentId(7L);
        pendingVolunteer.setActivityId(11L);
        pendingVolunteer.setStatus("submitted");

        when(registrationService.list(any(Wrapper.class))).thenReturn(List.of());
        when(submissionService.list(any(Wrapper.class))).thenReturn(List.of());
        when(participationService.list(any(Wrapper.class))).thenReturn(List.of(approvedVolunteer, approvedCulture, pendingVolunteer));
        when(activityService.listByIds(List.of(11L, 12L))).thenReturn(List.of(volunteer, culture));

        ReflectionTestUtils.setField(service, "registrationService", registrationService);
        ReflectionTestUtils.setField(service, "submissionService", submissionService);
        ReflectionTestUtils.setField(service, "participationService", participationService);
        ReflectionTestUtils.setField(service, "activityService", activityService);

        GrowthProfileVO profile = service.getStudentProfile(7L, null);

        assertEquals(2, profile.getTotalActivities());
        assertEquals(new BigDecimal("3.5"), profile.getTotalVolunteerHours());
        assertEquals(1, profile.getTotalCultureSports());
        assertTrue(score(profile, "volunteer") > 0);
        assertTrue(score(profile, "culture_sports") > 0);
        assertEquals(2, profile.getTimeline().size());
    }

    @Test
    void teacherGrowthOverviewAggregatesApprovedActivitiesAndFindsInactiveStudents() {
        TeacherServiceImpl service = new TeacherServiceImpl();
        UserService userService = mock(UserService.class);
        RegistrationService registrationService = mock(RegistrationService.class);
        SubmissionService submissionService = mock(SubmissionService.class);
        ParticipationService participationService = mock(ParticipationService.class);
        ActivityService activityService = mock(ActivityService.class);

        User active = student(1L, "20240101", "张三");
        User cultureOnly = student(2L, "20240102", "李四");
        User inactive = student(3L, "20240103", "王五");

        Activity volunteer = new Activity();
        volunteer.setId(21L);
        volunteer.setType("volunteer");
        volunteer.setServiceHours(new BigDecimal("2.0"));

        Activity culture = new Activity();
        culture.setId(22L);
        culture.setType("culture_sports");

        Participation p1 = participation(201L, 1L, 21L, "approved");
        Participation p2 = participation(202L, 2L, 22L, "approved");
        Participation ignored = participation(203L, 3L, 21L, "submitted");

        when(userService.list(any(Wrapper.class))).thenReturn(List.of(active, cultureOnly, inactive));
        when(registrationService.list(any(Wrapper.class))).thenReturn(List.of());
        when(submissionService.list(any(Wrapper.class))).thenReturn(List.of());
        when(participationService.list(any(Wrapper.class))).thenReturn(List.of(p1, p2, ignored));
        when(activityService.listByIds(List.of(21L, 22L))).thenReturn(List.of(volunteer, culture));

        ReflectionTestUtils.setField(service, "userService", userService);
        ReflectionTestUtils.setField(service, "registrationService", registrationService);
        ReflectionTestUtils.setField(service, "submissionService", submissionService);
        ReflectionTestUtils.setField(service, "participationService", participationService);
        ReflectionTestUtils.setField(service, "activityService", activityService);

        TeacherGrowthOverviewVO overview = service.getGrowthOverview(null, null, null, null);

        assertEquals(3, overview.getTotalStudents());
        assertEquals(1L, overview.getActivityTypeDistribution().get("volunteer"));
        assertEquals(1L, overview.getActivityTypeDistribution().get("culture_sports"));
        assertEquals(new BigDecimal("2.0"), overview.getTotalVolunteerHours());
        assertEquals(1, overview.getLowParticipationCount());
        assertEquals("王五", overview.getLowParticipationStudents().get(0).getStudentName());
    }

    private int score(GrowthProfileVO profile, String key) {
        return profile.getDimensions().stream()
                .filter(d -> key.equals(d.getKey()))
                .map(GrowthDimensionVO::getScore)
                .findFirst()
                .orElse(0);
    }

    private User student(Long id, String username, String name) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setRealName(name);
        user.setRole("student");
        user.setCollege("计算机学院");
        user.setMajor("软件工程");
        user.setClassName("软工2401");
        user.setGrade("2024");
        return user;
    }

    private Participation participation(Long id, Long studentId, Long activityId, String status) {
        Participation participation = new Participation();
        participation.setId(id);
        participation.setStudentId(studentId);
        participation.setActivityId(activityId);
        participation.setStatus(status);
        return participation;
    }
}
