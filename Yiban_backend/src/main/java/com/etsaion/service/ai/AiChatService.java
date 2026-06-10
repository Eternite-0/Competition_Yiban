package com.etsaion.service.ai;

import com.etsaion.dto.ai.AiChatRequestDTO;
import com.etsaion.vo.ai.AiChatResponseVO;
import com.etsaion.vo.ai.AiConversationVO;

import java.util.List;
import java.util.function.Consumer;

public interface AiChatService {
    AiChatResponseVO chat(Long userId, String role, AiChatRequestDTO dto);
    AiChatResponseVO chat(Long userId, String role, AiChatRequestDTO dto, Consumer<String> progress);
    List<AiConversationVO> listConversations(Long userId);
    AiConversationVO getConversationDetail(Long userId, Long conversationId);
    void deleteConversation(Long userId, Long conversationId);
}
