package com.etsaion.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.RegisterDTO;
import com.etsaion.entity.User;

public interface UserService extends IService<User> {
    User login(String username, String password);
    User register(RegisterDTO dto);
}
