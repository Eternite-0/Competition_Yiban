package com.etsaion.service.impl;

import com.etsaion.config.QiniuConfig;
import com.etsaion.service.QiniuService;
import com.qiniu.util.Auth;
import com.qiniu.util.StringMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;

@Service
public class QiniuServiceImpl implements QiniuService {

    @Autowired
    private QiniuConfig qiniuConfig;

    @Override
    public String generateUploadToken() {
        return generateUploadToken(null);
    }

    @Override
    public String generateUploadToken(String keyPrefix) {
        Auth auth = Auth.create(qiniuConfig.getAccessKey(), qiniuConfig.getSecretKey());
        StringMap putPolicy = new StringMap();
        putPolicy.put("returnBody",
                "{\"key\":\"$(key)\",\"hash\":\"$(etag)\",\"bucket\":\"$(bucket)\",\"fsize\":$(fsize)}");
        if (keyPrefix != null) {
            putPolicy.put("isPrefixalScope", 1);
            return auth.uploadToken(qiniuConfig.getBucket(), keyPrefix, 3600, putPolicy);
        }
        return auth.uploadToken(qiniuConfig.getBucket(), null, 3600, putPolicy);
    }

    @Override
    public String getFileUrl(String key) {
        return buildCdnUrl(key);
    }

    @Override
    public String getSignedUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return fileUrl;
        }
        // Local file URLs don't need Qiniu signing
        if (fileUrl.startsWith("/api/file/serve/")) {
            return fileUrl;
        }
        // Accept either a full URL or a bare key/path — prepend the configured domain if missing
        String fullUrl = buildCdnUrl(extractObjectPath(fileUrl));
        Auth auth = Auth.create(qiniuConfig.getAccessKey(), qiniuConfig.getSecretKey());
        return auth.privateDownloadUrl(fullUrl, 3600);
    }

    private String buildCdnUrl(String keyOrUrl) {
        String domain = qiniuConfig.getDomain();
        if (domain == null || domain.isBlank()) return keyOrUrl;
        String prefix = domain.endsWith("/") ? domain.substring(0, domain.length() - 1) : domain;
        String path = keyOrUrl == null ? "" : keyOrUrl.trim();
        while (path.startsWith("/")) path = path.substring(1);
        return prefix + (path.isEmpty() ? "" : "/" + path);
    }

    private String extractObjectPath(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) return "";
        String value = fileUrl.trim();
        try {
            if (value.startsWith("http://") || value.startsWith("https://")) {
                String path = URI.create(value).getPath();
                return path == null ? "" : path;
            }
        } catch (Exception ignored) {
            // Treat malformed values as bare keys below.
        }
        int query = value.indexOf('?');
        return query >= 0 ? value.substring(0, query) : value;
    }
}
