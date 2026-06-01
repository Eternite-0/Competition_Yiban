package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.Message;
import java.util.List;

public interface MessageService extends IService<Message> {
    List<Message> getMyMessages(Long userId);
    Page<Message> getMyMessagesPage(Long userId, int current, int size);
    void markAsRead(Long userId, Long messageId);
    void markAllAsRead(Long userId);
    void deleteMessage(Long userId, Long messageId);
}
