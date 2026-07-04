package cn.edu.lingnan.service;

import cn.edu.lingnan.pojo.Competition;

import java.util.List;

public interface CompetitionService {
    Competition getById(int id);

    List<Competition> list(String keyword);

    boolean save(Competition competition);

    boolean delete(int id);
}
