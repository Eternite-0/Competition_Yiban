package cn.edu.lingnan.dao;

import cn.edu.lingnan.pojo.Registration;

import java.sql.SQLException;
import java.util.List;

public interface RegistrationDao {
    Registration findById(int id) throws SQLException;

    List<Registration> findAll(String keyword) throws SQLException;

    boolean add(Registration registration) throws SQLException;

    boolean update(Registration registration) throws SQLException;

    boolean deleteById(int id) throws SQLException;
}
