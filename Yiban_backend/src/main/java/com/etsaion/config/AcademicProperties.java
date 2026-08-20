package com.etsaion.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "academic")
public class AcademicProperties {
    /** 只有部署环境具备学校授权的网络访问条件时才开启。 */
    private boolean syncEnabled = false;

    /** 正方教务系统根地址；不得填写 VPN 登录页。 */
    private String baseUrl = "";

    private int timeoutSeconds = 15;

    private long sessionTtlMinutes = 20;
}
