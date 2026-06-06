package com.etsaion.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.dto.Result;
import com.etsaion.dto.ai.CompetitionSourceSaveDTO;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.CompetitionSourceService;
import com.etsaion.vo.ai.CompetitionSourceVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Tag(name = "赛事来源管理")
@RestController
@RequestMapping("/api/admin/competition-sources")
@RequireRole("admin")
public class CompetitionSourceController {

    @Autowired
    private CompetitionSourceService competitionSourceService;

    @Operation(summary = "赛事来源列表")
    @GetMapping
    public Result<Page<CompetitionSourceVO>> listSources(@RequestParam(defaultValue = "1") int current,
                                                         @RequestParam(defaultValue = "10") int size,
                                                         @RequestParam(required = false) String keyword,
                                                         @RequestParam(required = false) Boolean enabled) {
        size = Math.min(Math.max(size, 1), 100);
        current = Math.max(current, 1);
        return Result.success(competitionSourceService.listSources(current, size, keyword, enabled));
    }

    @Operation(summary = "新增赛事来源")
    @PostMapping
    public Result<CompetitionSourceVO> createSource(@Validated @RequestBody CompetitionSourceSaveDTO dto) {
        return Result.success(competitionSourceService.saveSource(null, dto));
    }

    @Operation(summary = "更新赛事来源")
    @PutMapping("/{id}")
    public Result<CompetitionSourceVO> updateSource(@PathVariable Long id,
                                                    @Validated @RequestBody CompetitionSourceSaveDTO dto) {
        return Result.success(competitionSourceService.saveSource(id, dto));
    }

    @Operation(summary = "删除赛事来源")
    @DeleteMapping("/{id}")
    public Result<Void> deleteSource(@PathVariable Long id) {
        competitionSourceService.deleteSource(id);
        return Result.success();
    }

    @Operation(summary = "手动采集赛事来源")
    @PostMapping("/{id}/crawl")
    public Result<CompetitionSourceVO> crawlSource(@PathVariable Long id) {
        return Result.success(competitionSourceService.crawlSource(id));
    }
}
