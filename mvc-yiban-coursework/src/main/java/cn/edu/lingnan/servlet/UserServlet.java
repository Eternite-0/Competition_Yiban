package cn.edu.lingnan.servlet;

import cn.edu.lingnan.pojo.User;
import cn.edu.lingnan.service.UserService;
import cn.edu.lingnan.service.UserServiceImpl;
import cn.edu.lingnan.util.StringUtil;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 用户管理控制器，负责用户信息的列表展示和表单提交。
 */
@WebServlet("/users")
public class UserServlet extends HttpServlet {
    private final UserService userService = new UserServiceImpl();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String action = request.getParameter("action");
        int id = StringUtil.parseInt(request.getParameter("id"), 0);

        if ("form".equals(action)) {
            if (id > 0) {
                request.setAttribute("user", userService.getById(id));
            }
            request.getRequestDispatcher("/WEB-INF/jsp/user-form.jsp").forward(request, response);
            return;
        }

        if ("delete".equals(action) && id > 0) {
            try {
                userService.delete(id);
                response.sendRedirect(request.getContextPath() + "/users");
            } catch (RuntimeException e) {
                request.setAttribute("error", e.getMessage());
                showList(request, response);
            }
            return;
        }

        showList(request, response);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        User user = new User();
        int id = StringUtil.parseInt(request.getParameter("id"), 0);
        if (id > 0) {
            user.setId(id);
        }
        user.setUsername(StringUtil.trimToEmpty(request.getParameter("username")));
        user.setPassword(StringUtil.trimToEmpty(request.getParameter("password")));
        user.setRealName(StringUtil.trimToEmpty(request.getParameter("realName")));
        user.setRole(StringUtil.trimToEmpty(request.getParameter("role")));
        user.setCollege(StringUtil.trimToEmpty(request.getParameter("college")));
        user.setMajor(StringUtil.trimToEmpty(request.getParameter("major")));
        user.setClassName(StringUtil.trimToEmpty(request.getParameter("className")));
        user.setPhone(StringUtil.trimToEmpty(request.getParameter("phone")));
        user.setStatus(StringUtil.trimToEmpty(request.getParameter("status")));

        if (StringUtil.isBlank(user.getPassword())) {
            user.setPassword("123456");
        }
        if (StringUtil.isBlank(user.getStatus())) {
            user.setStatus("正常");
        }

        try {
            userService.save(user);
            response.sendRedirect(request.getContextPath() + "/users");
        } catch (RuntimeException e) {
            request.setAttribute("error", e.getMessage());
            request.setAttribute("user", user);
            request.getRequestDispatcher("/WEB-INF/jsp/user-form.jsp").forward(request, response);
        }
    }

    private void showList(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String keyword = request.getParameter("keyword");
        request.setAttribute("keyword", keyword);
        request.setAttribute("users", userService.list(keyword));
        request.getRequestDispatcher("/WEB-INF/jsp/user-list.jsp").forward(request, response);
    }
}
