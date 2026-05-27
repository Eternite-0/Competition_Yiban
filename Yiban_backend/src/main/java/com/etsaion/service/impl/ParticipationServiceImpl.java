package com.etsaion.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.Participation;
import com.etsaion.mapper.ParticipationMapper;
import com.etsaion.service.ParticipationService;
import org.springframework.stereotype.Service;

@Service
public class ParticipationServiceImpl extends ServiceImpl<ParticipationMapper, Participation> implements ParticipationService {
}
