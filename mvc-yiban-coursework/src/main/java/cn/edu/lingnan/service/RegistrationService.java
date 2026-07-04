package cn.edu.lingnan.service;

import cn.edu.lingnan.pojo.Registration;

import java.util.List;

public interface RegistrationService {
    Registration getById(int id);

    List<Registration> list(String keyword);

    boolean save(Registration registration);

    boolean delete(int id);
}
