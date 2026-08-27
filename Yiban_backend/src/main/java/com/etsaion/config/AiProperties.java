package com.etsaion.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {
    /**
     * OpenAI-compatible API base URL. Agnes AI is the default provider; the
     * existing environment variables can still override this for another
     * compatible provider.
     */
    private String baseUrl = "https://api.agnes-ai.cn/v1";
    private String apiKey = "";
    private String model = "agnes-2.5-flash";
    private String visionModel = "agnes-2.5-flash";
    /**
     * Agnes documents the standard Chat Completions fields but does not
     * document response_format=json_object. Keep it opt-in so JSON prompts
     * remain compatible with Agnes and other OpenAI-compatible gateways.
     */
    private boolean jsonResponseFormat = false;
    private int contextWindow = 1000000;
    private int timeoutSeconds = 90;
    private int maxRetries = 0;

    public boolean hasApiKey() {
        return StringUtils.hasText(apiKey);
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getVisionModel() {
        return visionModel;
    }

    public void setVisionModel(String visionModel) {
        this.visionModel = visionModel;
    }

    public boolean isJsonResponseFormat() {
        return jsonResponseFormat;
    }

    public void setJsonResponseFormat(boolean jsonResponseFormat) {
        this.jsonResponseFormat = jsonResponseFormat;
    }

    public int getContextWindow() {
        return contextWindow;
    }

    public void setContextWindow(int contextWindow) {
        this.contextWindow = contextWindow;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public int getMaxRetries() {
        return maxRetries;
    }

    public void setMaxRetries(int maxRetries) {
        this.maxRetries = maxRetries;
    }
}
