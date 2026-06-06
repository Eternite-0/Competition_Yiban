package com.etsaion.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.AiConversation;
import com.etsaion.mapper.AiConversationMapper;
import com.etsaion.service.ai.AiConversationService;
import org.springframework.stereotype.Service;

@Service
public class AiConversationServiceImpl extends ServiceImpl<AiConversationMapper, AiConversation>
        implements AiConversationService {
}
