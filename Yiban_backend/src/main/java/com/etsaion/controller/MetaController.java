package com.etsaion.controller;

import com.etsaion.dto.Result;
import com.etsaion.service.MajorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 注册等未登录场景需要的公共基础数据。
 *
 * 注册页此前直接调 {@code /api/admin/colleges}，而那是个 admin-only 端点，
 * 匿名请求必然 401 —— 前端把异常吞掉，学院下拉框就永远退到硬编码兜底，
 * 与管理员维护的专业表脱节。这里以 major 表为唯一来源开放只读访问。
 */
@Tag(name = "公共基础数据", description = "无需登录即可读取的院系等基础数据")
@RestController
@RequestMapping("/api/meta")
public class MetaController {

    @Autowired
    private MajorService majorService;

    @Operation(summary = "学院列表")
    @GetMapping("/colleges")
    public Result<List<String>> listColleges() {
        return Result.success(majorService.listColleges());
    }

    @Operation(summary = "专业列表")
    @GetMapping("/majors")
    public Result<List<Map<String, Object>>> listMajors(@RequestParam(required = false) String college) {
        return Result.success(majorService.listMajors(college));
    }
}
