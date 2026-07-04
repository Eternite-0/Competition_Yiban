package cn.edu.lingnan.service;

import cn.edu.lingnan.dao.CompetitionDao;
import cn.edu.lingnan.dao.CompetitionDaoImpl;
import cn.edu.lingnan.pojo.Competition;

import java.sql.SQLException;
import java.util.Collections;
import java.util.List;

/**
 * 赛事业务实现类，处理赛事查询、发布和维护。
 */
public class CompetitionServiceImpl implements CompetitionService {
    private final CompetitionDao competitionDao = new CompetitionDaoImpl();

    @Override
    public Competition getById(int id) {
        try {
            return competitionDao.findById(id);
        } catch (SQLException e) {
            throw new RuntimeException("查询赛事失败", e);
        }
    }

    @Override
    public List<Competition> list(String keyword) {
        try {
            return competitionDao.findAll(keyword);
        } catch (SQLException e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    @Override
    public boolean save(Competition competition) {
        try {
            if (competition.getId() == null) {
                return competitionDao.add(competition);
            }
            return competitionDao.update(competition);
        } catch (SQLException e) {
            throw new RuntimeException("保存赛事失败", e);
        }
    }

    @Override
    public boolean delete(int id) {
        try {
            return competitionDao.deleteById(id);
        } catch (SQLException e) {
            throw new RuntimeException("删除赛事失败，请先删除关联报名记录", e);
        }
    }
}
