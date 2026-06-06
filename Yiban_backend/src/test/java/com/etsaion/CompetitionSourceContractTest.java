package com.etsaion;

import com.etsaion.interceptor.RequireRole;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CompetitionSourceContractTest {

    @Test
    void competitionSourceBackendContractExists() throws Exception {
        assertNotNull(Class.forName("com.etsaion.entity.CompetitionSource"));
        assertNotNull(Class.forName("com.etsaion.mapper.CompetitionSourceMapper"));
        assertNotNull(Class.forName("com.etsaion.dto.ai.CompetitionSourceSaveDTO"));
        assertNotNull(Class.forName("com.etsaion.vo.ai.CompetitionSourceVO"));
        Class<?> service = Class.forName("com.etsaion.service.CompetitionSourceService");
        assertTrue(hasMethod(service, "listSources"));
        assertTrue(hasMethod(service, "saveSource"));
        assertTrue(hasMethod(service, "deleteSource"));
        assertTrue(hasMethod(service, "crawlSource"));

        Class<?> crawler = Class.forName("com.etsaion.service.ai.CrawlerService");
        assertTrue(hasMethod(crawler, "crawlSource"));
    }

    @Test
    void competitionSourceControllerIsAdminOnlyAndExposesCrud() throws Exception {
        Class<?> controller = Class.forName("com.etsaion.controller.CompetitionSourceController");
        RequireRole role = controller.getAnnotation(RequireRole.class);
        assertNotNull(role);
        assertArrayEquals(new String[]{"admin"}, role.value());
        assertTrue(hasMethod(controller, "listSources"));
        assertTrue(hasMethod(controller, "createSource"));
        assertTrue(hasMethod(controller, "updateSource"));
        assertTrue(hasMethod(controller, "deleteSource"));
        assertTrue(hasMethod(controller, "crawlSource"));
    }

    private boolean hasMethod(Class<?> type, String name) {
        return Arrays.stream(type.getDeclaredMethods())
                .map(Method::getName)
                .anyMatch(name::equals);
    }
}
