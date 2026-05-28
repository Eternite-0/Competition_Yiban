package com.etsaion.controller;

import cn.hutool.core.util.IdUtil;
import com.etsaion.dto.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;

@Tag(name = "文件存储管理接口", description = "支持本地环境上传赛事附件、成果证明等，返回可直接访问的文件 URL")
@RestController
@RequestMapping("/api/file")
public class FileController {

    @Value("${file.upload-path}")
    private String uploadPath;

    @Operation(summary = "单文件上传接口")
    @PostMapping("/upload")
    public Result<String> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return Result.error("文件不能为空");
        }

        try {
            // Resolve to absolute path so storage is consistent regardless of JVM cwd
            File dir = new File(uploadPath).getAbsoluteFile();
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // Create a unique file name
            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            String newFilename = IdUtil.simpleUUID() + ext;
            File targetFile = new File(dir, newFilename);
            
            // Save to physical disk
            file.transferTo(targetFile);

            // Return access URL mapped in WebMvcConfig
            String fileUrl = "/files/" + newFilename;
            return Result.success(fileUrl);
        } catch (IOException e) {
            return Result.error("文件上传失败，服务磁盘错误：" + e.getMessage());
        }
    }
}
