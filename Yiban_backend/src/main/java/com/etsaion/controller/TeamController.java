package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.dto.TeamPostCreateDTO;
import com.etsaion.entity.TeamPost;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.TeamPostService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.TeamVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Tag(name = "组队招募大厅", description = "发布招募、检索招募大厅帖子等功能")
@RestController
@RequestMapping("/api/team")
public class TeamController {

    @Autowired
    private TeamPostService teamPostService;

    @Operation(summary = "学生发布组队招募贴")
    @PostMapping("/create")
    @RequireRole("student")
    public Result<TeamPost> createTeamPost(@Validated @RequestBody TeamPostCreateDTO dto) {
        Long studentId = UserContext.getUserId();
        TeamPost post = teamPostService.createTeamPost(studentId, dto);
        return Result.success(post);
    }

    @Operation(summary = "分页/多条件检索招募大厅列表")
    @GetMapping("/list")
    public Result<Page<TeamVO>> listTeamPosts(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long competitionId,
            @RequestParam(required = false) String status) { // 招募中, 已满员
        
        Page<TeamVO> page = teamPostService.listTeamPostsPage(current, size, competitionId, status);
        return Result.success(page);
    }

    @Operation(summary = "查询招募贴详情")
    @GetMapping("/detail/{id}")
    public Result<TeamVO> getTeamPostDetail(@PathVariable Long id) {
        TeamVO vo = teamPostService.getTeamPostDetails(id);
        return Result.success(vo);
    }
}
