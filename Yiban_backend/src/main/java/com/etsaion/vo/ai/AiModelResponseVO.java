package com.etsaion.vo.ai;

public class AiModelResponseVO {
    private boolean success;
    private String content;
    private String errorMessage;
    private Integer statusCode;
    private String rawResponse;

    public static AiModelResponseVO success(String content, String rawResponse) {
        AiModelResponseVO response = new AiModelResponseVO();
        response.setSuccess(true);
        response.setContent(content);
        response.setRawResponse(rawResponse);
        return response;
    }

    public static AiModelResponseVO error(String errorMessage) {
        AiModelResponseVO response = new AiModelResponseVO();
        response.setSuccess(false);
        response.setErrorMessage(errorMessage);
        return response;
    }

    public static AiModelResponseVO error(String errorMessage, Integer statusCode, String rawResponse) {
        AiModelResponseVO response = error(errorMessage);
        response.setStatusCode(statusCode);
        response.setRawResponse(rawResponse);
        return response;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Integer getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(Integer statusCode) {
        this.statusCode = statusCode;
    }

    public String getRawResponse() {
        return rawResponse;
    }

    public void setRawResponse(String rawResponse) {
        this.rawResponse = rawResponse;
    }
}
