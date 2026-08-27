package com.etsaion;

import com.etsaion.interceptor.RequireRole;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Contract guard for the role-scoped AI feature surface. */
class AiFeatureContractTest {

    @Test
    void featureServiceExposesAllCapabilities() throws Exception {
        Class<?> service = Class.forName("com.etsaion.service.ai.AiFeatureService");
        for (String method : new String[]{"recommendCompetitions", "precheckMaterials", "matchTeamMembers", "teacherCockpit", "adminAnalytics"}) {
            assertTrue(Arrays.stream(service.getDeclaredMethods()).map(Method::getName).anyMatch(method::equals), method);
        }
    }

    @Test
    void controllerHasRoleScopedEndpoints() throws Exception {
        Class<?> controller = Class.forName("com.etsaion.controller.AiFeatureController");
        RequireRole role = controller.getAnnotation(RequireRole.class);
        assertNotNull(role);
        assertArrayEquals(new String[]{"student", "teacher", "admin"}, role.value());
        for (String method : new String[]{"recommendations", "precheck", "teamMatches", "teacherCockpit", "adminAnalytics"}) {
            assertTrue(Arrays.stream(controller.getDeclaredMethods()).map(Method::getName).anyMatch(method::equals), method);
        }
    }
}
