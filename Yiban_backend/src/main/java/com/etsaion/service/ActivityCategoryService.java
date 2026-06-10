package com.etsaion.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.ActivityCategorySaveDTO;
import com.etsaion.entity.ActivityCategory;
import com.etsaion.vo.ActivityCategoryVO;

import java.util.List;

public interface ActivityCategoryService extends IService<ActivityCategory> {
    List<ActivityCategoryVO> listCategories(String type, boolean includeInactive);
    ActivityCategoryVO createCategory(ActivityCategorySaveDTO dto);
    ActivityCategoryVO updateCategory(Long id, ActivityCategorySaveDTO dto);
    void disableCategory(Long id);
    String resolveOrCreate(String type, String value);
    ActivityCategoryVO toVO(ActivityCategory category);
}
