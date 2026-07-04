package cn.edu.lingnan.dao;

import cn.edu.lingnan.pojo.User;
import cn.edu.lingnan.util.DBUtil;
import cn.edu.lingnan.util.StringUtil;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * 用户 DAO 实现类，负责 user 表的所有数据库操作。
 */
public class UserDaoImpl implements UserDao {
    @Override
    public User findByUsernameAndPassword(String username, String password) throws SQLException {
        String sql = "select * from user where username = ? and password = ? and status = '正常'";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, username);
            statement.setString(2, password);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? mapRow(resultSet) : null;
            }
        }
    }

    @Override
    public User findById(int id) throws SQLException {
        String sql = "select * from user where id = ?";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, id);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? mapRow(resultSet) : null;
            }
        }
    }

    @Override
    public List<User> findAll(String keyword) throws SQLException {
        List<User> users = new ArrayList<>();
        StringBuilder sql = new StringBuilder("select * from user");
        boolean hasKeyword = !StringUtil.isBlank(keyword);
        if (hasKeyword) {
            sql.append(" where username like ? or real_name like ? or college like ? or major like ?");
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
                    users.add(mapRow(resultSet));
                }
            }
        }
        return users;
    }

    @Override
    public List<User> findStudents() throws SQLException {
        List<User> students = new ArrayList<>();
        String sql = "select * from user where role = 'student' order by username asc";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                students.add(mapRow(resultSet));
            }
        }
        return students;
    }

    @Override
    public boolean add(User user) throws SQLException {
        String sql = "insert into user(username,password,real_name,role,college,major,class_name,phone,status) values(?,?,?,?,?,?,?,?,?)";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            setUserParams(statement, user, false);
            return statement.executeUpdate() > 0;
        }
    }

    @Override
    public boolean update(User user) throws SQLException {
        String sql = "update user set username=?, password=?, real_name=?, role=?, college=?, major=?, class_name=?, phone=?, status=? where id=?";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            setUserParams(statement, user, true);
            return statement.executeUpdate() > 0;
        }
    }

    @Override
    public boolean deleteById(int id) throws SQLException {
        String sql = "delete from user where id = ?";
        try (Connection connection = DBUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, id);
            return statement.executeUpdate() > 0;
        }
    }

    private void setUserParams(PreparedStatement statement, User user, boolean includeId) throws SQLException {
        statement.setString(1, user.getUsername());
        statement.setString(2, user.getPassword());
        statement.setString(3, user.getRealName());
        statement.setString(4, user.getRole());
        statement.setString(5, user.getCollege());
        statement.setString(6, user.getMajor());
        statement.setString(7, user.getClassName());
        statement.setString(8, user.getPhone());
        statement.setString(9, user.getStatus());
        if (includeId) {
            statement.setInt(10, user.getId());
        }
    }

    private User mapRow(ResultSet resultSet) throws SQLException {
        User user = new User();
        user.setId(resultSet.getInt("id"));
        user.setUsername(resultSet.getString("username"));
        user.setPassword(resultSet.getString("password"));
        user.setRealName(resultSet.getString("real_name"));
        user.setRole(resultSet.getString("role"));
        user.setCollege(resultSet.getString("college"));
        user.setMajor(resultSet.getString("major"));
        user.setClassName(resultSet.getString("class_name"));
        user.setPhone(resultSet.getString("phone"));
        user.setStatus(resultSet.getString("status"));
        user.setCreateTime(resultSet.getTimestamp("create_time"));
        return user;
    }
}
