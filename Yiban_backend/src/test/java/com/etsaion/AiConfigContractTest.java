package com.etsaion;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiConfigContractTest {

    @Test
    void aiPropertiesClassExistsWithExpectedDefaultsAndKeyCheck() throws Exception {
        Class<?> type = Class.forName("com.etsaion.config.AiProperties");
        Object props = type.getDeclaredConstructor().newInstance();

        assertEquals("https://token-plan-cn.xiaomimimo.com/v1", type.getMethod("getBaseUrl").invoke(props));
        assertEquals("mimo-v2.5-pro", type.getMethod("getModel").invoke(props));
        assertEquals("mimo-v2-omni", type.getMethod("getVisionModel").invoke(props));
        assertEquals(1000000, type.getMethod("getContextWindow").invoke(props));
        assertEquals(25, type.getMethod("getTimeoutSeconds").invoke(props));
        assertEquals(0, type.getMethod("getMaxRetries").invoke(props));
        assertEquals(false, type.getMethod("hasApiKey").invoke(props));
    }

    @Test
    void applicationYamlExposesAiConfigurationWithoutRealApiKey() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yml"));
        Properties properties = yaml.getObject();

        assertNotNull(properties);
        assertEquals("${AI_BASE_URL:https://token-plan-cn.xiaomimimo.com/v1}", properties.getProperty("ai.base-url"));
        assertEquals("${AI_API_KEY:}", properties.getProperty("ai.api-key"));
        assertEquals("${AI_MODEL:mimo-v2.5-pro}", properties.getProperty("ai.model"));
        assertEquals("${AI_VISION_MODEL:mimo-v2-omni}", properties.getProperty("ai.vision-model"));
        assertEquals("${AI_CONTEXT_WINDOW:1000000}", properties.getProperty("ai.context-window"));
        assertEquals("${AI_TIMEOUT_SECONDS:25}", properties.getProperty("ai.timeout-seconds"));
        assertEquals("${AI_MAX_RETRIES:0}", properties.getProperty("ai.max-retries"));
        assertTrue(properties.getProperty("ai.api-key").contains("AI_API_KEY"));
    }
}
