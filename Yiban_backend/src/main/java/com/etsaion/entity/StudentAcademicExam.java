package com.etsaion.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("student_academic_exam")
public class StudentAcademicExam {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long syncId;
    private Long studentId;
    private String academicYear;
    private String term;
    private String courseNo;
    private String courseName;
    private String examType;
    private LocalDateTime examTime;
    private String location;
    private String seatNo;
    private String examStatus;
    private LocalDateTime createTime;
}
