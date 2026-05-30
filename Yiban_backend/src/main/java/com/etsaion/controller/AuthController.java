package com.etsaion.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.etsaion.dto.LoginDTO;
import com.etsaion.dto.RegisterDTO;
import com.etsaion.dto.Result;
import com.etsaion.entity.User;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.StudentRosterService;
import com.etsaion.service.UserService;
import com.etsaion.utils.JwtUtil;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.UserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Tag(name = "身份认证接口", description = "提供用户注册、登录及个人基本信息获取接口")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private StudentRosterService studentRosterService;

    @Operation(summary = "用户注册")
    @PostMapping("/register")
    public Result<Map<String, Object>> register(@Validated @RequestBody RegisterDTO dto) {
        User user = userService.register(dto);

        // 学生注册自动登录，教师注册返回提示
        if ("student".equals(user.getRole())) {
            String token = JwtUtil.generateToken(user.getId(), user.getRole());
            UserVO vo = new UserVO();
            BeanUtils.copyProperties(user, vo);
            Map<String, Object> data = new HashMap<>();
            data.put("token", token);
            data.put("user", vo);
            return Result.success(data);
        } else {
            Map<String, Object> data = new HashMap<>();
            data.put("message", "注册成功，请等待管理员审核");
            return Result.success(data);
        }
    }

    @Operation(summary = "查询学号对应信息（注册前校验）")
    @PostMapping("/lookup-student")
    public Result<Map<String, Object>> lookupStudent(@RequestBody Map<String, String> body) {
        String studentNo = body.get("studentNo");
        return Result.success(studentRosterService.lookupByStudentNo(studentNo));
    }

    @Operation(summary = "用户登录")
    @PostMapping("/login")
    public Result<Map<String, Object>> login(@Validated @RequestBody LoginDTO dto) {
        try {
            User user = userService.login(dto.getUsername(), dto.getPassword());

            // Generate Token
            String token = JwtUtil.generateToken(user.getId(), user.getRole());

            UserVO vo = new UserVO();
            BeanUtils.copyProperties(user, vo);

            Map<String, Object> data = new HashMap<>();
            data.put("token", token);
            data.put("user", vo);

            log.info("用户登录成功: {}", dto.getUsername());
            return Result.success(data);
        } catch (Exception e) {
            log.warn("用户登录失败: {}", dto.getUsername());
            throw e;
        }
    }

    @Operation(summary = "获取当前登录用户信息")
    @GetMapping("/me")
    @RequireRole({"student", "teacher", "admin"})
    public Result<UserVO> getCurrentUser() {
        Long userId = UserContext.getUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        
        User user = userService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }

        UserVO vo = new UserVO();
        BeanUtils.copyProperties(user, vo);
        return Result.success(vo);
    }

    @Operation(summary = "搜索学生（按学号或姓名）")
    @GetMapping("/search-students")
    @RequireRole("student")
    public Result<List<UserVO>> searchStudents(@RequestParam String keyword) {
        Long currentUserId = UserContext.getUserId();
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getRole, "student")
               .ne(User::getId, currentUserId)
               .and(w -> w.like(User::getUsername, keyword).or().like(User::getRealName, keyword))
               .last("LIMIT 20");
        List<UserVO> list = userService.list(wrapper).stream().map(u -> {
            UserVO vo = new UserVO();
            BeanUtils.copyProperties(u, vo);
            return vo;
        }).collect(Collectors.toList());
        return Result.success(list);
    }
}
