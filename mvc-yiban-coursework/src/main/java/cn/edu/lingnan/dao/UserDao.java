package cn.edu.lingnan.dao;

import cn.edu.lingnan.pojo.User;

import java.sql.SQLException;
import java.util.List;

public interface UserDao {
    User findByUsernameAndPassword(String username, String password) throws SQLException;

    User findById(int id) throws SQLException;

    List<User> findAll(String keyword) throws SQLException;

    List<User> findStudents() throws SQLException;

    boolean add(User user) throws SQLException;

    boolean update(User user) throws SQLException;

    boolean deleteById(int id) throws SQLException;
}
