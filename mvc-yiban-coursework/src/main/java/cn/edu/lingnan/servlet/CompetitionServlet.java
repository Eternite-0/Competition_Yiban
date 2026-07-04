package cn.edu.lingnan.servlet;

import cn.edu.lingnan.pojo.Competition;
import cn.edu.lingnan.service.CompetitionService;
import cn.edu.lingnan.service.CompetitionServiceImpl;
import cn.edu.lingnan.util.StringUtil;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.Date;

/**
 * 赛事控制器，完成赛事信息的查询、发布、修改和删除。
 */
@WebServlet("/competitions")
public class CompetitionServlet extends HttpServlet {
    private final CompetitionService competitionService = new CompetitionServiceImpl();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String action = request.getParameter("action");
        int id = StringUtil.parseInt(request.getParameter("id"), 0);

        if ("form".equals(action)) {
            if (id > 0) {
                request.setAttribute("competition", competitionService.getById(id));
            }
            request.getRequestDispatcher("/WEB-INF/jsp/competition-form.jsp").forward(request, response);
            return;
        }

        if ("delete".equals(action) && id > 0) {
            try {
                competitionService.delete(id);
                response.sendRedirect(request.getContextPath() + "/competitions");
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
        Competition competition = new Competition();
        int id = StringUtil.parseInt(request.getParameter("id"), 0);
        if (id > 0) {
            competition.setId(id);
        }
        competition.setName(StringUtil.trimToEmpty(request.getParameter("name")));
        competition.setLevel(StringUtil.trimToEmpty(request.getParameter("level")));
        competition.setCategory(StringUtil.trimToEmpty(request.getParameter("category")));
        competition.setOrganizer(StringUtil.trimToEmpty(request.getParameter("organizer")));
        competition.setStartDate(Date.valueOf(request.getParameter("startDate")));
        competition.setEndDate(Date.valueOf(request.getParameter("endDate")));
        competition.setMaxTeamSize(StringUtil.parseInt(request.getParameter("maxTeamSize"), 1));
        competition.setStatus(StringUtil.trimToEmpty(request.getParameter("status")));
        competition.setDescription(StringUtil.trimToEmpty(request.getParameter("description")));

        try {
            competitionService.save(competition);
            response.sendRedirect(request.getContextPath() + "/competitions");
        } catch (RuntimeException e) {
            request.setAttribute("error", e.getMessage());
            request.setAttribute("competition", competition);
            request.getRequestDispatcher("/WEB-INF/jsp/competition-form.jsp").forward(request, response);
        }
    }

    private void showList(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String keyword = request.getParameter("keyword");
        request.setAttribute("keyword", keyword);
        request.setAttribute("competitions", competitionService.list(keyword));
        request.getRequestDispatcher("/WEB-INF/jsp/competition-list.jsp").forward(request, response);
    }
}
