package com.etsaion.interceptor;

import cn.hutool.core.util.StrUtil;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.UserService;
import com.etsaion.utils.JwtUtil;
import com.etsaion.utils.UserContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Arrays;

@Slf4j
@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Autowired
    private UserService userService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Options requests pass automatically
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // Only handle controller methods
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        HandlerMethod handlerMethod = (HandlerMethod) handler;
        
        // Check for RequireRole annotation on method or class
        RequireRole requireRole = handlerMethod.getMethodAnnotation(RequireRole.class);
        if (requireRole == null) {
            requireRole = handlerMethod.getBeanType().getAnnotation(RequireRole.class);
        }

        // Parse token if exists, even if RequireRole is not present, to populate UserContext
        String token = request.getHeader("Authorization");
        if (StrUtil.isNotBlank(token)) {
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }
            
            if (JwtUtil.validateToken(token)) {
                Long userId = JwtUtil.getUserIdFromToken(token);
                String role = JwtUtil.getRoleFromToken(token);
                String username = JwtUtil.getUsernameFromToken(token);
                if (isTokenOwnerStillValid(userId, role, username)) {
                    UserContext.set(new UserContext.UserInfo(userId, role));
                } else {
                    log.warn("Token identity mismatch: userId={}, username={}, role={}, URI={}",
                            userId, username, role, request.getRequestURI());
                }
            }
        }

        // If require role is set, check permission
        if (requireRole != null) {
            if (UserContext.get() == null) {
                log.warn("认证失败: 未登录或登录已过期, URI={}", request.getRequestURI());
                throw new BusinessException(401, "未登录或登录已过期");
            }

            String currentRole = UserContext.getUserRole();
            String[] allowedRoles = requireRole.value();

            boolean hasPermission = Arrays.stream(allowedRoles)
                    .anyMatch(role -> role.equalsIgnoreCase(currentRole));

            if (!hasPermission) {
                log.warn("权限不足: 用户角色={}, 所需角色={}, URI={}", currentRole, String.join(",", allowedRoles), request.getRequestURI());
                throw new BusinessException(403, "权限不足，拒绝访问");
            }
        }

        return true;
    }

    private boolean isTokenOwnerStillValid(Long userId, String role, String username) {
        if (userId == null || StrUtil.isBlank(role) || StrUtil.isBlank(username)) {
            return false;
        }
        User user = userService.getById(userId);
        return user != null
                && username.equals(user.getUsername())
                && role.equalsIgnoreCase(user.getRole());
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // Clear thread local context to prevent memory leaks
        UserContext.remove();
    }
}
