package com.etsaion.service.impl;

import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.RegisterDTO;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.UserMapper;
import com.etsaion.service.UserService;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Override
    public User login(String username, String password) {
        User user = this.getOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, username));
        
        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        // Verify password using BCrypt
        if (!BCrypt.checkpw(password, user.getPassword())) {
            throw new BusinessException("密码错误");
        }

        return user;
    }

    @Override
    public User register(RegisterDTO dto) {
        // Check if username already exists
        long count = this.count(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, dto.getUsername()));
        if (count > 0) {
            throw new BusinessException("用户名（学号/工号）已存在");
        }

        User user = new User();
        BeanUtils.copyProperties(dto, user);
        
        // Hash password using BCrypt
        String hashedPw = BCrypt.hashpw(dto.getPassword(), BCrypt.gensalt());
        user.setPassword(hashedPw);

        this.save(user);
        return user;
    }
}
