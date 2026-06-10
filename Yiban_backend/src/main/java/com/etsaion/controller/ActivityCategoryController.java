package com.etsaion.controller;

import com.etsaion.dto.ActivityCategorySaveDTO;
import com.etsaion.dto.Result;
import com.etsaion.interceptor.RequireRole;
import com.etsaion.service.ActivityCategoryService;
import com.etsaion.vo.ActivityCategoryVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "活动分类接口", description = "提供赛事、志愿服务等活动分类的查询与管理员维护能力")
@RestController
@RequestMapping("/api/activity-categories")
public class ActivityCategoryController {

    @Autowired
    private ActivityCategoryService activityCategoryService;

    @Operation(summary = "查询活动分类")
    @GetMapping
    public Result<List<ActivityCategoryVO>> listCategories(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return Result.success(activityCategoryService.listCategories(type, includeInactive));
    }

    @Operation(summary = "管理员创建活动分类")
    @PostMapping("/admin")
    @RequireRole("admin")
    public Result<ActivityCategoryVO> createCategory(@Validated @RequestBody ActivityCategorySaveDTO dto) {
        return Result.success(activityCategoryService.createCategory(dto));
    }

    @Operation(summary = "管理员更新活动分类")
    @PutMapping("/admin/{id}")
    @RequireRole("admin")
    public Result<ActivityCategoryVO> updateCategory(@PathVariable Long id, @RequestBody ActivityCategorySaveDTO dto) {
        return Result.success(activityCategoryService.updateCategory(id, dto));
    }

    @Operation(summary = "管理员停用活动分类")
    @DeleteMapping("/admin/{id}")
    @RequireRole("admin")
    public Result<Void> disableCategory(@PathVariable Long id) {
        activityCategoryService.disableCategory(id);
        return Result.success(null);
    }
}
