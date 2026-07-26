package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.RegisterDTO;
import com.etsaion.entity.StudentRoster;
import com.etsaion.entity.User;
import com.etsaion.vo.UserVO;

import java.util.Map;

public interface UserService extends IService<User> {
    User login(String username, String password);
    User register(RegisterDTO dto);

    Page<UserVO> getUserPage(String keyword, String role, String college, int current, int size);

    Map<String, Object> getUserStats();

    Map<String, Object> syncStudentAccountsFromRoster(String grade, boolean resetPassword);

    /**
     * 把一条花名册记录的院系信息同步到已存在的学生账号。
     *
     * 花名册与 user 表是两份数据，教师端读的是后者；
     * 花名册改了却不同步，教师看到的就一直是旧值。
     * 只更新已有账号——是否为该学生开通账号仍由管理员显式决定。
     *
     * @return 是否更新了账号（学号还没有对应账号时返回 false）
     */
    boolean syncStudentAccountFromRoster(StudentRoster roster);
}
