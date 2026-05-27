package com.etsaion.service;

public interface QiniuService {
    String generateUploadToken();
    String generateUploadToken(String keyPrefix);
    String getFileUrl(String key);
    String getSignedUrl(String fileUrl);
}
