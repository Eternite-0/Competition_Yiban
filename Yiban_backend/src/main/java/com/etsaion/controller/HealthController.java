package com.etsaion.controller;

import com.etsaion.dto.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Tag(name = "健康检查接口")
@RestController
@RequestMapping("/api")
public class HealthController {

    @Operation(summary = "系统健康检查")
    @GetMapping("/health")
    public Result<Map<String, Object>> health() {
        Map<String, Object> data = new HashMap<>();
        data.put("status", "ok");
        data.put("timestamp", LocalDateTime.now().toString());
        data.put("version", "1.0.0");
        return Result.success(data);
    }
}
