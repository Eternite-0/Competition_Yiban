package com.etsaion;

import com.etsaion.interceptor.RequireRole;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiChatContractTest {

    @Test
    void aiChatBackendContractExists() throws Exception {
        assertNotNull(Class.forName("com.etsaion.entity.AiConversation"));
        assertNotNull(Class.forName("com.etsaion.entity.AiMessage"));
        assertNotNull(Class.forName("com.etsaion.mapper.AiConversationMapper"));
        assertNotNull(Class.forName("com.etsaion.mapper.AiMessageMapper"));
        assertNotNull(Class.forName("com.etsaion.service.ai.AiConversationService"));
        assertNotNull(Class.forName("com.etsaion.service.ai.AiMessageService"));
        Class<?> chatService = Class.forName("com.etsaion.service.ai.AiChatService");
        assertTrue(hasMethod(chatService, "chat"));
        assertTrue(hasMethod(chatService, "listConversations"));
        assertTrue(hasMethod(chatService, "getConversationDetail"));
        assertTrue(hasMethod(chatService, "deleteConversation"));

        Class<?> tools = Class.forName("com.etsaion.service.ai.AssistantToolRegistry");
        for (String method : new String[]{"getToolDefinitions", "executeTool"}) {
            assertTrue(hasMethod(tools, method), method + " must exist");
        }
    }

    @Test
    void aiChatControllerExposesRequiredEndpointsForAllRoles() throws Exception {
        Class<?> controller = Class.forName("com.etsaion.controller.AiChatController");
        RequireRole role = controller.getAnnotation(RequireRole.class);
        assertNotNull(role);
        assertTrue(Arrays.asList(role.value()).contains("student"));
        assertTrue(Arrays.asList(role.value()).contains("teacher"));
        assertTrue(Arrays.asList(role.value()).contains("admin"));
        assertTrue(hasMethod(controller, "chat"));
        assertTrue(hasMethod(controller, "stream"));
        assertTrue(hasMethod(controller, "listConversations"));
        assertTrue(hasMethod(controller, "detail"));
        assertTrue(hasMethod(controller, "delete"));
    }

    private boolean hasMethod(Class<?> type, String name) {
        return Arrays.stream(type.getDeclaredMethods())
                .map(Method::getName)
                .anyMatch(name::equals);
    }
}
