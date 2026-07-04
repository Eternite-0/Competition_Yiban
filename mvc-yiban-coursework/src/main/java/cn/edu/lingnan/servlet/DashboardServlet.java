package cn.edu.lingnan.servlet;

import cn.edu.lingnan.service.CompetitionService;
import cn.edu.lingnan.service.CompetitionServiceImpl;
import cn.edu.lingnan.service.RegistrationService;
import cn.edu.lingnan.service.RegistrationServiceImpl;
import cn.edu.lingnan.service.UserService;
import cn.edu.lingnan.service.UserServiceImpl;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 系统首页控制器，统计各业务表数据总数。
 */
@WebServlet("/dashboard")
public class DashboardServlet extends HttpServlet {
    private final UserService userService = new UserServiceImpl();
    private final CompetitionService competitionService = new CompetitionServiceImpl();
    private final RegistrationService registrationService = new RegistrationServiceImpl();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        request.setAttribute("userCount", userService.list(null).size());
        request.setAttribute("competitionCount", competitionService.list(null).size());
        request.setAttribute("registrationCount", registrationService.list(null).size());
        request.getRequestDispatcher("/WEB-INF/jsp/dashboard.jsp").forward(request, response);
    }
}
