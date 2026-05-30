package com.etsaion.service.impl;

import cn.hutool.crypto.digest.BCrypt;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.RegisterDTO;
import com.etsaion.entity.StudentRoster;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.UserMapper;
import com.etsaion.service.StudentRosterService;
import com.etsaion.service.UserService;
import com.etsaion.vo.UserVO;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Autowired
    private StudentRosterService studentRosterService;

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

        // 检查账号状态
        if ("pending_approval".equals(user.getStatus())) {
            throw new BusinessException("账号正在审核中，请等待管理员审核");
        }
        if ("rejected".equals(user.getStatus())) {
            throw new BusinessException("账号审核未通过，请联系管理员");
        }

        return user;
    }

    @Override
    @Transactional
    public User register(RegisterDTO dto) {
        String role = dto.getRole();

        if ("student".equals(role)) {
            return registerStudent(dto);
        } else if ("teacher".equals(role)) {
            return registerTeacher(dto);
        } else {
            throw new BusinessException("无效的角色类型");
        }
    }

    /**
     * 学生注册 — 走花名册校验
     */
    private User registerStudent(RegisterDTO dto) {
        String studentNo = dto.getUsername();

        // 1. 根据学号查花名册
        StudentRoster roster = studentRosterService.getOne(new LambdaQueryWrapper<StudentRoster>()
                .eq(StudentRoster::getStudentNo, studentNo));

        // 2. 未找到 → 拒绝
        if (roster == null) {
            throw new BusinessException("学号未录入系统，请联系辅导员");
        }

        // 3. 已注册 → 拒绝
        if ("registered".equals(roster.getStatus())) {
            throw new BusinessException("该学号已注册");
        }

        // 4. 校验姓名
        if (!dto.getRealName().trim().equals(roster.getRealName())) {
            throw new BusinessException("姓名与学籍信息不符，请核对后重试");
        }

        // 5. 创建用户
        User user = new User();
        user.setUsername(studentNo.trim());
        user.setRealName(dto.getRealName().trim());
        user.setRole("student");
        user.setStatus("active");
        user.setCollege(roster.getCollege());
        user.setMajor(getMajorName(roster.getMajorId()));
        user.setClassName(getClassName(roster.getClassId()));
        user.setGrade(roster.getGrade());

        // Hash password
        String hashedPw = BCrypt.hashpw(dto.getPassword(), BCrypt.gensalt());
        user.setPassword(hashedPw);

        this.save(user);

        // 6. 更新花名册状态
        roster.setStatus("registered");
        roster.setUpdateTime(java.time.LocalDateTime.now());
        studentRosterService.updateById(roster);

        return user;
    }

    /**
     * 教师注册 — 需管理员审核
     */
    private User registerTeacher(RegisterDTO dto) {
        // 校验工号不重复
        long count = this.count(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, dto.getUsername()));
        if (count > 0) {
            throw new BusinessException("该工号已被注册");
        }

        // 校验学院必填
        if (StrUtil.isBlank(dto.getCollege())) {
            throw new BusinessException("教师注册必须填写所属学院");
        }

        User user = new User();
        user.setUsername(dto.getUsername().trim());
        user.setRealName(dto.getRealName().trim());
        user.setRole("teacher");
        user.setStatus("pending_approval");
        user.setCollege(dto.getCollege().trim());

        // Hash password
        String hashedPw = BCrypt.hashpw(dto.getPassword(), BCrypt.gensalt());
        user.setPassword(hashedPw);

        this.save(user);
        return user;
    }

    private String getMajorName(Long majorId) {
        if (majorId == null) return null;
        // 通过 studentRosterService 间接查询
        return studentRosterService.getMajorNameById(majorId);
    }

    private String getClassName(Long classId) {
        if (classId == null) return null;
        return studentRosterService.getClassNameById(classId);
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
