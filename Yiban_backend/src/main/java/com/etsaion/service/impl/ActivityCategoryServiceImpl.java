package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.ActivityCategorySaveDTO;
import com.etsaion.entity.ActivityCategory;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.ActivityCategoryMapper;
import com.etsaion.service.ActivityCategoryService;
import com.etsaion.vo.ActivityCategoryVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ActivityCategoryServiceImpl extends ServiceImpl<ActivityCategoryMapper, ActivityCategory> implements ActivityCategoryService {

    @Override
    public List<ActivityCategoryVO> listCategories(String type, boolean includeInactive) {
        LambdaQueryWrapper<ActivityCategory> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StrUtil.isNotBlank(type), ActivityCategory::getType, normalizeType(type))
                .eq(!includeInactive, ActivityCategory::getStatus, "active")
                .orderByAsc(ActivityCategory::getType)
                .orderByAsc(ActivityCategory::getSortOrder)
                .orderByDesc(ActivityCategory::getCreateTime);
        return this.list(wrapper).stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    public ActivityCategoryVO createCategory(ActivityCategorySaveDTO dto) {
        String type = normalizeType(dto.getType());
        String name = normalizeName(dto.getName());
        String code = normalizeCode(StrUtil.blankToDefault(dto.getCode(), suggestCode(name)));
        ensureUnique(type, code, name, null);

        LocalDateTime now = LocalDateTime.now();
        ActivityCategory category = new ActivityCategory();
        category.setType(type);
        category.setCode(code);
        category.setName(name);
        category.setIcon(StrUtil.blankToDefault(dto.getIcon(), defaultIcon(type)));
        category.setSortOrder(dto.getSortOrder() == null ? 100 : dto.getSortOrder());
        category.setStatus(StrUtil.blankToDefault(dto.getStatus(), "active"));
        category.setCreateTime(now);
        category.setUpdateTime(now);
        this.save(category);
        return toVO(category);
    }

    @Override
    public ActivityCategoryVO updateCategory(Long id, ActivityCategorySaveDTO dto) {
        ActivityCategory category = this.getById(id);
        if (category == null) {
            throw new BusinessException("分类不存在");
        }

        String type = StrUtil.isBlank(dto.getType()) ? category.getType() : normalizeType(dto.getType());
        String name = StrUtil.isBlank(dto.getName()) ? category.getName() : normalizeName(dto.getName());
        String code = StrUtil.isBlank(dto.getCode()) ? category.getCode() : normalizeCode(dto.getCode());
        ensureUnique(type, code, name, id);

        category.setType(type);
        category.setCode(code);
        category.setName(name);
        if (dto.getIcon() != null) category.setIcon(dto.getIcon());
        if (dto.getSortOrder() != null) category.setSortOrder(dto.getSortOrder());
        if (dto.getStatus() != null) category.setStatus(dto.getStatus());
        category.setUpdateTime(LocalDateTime.now());
        this.updateById(category);
        return toVO(category);
    }

    @Override
    public void disableCategory(Long id) {
        ActivityCategory category = this.getById(id);
        if (category == null) {
            throw new BusinessException("分类不存在");
        }
        category.setStatus("disabled");
        category.setUpdateTime(LocalDateTime.now());
        this.updateById(category);
    }

    @Override
    public String resolveOrCreate(String type, String value) {
        if (StrUtil.isBlank(value)) return value;
        String normalizedType = normalizeType(type);
        String trimmed = value.trim();
        ActivityCategory existing = this.getOne(new LambdaQueryWrapper<ActivityCategory>()
                .eq(ActivityCategory::getType, normalizedType)
                .and(w -> w.eq(ActivityCategory::getCode, trimmed).or().eq(ActivityCategory::getName, trimmed))
                .last("LIMIT 1"));
        if (existing != null) {
            if (!"active".equals(existing.getStatus())) {
                existing.setStatus("active");
                existing.setUpdateTime(LocalDateTime.now());
                this.updateById(existing);
            }
            return existing.getCode();
        }

        ActivityCategorySaveDTO dto = new ActivityCategorySaveDTO();
        dto.setType(normalizedType);
        dto.setName(trimmed);
        dto.setIcon(defaultIcon(normalizedType));
        return createCategory(dto).getCode();
    }

    @Override
    public ActivityCategoryVO toVO(ActivityCategory category) {
        if (category == null) return null;
        ActivityCategoryVO vo = new ActivityCategoryVO();
        BeanUtils.copyProperties(category, vo);
        return vo;
    }

    private String normalizeType(String type) {
        String t = StrUtil.blankToDefault(type, "competition").trim().toLowerCase(Locale.ROOT);
        if ("competition".equals(t) || "volunteer".equals(t) || "culture_sports".equals(t) || "other".equals(t)) {
            return t;
        }
        return "other";
    }

    private String normalizeName(String name) {
        String n = name == null ? "" : name.trim();
        if (n.isEmpty()) {
            throw new BusinessException("分类名称不能为空");
        }
        if (n.length() > 50) {
            throw new BusinessException("分类名称不能超过 50 个字符");
        }
        return n;
    }

    private String normalizeCode(String code) {
        String c = code == null ? "" : code.trim();
        if (c.isEmpty()) {
            c = "cat_" + UUID.randomUUID().toString().substring(0, 8);
        }
        if (!c.matches("[A-Za-z0-9_-]{1,50}")) {
            throw new BusinessException("分类编码只能包含字母、数字、下划线和短横线");
        }
        return c;
    }

    private String suggestCode(String name) {
        String ascii = name.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        if (ascii.isBlank()) {
            ascii = "cat_" + UUID.randomUUID().toString().substring(0, 8);
        }
        return ascii.length() > 40 ? ascii.substring(0, 40) : ascii;
    }

    private String defaultIcon(String type) {
        if ("volunteer".equals(type)) return "volunteer_activism";
        if ("culture_sports".equals(type)) return "sports_soccer";
        if ("other".equals(type)) return "event_available";
        return "emoji_events";
    }

    private void ensureUnique(String type, String code, String name, Long exceptId) {
        long codeCount = this.count(new LambdaQueryWrapper<ActivityCategory>()
                .eq(ActivityCategory::getType, type)
                .eq(ActivityCategory::getCode, code)
                .ne(exceptId != null, ActivityCategory::getId, exceptId));
        if (codeCount > 0) {
            throw new BusinessException("该分类编码已存在");
        }
        long nameCount = this.count(new LambdaQueryWrapper<ActivityCategory>()
                .eq(ActivityCategory::getType, type)
                .eq(ActivityCategory::getName, name)
                .ne(exceptId != null, ActivityCategory::getId, exceptId));
        if (nameCount > 0) {
            throw new BusinessException("该活动类型下已存在同名分类");
        }
    }
}
