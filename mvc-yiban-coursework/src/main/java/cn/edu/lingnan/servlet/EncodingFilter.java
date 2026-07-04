package cn.edu.lingnan.servlet;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 统一设置 UTF-8 编码，解决中文参数和页面中文显示问题。
 */
@WebFilter("/*")
public class EncodingFilter implements Filter {
    @Override
    public void init(FilterConfig filterConfig) {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        request.setCharacterEncoding("UTF-8");
        response.setCharacterEncoding("UTF-8");
        if (response instanceof HttpServletResponse) {
            ((HttpServletResponse) response).setHeader("X-Content-Type-Options", "nosniff");
        }
        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {
    }
}
