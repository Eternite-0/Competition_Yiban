package com.etsaion.controller;

import com.etsaion.interceptor.RequireRole;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

@Slf4j
@RestController
@RequestMapping("/api/file/serve")
@RequireRole({"student", "teacher", "admin"})
public class FileServeController {

    @Value("${file.upload-path}")
    private String uploadPath;

    @GetMapping("/**")
    public void serveFile(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String fullPath = request.getRequestURI();
        String prefix = "/api/file/serve/";
        if (!fullPath.startsWith(prefix)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        String filename = fullPath.substring(prefix.length());

        // 防止路径遍历
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "非法文件名");
            return;
        }

        File file = new File(new File(uploadPath).getAbsoluteFile(), filename);
        if (!file.exists() || !file.isFile()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "文件不存在");
            return;
        }

        // 设置响应头
        String contentType = Files.probeContentType(file.toPath());
        if (contentType == null) {
            if (filename.toLowerCase().endsWith(".xlsx")) {
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            } else if (filename.toLowerCase().endsWith(".docx")) {
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            } else {
                contentType = "application/octet-stream";
            }
        }
        response.setContentType(contentType);
        response.setContentLengthLong(file.length());
        response.setHeader("Content-Disposition", "inline; filename=\"" + file.getName() + "\"");

        // 流式输出
        Files.copy(file.toPath(), response.getOutputStream());
        response.getOutputStream().flush();
    }
}
