package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("student_academic_schedule")
public class StudentAcademicSchedule {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long syncId;
    private Long studentId;
    private String academicYear;
    private String term;
    private String courseNo;
    private String courseName;
    private String teachingClass;
    private String teacherName;
    private String location;
    private Integer weekday;
    private String sectionText;
    private String weekText;
    private String startTime;
    private String endTime;
    private LocalDateTime createTime;
}
