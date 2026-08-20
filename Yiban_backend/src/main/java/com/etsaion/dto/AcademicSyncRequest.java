package com.etsaion.dto;

import lombok.Data;


@Data
public class AcademicSyncRequest {
    /** A short-lived in-memory session created by the challenge endpoint. */
    private String sessionId;

    /** Optional campus/正方 base URL. Defaults to Lingnan WebVPN. */
    private String baseUrl;

    /** WebVPN account; when omitted, teachingUsername/password are reused. */
    private String webvpnUsername;

    private String webvpnPassword;

    /** 默认使用易赛通登录学号；仅在教务账号不同的学校填写。 */
    private String teachingUsername;

    /** 仅用于当前同步请求，不保存、不写入日志。 */
    private String password;

    /** 部分学校在登录时会要求验证码；本期仅透传用户已获得的验证码。 */
    private String verificationCode;
}
