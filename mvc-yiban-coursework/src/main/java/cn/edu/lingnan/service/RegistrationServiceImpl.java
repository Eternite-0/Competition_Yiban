package cn.edu.lingnan.service;

import cn.edu.lingnan.dao.RegistrationDao;
import cn.edu.lingnan.dao.RegistrationDaoImpl;
import cn.edu.lingnan.pojo.Registration;

import java.sql.SQLException;
import java.util.Collections;
import java.util.List;

/**
 * 报名业务实现类，负责报名记录的查询和审核状态维护。
 */
public class RegistrationServiceImpl implements RegistrationService {
    private final RegistrationDao registrationDao = new RegistrationDaoImpl();

    @Override
    public Registration getById(int id) {
        try {
            return registrationDao.findById(id);
        } catch (SQLException e) {
            throw new RuntimeException("查询报名记录失败", e);
        }
    }

    @Override
    public List<Registration> list(String keyword) {
        try {
            return registrationDao.findAll(keyword);
        } catch (SQLException e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    @Override
    public boolean save(Registration registration) {
        try {
            if (registration.getId() == null) {
                return registrationDao.add(registration);
            }
            return registrationDao.update(registration);
        } catch (SQLException e) {
            throw new RuntimeException("保存报名记录失败", e);
        }
    }

    @Override
    public boolean delete(int id) {
        try {
            return registrationDao.deleteById(id);
        } catch (SQLException e) {
            throw new RuntimeException("删除报名记录失败", e);
        }
    }
}
