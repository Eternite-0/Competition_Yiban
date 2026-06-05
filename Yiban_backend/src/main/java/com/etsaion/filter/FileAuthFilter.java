package com.etsaion.filter;

import cn.hutool.core.util.StrUtil;
import com.etsaion.utils.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 文件访问认证过滤器
 * 拦截 /files/** 路径，要求 JWT 认证
 * 支持 Authorization header 和 ?token= 查询参数两种方式
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 12)
public class FileAuthFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();

        // 只拦截 /files/ 路径
        if (!path.startsWith("/files/")) {
            chain.doFilter(request, response);
            return;
        }

        // 从 Authorization header 或 query param 获取 token
        String token = extractToken(httpRequest);

        if (StrUtil.isBlank(token) || !JwtUtil.validateToken(token)) {
            log.warn("文件访问认证失败: URI={}, IP={}", path, httpRequest.getRemoteAddr());
            httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            httpResponse.setContentType("application/json;charset=UTF-8");
            httpResponse.getWriter().write("{\"code\":401,\"message\":\"访问文件需要认证\",\"data\":null}");
            return;
        }

        chain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        // 优先从 Authorization header 获取
        String authHeader = request.getHeader("Authorization");
        if (StrUtil.isNotBlank(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        // 回退到查询参数 ?token=
        return request.getParameter("token");
    }
}
