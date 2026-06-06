package com.etsaion.vo.ai;

import com.etsaion.entity.AiMessage;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class AiConversationVO {
    private Long id;
    private Long userId;
    private String role;
    private String title;
    private LocalDateTime lastMessageAt;
    private LocalDateTime createTime;
    private List<AiMessage> messages;
}
