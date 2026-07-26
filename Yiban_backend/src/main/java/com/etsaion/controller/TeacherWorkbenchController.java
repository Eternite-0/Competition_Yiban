package com.etsaion.controller;

import com.etsaion.interceptor.RequireRole;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "教师审核工作台", description = "教师端统一处理赛事报名与成果审核待办")
@RestController
@RequestMapping("/api/teacher/workbench")
@RequireRole("teacher")
public class TeacherWorkbenchController extends WorkbenchControllerSupport {
}
