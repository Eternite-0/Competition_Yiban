package com.etsaion;

import cn.hutool.json.JSONObject;
import com.etsaion.dto.ai.AiChatRequestDTO;
import com.etsaion.entity.AiConversation;
import com.etsaion.entity.AiMessage;
import com.etsaion.service.ai.AiConversationService;
import com.etsaion.service.ai.AiMessageService;
import com.etsaion.service.ai.AssistantToolRegistry;
import com.etsaion.service.ai.MimoModelClient;
import com.etsaion.service.impl.AiChatServiceImpl;
import com.etsaion.vo.ai.AiChatResponseVO;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiChatComprehensiveRankTest {

    @Test
    void studentComprehensiveRankQuestionBypassesModelAndReturnsRankOnlyToolContext() {
        AiChatServiceImpl service = new AiChatServiceImpl();
        AiConversationService conversationService = mock(AiConversationService.class);
        AiMessageService messageService = mock(AiMessageService.class);
        AssistantToolRegistry registry = mock(AssistantToolRegistry.class);
        MimoModelClient modelClient = mock(MimoModelClient.class);
        AtomicLong conversationId = new AtomicLong(1L);
        AtomicLong messageId = new AtomicLong(1L);

        when(registry.executeTool("get_my_comprehensive_score", "{}", 21L, "student"))
                .thenReturn("""
                        {"found":true,"academicYear":"2024-2025-1","comprehensiveRank":3,"rankTotal":109,"comprehensiveRankPercent":0.02752294,"rankScope":"2024级人工智能","scopeNote":"该官方综测排名仅限学生所在年级和专业范围，不要按全校重新计算。"}
                        """);
        when(conversationService.save(any(AiConversation.class))).thenAnswer(invocation -> {
            AiConversation conversation = invocation.getArgument(0);
            conversation.setId(conversationId.getAndIncrement());
            return true;
        });
        when(conversationService.updateById(any(AiConversation.class))).thenReturn(true);
        when(messageService.save(any(AiMessage.class))).thenAnswer(invocation -> {
            AiMessage message = invocation.getArgument(0);
            message.setId(messageId.getAndIncrement());
            return true;
        });

        ReflectionTestUtils.setField(service, "aiConversationService", conversationService);
        ReflectionTestUtils.setField(service, "aiMessageService", messageService);
        ReflectionTestUtils.setField(service, "assistantToolRegistry", registry);
        ReflectionTestUtils.setField(service, "mimoModelClient", modelClient);

        AiChatRequestDTO request = new AiChatRequestDTO();
        request.setMessage("查一下我的综测排名，只要排名和百分比");

        AiChatResponseVO response = service.chat(21L, "student", request);

        assertTrue(response.getAnswer().contains("3 / 109"));
        assertTrue(response.getAnswer().contains("2.8%"));
        assertTrue(response.getAnswer().contains("2024级人工智能"));
        assertNotNull(response.getConversationId());
        assertTrue(response.getToolContext().containsKey("get_my_comprehensive_score"));
        verify(messageService, times(2)).save(any(AiMessage.class));
        verify(conversationService).updateById(any(AiConversation.class));

        JSONObject payload = (JSONObject) response.getToolContext().get("get_my_comprehensive_score");
        assertEquals(3, payload.getInt("comprehensiveRank"));
        assertEquals(109L, payload.getLong("rankTotal"));
        assertEquals("0.02752294", payload.getStr("comprehensiveRankPercent"));
        assertEquals("2024级人工智能", payload.getStr("rankScope"));
        assertFalse(payload.containsKey("studentNo"));
        assertFalse(payload.containsKey("realName"));
        assertFalse(payload.containsKey("college"));
        assertFalse(payload.containsKey("className"));

        ArgumentCaptor<AiMessage> messageCaptor = ArgumentCaptor.forClass(AiMessage.class);
        verify(messageService, times(2)).save(messageCaptor.capture());
        assertEquals("user", messageCaptor.getAllValues().get(0).getRole());
        assertEquals("assistant", messageCaptor.getAllValues().get(1).getRole());
        assertTrue(messageCaptor.getAllValues().get(1).getToolResultJson().contains("get_my_comprehensive_score"));
        verifyNoInteractions(modelClient);
    }
}
