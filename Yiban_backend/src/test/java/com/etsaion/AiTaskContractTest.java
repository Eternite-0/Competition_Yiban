package com.etsaion;

import com.etsaion.interceptor.RequireRole;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiTaskContractTest {

    @Test
    void aiTaskBackendContractExists() throws Exception {
        assertNotNull(Class.forName("com.etsaion.entity.AiTask"));
        assertNotNull(Class.forName("com.etsaion.mapper.AiTaskMapper"));
        Class<?> service = Class.forName("com.etsaion.service.ai.AiTaskService");
        assertTrue(hasMethod(service, "createTask"));
        assertTrue(hasMethod(service, "markRunning"));
        assertTrue(hasMethod(service, "markSucceeded"));
        assertTrue(hasMethod(service, "markFailed"));
        assertTrue(hasMethod(service, "getVisibleTask"));
        assertTrue(hasMethod(service, "listAdminTasks"));
        assertTrue(hasMethod(service, "retryFailedTask"));
        assertNotNull(Class.forName("com.etsaion.vo.ai.AiTaskVO"));
    }

    @Test
    void aiTaskControllerExposesRequiredEndpointsForAllRolesAndAdminActions() throws Exception {
        Class<?> controller = Class.forName("com.etsaion.controller.AiTaskController");
        RequireRole role = controller.getAnnotation(RequireRole.class);
        assertNotNull(role);
        assertTrue(Arrays.asList(role.value()).contains("student"));
        assertTrue(Arrays.asList(role.value()).contains("teacher"));
        assertTrue(Arrays.asList(role.value()).contains("admin"));
        assertTrue(hasMethod(controller, "getTask"));
        assertTrue(hasMethod(controller, "listTasks"));
        assertTrue(hasMethod(controller, "retryTask"));
    }

    private boolean hasMethod(Class<?> type, String name) {
        return Arrays.stream(type.getDeclaredMethods())
                .map(Method::getName)
                .anyMatch(name::equals);
    }
}
