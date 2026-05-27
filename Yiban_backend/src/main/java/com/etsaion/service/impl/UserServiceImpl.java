package com.etsaion.service.impl;

import cn.hutool.crypto.digest.BCrypt;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.RegisterDTO;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.UserMapper;
import com.etsaion.service.UserService;
import com.etsaion.vo.UserVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

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

    @Override
    public Page<UserVO> getUserPage(String keyword, String role, String college, int current, int size) {
        Page<User> page = new Page<>(current, size);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();

        if (StrUtil.isNotBlank(role)) {
            wrapper.eq(User::getRole, role);
        }
        if (StrUtil.isNotBlank(college)) {
            wrapper.eq(User::getCollege, college);
        }
        if (StrUtil.isNotBlank(keyword)) {
            wrapper.and(w -> w.like(User::getUsername, keyword)
                    .or().like(User::getRealName, keyword));
        }
        wrapper.orderByDesc(User::getId);

        Page<User> rawPage = this.page(page, wrapper);

        Page<UserVO> voPage = new Page<>(rawPage.getCurrent(), rawPage.getSize(), rawPage.getTotal());
        voPage.setRecords(rawPage.getRecords().stream().map(u -> {
            UserVO vo = new UserVO();
            BeanUtils.copyProperties(u, vo);
            return vo;
        }).collect(Collectors.toList()));
        return voPage;
    }

    @Override
    public Map<String, Object> getUserStats() {
        Map<String, Object> stats = new HashMap<>();
        long total = this.count();
        stats.put("total", total);
        stats.put("students", this.count(new LambdaQueryWrapper<User>().eq(User::getRole, "student")));
        stats.put("teachers", this.count(new LambdaQueryWrapper<User>().eq(User::getRole, "teacher")));
        stats.put("admins", this.count(new LambdaQueryWrapper<User>().eq(User::getRole, "admin")));
        return stats;
    }
}
