package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.entity.Announcement;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.AnnouncementService;
import com.etsaion.utils.UserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "公告管理")
@RestController
@RequestMapping("/api/announcement")
public class AnnouncementController {

    @Autowired
    private AnnouncementService announcementService;

    @Operation(summary = "分页查询公告")
    @GetMapping("/list")
    public Result<Page<Map<String, Object>>> listAnnouncements(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long competitionId,
            @RequestParam(required = false) String type) {
        return Result.success(announcementService.listAnnouncements(current, size, competitionId, type));
    }

    @Operation(summary = "公告详情")
    @GetMapping("/{id}")
    public Result<Map<String, Object>> getAnnouncement(@PathVariable Long id) {
        return Result.success(announcementService.getAnnouncementDetail(id));
    }

    @Operation(summary = "创建公告")
    @PostMapping
    @RequireRole({"admin", "teacher"})
    public Result<Announcement> createAnnouncement(@RequestBody Announcement announcement) {
        Long authorId = UserContext.getUserId();
        return Result.success(announcementService.createAnnouncement(announcement, authorId));
    }

    @Operation(summary = "更新公告")
    @PutMapping("/{id}")
    @RequireRole("admin")
    public Result<Announcement> updateAnnouncement(@PathVariable Long id, @RequestBody Announcement announcement) {
        return Result.success(announcementService.updateAnnouncement(id, announcement));
    }

    @Operation(summary = "删除公告")
    @DeleteMapping("/{id}")
    @RequireRole("admin")
    public Result<Void> deleteAnnouncement(@PathVariable Long id) {
        announcementService.deleteAnnouncement(id);
        return Result.success();
    }
}
