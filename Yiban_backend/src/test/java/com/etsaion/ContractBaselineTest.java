package com.etsaion;

import com.etsaion.controller.GrowthController;
import com.etsaion.dto.RegisterDTO;
import com.etsaion.dto.RegistrationSubmitDTO;
import com.etsaion.dto.Result;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.utils.UserContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class ContractBaselineTest {

    @AfterEach
    void clearUserContext() {
        UserContext.remove();
    }

    @Test
    void publicRegistrationDtoDoesNotExposeRoleSelection() {
        boolean hasRoleField = Arrays.stream(RegisterDTO.class.getDeclaredFields())
                .anyMatch(field -> "role".equals(field.getName()));

        assertFalse(hasRoleField, "public registration must not allow clients to choose role");
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

    private boolean hasMethod(Class<?> type, String name) {
        return Arrays.stream(type.getDeclaredMethods())
                .map(Method::getName)
                .anyMatch(name::equals);
    }
}
