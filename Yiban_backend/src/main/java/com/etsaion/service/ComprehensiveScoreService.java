package com.etsaion.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.ComprehensiveScore;
import com.etsaion.vo.ComprehensiveScoreVO;

import java.util.List;

public interface ComprehensiveScoreService extends IService<ComprehensiveScore> {
    ComprehensiveScoreVO getLatestByStudentNo(String studentNo);
    ComprehensiveScoreVO getByStudentNo(String studentNo, String academicYear);
    List<ComprehensiveScoreVO> listByScope(String academicYear, String college, String major);
}
