package cn.edu.lingnan.servlet;

import cn.edu.lingnan.pojo.Registration;
import cn.edu.lingnan.service.CompetitionService;
import cn.edu.lingnan.service.CompetitionServiceImpl;
import cn.edu.lingnan.service.RegistrationService;
import cn.edu.lingnan.service.RegistrationServiceImpl;
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
 * 报名控制器，负责报名信息查询和审核状态维护。
 */
@WebServlet("/registrations")
public class RegistrationServlet extends HttpServlet {
    private final RegistrationService registrationService = new RegistrationServiceImpl();
    private final CompetitionService competitionService = new CompetitionServiceImpl();
    private final UserService userService = new UserServiceImpl();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String action = request.getParameter("action");
        int id = StringUtil.parseInt(request.getParameter("id"), 0);

        if ("form".equals(action)) {
            prepareForm(request, id);
            request.getRequestDispatcher("/WEB-INF/jsp/registration-form.jsp").forward(request, response);
            return;
        }

        if ("delete".equals(action) && id > 0) {
            try {
                registrationService.delete(id);
                response.sendRedirect(request.getContextPath() + "/registrations");
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
        Registration registration = new Registration();
        int id = StringUtil.parseInt(request.getParameter("id"), 0);
        if (id > 0) {
            registration.setId(id);
        }
        registration.setCompetitionId(StringUtil.parseInt(request.getParameter("competitionId"), 0));
        registration.setStudentId(StringUtil.parseInt(request.getParameter("studentId"), 0));
        registration.setTeamName(StringUtil.trimToEmpty(request.getParameter("teamName")));
        registration.setTrack(StringUtil.trimToEmpty(request.getParameter("track")));
        registration.setMembers(StringUtil.trimToEmpty(request.getParameter("members")));
        registration.setStatus(StringUtil.trimToEmpty(request.getParameter("status")));
        registration.setReviewNote(StringUtil.trimToEmpty(request.getParameter("reviewNote")));

        try {
            registrationService.save(registration);
            response.sendRedirect(request.getContextPath() + "/registrations");
        } catch (RuntimeException e) {
            request.setAttribute("error", e.getMessage());
            request.setAttribute("registration", registration);
            prepareForm(request, id);
            request.getRequestDispatcher("/WEB-INF/jsp/registration-form.jsp").forward(request, response);
        }
    }

    private void prepareForm(HttpServletRequest request, int id) {
        if (id > 0 && request.getAttribute("registration") == null) {
            request.setAttribute("registration", registrationService.getById(id));
        }
        request.setAttribute("competitions", competitionService.list(null));
        request.setAttribute("students", userService.listStudents());
    }

    private void showList(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String keyword = request.getParameter("keyword");
        request.setAttribute("keyword", keyword);
        request.setAttribute("registrations", registrationService.list(keyword));
        request.getRequestDispatcher("/WEB-INF/jsp/registration-list.jsp").forward(request, response);
    }
}
