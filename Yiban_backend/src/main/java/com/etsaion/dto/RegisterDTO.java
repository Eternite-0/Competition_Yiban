package com.etsaion.dto;

import lombok.Data;
import javax.validation.constraints.AssertTrue;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class RegisterDTO {
    /**
     * 角色: student/teacher
     */
    @NotBlank(message = "角色不能为空")
    private String role;

    /**
     * 学生注册: 学号
     * 教师注册: 工号
     */
    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 8, message = "密码长度不能少于8位")
    @javax.validation.constraints.Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\d).+$", message = "密码必须包含字母和数字")
    private String password;

    @NotBlank(message = "真实姓名不能为空")
    private String realName;

    /**
     * 学院（教师必填，学生从花名册获取）
     */
    private String college;

    /**
     * 专业（学生从花名册获取）
     */
    private String major;

    /**
     * 班级（学生从花名册获取）
     */
    private String className;

    /**
     * 年级（学生从花名册获取）
     */
    private String grade;

    /**
     * 手机号（选填）
     */
    private String phone;

    /**
     * 邮箱（选填）
     */
    private String email;

    /**
     * 是否同意注册协议（前端必传 true）
     */
    @AssertTrue(message = "必须同意注册协议")
    private boolean agreement;
}
