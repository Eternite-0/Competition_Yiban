package com.etsaion.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.Message;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.MessageMapper;
import com.etsaion.service.MessageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MessageServiceImpl extends ServiceImpl<MessageMapper, Message> implements MessageService {

    @Override
    public List<Message> getMyMessages(Long userId) {
        return this.list(new LambdaQueryWrapper<Message>()
                .eq(Message::getToUser, userId)
                .orderByDesc(Message::getCreateTime));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void markAsRead(Long userId, Long messageId) {
        Message msg = this.getById(messageId);
        if (msg == null) {
            throw new BusinessException("消息不存在");
        }
        if (!msg.getToUser().equals(userId)) {
            throw new BusinessException("您无权修改此消息状态");
        }

        msg.setIsRead(1);
        this.updateById(msg);
    }
}
