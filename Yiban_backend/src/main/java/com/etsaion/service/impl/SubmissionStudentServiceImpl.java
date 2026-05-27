package com.etsaion.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.SubmissionStudent;
import com.etsaion.mapper.SubmissionStudentMapper;
import com.etsaion.service.SubmissionStudentService;
import org.springframework.stereotype.Service;

@Service
public class SubmissionStudentServiceImpl extends ServiceImpl<SubmissionStudentMapper, SubmissionStudent> implements SubmissionStudentService {
}
