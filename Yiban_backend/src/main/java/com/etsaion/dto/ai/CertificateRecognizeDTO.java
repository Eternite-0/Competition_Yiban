package com.etsaion.dto.ai;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class CertificateRecognizeDTO {
    private String fileName;
    @NotBlank(message = "证书图片地址不能为空")
    private String fileUrl;
    private String fileHash;
}
