package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.vo.RegistrationVO;
import com.etsaion.vo.StudentComprehensiveVO;
import com.etsaion.vo.UserVO;
import java.util.List;
import java.util.Map;

public interface TeacherService {
    Map<String, Object> getDashboardStats(String college, String grade, String major, String className);
    Page<RegistrationVO> monitorStudentEvents(int current, int size, String studentName, String status, String className, String college, String grade, String major);
    List<StudentComprehensiveVO> getComprehensiveData(String academicYear, String major);
    List<UserVO> listStudents(String keyword, String college, String className, String grade, String major);

    // Cascade filter APIs
    List<String> listColleges();
    List<String> listMajors(String college);
    List<String> listGrades(String college, String major);
    List<String> listClasses(String college, String major, String grade);

    // College overview
    Map<String, Object> getCollegeOverview(String college, String grade, String major);

    // Student detail
    Map<String, Object> getStudentDetail(Long studentId);

    // Trend data
    Map<String, Object> getTrend(String college, String grade, String major);

    // Student detail export
    Map<String, Object> getStudentExportData(Long studentId);
}
