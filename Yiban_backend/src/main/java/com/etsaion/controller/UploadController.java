package com.etsaion.controller;

import cn.hutool.core.map.MapUtil;
import com.etsaion.config.QiniuConfig;
import com.etsaion.dto.Result;
import com.etsaion.service.QiniuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "文件上传", description = "七牛云文件上传凭证接口")
@RestController
@RequestMapping("/api/upload")
public class UploadController {

    @Autowired
    private QiniuService qiniuService;

    @Autowired
    private QiniuConfig qiniuConfig;

    @Operation(summary = "获取七牛云上传凭证")
    @GetMapping("/token")
    public Result<Map<String, Object>> getUploadToken(
            @RequestParam(required = false) String prefix) {

        String token = qiniuService.generateUploadToken(prefix);
        Map<String, Object> data = MapUtil.<String, Object>builder()
                .put("token", token)
                .put("domain", qiniuConfig.getDomain())
                .put("bucket", qiniuConfig.getBucket())
                .put("uploadUrl", qiniuConfig.getUploadUrl())
                .build();
        return Result.success(data);
    }

    @Operation(summary = "获取私有空间文件的签名下载链接")
    @GetMapping("/sign-url")
    public Result<String> getSignedUrl(@RequestParam String fileUrl) {
        String signedUrl = qiniuService.getSignedUrl(fileUrl);
        return Result.success(signedUrl);
    }
}
