package cn.edu.lingnan.dao;

import cn.edu.lingnan.pojo.Registration;
import cn.edu.lingnan.util.DBUtil;
import cn.edu.lingnan.util.StringUtil;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * 报名 DAO 实现类，通过 join 查询同时显示赛事和学生信息。
 */
public class RegistrationDaoImpl implements RegistrationDao {
    private static final String BASE_SELECT =
            "select r.*, c.name competition_name, u.real_name student_name, u.username " +
                    "from registration r " +
                    "join competition c on r.competition_id = c.id " +
                    "join user u on r.student_id = u.id ";

    @Override
    public Registration findById(int id) throws SQLException {
        String sql = BASE_SELECT + "where r.id = ?";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, id);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? mapRow(resultSet) : null;
            }
        }
    }

    @Override
    public List<Registration> findAll(String keyword) throws SQLException {
        List<Registration> registrations = new ArrayList<>();
        StringBuilder sql = new StringBuilder(BASE_SELECT);
        boolean hasKeyword = !StringUtil.isBlank(keyword);
        if (hasKeyword) {
            sql.append("where c.name like ? or u.real_name like ? or r.team_name like ? or r.status like ? ");
        }
        sql.append("order by r.id asc");

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
                    registrations.add(mapRow(resultSet));
                }
            }
        }
        return registrations;
    }

    @Override
    public boolean add(Registration registration) throws SQLException {
        String sql = "insert into registration(competition_id,student_id,team_name,track,members,status,review_note) values(?,?,?,?,?,?,?)";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            setRegistrationParams(statement, registration, false);
            return statement.executeUpdate() > 0;
        }
    }

    @Override
    public boolean update(Registration registration) throws SQLException {
        String sql = "update registration set competition_id=?, student_id=?, team_name=?, track=?, members=?, status=?, review_note=? where id=?";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            setRegistrationParams(statement, registration, true);
            return statement.executeUpdate() > 0;
        }
    }

    @Override
    public boolean deleteById(int id) throws SQLException {
        String sql = "delete from registration where id = ?";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, id);
            return statement.executeUpdate() > 0;
        }
    }

    private void setRegistrationParams(PreparedStatement statement, Registration registration, boolean includeId) throws SQLException {
        statement.setInt(1, registration.getCompetitionId());
        statement.setInt(2, registration.getStudentId());
        statement.setString(3, registration.getTeamName());
        statement.setString(4, registration.getTrack());
        statement.setString(5, registration.getMembers());
        statement.setString(6, registration.getStatus());
        statement.setString(7, registration.getReviewNote());
        if (includeId) {
            statement.setInt(8, registration.getId());
        }
    }

    private Registration mapRow(ResultSet resultSet) throws SQLException {
        Registration registration = new Registration();
        registration.setId(resultSet.getInt("id"));
        registration.setCompetitionId(resultSet.getInt("competition_id"));
        registration.setStudentId(resultSet.getInt("student_id"));
        registration.setCompetitionName(resultSet.getString("competition_name"));
        registration.setStudentName(resultSet.getString("student_name"));
        registration.setUsername(resultSet.getString("username"));
        registration.setTeamName(resultSet.getString("team_name"));
        registration.setTrack(resultSet.getString("track"));
        registration.setMembers(resultSet.getString("members"));
        registration.setStatus(resultSet.getString("status"));
        registration.setSubmitTime(resultSet.getTimestamp("submit_time"));
        registration.setReviewNote(resultSet.getString("review_note"));
        return registration;
    }
}
