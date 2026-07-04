package cn.edu.lingnan.servlet;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 登录过滤器，未登录用户只能访问登录页和静态资源。
 */
@WebFilter("/*")
public class AuthFilter implements Filter {
    @Override
    public void init(FilterConfig filterConfig) {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        String uri = httpRequest.getRequestURI();
        String contextPath = httpRequest.getContextPath();

        boolean publicResource = uri.endsWith("/login")
                || uri.contains("/assets/")
                || uri.endsWith("/index.jsp");

        if (publicResource || httpRequest.getSession().getAttribute("loginUser") != null) {
            chain.doFilter(request, response);
            return;
        }

        httpResponse.sendRedirect(contextPath + "/login");
    }

    @Override
    public void destroy() {
    }
}
