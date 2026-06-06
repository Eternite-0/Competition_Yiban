package com.etsaion.vo.ai;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class AiChatResponseVO {
    private Long conversationId;
    private String answer;
    private Map<String, Object> toolContext;
    private LocalDateTime createTime;
}
