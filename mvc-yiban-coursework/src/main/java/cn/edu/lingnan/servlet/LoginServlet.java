package cn.edu.lingnan.servlet;

import cn.edu.lingnan.pojo.User;
import cn.edu.lingnan.service.UserService;
import cn.edu.lingnan.service.UserServiceImpl;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 登录控制器，负责显示登录页、验证账号密码和退出系统。
 */
@WebServlet("/login")
public class LoginServlet extends HttpServlet {
    private final UserService userService = new UserServiceImpl();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String action = request.getParameter("action");
        if ("logout".equals(action)) {
            request.getSession().invalidate();
            response.sendRedirect(request.getContextPath() + "/login");
            return;
        }
        request.getRequestDispatcher("/WEB-INF/jsp/login.jsp").forward(request, response);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String username = request.getParameter("username");
        String password = request.getParameter("password");
        User loginUser = userService.login(username, password);

        if (loginUser == null) {
            request.setAttribute("error", "用户名或密码错误，请重新输入。");
            request.getRequestDispatcher("/WEB-INF/jsp/login.jsp").forward(request, response);
            return;
        }

        request.getSession().setAttribute("loginUser", loginUser);
        response.sendRedirect(request.getContextPath() + "/dashboard");
    }
}
