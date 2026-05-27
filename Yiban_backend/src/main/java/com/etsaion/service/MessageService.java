package com.etsaion.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.Message;
import java.util.List;

public interface MessageService extends IService<Message> {
    List<Message> getMyMessages(Long userId);
    void markAsRead(Long userId, Long messageId);
}
