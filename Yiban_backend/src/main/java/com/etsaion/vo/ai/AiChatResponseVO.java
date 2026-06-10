package com.etsaion.vo.ai;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class AiChatResponseVO {
    private Long conversationId;
    private String answer;
    private Map<String, Object> toolContext;
    private List<AiArtifactVO> artifacts;
    private LocalDateTime createTime;
}
