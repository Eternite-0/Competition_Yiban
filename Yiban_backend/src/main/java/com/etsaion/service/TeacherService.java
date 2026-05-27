package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.vo.RegistrationVO;
import com.etsaion.vo.StudentComprehensiveVO;
import com.etsaion.vo.UserVO;
import java.util.List;
import java.util.Map;

public interface TeacherService {
    Map<String, Object> getDashboardStats(String college);
    Page<RegistrationVO> monitorStudentEvents(int current, int size, String studentName, String status, String className);
    List<StudentComprehensiveVO> getComprehensiveData(String academicYear, String major);
    List<UserVO> listStudents(String keyword, String college, String className);
}
