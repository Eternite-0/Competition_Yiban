package com.etsaion;

import com.etsaion.interceptor.RequireRole;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiCompetitionDraftContractTest {

    @Test
    void aiCompetitionDraftBackendContractExists() throws Exception {
        assertNotNull(Class.forName("com.etsaion.entity.AiCompetitionDraft"));
        assertNotNull(Class.forName("com.etsaion.mapper.AiCompetitionDraftMapper"));
        assertNotNull(Class.forName("com.etsaion.dto.ai.CompetitionDraftConfirmDTO"));
        assertNotNull(Class.forName("com.etsaion.dto.ai.CompetitionDraftParseUrlDTO"));
        assertNotNull(Class.forName("com.etsaion.vo.ai.AiCompetitionDraftVO"));

        Class<?> documentContentService = Class.forName("com.etsaion.service.ai.DocumentContentService");
        assertTrue(hasMethod(documentContentService, "readText"));
        assertTrue(hasMethod(documentContentService, "readMultipartFile"));
        assertTrue(hasMethod(documentContentService, "readUrl"));

        Class<?> draftService = Class.forName("com.etsaion.service.ai.AiCompetitionDraftService");
        assertTrue(hasMethod(draftService, "parseFile"));
        assertTrue(hasMethod(draftService, "parseUrl"));
        assertTrue(hasMethod(draftService, "listDrafts"));
        assertTrue(hasMethod(draftService, "getDraftDetail"));
        assertTrue(hasMethod(draftService, "updateDraft"));
        assertTrue(hasMethod(draftService, "confirmDraft"));
        assertTrue(hasMethod(draftService, "ignoreDraft"));
    }

    @Test
    void aiCompetitionControllerIsAdminOnlyAndExposesDraftFlow() throws Exception {
        Class<?> controller = Class.forName("com.etsaion.controller.AiCompetitionController");
        RequireRole role = controller.getAnnotation(RequireRole.class);
        assertNotNull(role);
        assertArrayEquals(new String[]{"admin"}, role.value());
        assertTrue(hasMethod(controller, "parseFile"));
        assertTrue(hasMethod(controller, "parseUrl"));
        assertTrue(hasMethod(controller, "listDrafts"));
        assertTrue(hasMethod(controller, "detail"));
        assertTrue(hasMethod(controller, "updateDraft"));
        assertTrue(hasMethod(controller, "confirmDraft"));
        assertTrue(hasMethod(controller, "ignoreDraft"));
    }

    private boolean hasMethod(Class<?> type, String name) {
        return Arrays.stream(type.getDeclaredMethods())
                .map(Method::getName)
                .anyMatch(name::equals);
    }
}
