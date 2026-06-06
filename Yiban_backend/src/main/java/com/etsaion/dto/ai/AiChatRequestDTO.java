package com.etsaion.dto.ai;

import lombok.Data;

import javax.validation.constraints.AssertTrue;
import java.util.List;

@Data
public class AiChatRequestDTO {
    private Long conversationId;
    private String message;
    private List<String> imageDataUrls;

    @AssertTrue(message = "消息内容或图片附件不能为空")
    public boolean isContentPresent() {
        return (message != null && !message.trim().isEmpty())
                || (imageDataUrls != null && !imageDataUrls.isEmpty());
    }
}
