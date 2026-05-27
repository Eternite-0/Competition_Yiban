package com.etsaion.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.vo.StudentGrowthVO;
import java.util.List;

public interface GrowthRecordService extends IService<GrowthRecord> {
    List<GrowthRecord> getTimeline(Long studentId);
    StudentGrowthVO getStudentGrowth(Long studentId);
}
