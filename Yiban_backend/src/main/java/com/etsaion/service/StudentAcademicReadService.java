package com.etsaion.service;

import com.etsaion.vo.AcademicTermVO;
import com.etsaion.vo.StudentAcademicDashboardVO;

import java.util.List;

public interface StudentAcademicReadService {
    StudentAcademicDashboardVO getDashboard(Long studentId, String academicYear, String term);

    List<AcademicTermVO> listTerms(Long studentId);
}
