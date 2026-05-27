package com.etsaion.controller;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.EventPublishDTO;
import com.etsaion.dto.Result;
import com.etsaion.entity.Competition;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.CompetitionService;
import com.etsaion.vo.CompetitionVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@Tag(name = "赛事/竞赛管理接口", description = "提供赛事列表查询、详情获取，以及管理员维护赛事接口")
@RestController
@RequestMapping("/api/competition")
public class CompetitionController {

    @Autowired
    private CompetitionService competitionService;

    @Operation(summary = "查询赛事分页列表 (公开)")
    @GetMapping("/list")
    public Result<Page<CompetitionVO>> listCompetitions(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {

        Page<Competition> page = competitionService.getCompetitionsPage(current, size, keyword, level, category, status);
        return Result.success(competitionService.toVOPage(page));
    }

    @Operation(summary = "获取单个赛事详情 (公开)")
    @GetMapping("/detail/{id}")
    public Result<CompetitionVO> getCompetitionDetail(@PathVariable Long id) {
        Competition comp = competitionService.getById(id);
        if (comp == null) {
            return Result.error("赛事不存在");
        }
        return Result.success(competitionService.toVO(comp));
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
        BeanUtils.copyProperties(dto, comp, "tags", "tracks", "createTime");
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

        competitionService.removeById(id);
        return Result.success();
    }
}
