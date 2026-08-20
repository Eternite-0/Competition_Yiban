package com.etsaion.vo;

import com.etsaion.entity.StudentAcademicCourse;
import com.etsaion.entity.StudentAcademicCreditRequirement;
import com.etsaion.entity.StudentAcademicExam;
import com.etsaion.entity.StudentAcademicGrade;
import com.etsaion.entity.StudentAcademicNotice;
import com.etsaion.entity.StudentAcademicSchedule;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class StudentAcademicDashboardVO {
    private StudentAcademicSnapshotVO summary;
    private List<StudentAcademicCreditRequirement> creditRequirements = new ArrayList<>();
    private List<StudentAcademicCourse> planCourses = new ArrayList<>();
    private List<StudentAcademicGrade> grades = new ArrayList<>();
    private List<StudentAcademicSchedule> schedules = new ArrayList<>();
    private List<StudentAcademicExam> exams = new ArrayList<>();
    private List<StudentAcademicNotice> notices = new ArrayList<>();
}
