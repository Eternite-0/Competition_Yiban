package com.etsaion.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.AwardProofStudent;
import com.etsaion.mapper.AwardProofStudentMapper;
import com.etsaion.service.AwardProofStudentService;
import org.springframework.stereotype.Service;

@Service
public class AwardProofStudentServiceImpl extends ServiceImpl<AwardProofStudentMapper, AwardProofStudent>
        implements AwardProofStudentService {
}
