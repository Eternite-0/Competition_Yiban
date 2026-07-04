package cn.edu.lingnan.service;

import cn.edu.lingnan.pojo.User;

import java.util.List;

public interface UserService {
    User login(String username, String password);

    User getById(int id);

    List<User> list(String keyword);

    List<User> listStudents();

    boolean save(User user);

    boolean delete(int id);
}
