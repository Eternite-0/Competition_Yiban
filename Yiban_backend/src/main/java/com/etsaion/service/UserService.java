package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.RegisterDTO;
import com.etsaion.entity.User;
import com.etsaion.vo.UserVO;

import java.util.Map;

public interface UserService extends IService<User> {
    User login(String username, String password);
    User register(RegisterDTO dto);

    Page<UserVO> getUserPage(String keyword, String role, String college, int current, int size);

    Map<String, Object> getUserStats();
}
