package cn.edu.lingnan.service;

import cn.edu.lingnan.dao.UserDao;
import cn.edu.lingnan.dao.UserDaoImpl;
import cn.edu.lingnan.pojo.User;
import cn.edu.lingnan.util.StringUtil;

import java.sql.SQLException;
import java.util.Collections;
import java.util.List;

/**
 * 用户业务实现类，负责登录校验和用户管理。
 */
public class UserServiceImpl implements UserService {
    private final UserDao userDao = new UserDaoImpl();

    @Override
    public User login(String username, String password) {
        if (StringUtil.isBlank(username) || StringUtil.isBlank(password)) {
            return null;
        }
        try {
            return userDao.findByUsernameAndPassword(username.trim(), password.trim());
        } catch (SQLException e) {
            throw new RuntimeException("登录查询失败", e);
        }
    }

    @Override
    public User getById(int id) {
        try {
            return userDao.findById(id);
        } catch (SQLException e) {
            throw new RuntimeException("查询用户失败", e);
        }
    }

    @Override
    public List<User> list(String keyword) {
        try {
            return userDao.findAll(keyword);
        } catch (SQLException e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    @Override
    public List<User> listStudents() {
        try {
            return userDao.findStudents();
        } catch (SQLException e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    @Override
    public boolean save(User user) {
        try {
            if (user.getId() == null) {
                return userDao.add(user);
            }
            return userDao.update(user);
        } catch (SQLException e) {
            throw new RuntimeException("保存用户失败", e);
        }
    }

    @Override
    public boolean delete(int id) {
        try {
            return userDao.deleteById(id);
        } catch (SQLException e) {
            throw new RuntimeException("删除用户失败，请先删除关联报名记录", e);
        }
    }
}
