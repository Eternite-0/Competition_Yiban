package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.StudentAccessPolicy;
import com.etsaion.service.UserService;
import com.etsaion.utils.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StudentAccessPolicyImpl implements StudentAccessPolicy {

    /** 学院更名后新旧名并存，同一批学生的档案里两种写法都有。 */
    private static final List<List<String>> COLLEGE_ALIASES = List.of(
            List.of("计算机学院", "计算机与人工智能学院", "计算机与智能教育学院")
    );

    @Autowired
    @Lazy
    private UserService userService;

    @Override
    public boolean isCollegeScoped() {
        return "teacher".equalsIgnoreCase(UserContext.getUserRole());
    }

    @Override
    public String requireScopedCollege() {
        if (!isCollegeScoped()) {
            return null;
        }
        Long teacherId = UserContext.getUserId();
        User teacher = teacherId != null ? userService.getById(teacherId) : null;
        String college = teacher != null ? teacher.getCollege() : null;
        if (StrUtil.isBlank(college)) {
            // 无法判定范围就不能放行——放行等于给了管理员级别的可见性
            throw new BusinessException(403, "您的账号尚未设置所属学院，请联系管理员补全后再查看学生数据");
        }
        return college;
    }

    @Override
    public String resolveRequestedCollege(String requestedCollege) {
        String ownCollege = requireScopedCollege();
        if (ownCollege == null) {
            return StrUtil.isBlank(requestedCollege) ? null : requestedCollege;
        }
        if (StrUtil.isBlank(requestedCollege) || sameCollege(ownCollege, requestedCollege)) {
            return ownCollege;
        }
        throw new BusinessException(403, "无权查看其他学院的学生数据");
    }

    @Override
    public boolean canAccess(User student) {
        String role = UserContext.getUserRole();
        if ("student".equalsIgnoreCase(role)) {
            return student != null && student.getId() != null && student.getId().equals(UserContext.getUserId());
        }
        if (!isCollegeScoped()) {
            // 不受范围限制时一律放行，包括学生记录已不存在的情况——
            // 记录是否存在是调用方的关注点，不是访问范围的
            return true;
        }
        if (student == null) {
            return false;
        }
        Long teacherId = UserContext.getUserId();
        User teacher = teacherId != null ? userService.getById(teacherId) : null;
        String ownCollege = teacher != null ? teacher.getCollege() : null;
        return StrUtil.isNotBlank(ownCollege) && sameCollege(ownCollege, student.getCollege());
    }

    @Override
    public void requireAccess(Long studentId) {
        if (studentId == null) {
            throw new BusinessException("请指定学生");
        }
        if (!canAccess(userService.getById(studentId))) {
            throw new BusinessException(403, "无权查看该学生的数据");
        }
    }

    @Override
    public List<Long> scopedStudentIds() {
        String college = requireScopedCollege();
        if (college == null) {
            return null;
        }
        return userService.list(new LambdaQueryWrapper<User>()
                        .eq(User::getRole, "student")
                        .in(User::getCollege, collegeAliases(college))
                        .select(User::getId))
                .stream().map(User::getId).collect(Collectors.toList());
    }

    @Override
    public boolean sameCollege(String left, String right) {
        if (StrUtil.isBlank(left) || StrUtil.isBlank(right)) {
            return false;
        }
        return left.equals(right) || collegeAliases(left).contains(right);
    }

    @Override
    public List<String> collegeAliases(String college) {
        if (StrUtil.isBlank(college)) {
            return Collections.emptyList();
        }
        return COLLEGE_ALIASES.stream()
                .filter(group -> group.contains(college))
                .findFirst()
                .orElse(List.of(college));
    }
}
