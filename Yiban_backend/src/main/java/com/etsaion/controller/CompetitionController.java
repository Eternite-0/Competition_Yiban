package com.etsaion.controller;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.EventPublishDTO;
import com.etsaion.dto.Result;
import com.etsaion.entity.Competition;
import com.etsaion.entity.Registration;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.CompetitionStageService;
import com.etsaion.service.RegistrationService;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.CompetitionVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@Tag(name = "赛事/竞赛管理接口", description = "提供赛事列表查询、详情获取，以及管理员维护赛事接口")
@RestController
@RequestMapping("/api/competition")
public class CompetitionController {

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private RegistrationService registrationService;

    @Autowired
    private CompetitionStageService competitionStageService;

    @Operation(summary = "查询赛事分页列表 (公开)")
    @GetMapping("/list")
    public Result<Page<CompetitionVO>> listCompetitions(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {

        // Non-admins can only see published competitions
        if (!"admin".equalsIgnoreCase(UserContext.getUserRole())) {
            status = "published";
        }
        Page<Competition> page = competitionService.getCompetitionsPage(current, size, keyword, level, category, status);
        return Result.success(competitionService.toVOPage(page));
    }

    @Operation(summary = "获取单个赛事详情 (公开)")
    @GetMapping("/detail/{id}")
    public Result<Map<String, Object>> getCompetitionDetail(@PathVariable Long id) {
        Competition comp = competitionService.getById(id);
        if (comp == null) {
            return Result.error("赛事不存在");
        }
        CompetitionVO vo = competitionService.toVO(comp);
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", vo.getId());
        result.put("name", vo.getName());
        result.put("level", vo.getLevel());
        result.put("category", vo.getCategory());
        result.put("organizer", vo.getOrganizer());
        result.put("startTime", vo.getStartTime());
        result.put("endTime", vo.getEndTime());
        result.put("competitionStart", vo.getCompetitionStart());
        result.put("competitionEnd", vo.getCompetitionEnd());
        result.put("maxTeamSize", vo.getMaxTeamSize());
        result.put("coverUrl", vo.getCoverUrl());
        result.put("content", vo.getContent());
        result.put("tags", vo.getTags());
        result.put("tracks", vo.getTracks());
        result.put("status", vo.getStatus());
        result.put("stages", competitionStageService.listByCompetition(id));
        return Result.success(result);
    }

    @Operation(summary = "管理员发布赛事")
    @PostMapping("/admin/publish")
    @RequireRole("admin")
    public Result<CompetitionVO> publishCompetition(@Validated @RequestBody EventPublishDTO dto) {
        Competition comp = new Competition();
        BeanUtils.copyProperties(dto, comp, "tags", "tracks");

        if (CollUtil.isNotEmpty(dto.getTags())) {
            comp.setTags(JSONUtil.toJsonStr(dto.getTags()));
        } else {
            comp.setTags("[]");
        }
        if (CollUtil.isNotEmpty(dto.getTracks())) {
            comp.setTracks(JSONUtil.toJsonStr(dto.getTracks()));
        } else {
            comp.setTracks("[]");
        }

        String status = dto.getStatus();
        if (status == null || status.isBlank()) {
            status = "published";
        }
        comp.setStatus(status);
        comp.setCreateTime(LocalDateTime.now());
        comp.setUpdateTime(LocalDateTime.now());

        competitionService.save(comp);
        return Result.success(competitionService.toVO(comp));
    }

    @Operation(summary = "管理员更新赛事")
    @PutMapping("/admin/update/{id}")
    @RequireRole("admin")
    public Result<CompetitionVO> updateCompetition(@PathVariable Long id, @RequestBody EventPublishDTO dto) {
        Competition comp = competitionService.getById(id);
        if (comp == null) {
            return Result.error("赛事不存在");
        }
        // Copy only non-null fields to avoid overwriting with nulls
        if (dto.getName() != null) comp.setName(dto.getName());
        if (dto.getLevel() != null) comp.setLevel(dto.getLevel());
        if (dto.getCategory() != null) comp.setCategory(dto.getCategory());
        if (dto.getOrganizer() != null) comp.setOrganizer(dto.getOrganizer());
        if (dto.getStartTime() != null) comp.setStartTime(dto.getStartTime());
        if (dto.getEndTime() != null) comp.setEndTime(dto.getEndTime());
        if (dto.getCompetitionStart() != null) comp.setCompetitionStart(dto.getCompetitionStart());
        if (dto.getCompetitionEnd() != null) comp.setCompetitionEnd(dto.getCompetitionEnd());
        if (dto.getMaxTeamSize() != null) comp.setMaxTeamSize(dto.getMaxTeamSize());
        if (dto.getCoverUrl() != null) comp.setCoverUrl(dto.getCoverUrl());
        if (dto.getContent() != null) comp.setContent(dto.getContent());
        if (CollUtil.isNotEmpty(dto.getTags())) {
            comp.setTags(JSONUtil.toJsonStr(dto.getTags()));
        }
        if (CollUtil.isNotEmpty(dto.getTracks())) {
            comp.setTracks(JSONUtil.toJsonStr(dto.getTracks()));
        }
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            comp.setStatus(dto.getStatus());
        }
        comp.setUpdateTime(LocalDateTime.now());
        competitionService.updateById(comp);
        return Result.success(competitionService.toVO(comp));
    }

    @Operation(summary = "管理员删除赛事")
    @DeleteMapping("/admin/delete/{id}")
    @RequireRole("admin")
    public Result<Void> deleteCompetition(@PathVariable Long id) {
        Competition comp = competitionService.getById(id);
        if (comp == null) {
            return Result.error("赛事不存在");
        }

        // Check for existing registrations before deletion
        long regCount = registrationService.count(new LambdaQueryWrapper<Registration>()
                .eq(Registration::getCompetitionId, id));
        if (regCount > 0) {
            return Result.error("该赛事已有 " + regCount + " 条报名记录，无法删除");
        }

        competitionService.removeById(id);
        return Result.success();
    }
}
