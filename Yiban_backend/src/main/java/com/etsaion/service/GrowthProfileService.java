package com.etsaion.service;

import com.etsaion.vo.GrowthProfileVO;

public interface GrowthProfileService {
    GrowthProfileVO getStudentProfile(Long studentId, String academicYear);
}
