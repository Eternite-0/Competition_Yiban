package cn.edu.lingnan.dao;

import cn.edu.lingnan.pojo.Competition;

import java.sql.SQLException;
import java.util.List;

public interface CompetitionDao {
    Competition findById(int id) throws SQLException;

    List<Competition> findAll(String keyword) throws SQLException;

    boolean add(Competition competition) throws SQLException;

    boolean update(Competition competition) throws SQLException;

    boolean deleteById(int id) throws SQLException;
}
