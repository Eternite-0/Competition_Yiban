package com.etsaion.service.impl;

import com.etsaion.config.QiniuConfig;
import com.etsaion.service.QiniuService;
import com.qiniu.util.Auth;
import com.qiniu.util.StringMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
        String domain = qiniuConfig.getDomain();
        if (domain.endsWith("/")) {
            return domain + key;
        }
        return domain + "/" + key;
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
        String fullUrl = fileUrl;
        if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
            String domain = qiniuConfig.getDomain();
            if (domain == null || domain.isEmpty()) {
                return fileUrl;
            }
            String prefix = domain.endsWith("/") ? domain.substring(0, domain.length() - 1) : domain;
            String suffix = fileUrl.startsWith("/") ? fileUrl : "/" + fileUrl;
            fullUrl = prefix + suffix;
        }
        Auth auth = Auth.create(qiniuConfig.getAccessKey(), qiniuConfig.getSecretKey());
        return auth.privateDownloadUrl(fullUrl, 3600);
    }
}
