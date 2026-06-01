package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.entity.Message;
import com.etsaion.entity.User;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.MessageService;
import com.etsaion.service.UserService;
import com.etsaion.utils.UserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Tag(name = "消息中心")
@RestController
@RequestMapping("/api/message")
@RequireRole({"student", "teacher", "admin"})
public class MessageController {

    @Autowired
    private MessageService messageService;

    @Autowired
    private UserService userService;

    @Operation(summary = "发送站内消息")
    @PostMapping("/send")
    public Result<Void> sendMessage(@RequestBody Message msg) {
        Long fromId = UserContext.getUserId();
        if (fromId == null) {
            return Result.error(401, "请先登录");
        }
        msg.setId(null); // 防止客户端伪造 id
        if (msg.getToUser() == null || msg.getTitle() == null || msg.getContent() == null) {
            return Result.error(400, "收件人、标题和内容不能为空");
        }
        if (fromId.equals(msg.getToUser())) {
            return Result.error(400, "不能给自己发送消息");
        }
        User recipient = userService.getById(msg.getToUser());
        if (recipient == null) {
            return Result.error(400, "收件人不存在");
        }
        msg.setFromUser(fromId);
        msg.setIsRead(0);
        msg.setCreateTime(LocalDateTime.now());
        messageService.save(msg);
        return Result.success();
    }

    @Operation(summary = "获取我的消息列表")
    @GetMapping("/list")
    public Result<Page<Message>> listMessages(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size) {
        Long userId = UserContext.getUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        size = Math.min(Math.max(size, 1), 100);
        current = Math.max(current, 1);
        return Result.success(messageService.getMyMessagesPage(userId, current, size));
    }

    @Operation(summary = "标记消息已读")
    @PostMapping("/read/{id}")
    public Result<Void> markAsRead(@PathVariable Long id) {
        Long userId = UserContext.getUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        messageService.markAsRead(userId, id);
        return Result.success();
    }

    @Operation(summary = "全部标记已读")
    @PostMapping("/read-all")
    public Result<Void> markAllAsRead() {
        Long userId = UserContext.getUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        messageService.markAllAsRead(userId);
        return Result.success();
    }

    @Operation(summary = "删除消息")
    @DeleteMapping("/{id}")
    public Result<Void> deleteMessage(@PathVariable Long id) {
        Long userId = UserContext.getUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        messageService.deleteMessage(userId, id);
        return Result.success();
    }
}
