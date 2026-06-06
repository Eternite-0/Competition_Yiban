package com.etsaion.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.AiMessage;
import com.etsaion.mapper.AiMessageMapper;
import com.etsaion.service.ai.AiMessageService;
import org.springframework.stereotype.Service;

@Service
public class AiMessageServiceImpl extends ServiceImpl<AiMessageMapper, AiMessage> implements AiMessageService {
}
