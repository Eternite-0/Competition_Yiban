package cn.edu.lingnan.dao;

import cn.edu.lingnan.pojo.Competition;
import cn.edu.lingnan.util.DBUtil;
import cn.edu.lingnan.util.StringUtil;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * 赛事 DAO 实现类，封装 competition 表的增删改查 SQL。
 */
public class CompetitionDaoImpl implements CompetitionDao {
    @Override
    public Competition findById(int id) throws SQLException {
        String sql = "select * from competition where id = ?";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, id);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? mapRow(resultSet) : null;
            }
        }
    }

    @Override
    public List<Competition> findAll(String keyword) throws SQLException {
        List<Competition> competitions = new ArrayList<>();
        StringBuilder sql = new StringBuilder("select * from competition");
        boolean hasKeyword = !StringUtil.isBlank(keyword);
        if (hasKeyword) {
            sql.append(" where name like ? or level like ? or category like ? or organizer like ?");
        }
        sql.append(" order by id asc");

        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql.toString())) {
            if (hasKeyword) {
                String likeKeyword = "%" + keyword.trim() + "%";
                statement.setString(1, likeKeyword);
                statement.setString(2, likeKeyword);
                statement.setString(3, likeKeyword);
                statement.setString(4, likeKeyword);
            }
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    competitions.add(mapRow(resultSet));
                }
            }
        }
        return competitions;
    }

    @Override
    public boolean add(Competition competition) throws SQLException {
        String sql = "insert into competition(name,level,category,organizer,start_date,end_date,max_team_size,status,description) values(?,?,?,?,?,?,?,?,?)";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            setCompetitionParams(statement, competition, false);
            return statement.executeUpdate() > 0;
        }
    }

    @Override
    public boolean update(Competition competition) throws SQLException {
        String sql = "update competition set name=?, level=?, category=?, organizer=?, start_date=?, end_date=?, max_team_size=?, status=?, description=? where id=?";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            setCompetitionParams(statement, competition, true);
            return statement.executeUpdate() > 0;
        }
    }

    @Override
    public boolean deleteById(int id) throws SQLException {
        String sql = "delete from competition where id = ?";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, id);
            return statement.executeUpdate() > 0;
        }
    }

    private void setCompetitionParams(PreparedStatement statement, Competition competition, boolean includeId) throws SQLException {
        statement.setString(1, competition.getName());
        statement.setString(2, competition.getLevel());
        statement.setString(3, competition.getCategory());
        statement.setString(4, competition.getOrganizer());
        statement.setDate(5, competition.getStartDate());
        statement.setDate(6, competition.getEndDate());
        statement.setInt(7, competition.getMaxTeamSize());
        statement.setString(8, competition.getStatus());
        statement.setString(9, competition.getDescription());
        if (includeId) {
            statement.setInt(10, competition.getId());
        }
    }

    private Competition mapRow(ResultSet resultSet) throws SQLException {
        Competition competition = new Competition();
        competition.setId(resultSet.getInt("id"));
        competition.setName(resultSet.getString("name"));
        competition.setLevel(resultSet.getString("level"));
        competition.setCategory(resultSet.getString("category"));
        competition.setOrganizer(resultSet.getString("organizer"));
        competition.setStartDate(Date.valueOf(resultSet.getString("start_date")));
        competition.setEndDate(Date.valueOf(resultSet.getString("end_date")));
        competition.setMaxTeamSize(resultSet.getInt("max_team_size"));
        competition.setStatus(resultSet.getString("status"));
        competition.setDescription(resultSet.getString("description"));
        competition.setCreateTime(resultSet.getTimestamp("create_time"));
        return competition;
    }
}
