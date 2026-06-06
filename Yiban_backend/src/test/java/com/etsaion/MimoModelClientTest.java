package com.etsaion;

import com.etsaion.config.AiProperties;
import com.etsaion.dto.ai.AiMessageDTO;
import com.etsaion.service.ai.MimoModelClient;
import com.etsaion.vo.ai.AiModelResponseVO;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MimoModelClientTest {
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void returnsClearErrorWhenApiKeyMissing() {
        MimoModelClient client = new MimoModelClient(new AiProperties());

        AiModelResponseVO response = client.chatText("system", List.of(new AiMessageDTO("user", "hello")));

        assertFalse(response.isSuccess());
        assertEquals("AI_API_KEY 未配置，无法调用 AI 模型服务", response.getErrorMessage());
    }

    @Test
    void parsesOpenAiCompatibleJsonResponse() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        startServer((exchange) -> {
            calls.incrementAndGet();
            assertEquals("Bearer test-key", exchange.getRequestHeaders().getFirst("Authorization"));
            String body = """
                    {"choices":[{"message":{"content":"{\\\"ok\\\":true}"}}]}
                    """;
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });

        AiProperties props = testProperties();
        MimoModelClient client = new MimoModelClient(props);

        AiModelResponseVO response = client.chatJson("system", "user", null);

        assertTrue(response.isSuccess());
        assertEquals("{\"ok\":true}", response.getContent());
        assertEquals(1, calls.get());
    }

    @Test
    void sendsVisionTextRequestWithImageDataUrl() throws Exception {
        startServer((exchange) -> {
            String requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            assertTrue(requestBody.contains("\"type\":\"image_url\""));
            assertTrue(requestBody.contains("data:image/png;base64,AAA"));
            assertFalse(requestBody.contains("response_format"));
            String body = """
                    {"choices":[{"message":{"content":"已读取图片"}}]}
                    """;
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });

        MimoModelClient client = new MimoModelClient(testProperties());

        AiModelResponseVO response = client.chatVisionText(
                "system",
                "请分析图片",
                List.of("data:image/png;base64,AAA"));

        assertTrue(response.isSuccess());
        assertEquals("已读取图片", response.getContent());
    }

    @Test
    void retriesServerErrorsAndWrapsFailure() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        startServer((exchange) -> {
            calls.incrementAndGet();
            byte[] bytes = "boom".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(500, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });

        AiProperties props = testProperties();
        props.setMaxRetries(1);
        MimoModelClient client = new MimoModelClient(props);

        AiModelResponseVO response = client.chatText("system", List.of(new AiMessageDTO("user", "hello")));

        assertFalse(response.isSuccess());
        assertEquals("AI 模型调用失败: HTTP 500", response.getErrorMessage());
        assertEquals(2, calls.get());
    }

    private AiProperties testProperties() {
        AiProperties props = new AiProperties();
        props.setApiKey("test-key");
        props.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/v1");
        props.setTimeoutSeconds(5);
        props.setMaxRetries(0);
        return props;
    }

    private void startServer(ExchangeHandler handler) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/chat/completions", exchange -> handler.handle(exchange));
        server.start();
    }

    private interface ExchangeHandler {
        void handle(com.sun.net.httpserver.HttpExchange exchange) throws IOException;
    }
}
