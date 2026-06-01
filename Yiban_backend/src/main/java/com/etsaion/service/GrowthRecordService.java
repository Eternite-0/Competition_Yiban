package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.vo.StudentGrowthVO;
import java.util.List;

public interface GrowthRecordService extends IService<GrowthRecord> {
    List<GrowthRecord> getTimeline(Long studentId);
    Page<GrowthRecord> getTimelinePage(Long studentId, int current, int size);
    StudentGrowthVO getStudentGrowth(Long studentId);
}
