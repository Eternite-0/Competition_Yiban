package com.etsaion.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * 认证端点速率限制过滤器
 * 对 /api/auth/login 和 /api/auth/register 实施滑动窗口限流
 * 60 秒内同一 IP 最多 20 次请求
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 15)
public class AuthRateLimitFilter implements Filter {

    private static final long WINDOW_MS = 60_000; // 60 秒窗口
    private static final int MAX_REQUESTS = 20;    // 窗口内最大请求数
    private static final String LOGIN_PATH = "/api/auth/login";
    private static final String REGISTER_PATH = "/api/auth/register";

    private final ConcurrentHashMap<String, Deque<Long>> requestCounts = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();

        // 只拦截认证端点
        if (!LOGIN_PATH.equals(path) && !REGISTER_PATH.equals(path)) {
            chain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(httpRequest);
        long now = System.currentTimeMillis();

        Deque<Long> timestamps = requestCounts.computeIfAbsent(clientIp, k -> new ConcurrentLinkedDeque<>());

        // 清除窗口外的旧记录
        while (!timestamps.isEmpty() && (now - timestamps.peekFirst()) > WINDOW_MS) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= MAX_REQUESTS) {
            log.warn("IP {} 触发速率限制，当前窗口内 {} 次请求", clientIp, timestamps.size());
            httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            httpResponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
            httpResponse.setHeader("Retry-After", "60");

            Map<String, Object> errorBody = Map.of(
                    "code", 429,
                    "message", "请求过于频繁，请稍后再试",
                    "data", (Object) Map.of()
            );
            httpResponse.getWriter().write(objectMapper.writeValueAsString(errorBody));
            return;
        }

        // 记录本次请求
        timestamps.addLast(now);

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            // 取第一个 IP（客户端真实 IP）
            ip = ip.split(",")[0].trim();
        }
        if (ip == null || ip.isBlank()) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isBlank()) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}
