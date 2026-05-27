package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.entity.User;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.UserService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.UserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "管理员用户管理接口", description = "提供用户列表查询、统计及删除等管理功能")
@RestController
@RequestMapping("/api/admin/users")
@RequireRole("admin")
public class AdminUserController {

    @Autowired
    private UserService userService;

    @Operation(summary = "分页查询用户列表")
    @GetMapping
    public Result<Page<UserVO>> listUsers(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String college) {
        Page<UserVO> page = userService.getUserPage(keyword, role, college, current, size);
        return Result.success(page);
    }

    @Operation(summary = "用户统计信息")
    @GetMapping("/stats")
    public Result<Map<String, Object>> getUserStats() {
        return Result.success(userService.getUserStats());
    }

    @Operation(summary = "删除用户")
    @DeleteMapping("/{id}")
    public Result<Void> deleteUser(@PathVariable Long id) {
        Long currentUserId = UserContext.getUserId();
        if (id.equals(currentUserId)) {
            return Result.error("不能删除自己的账号");
        }

        User user = userService.getById(id);
        if (user == null) {
            return Result.error("用户不存在");
        }

        userService.removeById(id);
        return Result.success();
    }
}
