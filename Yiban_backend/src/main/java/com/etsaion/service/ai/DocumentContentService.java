package com.etsaion.service.ai;

import com.etsaion.exception.BusinessException;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.stream.Collectors;

@Service
public class DocumentContentService {

    public String readMultipartFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("上传文件不能为空");
        }
        try {
            return readText(file.getOriginalFilename(), file.getBytes());
        } catch (IOException e) {
            throw new BusinessException("读取上传文件失败");
        }
    }

    public String readText(String fileName, byte[] bytes) {
        String name = fileName == null ? "" : fileName.toLowerCase();
        if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".html") || name.endsWith(".htm")) {
            return new String(bytes, StandardCharsets.UTF_8);
        }
        if (name.endsWith(".docx")) {
            return readDocx(bytes);
        }
        if (name.endsWith(".pdf")) {
            throw new BusinessException("暂不支持直接解析 PDF，请先转换为 DOCX 或 TXT 后上传");
        }
        return new String(bytes, StandardCharsets.UTF_8);
    }

    public String readUrl(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("User-Agent", "Etsaion-AI-Crawler/1.0")
                    .GET()
                    .build();
            HttpResponse<String> response = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build()
                    .send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException("读取 URL 失败，HTTP " + response.statusCode());
            }
            return stripHtml(response.body());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("读取 URL 失败：" + e.getMessage());
        }
    }

    private String readDocx(byte[] bytes) {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            return doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .filter(text -> text != null && !text.isBlank())
                    .collect(Collectors.joining("\n"));
        } catch (IOException e) {
            throw new BusinessException("读取 DOCX 文件失败");
        }
    }

    private String stripHtml(String html) {
        String withoutScripts = html.replaceAll("(?is)<script.*?</script>", " ")
                .replaceAll("(?is)<style.*?</style>", " ");
        return withoutScripts.replaceAll("(?is)<[^>]+>", " ")
                .replaceAll("&nbsp;", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
